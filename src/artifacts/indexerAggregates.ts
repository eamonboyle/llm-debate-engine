import { mean, round3, stddev } from "../core/math";
import type { BenchmarkArtifactV1 } from "../types/artifact";

export type OutlierRun = {
    benchmarkId: string;
    runId: string;
    avgSimilarity: number;
    zScore: number;
};

/**
 * Computes outlier runs (lowest average pairwise similarity) per benchmark.
 */
export function computeOutlierRuns(
    benchmarks: BenchmarkArtifactV1[],
): OutlierRun[] {
    return benchmarks
        .map((artifact) => {
            const runIds = artifact.payload.runIds;
            const pairs = artifact.payload.summary?.stability?.pairs;
            if (!runIds?.length || !pairs?.length) return null;

            const sums = new Array(runIds.length).fill(0);
            const counts = new Array(runIds.length).fill(0);
            for (const pair of pairs) {
                if (
                    typeof pair.i !== "number" ||
                    typeof pair.j !== "number" ||
                    typeof pair.similarity !== "number"
                ) {
                    continue;
                }
                if (pair.i >= runIds.length || pair.j >= runIds.length)
                    continue;
                sums[pair.i] += pair.similarity;
                counts[pair.i] += 1;
                sums[pair.j] += pair.similarity;
                counts[pair.j] += 1;
            }

            const avgByRun = runIds.map((_, idx) =>
                counts[idx] > 0 ? sums[idx] / counts[idx] : 1,
            );
            const meanAvg = mean(avgByRun);
            const stdevAvg = stddev(avgByRun);

            let minIndex = 0;
            for (let i = 1; i < avgByRun.length; i++) {
                if (avgByRun[i] < avgByRun[minIndex]) minIndex = i;
            }

            const outlierAvg = avgByRun[minIndex];
            return {
                benchmarkId: artifact.id,
                runId: runIds[minIndex],
                avgSimilarity: round3(outlierAvg),
                zScore:
                    stdevAvg === 0
                        ? 0
                        : round3((outlierAvg - meanAvg) / stdevAvg),
            };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .sort((a, b) => a.avgSimilarity - b.avgSimilarity);
}
