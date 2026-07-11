import { describe, expect, it } from "vitest";
import { buildQualityTrendSeries } from "./qualityTrends";
import type { QualityRunRow } from "./qualityInsights";

describe("buildQualityTrendSeries", () => {
    it("returns chronologically sorted runs with rubric scores", () => {
        const rows: QualityRunRow[] = [
            {
                id: "run_b",
                question: "Q",
                model: "gpt-test",
                preset: "research_deep",
                createdAt: "2025-06-20T00:00:00.000Z",
                coherence: 4,
                completeness: null,
                factualRisk: 2,
                uncertaintyHandling: null,
                issueCount: 1,
                traceHref: "/runs/run_b",
            },
            {
                id: "run_a",
                question: "Q",
                model: "gpt-test",
                preset: "research_deep",
                createdAt: "2025-06-10T00:00:00.000Z",
                coherence: 3,
                completeness: 4,
                factualRisk: null,
                uncertaintyHandling: 3,
                issueCount: 0,
                traceHref: "/runs/run_a",
            },
            {
                id: "run_c",
                question: "Q",
                model: "gpt-test",
                preset: "standard",
                createdAt: "2025-06-30T00:00:00.000Z",
                coherence: null,
                completeness: null,
                factualRisk: null,
                uncertaintyHandling: null,
                issueCount: 0,
                traceHref: "/runs/run_c",
            },
        ];

        const series = buildQualityTrendSeries(rows);
        expect(series).toHaveLength(2);
        expect(series[0].label).toContain("run_a");
        expect(series[1].label).toContain("run_b");
        expect(series[1].coherence).toBe(4);
    });
});
