import { describe, expect, it } from "vitest";
import {
    buildBenchmarkPairDetails,
    buildBenchmarkPairSummaries,
} from "./pairsExplorer";
import type { BenchmarkArtifact } from "./data";

function makeBenchmark(
    id: string,
    pairs: Array<{ i: number; j: number; similarity: number }>,
    runIds: string[],
): BenchmarkArtifact {
    return {
        kind: "benchmark",
        id,
        question: `Question for ${id}`,
        metadata: {
            createdAt: "2025-01-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "standard",
            fastMode: false,
        },
        payload: {
            runs: runIds.length,
            modeCount: 2,
            modeSizes: [runIds.length],
            divergenceEntropy: 0.5,
            runIds,
            summary: {
                stability: {
                    pairwiseMean: 0.8,
                    pairs,
                },
            },
        },
    };
}

describe("pairs explorer helpers", () => {
    it("summarizes pairwise stats from benchmark artifacts", async () => {
        const benchmarks = [
            makeBenchmark(
                "bench_a",
                [
                    { i: 0, j: 1, similarity: 0.7 },
                    { i: 0, j: 2, similarity: 0.9 },
                ],
                ["run_a", "run_b", "run_c"],
            ),
        ];

        const rows = await buildBenchmarkPairSummaries(benchmarks);
        expect(rows).toHaveLength(1);
        expect(rows[0].pairCount).toBe(2);
        expect(rows[0].minSimilarity).toBeCloseTo(0.7, 3);
        expect(rows[0].avgSimilarity).toBeCloseTo(0.8, 3);
    });

    it("builds sorted pair details with compare links", async () => {
        const benchmarks = [
            makeBenchmark(
                "bench_a",
                [
                    { i: 0, j: 1, similarity: 0.95 },
                    { i: 0, j: 2, similarity: 0.6 },
                ],
                ["run_a", "run_b", "run_c"],
            ),
        ];

        const { summary, pairs } = await buildBenchmarkPairDetails(
            "bench_a",
            benchmarks,
        );
        expect(summary?.pairCount).toBe(2);
        expect(pairs[0].similarity).toBeCloseTo(0.6, 3);
        expect(pairs[0].compareHref).toBe(
            "/runs/compare?left=run_a&right=run_c",
        );
    });
});
