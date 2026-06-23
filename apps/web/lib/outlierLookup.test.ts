import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import { findOutlierForRun } from "./outlierLookup";

function sampleIndex(): AnalysisIndex {
    return {
        generatedAt: new Date().toISOString(),
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
                    avgSimilarity: 0.42,
                    zScore: -2.1,
                },
            ],
        },
        skipped: [],
    };
}

describe("findOutlierForRun", () => {
    it("returns outlier entry when run is flagged", () => {
        const entry = findOutlierForRun(sampleIndex(), "run_outlier");
        expect(entry).toEqual({
            benchmarkId: "bench_1",
            runId: "run_outlier",
            avgSimilarity: 0.42,
            zScore: -2.1,
        });
    });

    it("returns null when run is not an outlier", () => {
        expect(findOutlierForRun(sampleIndex(), "run_normal")).toBeNull();
    });
});
