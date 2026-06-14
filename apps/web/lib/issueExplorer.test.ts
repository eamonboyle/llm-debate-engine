import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import { buildIssueTypeSummaries, listRunsForIssueType } from "./issueExplorer";

function makeIndex(): AnalysisIndex {
    return {
        generatedAt: new Date().toISOString(),
        totals: { runs: 2, benchmarks: 0, skippedFiles: 0 },
        runs: [
            {
                id: "run_a",
                question: "Q1",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "A",
                confidence: {},
                critique: {
                    issueCount: 3,
                    maxSeverity: 5,
                    byType: { factual: 2, logic: 1 },
                },
            },
            {
                id: "run_b",
                question: "Q2",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "B",
                confidence: {},
                critique: {
                    issueCount: 1,
                    maxSeverity: 4,
                    byType: { factual: 1 },
                },
            },
        ],
        benchmarks: [],
        aggregates: {
            issueTypeCounts: { factual: 3, logic: 1 },
            issueSeverityByType: [
                { type: "factual", count: 3, avgSeverity: 3.5, maxSeverity: 5 },
                { type: "logic", count: 1, avgSeverity: 2, maxSeverity: 2 },
            ],
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
}

describe("issueExplorer", () => {
    it("summarizes issue types with run coverage", () => {
        const summaries = buildIssueTypeSummaries(makeIndex(), {
            useIndexedSeverity: true,
        });
        expect(summaries[0]).toEqual({
            type: "factual",
            totalCount: 3,
            runCount: 2,
            avgSeverity: 3.5,
            maxSeverity: 5,
        });
    });

    it("falls back to run max severity when indexed severity is disabled", () => {
        const summaries = buildIssueTypeSummaries(makeIndex());
        expect(summaries[0]?.avgSeverity).toBe(4.5);
    });

    it("lists runs for a selected issue type", () => {
        const rows = listRunsForIssueType(makeIndex(), "factual");
        expect(rows).toHaveLength(2);
        expect(rows[0]?.runId).toBe("run_a");
        expect(rows[0]?.countForType).toBe(2);
    });
});
