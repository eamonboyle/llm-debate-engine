import { describe, expect, it } from "vitest";
import type { CatalogStats } from "./catalogStats";
import { buildCatalogGaps, filterCatalogGaps } from "./catalogGaps";

function sampleStats(): CatalogStats {
    return {
        models: [
            { model: "gpt-a", runCount: 2, benchmarkCount: 0, total: 2 },
            { model: "gpt-b", runCount: 1, benchmarkCount: 0, total: 1 },
        ],
        presets: [
            { preset: "standard", runCount: 2, benchmarkCount: 0, total: 2 },
            {
                preset: "research_deep",
                runCount: 1,
                benchmarkCount: 0,
                total: 1,
            },
        ],
        combos: [
            {
                model: "gpt-a",
                preset: "standard",
                runCount: 2,
                benchmarkCount: 0,
                total: 2,
            },
        ],
        totals: {
            runs: 3,
            benchmarks: 0,
            uniqueModels: 2,
            uniquePresets: 2,
        },
    };
}

describe("catalogGaps", () => {
    it("lists untested model x preset combinations", () => {
        const summary = buildCatalogGaps(sampleStats());
        expect(summary.possibleCount).toBe(4);
        expect(summary.coveredCount).toBe(1);
        expect(summary.coveragePercent).toBe(25);
        expect(summary.gaps).toEqual([
            { model: "gpt-a", preset: "research_deep" },
            { model: "gpt-b", preset: "research_deep" },
            { model: "gpt-b", preset: "standard" },
        ]);
    });

    it("returns empty gaps when every combination is covered", () => {
        const stats = sampleStats();
        stats.combos.push(
            {
                model: "gpt-a",
                preset: "research_deep",
                runCount: 0,
                benchmarkCount: 0,
                total: 0,
            },
            {
                model: "gpt-b",
                preset: "standard",
                runCount: 0,
                benchmarkCount: 0,
                total: 0,
            },
            {
                model: "gpt-b",
                preset: "research_deep",
                runCount: 0,
                benchmarkCount: 0,
                total: 0,
            },
        );
        const summary = buildCatalogGaps(stats);
        expect(summary.gaps).toEqual([]);
        expect(summary.coveragePercent).toBe(100);
    });

    it("filters gaps by search query", () => {
        const summary = buildCatalogGaps(sampleStats());
        const filtered = filterCatalogGaps(summary, "gpt-b");
        expect(filtered).toEqual([
            { model: "gpt-b", preset: "research_deep" },
            { model: "gpt-b", preset: "standard" },
        ]);
    });
});
