import { describe, expect, it } from "vitest";
import type { BenchmarkArtifact } from "./data";
import {
    buildBenchmarkComparePayload,
    summarizeBenchmark,
} from "./benchmarkCompare";

function makeBenchmarkArtifact(params: {
    id: string;
    runs: number;
    modeCount: number;
    divergenceEntropy: number;
    stabilityPairwiseMean?: number;
}): BenchmarkArtifact {
    return {
        kind: "benchmark",
        id: params.id,
        question: `Question ${params.id}`,
        metadata: {
            createdAt: "2025-01-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "standard",
            fastMode: false,
        },
        payload: {
            runs: params.runs,
            modeCount: params.modeCount,
            modeSizes: [params.runs],
            divergenceEntropy: params.divergenceEntropy,
            summary: {
                stability: {
                    pairwiseMean: params.stabilityPairwiseMean,
                    pairs: [],
                },
            },
        },
    };
}

describe("benchmark compare helpers", () => {
    it("summarizes benchmark fields for compare views", () => {
        const benchmark = makeBenchmarkArtifact({
            id: "bench_a",
            runs: 4,
            modeCount: 2,
            divergenceEntropy: 0.6,
            stabilityPairwiseMean: 0.8,
        });

        const summary = summarizeBenchmark(benchmark);
        expect(summary.id).toBe("bench_a");
        expect(summary.runs).toBe(4);
        expect(summary.modeCount).toBe(2);
        expect(summary.divergenceEntropy).toBe(0.6);
        expect(summary.stabilityPairwiseMean).toBe(0.8);
    });

    it("computes compare deltas and preserves null stability deltas", () => {
        const left = makeBenchmarkArtifact({
            id: "bench_left",
            runs: 2,
            modeCount: 1,
            divergenceEntropy: 0.2,
            stabilityPairwiseMean: 0.7,
        });
        const right = makeBenchmarkArtifact({
            id: "bench_right",
            runs: 5,
            modeCount: 3,
            divergenceEntropy: 0.9,
            stabilityPairwiseMean: undefined,
        });

        const compared = buildBenchmarkComparePayload(left, right);
        expect(compared.delta.runs).toBe(3);
        expect(compared.delta.modeCount).toBe(2);
        expect(compared.delta.divergenceEntropy).toBeCloseTo(0.7, 3);
        expect(compared.delta.stabilityPairwiseMean).toBeNull();
        expect(compared.left.claimCentroid.hasClaimCentroid).toBe(false);
    });

    it("includes claim-centroid deltas when present", () => {
        const left = makeBenchmarkArtifact({
            id: "bench_left",
            runs: 4,
            modeCount: 5,
            divergenceEntropy: 2.1,
            stabilityPairwiseMean: 0.7,
        });
        left.payload.modeCountClaimCentroid = 4;
        left.payload.divergenceEntropyClaimCentroid = 1.9;
        left.payload.stabilityClaimCentroid = { pairwiseMean: 0.75 };

        const right = makeBenchmarkArtifact({
            id: "bench_right",
            runs: 4,
            modeCount: 5,
            divergenceEntropy: 2.1,
            stabilityPairwiseMean: 0.7,
        });
        right.payload.modeCountClaimCentroid = 3;
        right.payload.divergenceEntropyClaimCentroid = 1.5;
        right.payload.stabilityClaimCentroid = { pairwiseMean: 0.82 };

        const compared = buildBenchmarkComparePayload(left, right);
        expect(compared.left.claimCentroid.hasClaimCentroid).toBe(true);
        expect(compared.delta.claimCentroidModeCount).toBe(-1);
        expect(compared.delta.claimCentroidDivergenceEntropy).toBeCloseTo(
            -0.4,
            3,
        );
        expect(compared.delta.claimCentroidStabilityPairwiseMean).toBeCloseTo(
            0.07,
            3,
        );
    });
});
