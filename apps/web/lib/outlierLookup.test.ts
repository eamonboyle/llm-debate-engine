import { describe, expect, it, vi } from "vitest";
import type { AnalysisIndex } from "./data";
import { buildRunOutlierContext } from "./outlierLookup";

vi.mock("./data", async (importOriginal) => {
    const actual = await importOriginal<typeof import("./data")>();
    return {
        ...actual,
        loadBenchmarkPairsById: vi.fn(async () => ({
            runIds: ["run_a", "run_outlier", "run_peer"],
            pairs: [
                { i: 0, j: 1, similarity: 0.2 },
                { i: 1, j: 2, similarity: 0.9 },
                { i: 0, j: 2, similarity: 0.5 },
            ],
        })),
    };
});

function sampleIndex(): AnalysisIndex {
    return {
        generatedAt: "2026-01-01T00:00:00.000Z",
        totals: { runs: 1, benchmarks: 1, skippedFiles: 0 },
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
                    avgSimilarity: 0.31,
                    zScore: -2.1,
                },
            ],
        },
        skipped: [],
    };
}

describe("buildRunOutlierContext", () => {
    it("returns null when index is missing", async () => {
        expect(await buildRunOutlierContext(null, "run_outlier")).toBeNull();
    });

    it("returns null when run is not an outlier", async () => {
        expect(
            await buildRunOutlierContext(sampleIndex(), "run_other"),
        ).toBeNull();
    });

    it("builds benchmark links and peer compare href", async () => {
        const context = await buildRunOutlierContext(
            sampleIndex(),
            "run_outlier",
        );
        expect(context?.entries).toHaveLength(1);
        expect(context?.entries[0]).toMatchObject({
            benchmarkId: "bench_1",
            avgSimilarity: 0.31,
            zScore: -2.1,
            peerRunId: "run_peer",
            peerCompareHref: "/runs/compare?left=run_outlier&right=run_peer",
            benchmarkHref: "/benchmarks/bench_1",
        });
    });
});
