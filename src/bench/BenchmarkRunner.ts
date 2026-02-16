import type { DebateEngine } from "../debate/DebateEngine";
import type { DebateRun } from "../types/agent";
import type { EmbeddingClient } from "../types/embedding";
import { cosineSimilarity } from "../core/math";

export type BenchmarkResult = {
    question: string;
    runs: number;
    runIds: string[];

    consensus: { mean: number; stddev: number };
    critiqueMaxSeverity: { mean: number; stddev: number };

    modeCount: number;
    modeSizes: number[];
    divergenceEntropy: number;

    stability: {
        // Average pairwise similarity of final answers across runs.
        pairwiseMean: number;
        pairwiseStddev: number;
        minPairwiseSimilarity: number;
        maxPairwiseSimilarity: number;
        pairs: Array<{ i: number; j: number; similarity: number }>;
    };
};

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.2";

export class BenchmarkRunner {
    constructor(
        private readonly deps: {
            engine: DebateEngine;
            embedding: EmbeddingClient;
        },
    ) {}

    /* --------------------------------------------------- */
    /** Helper - greedy clustering by cosine similarity threshold */
    private clusterEmbeddings(vectors: number[][], threshold = 0.8): number[] {
        const centroids: number[][] = [];
        const assignments: number[] = new Array(vectors.length).fill(-1);

        vectors.forEach((vec, idx) => {
            // try to fit into an existing centroid
            let placed = false;
            for (let c = 0; c < centroids.length; c++) {
                if (cosineSimilarity(vec, centroids[c]) >= threshold) {
                    assignments[idx] = c;
                    placed = true;
                    break;
                }
            }

            // new cluster if no centroid matched
            if (!placed) {
                centroids.push(vec);
                assignments[idx] = centroids.length - 1;
            }
        });

        return assignments; // index of the mode each vector belongs to
    }

    /* --------------------------------------------------- */
    /** Run tasks with concurrency limit, preserving result order */
    private async runWithConcurrency<T>(
        concurrency: number,
        count: number,
        fn: (i: number) => Promise<T>,
        onItemComplete?: (result: T, i: number) => void,
    ): Promise<T[]> {
        const results: (T | undefined)[] = new Array(count);
        let nextIndex = 0;

        async function worker(): Promise<void> {
            while (true) {
                const i = nextIndex++;
                if (i >= count) break;
                const result = await fn(i);
                results[i] = result;
                onItemComplete?.(result, i);
            }
        }

        const workers = Array(Math.min(concurrency, count))
            .fill(null)
            .map(() => worker());
        await Promise.all(workers);
        return results as T[];
    }

    /* --------------------------------------------------- */
    /** Run a benchmark */
    async run(
        question: string,
        runs: number,
        opts?: {
            model?: string;
            verbose?: boolean;
            quiet?: boolean;
            onProgress?: (i: number, total: number) => void;
            /** Max concurrent debate runs. Default 3 to avoid rate limits. */
            concurrency?: number;
            /** Skip revision and synthesizer steps (~50% fewer LLM calls). */
            fast?: boolean;
            // allow caller to tweak the clustering threshold
            clusteringThreshold?: number;
        },
    ): Promise<{ result: BenchmarkResult; raw: DebateRun[] }> {
        const model = opts?.model ?? MODEL;
        const verbose = opts?.verbose ?? false;
        const quiet = opts?.quiet ?? false;
        const onProgress = opts?.onProgress;
        const concurrency = opts?.concurrency ?? 3;

        const raw = await this.runWithConcurrency(
            concurrency,
            runs,
            (i) =>
                this.deps.engine.run(
                    { question },
                    { model, verbose, quiet, fast: opts?.fast },
                ),
            !verbose && onProgress
                ? (_, i) => onProgress(i + 1, runs)
                : undefined,
        );

        /* --------------------------------------------------- */
        /** Compute metrics */
        const runIds = raw.map((r) => r.id);

        const consensusValues = raw
            .map((r) => r.metrics.consensus?.strength)
            .filter((v): v is number => typeof v === "number");

        const critiqueMaxValues = raw
            .map((r) => r.metrics.critique.maxSeverity)
            .filter((v): v is number => typeof v === "number");

        /* --------------------------------------------------- */
        /** Embedding stability on final answers */
        const finals = raw
            .map((r) => r.finalAnswer)
            .filter(
                (t): t is string =>
                    typeof t === "string" && t.trim().length > 0,
            );

        const vectors =
            finals.length > 0
                ? await this.deps.embedding.embedBatch(finals)
                : [];

        /* --------------------------------------------------- */
        /** Mode detection */
        const assignments = this.clusterEmbeddings(
            vectors,
            opts?.clusteringThreshold ?? 0.8,
        );
        const modeSizes: number[] = [];
        assignments.forEach((mIdx) => {
            modeSizes[mIdx] = (modeSizes[mIdx] ?? 0) + 1;
        });
        const modeCount = modeSizes.length;

        /* --------------------------------------------------- */
        /** Divergence entropy */
        const divergenceEntropy =
            modeCount === 0
                ? 0
                : -modeSizes.reduce((sum, sz) => {
                      const p = sz / vectors.length;
                      return sum + p * Math.log2(p);
                  }, 0);

        /* --------------------------------------------------- */
        /** Pairwise similarity */
        const pairs: Array<{ i: number; j: number; similarity: number }> = [];
        for (let i = 0; i < vectors.length; i++) {
            for (let j = i + 1; j < vectors.length; j++) {
                pairs.push({
                    i,
                    j,
                    similarity: cosineSimilarity(vectors[i], vectors[j]),
                });
            }
        }

        /* --------------------------------------------------- */
        /** Assemble results */
        const sims = pairs.map((p) => p.similarity);
        const roundedPairs = pairs.map((p) => ({
            ...p,
            similarity: round3(p.similarity),
        }));

        const result: BenchmarkResult = {
            question,
            runs,
            runIds,

            consensus: {
                mean: round3(mean(consensusValues)),
                stddev: round3(stddev(consensusValues)),
            },
            critiqueMaxSeverity: {
                mean: round3(mean(critiqueMaxValues)),
                stddev: round3(stddev(critiqueMaxValues)),
            },

            modeCount,
            modeSizes,
            divergenceEntropy,

            stability: {
                pairwiseMean: round3(mean(sims)),
                pairwiseStddev: round3(stddev(sims)),
                minPairwiseSimilarity: round3(Math.min(...sims)),
                maxPairwiseSimilarity: round3(Math.max(...sims)),
                pairs: roundedPairs,
            },
        };

        return { result, raw };
    }
}

/* ---- tiny stats ---- */
function mean(xs: number[]) {
    if (!xs.length) return 0;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]) {
    if (xs.length < 2) return 0;
    const m = mean(xs);
    const v = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
    return Math.sqrt(v);
}

function round3(n: number) {
    return Math.round(n * 1000) / 1000;
}
