import { describe, expect, it } from "vitest";
import type { BenchmarkArtifact } from "./data";
import { extractBenchmarkSummaryDisplay } from "./benchmarkSummaryMetrics";

function makeBenchmark(
    summary: BenchmarkArtifact["payload"]["summary"],
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
            modeCount: 2,
            modeSizes: [3, 2],
            divergenceEntropy: 0.9,
            summary,
        },
    };
}

describe("extractBenchmarkSummaryDisplay", () => {
    it("returns null metrics when summary is missing", () => {
        const display = extractBenchmarkSummaryDisplay(
            makeBenchmark(undefined),
        );
        expect(display.hasAny).toBe(false);
        expect(display.consensusMean).toBeNull();
        expect(display.stabilityMean).toBeNull();
    });

    it("extracts consensus, critique, and stability aggregates", () => {
        const display = extractBenchmarkSummaryDisplay(
            makeBenchmark({
                consensus: { mean: 0.875, stddev: 0.024 },
                critiqueMaxSeverity: { mean: 4.8, stddev: 0.447 },
                stability: {
                    pairwiseMean: 0.788,
                    pairwiseStddev: 0.05,
                    minPairwiseSimilarity: 0.698,
                    maxPairwiseSimilarity: 0.874,
                },
            }),
        );

        expect(display.hasAny).toBe(true);
        expect(display.consensusMean).toBe(0.875);
        expect(display.critiqueMean).toBe(4.8);
        expect(display.stabilityMin).toBe(0.698);
        expect(display.stabilityMax).toBe(0.874);
    });
});
