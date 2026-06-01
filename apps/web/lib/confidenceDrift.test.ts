import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import {
    buildConfidenceDriftRows,
    summarizeConfidenceDrift,
} from "./confidenceDrift";

function makeIndex(): AnalysisIndex {
    return {
        generatedAt: "2026-01-01T00:00:00.000Z",
        totals: { runs: 2, benchmarks: 0, skippedFiles: 0 },
        runs: [
            {
                id: "run-low",
                question: "Q",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "m",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "a",
                confidence: {
                    solverToRevisionDelta: -0.1,
                    revisionToSynthesizerDelta: 0.05,
                },
                critique: { issueCount: 0, maxSeverity: 2 },
            },
            {
                id: "run-high",
                question: "Q",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "m",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "b",
                confidence: {
                    solverToRevisionDelta: -0.5,
                    revisionToSynthesizerDelta: 0.4,
                },
                critique: { issueCount: 0, maxSeverity: 5 },
            },
        ],
        benchmarks: [],
        aggregates: {
            issueTypeCounts: {},
            confidenceDrift: {
                solverToRevisionMean: -0.3,
                revisionToSynthesizerMean: 0.2,
                calibratedMinusSynthMean: 0,
            },
            confidenceCorrelation: {
                severityVsSolverToRevisionDelta: 0.5,
                severityVsRevisionToSynthesizerDelta: 0.1,
            },
            presets: {},
            critiqueVsConfidence: [
                {
                    runId: "run-low",
                    maxSeverity: 2,
                    solverToRevisionDelta: -0.1,
                },
            ],
        },
        skipped: [],
    };
}

describe("confidenceDrift", () => {
    it("sorts runs by combined drift magnitude", () => {
        const rows = buildConfidenceDriftRows(makeIndex());
        expect(rows[0]?.runId).toBe("run-high");
        expect(rows[0]?.driftMagnitude).toBeCloseTo(0.9, 5);
    });

    it("summarizes aggregate drift stats", () => {
        const summary = summarizeConfidenceDrift(makeIndex());
        expect(summary.runCount).toBe(2);
        expect(summary.solverToRevisionMean).toBe(-0.3);
        expect(summary.severityVsSolverToRevision).toBe(0.5);
    });
});
