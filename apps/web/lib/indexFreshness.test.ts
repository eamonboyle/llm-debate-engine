import { describe, expect, it } from "vitest";
import { computeIndexFreshness } from "./indexFreshness";
import type { AnalysisIndex, DataStatus } from "./data";

const baseStatus: DataStatus = {
    runsDirLabel: "runs/",
    hasAnalysisIndex: true,
    hasAnalysisBundle: false,
    hasAnalysisReport: false,
    hasAnalysisRunsCsv: false,
    hasAnalysisBenchmarksCsv: false,
    hasBenchmarkPairs: false,
    analysisGeneratedAt: "2026-01-01T00:00:00.000Z",
    artifactCounts: { runs: 5, benchmarks: 2 },
    indexTotals: { runs: 5, benchmarks: 2, skippedFiles: 0 },
    skippedCount: 0,
};

const baseIndex: AnalysisIndex = {
    generatedAt: "2026-01-01T00:00:00.000Z",
    totals: { runs: 5, benchmarks: 2, skippedFiles: 0 },
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
    },
    skipped: [],
};

describe("computeIndexFreshness", () => {
    it("marks missing index as stale when artifacts exist", () => {
        const freshness = computeIndexFreshness(
            { ...baseStatus, hasAnalysisIndex: false, indexTotals: null },
            null,
        );
        expect(freshness.stale).toBe(true);
        expect(freshness.missingIndex).toBe(true);
    });

    it("marks index stale when artifact counts exceed indexed totals", () => {
        const freshness = computeIndexFreshness(
            {
                ...baseStatus,
                artifactCounts: { runs: 8, benchmarks: 3 },
            },
            baseIndex,
        );
        expect(freshness.stale).toBe(true);
        expect(freshness.runsBehind).toBe(3);
        expect(freshness.benchmarksBehind).toBe(1);
    });

    it("marks index fresh when counts match", () => {
        const freshness = computeIndexFreshness(baseStatus, baseIndex);
        expect(freshness.stale).toBe(false);
        expect(freshness.runsBehind).toBe(0);
    });
});
