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

    async run(
        question: string,
        runs: number,
        opts?: {
            model?: string;
            verbose?: boolean;
            quiet?: boolean;
            onProgress?: (i: number, total: number) => void;
        },
    ): Promise<{ result: BenchmarkResult; raw: DebateRun[] }> {
        const raw: DebateRun[] = [];
        const model = opts?.model ?? MODEL;
        const verbose = opts?.verbose ?? false;
        const quiet = opts?.quiet ?? false;
        const onProgress = opts?.onProgress;

        for (let i = 0; i < runs; i++) {
            if (!verbose && onProgress) onProgress(i + 1, runs);
            raw.push(
                await this.deps.engine.run(
                    { question },
                    { model, verbose, quiet },
                ),
            );
        }

        const runIds = raw.map((r) => r.id);

        const consensusValues = raw
            .map((r) => r.metrics.consensus?.strength)
            .filter((v): v is number => typeof v === "number");

        const critiqueMaxValues = raw
            .map((r) => r.metrics.critique.maxSeverity)
            .filter((v): v is number => typeof v === "number");

        // Embedding stability on final answers
        const finals = raw
            .map((r) => r.finalAnswer)
            .filter(
                (t): t is string =>
                    typeof t === "string" && t.trim().length > 0,
            );

        const vectors = await Promise.all(
            finals.map((t) => this.deps.embedding.embed(t)),
        );

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
            stability: (() => {
                const sims = pairs.map((p) => p.similarity);
                const rounded = pairs.map((p) => ({
                    ...p,
                    similarity: round3(p.similarity),
                }));
                return {
                    pairwiseMean: round3(mean(sims)),
                    pairwiseStddev: round3(stddev(sims)),
                    minPairwiseSimilarity: round3(
                        sims.length ? Math.min(...sims) : 0,
                    ),
                    maxPairwiseSimilarity: round3(
                        sims.length ? Math.max(...sims) : 0,
                    ),
                    pairs: rounded,
                };
            })(),
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
