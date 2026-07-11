import { describe, expect, it } from "vitest";
import { filterPairSummaries } from "./pairsExplorer";
import type { BenchmarkPairSummaryRow } from "./pairsExplorer";

function makeSummary(
    overrides: Partial<BenchmarkPairSummaryRow> = {},
): BenchmarkPairSummaryRow {
    return {
        benchmarkId: "bench_a",
        question: "What is policy X?",
        model: "gpt-test",
        pipelinePreset: "standard",
        fastMode: false,
        createdAt: "2025-06-15T12:00:00.000Z",
        runCount: 3,
        pairCount: 2,
        minSimilarity: 0.7,
        maxSimilarity: 0.9,
        avgSimilarity: 0.8,
        ...overrides,
    };
}

describe("filterPairSummaries", () => {
    const rows = [
        makeSummary(),
        makeSummary({
            benchmarkId: "bench_b",
            question: "Climate impact study",
            model: "claude-test",
            pipelinePreset: "research_deep",
            fastMode: true,
            createdAt: "2025-07-01T12:00:00.000Z",
        }),
    ];

    it("filters by question text", () => {
        const filtered = filterPairSummaries(rows, { q: "climate" });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].benchmarkId).toBe("bench_b");
    });

    it("filters by model and preset", () => {
        expect(filterPairSummaries(rows, { model: "claude" })).toHaveLength(1);
        expect(filterPairSummaries(rows, { preset: "standard" })).toHaveLength(
            1,
        );
    });

    it("filters by fast mode and date range", () => {
        expect(filterPairSummaries(rows, { fast: "true" })).toHaveLength(1);
        expect(
            filterPairSummaries(rows, { from: "2025-06-20T00:00:00" }),
        ).toHaveLength(1);
        expect(
            filterPairSummaries(rows, { to: "2025-06-20T00:00:00" }),
        ).toHaveLength(1);
    });
});
