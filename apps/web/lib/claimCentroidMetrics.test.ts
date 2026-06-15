import { describe, expect, it } from "vitest";
import type { BenchmarkArtifact } from "./data";
import {
    extractClaimCentroidDisplay,
    formatClaimCentroidComparison,
} from "./claimCentroidMetrics";

function makeBenchmark(
    overrides: Partial<BenchmarkArtifact["payload"]> = {},
): BenchmarkArtifact {
    return {
        kind: "benchmark",
        id: "bench_test",
        question: "Q",
        metadata: {
            createdAt: "2026-01-01T00:00:00.000Z",
            model: "gpt",
            pipelinePreset: "standard",
            fastMode: false,
        },
        payload: {
            runs: 5,
            modeCount: 5,
            modeSizes: [1, 1, 1, 1, 1],
            divergenceEntropy: 2.32,
            ...overrides,
        },
    };
}

describe("extractClaimCentroidDisplay", () => {
    it("returns hasClaimCentroid false when claim metrics are absent", () => {
        const display = extractClaimCentroidDisplay(makeBenchmark());
        expect(display.hasClaimCentroid).toBe(false);
        expect(display.modeCount).toBeNull();
    });

    it("extracts claim-centroid clustering metrics from payload", () => {
        const display = extractClaimCentroidDisplay(
            makeBenchmark({
                modeCountClaimCentroid: 4,
                modeSizesClaimCentroid: [2, 1, 1, 1],
                divergenceEntropyClaimCentroid: 1.92,
                modeCountClaimCentroidAt0_8: 1,
                modeCountClaimCentroidAt0_9: 4,
                modeCountClaimCentroidAt0_95: 5,
                stabilityClaimCentroid: {
                    pairwiseMean: 0.836,
                    minPairwiseSimilarity: 0.771,
                    maxPairwiseSimilarity: 0.888,
                },
            }),
        );

        expect(display.hasClaimCentroid).toBe(true);
        expect(display.modeCount).toBe(4);
        expect(display.divergenceEntropy).toBe(1.92);
        expect(display.stabilityPairwiseMean).toBe(0.836);
        expect(display.modeCountDelta).toBe(1);
        expect(display.thresholdCounts[0].modeCount).toBe(1);
    });
});

describe("formatClaimCentroidComparison", () => {
    it("formats side-by-side values with delta", () => {
        expect(formatClaimCentroidComparison(5, 4)).toBe(
            "5.000 vs 4.000 (+1.000)",
        );
    });
});
