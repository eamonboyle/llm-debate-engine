import { describe, expect, it } from "vitest";
import type { BenchmarkArtifact } from "./data";
import { buildBenchmarkCompareSuggestions } from "./benchmarkCompareSuggestions";

function makeBenchmark(
    id: string,
    question: string,
    model = "gpt-test",
    createdAt = "2026-01-01T00:00:00.000Z",
): BenchmarkArtifact {
    return {
        kind: "benchmark",
        id,
        question,
        metadata: {
            createdAt,
            model,
            pipelinePreset: "standard",
            fastMode: false,
        },
        payload: {
            runs: 3,
            modeCount: 2,
            modeSizes: [2, 1],
            divergenceEntropy: 0.5,
        },
    };
}

describe("benchmarkCompareSuggestions", () => {
    const benchmarks = [
        makeBenchmark(
            "bench_a",
            "Question A",
            "gpt-a",
            "2026-01-03T00:00:00.000Z",
        ),
        makeBenchmark(
            "bench_b",
            "Question A",
            "gpt-b",
            "2026-01-02T00:00:00.000Z",
        ),
        makeBenchmark(
            "bench_c",
            "Question B",
            "gpt-a",
            "2026-01-01T00:00:00.000Z",
        ),
    ];

    it("suggests same-question benchmarks when only left is selected", () => {
        const suggestions = buildBenchmarkCompareSuggestions(benchmarks, {
            left: "bench_a",
        });
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].id).toBe("bench_b");
        expect(suggestions[0].href).toContain("left=bench_a");
        expect(suggestions[0].href).toContain("right=bench_b");
        expect(suggestions[0].reason).toBe("Same research question");
    });

    it("suggests same-question benchmarks when only right is selected", () => {
        const suggestions = buildBenchmarkCompareSuggestions(benchmarks, {
            right: "bench_b",
        });
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].id).toBe("bench_a");
        expect(suggestions[0].href).toContain("left=bench_a");
        expect(suggestions[0].href).toContain("right=bench_b");
    });

    it("returns empty when both sides are selected", () => {
        expect(
            buildBenchmarkCompareSuggestions(benchmarks, {
                left: "bench_a",
                right: "bench_b",
            }),
        ).toEqual([]);
    });
});
