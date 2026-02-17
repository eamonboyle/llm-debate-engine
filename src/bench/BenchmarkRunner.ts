import type { DebateEngine } from "../debate/DebateEngine";
import type { DebateRun } from "../types/agent";
import type { EmbeddingClient } from "../types/embedding";
import type { BenchmarkResult } from "../types/benchmark";
import { cosineSimilarity, vectorMean } from "../core/math";
import { getProposal } from "../core/extraction";

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

    /** Returns mode count for a given threshold (for sensitivity reporting). */
    private getModeCount(vectors: number[][], threshold: number): number {
        if (vectors.length === 0) return 0;
        const assignments = this.clusterEmbeddings(vectors, threshold);
        const modeSizes: number[] = [];
        assignments.forEach((mIdx) => {
            modeSizes[mIdx] = (modeSizes[mIdx] ?? 0) + 1;
        });
        return modeSizes.length;
    }

    /** Extract keyClaims from synthesizer step. Returns [] if no synthesizer or empty keyClaims. */
    private getSynthesizerKeyClaims(run: DebateRun): string[] {
        const synthStep = run.steps.find((s) => s.role === "synthesizer");
        const proposal = synthStep ? getProposal(synthStep) : null;
        const claims = proposal?.keyClaims;
        if (!Array.isArray(claims) || claims.length === 0) return [];
        return claims.filter(
            (c): c is string =>
                typeof c === "string" && c.trim().length > 0,
        );
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
        const finalsWithIndices: { text: string; rawIndex: number }[] = [];
        raw.forEach((r, i) => {
            if (
                typeof r.finalAnswer === "string" &&
                r.finalAnswer.trim().length > 0
            ) {
                finalsWithIndices.push({ text: r.finalAnswer, rawIndex: i });
            }
        });
        const finals = finalsWithIndices.map((f) => f.text);
        const rawIndexByVectorIndex = finalsWithIndices.map((f) => f.rawIndex);

        const vectors =
            finals.length > 0
                ? await this.deps.embedding.embedBatch(finals)
                : [];

        /* --------------------------------------------------- */
        /** Mode detection */
        const threshold = opts?.clusteringThreshold ?? 0.8;
        const assignments = this.clusterEmbeddings(vectors, threshold);
        const modeSizes: number[] = [];
        assignments.forEach((mIdx) => {
            modeSizes[mIdx] = (modeSizes[mIdx] ?? 0) + 1;
        });
        const modeCount = modeSizes.length;

        /* Multi-threshold mode counts for sensitivity reporting */
        const modeCountAt0_8 = this.getModeCount(vectors, 0.8);
        const modeCountAt0_9 = this.getModeCount(vectors, 0.9);
        const modeCountAt0_95 = this.getModeCount(vectors, 0.95);

        /* Per-cluster exemplars (central run = highest avg similarity to others) */
        const clusterIndices = Array.from(new Set(assignments)).sort(
            (a, b) => a - b,
        );
        const modes =
            vectors.length > 0
                ? clusterIndices.map((clusterIdx) => {
                      const memberVectorIndices = assignments
                          .map((c, i) => (c === clusterIdx ? i : -1))
                          .filter((i) => i >= 0);
                      const members = memberVectorIndices.map(
                          (vi) => rawIndexByVectorIndex[vi],
                      );

                      let bestVi = memberVectorIndices[0];
                      let bestAvgSim = -1;
                      for (const vi of memberVectorIndices) {
                          let sum = 0;
                          let count = 0;
                          for (const vj of memberVectorIndices) {
                              if (vi === vj) continue;
                              sum += cosineSimilarity(vectors[vi], vectors[vj]);
                              count++;
                          }
                          const avgSim = count > 0 ? sum / count : 1;
                          if (avgSim > bestAvgSim) {
                              bestAvgSim = avgSim;
                              bestVi = vi;
                          }
                      }

                      const exemplarIndex = rawIndexByVectorIndex[bestVi];
                      const exemplarPreview =
                          (raw[exemplarIndex].finalAnswer ?? "").slice(0, 200);

                      return {
                          size: memberVectorIndices.length,
                          members,
                          exemplarIndex,
                          exemplarPreview,
                      };
                  })
                : undefined;

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
        /** Claim-centroid mode detection (synthesizer keyClaims only) */
        const claimCentroidWithIndices: {
            centroid: number[];
            rawIndex: number;
        }[] = [];
        for (let i = 0; i < raw.length; i++) {
            const claims = this.getSynthesizerKeyClaims(raw[i]);
            if (claims.length === 0) continue;
            const claimVecs = await this.deps.embedding.embedBatch(claims);
            const centroid = vectorMean(claimVecs);
            claimCentroidWithIndices.push({ centroid, rawIndex: i });
        }

        const claimCentroidVectors = claimCentroidWithIndices.map(
            (c) => c.centroid,
        );

        let modeCountClaimCentroid: number | undefined;
        let modeSizesClaimCentroid: number[] | undefined;
        let divergenceEntropyClaimCentroid: number | undefined;
        let modeCountClaimCentroidAt0_8: number | undefined;
        let modeCountClaimCentroidAt0_9: number | undefined;
        let modeCountClaimCentroidAt0_95: number | undefined;
        let stabilityClaimCentroid:
            | {
                  pairwiseMean: number;
                  pairwiseStddev: number;
                  minPairwiseSimilarity: number;
                  maxPairwiseSimilarity: number;
              }
            | undefined;

        if (claimCentroidVectors.length > 0) {
            const ccAssignments = this.clusterEmbeddings(
                claimCentroidVectors,
                threshold,
            );
            modeSizesClaimCentroid = [];
            ccAssignments.forEach((mIdx) => {
                modeSizesClaimCentroid![mIdx] =
                    (modeSizesClaimCentroid![mIdx] ?? 0) + 1;
            });
            modeCountClaimCentroid = modeSizesClaimCentroid.length;

            modeCountClaimCentroidAt0_8 = this.getModeCount(
                claimCentroidVectors,
                0.8,
            );
            modeCountClaimCentroidAt0_9 = this.getModeCount(
                claimCentroidVectors,
                0.9,
            );
            modeCountClaimCentroidAt0_95 = this.getModeCount(
                claimCentroidVectors,
                0.95,
            );

            divergenceEntropyClaimCentroid =
                modeCountClaimCentroid === 0
                    ? 0
                    : -modeSizesClaimCentroid.reduce((sum, sz) => {
                          const p = sz / claimCentroidVectors.length;
                          return sum + p * Math.log2(p);
                      }, 0);

            const ccPairs: number[] = [];
            for (let i = 0; i < claimCentroidVectors.length; i++) {
                for (let j = i + 1; j < claimCentroidVectors.length; j++) {
                    ccPairs.push(
                        cosineSimilarity(
                            claimCentroidVectors[i],
                            claimCentroidVectors[j],
                        ),
                    );
                }
            }
            stabilityClaimCentroid = {
                pairwiseMean: round3(mean(ccPairs)),
                pairwiseStddev: round3(stddev(ccPairs)),
                minPairwiseSimilarity: round3(Math.min(...ccPairs)),
                maxPairwiseSimilarity: round3(Math.max(...ccPairs)),
            };
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

            threshold,
            modeCountAt0_8,
            modeCountAt0_9,
            modeCountAt0_95,
            modes,

            stability: {
                pairwiseMean: round3(mean(sims)),
                pairwiseStddev: round3(stddev(sims)),
                minPairwiseSimilarity: round3(Math.min(...sims)),
                maxPairwiseSimilarity: round3(Math.max(...sims)),
                pairs: roundedPairs,
            },

            modeCountClaimCentroid,
            modeSizesClaimCentroid,
            divergenceEntropyClaimCentroid,
            modeCountClaimCentroidAt0_8,
            modeCountClaimCentroidAt0_9,
            modeCountClaimCentroidAt0_95,
            stabilityClaimCentroid,
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
