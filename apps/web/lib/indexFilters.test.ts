import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import {
    applyIndexFilters,
    buildPresetCountsFromRuns,
    filterIndexRuns,
    hasActiveIndexFilters,
} from "./indexFilters";

function makeIndex(): AnalysisIndex {
    return {
        generatedAt: "2026-01-01T00:00:00.000Z",
        totals: { runs: 3, benchmarks: 1, skippedFiles: 0 },
        runs: [
            {
                id: "run_a",
                question: "Alpha question",
                createdAt: "2026-01-10T12:00:00.000Z",
                model: "gpt-alpha",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "alpha answer",
                confidence: {},
                critique: { issueCount: 1 },
            },
            {
                id: "run_b",
                question: "Beta question",
                createdAt: "2026-02-10T12:00:00.000Z",
                model: "gpt-beta",
                pipelinePreset: "standard",
                fastMode: true,
                finalAnswerPreview: "beta answer",
                confidence: {},
                critique: { issueCount: 2 },
            },
            {
                id: "run_c",
                question: "Gamma question",
                createdAt: "2026-03-10T12:00:00.000Z",
                model: "gpt-alpha",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "gamma answer",
                confidence: {},
                critique: { issueCount: 0 },
            },
        ],
        benchmarks: [
            {
                id: "bench_1",
                question: "Alpha question",
                createdAt: "2026-01-15T12:00:00.000Z",
                model: "gpt-alpha",
                pipelinePreset: "research_deep",
                fastMode: false,
                runs: 2,
                modeCount: 1,
                modeSizes: [2],
                divergenceEntropy: 0.2,
                modeLabels: [],
            },
        ],
        aggregates: {
            issueTypeCounts: {},
            confidenceDrift: {
                solverToRevisionMean: 0,
                revisionToSynthesizerMean: 0,
                calibratedMinusSynthMean: 0,
            },
            presets: { research_deep: 1, standard: 2 },
            critiqueVsConfidence: [],
            outlierRuns: [
                {
                    benchmarkId: "bench_1",
                    runId: "run_a",
                    avgSimilarity: 0.4,
                    zScore: -1.2,
                },
                {
                    benchmarkId: "bench_1",
                    runId: "run_b",
                    avgSimilarity: 0.8,
                    zScore: 0.1,
                },
            ],
        },
        skipped: [],
    };
}

describe("indexFilters", () => {
    it("filters runs by model, preset, and fast mode", () => {
        const index = makeIndex();
        const filtered = filterIndexRuns(index.runs, {
            model: "alpha",
            preset: "standard",
            fast: "false",
        });
        expect(filtered.map((run) => run.id)).toEqual(["run_c"]);
    });

    it("filters runs by date range", () => {
        const index = makeIndex();
        const filtered = filterIndexRuns(index.runs, {
            from: "2026-02-01T00:00:00",
            to: "2026-02-28T23:59:59",
        });
        expect(filtered.map((run) => run.id)).toEqual(["run_b"]);
    });

    it("applies filters to outliers and totals", () => {
        const index = makeIndex();
        const filtered = applyIndexFilters(index, { model: "alpha" });
        expect(filtered.totals.runs).toBe(2);
        expect(
            filtered.aggregates.outlierRuns?.map((row) => row.runId),
        ).toEqual(["run_a"]);
    });

    it("detects active filters", () => {
        expect(hasActiveIndexFilters({})).toBe(false);
        expect(hasActiveIndexFilters({ q: "alpha" })).toBe(true);
        expect(hasActiveIndexFilters({ fast: "true" })).toBe(true);
    });

    it("builds preset counts from filtered runs", () => {
        const index = makeIndex();
        const counts = buildPresetCountsFromRuns(
            filterIndexRuns(index.runs, { model: "alpha" }),
        );
        expect(counts).toEqual({ research_deep: 1, standard: 1 });
    });
});
