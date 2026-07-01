import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import {
    buildQuestionHubRunRows,
    summarizeQuestionHubMetrics,
} from "./questionHubMetrics";

function sampleIndex(): AnalysisIndex {
    return {
        generatedAt: "2026-01-01T00:00:00.000Z",
        totals: { runs: 2, benchmarks: 0, skippedFiles: 0 },
        runs: [
            {
                id: "run_a",
                question: "Topic A",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "a",
                confidence: {
                    solver: 0.4,
                    solverToRevisionDelta: 0.1,
                },
                critique: { issueCount: 2, avgSeverity: 2.5 },
                research: { evidenceRiskLevel: 2 },
                quality: { coherence: 4, factualRisk: 2 },
            },
            {
                id: "run_b",
                question: "Topic A",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "b",
                confidence: {
                    solver: 0.6,
                    solverToRevisionDelta: 0.3,
                },
                critique: { issueCount: 4, avgSeverity: 3.5 },
                research: { evidenceRiskLevel: 4 },
                quality: { coherence: 2, factualRisk: 4 },
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
            presets: {},
            critiqueVsConfidence: [],
        },
        skipped: [],
    };
}

describe("summarizeQuestionHubMetrics", () => {
    it("averages indexed metrics for a question", () => {
        const summary = summarizeQuestionHubMetrics(sampleIndex(), "Topic A");
        expect(summary).not.toBeNull();
        expect(summary?.indexedRunCount).toBe(2);
        expect(summary?.avgIssueCount).toBe(3);
        expect(summary?.avgSeverity).toBe(3);
        expect(summary?.avgSolverConfidence).toBeCloseTo(0.5, 3);
        expect(summary?.avgEvidenceRisk).toBe(3);
        expect(summary?.avgSolverToRevisionDelta).toBeCloseTo(0.2, 3);
        expect(summary?.runsWithQualityScores).toBe(2);
        expect(summary?.avgCoherence).toBe(3);
        expect(summary?.avgFactualRisk).toBe(3);
    });

    it("returns null when no indexed runs match", () => {
        expect(
            summarizeQuestionHubMetrics(sampleIndex(), "Other topic"),
        ).toBeNull();
    });

    it("builds indexed run rows for filtered ids", () => {
        const rows = buildQuestionHubRunRows(sampleIndex(), "Topic A", [
            "run_a",
            "missing",
        ]);
        expect(rows.get("run_a")).toMatchObject({
            issueCount: 2,
            avgSeverity: 2.5,
            coherence: 4,
        });
        expect(rows.has("missing")).toBe(false);
    });
});
