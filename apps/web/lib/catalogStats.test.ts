import { describe, expect, it } from "vitest";
import { buildCatalogStats, filterCatalogStats } from "./catalogStats";
import type { BenchmarkArtifact, RunArtifact } from "./data";

function makeRun(model: string, preset: string): RunArtifact {
    return {
        kind: "run",
        id: `run-${model}-${preset}`,
        question: "Q",
        metadata: {
            createdAt: "2025-01-01T00:00:00.000Z",
            model,
            pipelinePreset: preset,
            fastMode: false,
        },
        run: { id: "r", finalAnswer: "A", steps: [], metrics: {} },
    };
}

function makeBenchmark(model: string, preset: string): BenchmarkArtifact {
    return {
        kind: "benchmark",
        id: `bench-${model}-${preset}`,
        question: "Q",
        metadata: {
            createdAt: "2025-01-01T00:00:00.000Z",
            model,
            pipelinePreset: preset,
            fastMode: false,
        },
        payload: {
            runs: 2,
            modeCount: 1,
            modeSizes: [2],
            divergenceEntropy: 0,
        },
    };
}

describe("buildCatalogStats", () => {
    it("aggregates counts by model, preset, and combo", () => {
        const stats = buildCatalogStats(
            [
                makeRun("gpt-a", "standard"),
                makeRun("gpt-a", "research_deep"),
                makeRun("gpt-b", "standard"),
            ],
            [makeBenchmark("gpt-a", "standard")],
        );

        expect(stats.totals).toEqual({
            runs: 3,
            benchmarks: 1,
            uniqueModels: 2,
            uniquePresets: 2,
        });

        const modelA = stats.models.find((row) => row.model === "gpt-a");
        expect(modelA).toMatchObject({
            runCount: 2,
            benchmarkCount: 1,
            total: 3,
        });

        const standard = stats.presets.find((row) => row.preset === "standard");
        expect(standard).toMatchObject({
            runCount: 2,
            benchmarkCount: 1,
            total: 3,
        });

        const combo = stats.combos.find(
            (row) => row.model === "gpt-a" && row.preset === "standard",
        );
        expect(combo).toMatchObject({
            runCount: 1,
            benchmarkCount: 1,
            total: 2,
        });
    });

    it("filters catalog rows by search query", () => {
        const stats = buildCatalogStats(
            [
                makeRun("gpt-a", "standard"),
                makeRun("gpt-b", "research_deep"),
            ],
            [makeBenchmark("gpt-a", "standard")],
        );

        const filtered = filterCatalogStats(stats, "gpt-a");
        expect(filtered.models.map((row) => row.model)).toEqual(["gpt-a"]);
        expect(filtered.presets).toHaveLength(0);
        expect(filtered.combos).toHaveLength(1);

        const presetFiltered = filterCatalogStats(stats, "research");
        expect(presetFiltered.models).toHaveLength(0);
        expect(presetFiltered.presets.map((row) => row.preset)).toEqual([
            "research_deep",
        ]);
        expect(presetFiltered.combos).toHaveLength(1);
    });
});
