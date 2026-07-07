import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import { buildOutlierExplorerRows } from "./outlierExplorer";

const sampleIndex: AnalysisIndex = {
    generatedAt: "2026-01-01T00:00:00.000Z",
    totals: { runs: 2, benchmarks: 1, skippedFiles: 0 },
    runs: [],
    benchmarks: [],
    aggregates: {
        issueTypeCounts: {},
        confidenceDrift: {
            solverToRevisionMean: 0,
            revisionToSynthesizerMean: 0,
            calibratedMinusSynthMean: 0,
        },
        presets: {},
        critiqueVsConfidence: [],
        outlierRuns: [
            {
                benchmarkId: "bench_1",
                runId: "run_outlier",
                avgSimilarity: 0.42,
                zScore: -1.8,
            },
            {
                benchmarkId: "bench_1",
                runId: "run_peer",
                avgSimilarity: 0.91,
                zScore: 0.2,
            },
        ],
    },
    skipped: [],
};

describe("buildOutlierExplorerRows", () => {
    it("sorts outliers by ascending avg similarity", async () => {
        const rows = await buildOutlierExplorerRows(sampleIndex);
        expect(rows.map((row) => row.runId)).toEqual([
            "run_outlier",
            "run_peer",
        ]);
        expect(rows[0].avgSimilarity).toBe(0.42);
    });

    it("returns null peer when pairwise data is unavailable", async () => {
        const rows = await buildOutlierExplorerRows(sampleIndex);
        expect(rows[0].peerRunId).toBeNull();
        expect(rows[0].peerCompareHref).toBeNull();
    });

    it("filters outliers to a single benchmark when requested", async () => {
        const index: AnalysisIndex = {
            ...sampleIndex,
            aggregates: {
                ...sampleIndex.aggregates,
                outlierRuns: [
                    {
                        benchmarkId: "bench_1",
                        runId: "run_outlier",
                        avgSimilarity: 0.42,
                        zScore: -1.8,
                    },
                    {
                        benchmarkId: "bench_2",
                        runId: "run_other",
                        avgSimilarity: 0.5,
                        zScore: -1.2,
                    },
                ],
            },
        };
        const rows = await buildOutlierExplorerRows(index, {
            benchmarkId: "bench_1",
        });
        expect(rows).toHaveLength(1);
        expect(rows[0]?.runId).toBe("run_outlier");
    });
});
