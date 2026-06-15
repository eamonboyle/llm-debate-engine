import type { BenchmarkArtifact } from "./data";
import { formatSummaryMetric } from "./benchmarkSummaryMetrics";

export type ClaimCentroidDisplay = {
    hasClaimCentroid: boolean;
    modeCount: number | null;
    divergenceEntropy: number | null;
    stabilityPairwiseMean: number | null;
    stabilityMin: number | null;
    stabilityMax: number | null;
    modeSizes: number[] | null;
    thresholdCounts: Array<{ threshold: string; modeCount: number }>;
    answerModeCount: number;
    answerDivergenceEntropy: number;
    modeCountDelta: number | null;
};

function toNumberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function extractClaimCentroidDisplay(
    benchmark: BenchmarkArtifact,
): ClaimCentroidDisplay {
    const payload = benchmark.payload;
    const modeCount = toNumberOrNull(payload.modeCountClaimCentroid);
    const divergenceEntropy = toNumberOrNull(
        payload.divergenceEntropyClaimCentroid,
    );
    const stability = payload.stabilityClaimCentroid;
    const stabilityPairwiseMean = toNumberOrNull(stability?.pairwiseMean);
    const stabilityMin = toNumberOrNull(stability?.minPairwiseSimilarity);
    const stabilityMax = toNumberOrNull(stability?.maxPairwiseSimilarity);
    const modeSizes = Array.isArray(payload.modeSizesClaimCentroid)
        ? payload.modeSizesClaimCentroid
        : null;

    const thresholdCounts = [
        {
            threshold: "0.8",
            modeCount: payload.modeCountClaimCentroidAt0_8 ?? 0,
        },
        {
            threshold: "0.9",
            modeCount: payload.modeCountClaimCentroidAt0_9 ?? 0,
        },
        {
            threshold: "0.95",
            modeCount: payload.modeCountClaimCentroidAt0_95 ?? 0,
        },
    ];

    const hasClaimCentroid =
        modeCount != null ||
        divergenceEntropy != null ||
        stabilityPairwiseMean != null;

    const modeCountDelta =
        modeCount != null ? payload.modeCount - modeCount : null;

    return {
        hasClaimCentroid,
        modeCount,
        divergenceEntropy,
        stabilityPairwiseMean,
        stabilityMin,
        stabilityMax,
        modeSizes,
        thresholdCounts,
        answerModeCount: payload.modeCount,
        answerDivergenceEntropy: payload.divergenceEntropy,
        modeCountDelta,
    };
}

export function formatClaimCentroidComparison(
    answerValue: number,
    claimValue: number | null,
    digits = 3,
): string {
    if (claimValue == null) return formatSummaryMetric(answerValue, digits);
    const delta = answerValue - claimValue;
    const sign = delta > 0 ? "+" : "";
    return `${formatSummaryMetric(answerValue, digits)} vs ${formatSummaryMetric(claimValue, digits)} (${sign}${delta.toFixed(digits)})`;
}
