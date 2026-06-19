import type { AnalysisIndex, DataStatus } from "./data";

export type IndexFreshness = {
    stale: boolean;
    missingIndex: boolean;
    artifactRuns: number;
    artifactBenchmarks: number;
    indexedRuns: number;
    indexedBenchmarks: number;
    runsBehind: number;
    benchmarksBehind: number;
};

export function computeIndexFreshness(
    status: DataStatus,
    index: AnalysisIndex | null,
): IndexFreshness {
    const artifactRuns = status.artifactCounts.runs;
    const artifactBenchmarks = status.artifactCounts.benchmarks;
    const indexedRuns = index?.totals.runs ?? 0;
    const indexedBenchmarks = index?.totals.benchmarks ?? 0;
    const runsBehind = Math.max(0, artifactRuns - indexedRuns);
    const benchmarksBehind = Math.max(0, artifactBenchmarks - indexedBenchmarks);
    const missingIndex = !index && (artifactRuns > 0 || artifactBenchmarks > 0);
    const stale =
        missingIndex || runsBehind > 0 || benchmarksBehind > 0;

    return {
        stale,
        missingIndex,
        artifactRuns,
        artifactBenchmarks,
        indexedRuns,
        indexedBenchmarks,
        runsBehind,
        benchmarksBehind,
    };
}
