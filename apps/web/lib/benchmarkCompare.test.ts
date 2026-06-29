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
    withClaimCentroid?: boolean;
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
            ...(params.withClaimCentroid
                ? {
                      modeCountClaimCentroid: 1,
                      divergenceEntropyClaimCentroid: 0.4,
                      stabilityClaimCentroid: {
                          pairwiseMean: 0.85,
                      },
                  }
                : {}),
            summary: {
                stability: {
                    pairwiseMean: params.stabilityPairwiseMean,
                    pairs: [],
                },
                ...(params.withClaimCentroid
                    ? {
                          consensus: { mean: 0.7 },
                          critiqueMaxSeverity: { mean: 2.1 },
                      }
                    : {}),
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
            withClaimCentroid: true,
        });

        const summary = summarizeBenchmark(benchmark);
        expect(summary.id).toBe("bench_a");
        expect(summary.runs).toBe(4);
        expect(summary.modeCount).toBe(2);
        expect(summary.divergenceEntropy).toBe(0.6);
        expect(summary.stabilityPairwiseMean).toBe(0.8);
        expect(summary.claimModeCount).toBe(1);
        expect(summary.consensusMean).toBe(0.7);
        expect(summary.modeCountDelta).toBe(1);
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
        expect(compared.delta.claimModeCount).toBeNull();
        expect(compared.delta.consensusMean).toBeNull();
    });
});
