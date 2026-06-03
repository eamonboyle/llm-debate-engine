import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import {
    buildEvidenceRiskSummaries,
    listRunsForEvidenceRisk,
    summarizeEvidencePlanning,
} from "./evidenceExplorer";

function sampleIndex(): AnalysisIndex {
    return {
        generatedAt: "2026-01-01T00:00:00.000Z",
        totals: { runs: 2, benchmarks: 0, skippedFiles: 0 },
        runs: [
            {
                id: "run-a",
                question: "Q1",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "m1",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "a",
                confidence: {},
                critique: { issueCount: 1 },
                research: { evidenceRiskLevel: 4 },
            },
            {
                id: "run-b",
                question: "Q2",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "m1",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "b",
                confidence: {},
                critique: { issueCount: 1 },
                research: { evidenceRiskLevel: 2 },
            },
        ],
        benchmarks: [],
        aggregates: {
            issueTypeCounts: {},
            confidenceDrift: {
                solverToRevisionMean: 0,
                revisionToSynthesizerMean: 0,
                calibratedMinusSynthMean: 0,
            },
            evidencePlanning: {
                riskLevelMean: 3,
                riskLevelDistribution: { "2": 1, "4": 1 },
            },
            presets: {},
            critiqueVsConfidence: [],
        },
        skipped: [],
    };
}

describe("evidenceExplorer", () => {
    it("builds risk level summaries", () => {
        const summaries = buildEvidenceRiskSummaries(sampleIndex());
        expect(summaries).toEqual([
            { riskLevel: 2, runCount: 1 },
            { riskLevel: 4, runCount: 1 },
        ]);
    });

    it("lists runs for a risk level", () => {
        const rows = listRunsForEvidenceRisk(sampleIndex(), 4);
        expect(rows).toHaveLength(1);
        expect(rows[0].runId).toBe("run-a");
    });

    it("summarizes evidence planning aggregates", () => {
        const summary = summarizeEvidencePlanning(sampleIndex());
        expect(summary.runCountWithRisk).toBe(2);
        expect(summary.highRiskCount).toBe(1);
        expect(summary.riskLevelMean).toBe(3);
    });
});
