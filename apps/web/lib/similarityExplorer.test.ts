import { describe, expect, it } from "vitest";
import type { AnalysisIndex, BenchmarkPairsExport } from "./data";
import {
    buildBenchmarkSimilaritySummaries,
    collectGlobalLowSimilarityPairs,
} from "./similarityExplorer";

const index = {
    benchmarks: [
        {
            id: "benchmark_a",
            question: "Question A",
            model: "gpt-test",
            pipelinePreset: "standard",
            createdAt: "2026-01-01T00:00:00.000Z",
        },
    ],
} as AnalysisIndex;

const pairsExport: BenchmarkPairsExport = {
    generatedAt: "2026-01-01T00:00:00.000Z",
    pairwise: [
        {
            benchmarkId: "benchmark_a",
            runIds: ["run_1", "run_2", "run_3"],
            pairs: [
                { i: 0, j: 1, similarity: 0.55 },
                { i: 0, j: 2, similarity: 0.9 },
                { i: 1, j: 2, similarity: 0.8 },
            ],
        },
    ],
};

describe("similarityExplorer", () => {
    it("summarizes benchmark pairwise stability", () => {
        const rows = buildBenchmarkSimilaritySummaries(index, pairsExport);
        expect(rows).toHaveLength(1);
        expect(rows[0].benchmarkId).toBe("benchmark_a");
        expect(rows[0].question).toBe("Question A");
        expect(rows[0].runCount).toBe(3);
        expect(rows[0].pairCount).toBe(3);
        expect(rows[0].minPairSimilarity).toBeCloseTo(0.55);
        expect(rows[0].minPairRunIds).toEqual(["run_1", "run_2"]);
        expect(rows[0].compareHref).toBe(
            "/runs/compare?left=run_1&right=run_2",
        );
    });

    it("collects globally lowest similarity pairs", () => {
        const rows = collectGlobalLowSimilarityPairs(pairsExport, 2);
        expect(rows).toHaveLength(2);
        expect(rows[0].similarity).toBeCloseTo(0.55);
        expect(rows[0].runIdI).toBe("run_1");
        expect(rows[0].runIdJ).toBe("run_2");
    });
});
