import type { AnalysisIndex } from "./data";

export type BenchmarkIndexSnapshot = {
    stabilityPairwiseMean?: number;
    modeLabels: AnalysisIndex["benchmarks"][number]["modeLabels"];
};

export function buildBenchmarkIndexLookup(
    index: AnalysisIndex,
): Map<string, BenchmarkIndexSnapshot> {
    const lookup = new Map<string, BenchmarkIndexSnapshot>();

    for (const benchmark of index.benchmarks) {
        lookup.set(benchmark.id, {
            stabilityPairwiseMean: benchmark.stabilityPairwiseMean,
            modeLabels: benchmark.modeLabels,
        });
    }

    return lookup;
}

export function formatTopModeLabel(
    modeLabels: BenchmarkIndexSnapshot["modeLabels"],
    maxLength = 48,
): string | null {
    if (!modeLabels.length) return null;
    const largest = [...modeLabels].sort((a, b) => b.size - a.size)[0];
    if (!largest?.label) return null;
    const label = largest.label.trim();
    if (label.length <= maxLength) return label;
    return `${label.slice(0, maxLength - 1)}…`;
}
