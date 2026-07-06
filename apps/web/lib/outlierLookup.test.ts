import { describe, expect, it, vi } from "vitest";
import type { AnalysisIndex } from "./data";
import {
    buildOutlierRunIdSet,
    buildBenchmarkOutlierLookup,
    buildRunOutlierContext,
    findRunOutlierEntry,
    listOutliersForBenchmark,
} from "./outlierLookup";

vi.mock("./data", async (importOriginal) => {
    const actual = await importOriginal<typeof import("./data")>();
    return {
        ...actual,
        loadBenchmarkPairsById: vi.fn(async () => ({
            runIds: ["run_outlier", "run_b"],
            pairs: [{ i: 0, j: 1, similarity: 0.92 }],
            source: "artifact" as const,
        })),
    };
});

function sampleIndex(): AnalysisIndex {
    return {
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
                    zScore: -2.1,
                },
                {
                    benchmarkId: "bench_2",
                    runId: "run_other",
                    avgSimilarity: 0.5,
                    zScore: -1.8,
                },
            ],
        },
        skipped: [],
    };
}

describe("outlierLookup", () => {
    it("finds outlier entry for a run id", () => {
        const entry = findRunOutlierEntry(sampleIndex(), "run_outlier");
        expect(entry?.benchmarkId).toBe("bench_1");
        expect(entry?.avgSimilarity).toBe(0.42);
    });

    it("returns null when run is not an outlier", () => {
        expect(findRunOutlierEntry(sampleIndex(), "run_normal")).toBeNull();
        expect(findRunOutlierEntry(null, "run_outlier")).toBeNull();
    });

    it("builds a set of outlier run ids", () => {
        const ids = buildOutlierRunIdSet(sampleIndex());
        expect(ids.has("run_outlier")).toBe(true);
        expect(ids.has("run_normal")).toBe(false);
    });

    it("builds compare context with peer run", async () => {
        const context = await buildRunOutlierContext(
            sampleIndex(),
            "run_outlier",
        );
        expect(context).toEqual({
            benchmarkId: "bench_1",
            avgSimilarity: 0.42,
            zScore: -2.1,
            peerRunId: "run_b",
            peerCompareHref: "/runs/compare?left=run_outlier&right=run_b",
        });
    });

    it("lists outliers for a benchmark", () => {
        const rows = listOutliersForBenchmark(sampleIndex(), "bench_1");
        expect(rows).toEqual([
            {
                runId: "run_outlier",
                avgSimilarity: 0.42,
                zScore: -2.1,
            },
        ]);
    });

    it("builds a benchmark outlier lookup map", () => {
        const lookup = buildBenchmarkOutlierLookup(sampleIndex(), "bench_1");
        expect(lookup.get("run_outlier")?.zScore).toBe(-2.1);
        expect(lookup.has("run_other")).toBe(false);
    });
});
