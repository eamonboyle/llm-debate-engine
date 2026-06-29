import type { BenchmarkArtifact } from "./data";
import { extractClaimCentroidDisplay } from "./claimCentroidMetrics";
import { extractBenchmarkSummaryDisplay } from "./benchmarkSummaryMetrics";

export type BenchmarkCompareSummary = {
    id: string;
    question: string;
    createdAt: string;
    model: string;
    pipelinePreset: string;
    fastMode: boolean;
    runs: number;
    modeCount: number;
    divergenceEntropy: number;
    stabilityPairwiseMean: number | null;
    claimModeCount: number | null;
    claimDivergenceEntropy: number | null;
    claimStabilityPairwiseMean: number | null;
    modeCountDelta: number | null;
    consensusMean: number | null;
    critiqueMean: number | null;
};

export type BenchmarkComparePayload = {
    left: BenchmarkCompareSummary;
    right: BenchmarkCompareSummary;
    delta: {
        runs: number;
        modeCount: number;
        divergenceEntropy: number;
        stabilityPairwiseMean: number | null;
        claimModeCount: number | null;
        claimDivergenceEntropy: number | null;
        claimStabilityPairwiseMean: number | null;
        modeCountDelta: number | null;
        consensusMean: number | null;
        critiqueMean: number | null;
    };
};

function toNumberOrNull(value: unknown): number | null {
    return typeof value === "number" ? value : null;
}

function subtractOrNull(
    right: number | null,
    left: number | null,
): number | null {
    if (typeof right !== "number" || typeof left !== "number") return null;
    return right - left;
}

export function summarizeBenchmark(
    benchmark: BenchmarkArtifact,
): BenchmarkCompareSummary {
    const claimCentroid = extractClaimCentroidDisplay(benchmark);
    const summary = extractBenchmarkSummaryDisplay(benchmark);

    return {
        id: benchmark.id,
        question: benchmark.question,
        createdAt: benchmark.metadata.createdAt,
        model: benchmark.metadata.model,
        pipelinePreset: benchmark.metadata.pipelinePreset,
        fastMode: benchmark.metadata.fastMode,
        runs: benchmark.payload.runs,
        modeCount: benchmark.payload.modeCount,
        divergenceEntropy: benchmark.payload.divergenceEntropy,
        stabilityPairwiseMean: toNumberOrNull(
            benchmark.payload.summary?.stability?.pairwiseMean,
        ),
        claimModeCount: claimCentroid.modeCount,
        claimDivergenceEntropy: claimCentroid.divergenceEntropy,
        claimStabilityPairwiseMean: claimCentroid.stabilityPairwiseMean,
        modeCountDelta: claimCentroid.modeCountDelta,
        consensusMean: summary.consensusMean,
        critiqueMean: summary.critiqueMean,
    };
}

export function buildBenchmarkComparePayload(
    leftBenchmark: BenchmarkArtifact,
    rightBenchmark: BenchmarkArtifact,
): BenchmarkComparePayload {
    const left = summarizeBenchmark(leftBenchmark);
    const right = summarizeBenchmark(rightBenchmark);

    return {
        left,
        right,
        delta: {
            runs: right.runs - left.runs,
            modeCount: right.modeCount - left.modeCount,
            divergenceEntropy: right.divergenceEntropy - left.divergenceEntropy,
            stabilityPairwiseMean: subtractOrNull(
                right.stabilityPairwiseMean,
                left.stabilityPairwiseMean,
            ),
            claimModeCount: subtractOrNull(
                right.claimModeCount,
                left.claimModeCount,
            ),
            claimDivergenceEntropy: subtractOrNull(
                right.claimDivergenceEntropy,
                left.claimDivergenceEntropy,
            ),
            claimStabilityPairwiseMean: subtractOrNull(
                right.claimStabilityPairwiseMean,
                left.claimStabilityPairwiseMean,
            ),
            modeCountDelta: subtractOrNull(
                right.modeCountDelta,
                left.modeCountDelta,
            ),
            consensusMean: subtractOrNull(
                right.consensusMean,
                left.consensusMean,
            ),
            critiqueMean: subtractOrNull(right.critiqueMean, left.critiqueMean),
        },
    };
}
