import type { BenchmarkArtifact } from "./data";

export type BenchmarkSummaryDisplay = {
    consensusMean: number | null;
    consensusStddev: number | null;
    critiqueMean: number | null;
    critiqueStddev: number | null;
    stabilityMean: number | null;
    stabilityStddev: number | null;
    stabilityMin: number | null;
    stabilityMax: number | null;
    hasAny: boolean;
};

function toNumberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readMeanStddev(
    value: unknown,
): { mean: number | null; stddev: number | null } {
    if (!value || typeof value !== "object") {
        return { mean: null, stddev: null };
    }
    const record = value as Record<string, unknown>;
    return {
        mean: toNumberOrNull(record.mean),
        stddev: toNumberOrNull(record.stddev),
    };
}

export function extractBenchmarkSummaryDisplay(
    benchmark: BenchmarkArtifact,
): BenchmarkSummaryDisplay {
    const summary = benchmark.payload.summary;
    const consensus = readMeanStddev(summary?.consensus);
    const critique = readMeanStddev(summary?.critiqueMaxSeverity);
    const stability = summary?.stability;

    const stabilityMean = toNumberOrNull(stability?.pairwiseMean);
    const stabilityStddev = toNumberOrNull(stability?.pairwiseStddev);
    const stabilityMin = toNumberOrNull(stability?.minPairwiseSimilarity);
    const stabilityMax = toNumberOrNull(stability?.maxPairwiseSimilarity);

    const hasAny =
        consensus.mean != null ||
        critique.mean != null ||
        stabilityMean != null;

    return {
        consensusMean: consensus.mean,
        consensusStddev: consensus.stddev,
        critiqueMean: critique.mean,
        critiqueStddev: critique.stddev,
        stabilityMean,
        stabilityStddev,
        stabilityMin,
        stabilityMax,
        hasAny,
    };
}

export function formatSummaryMetric(
    value: number | null,
    digits = 3,
): string {
    return value == null ? "—" : value.toFixed(digits);
}
