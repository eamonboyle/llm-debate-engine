import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import {
    buildQuestionModelRows,
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
                critique: { issueCount: 2 },
                research: { evidenceRiskLevel: 2 },
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
                critique: { issueCount: 4 },
                research: { evidenceRiskLevel: 4 },
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
        expect(summary?.avgSolverConfidence).toBeCloseTo(0.5, 3);
        expect(summary?.avgEvidenceRisk).toBe(3);
        expect(summary?.avgSolverToRevisionDelta).toBeCloseTo(0.2, 3);
    });

    it("returns null when no indexed runs match", () => {
        expect(
            summarizeQuestionHubMetrics(sampleIndex(), "Other topic"),
        ).toBeNull();
    });
});

describe("buildQuestionModelRows", () => {
    it("groups indexed runs by model with compare link", () => {
        const index = sampleIndex();
        index.runs.push({
            id: "run_c",
            question: "Topic A",
            createdAt: "2026-01-03T00:00:00.000Z",
            model: "claude",
            pipelinePreset: "standard",
            fastMode: false,
            finalAnswerPreview: "c",
            confidence: { solver: 0.8 },
            critique: { issueCount: 1 },
            research: { evidenceRiskLevel: 1 },
        });

        const rows = buildQuestionModelRows(index, "Topic A");
        expect(rows).toHaveLength(2);
        expect(rows[0].model).toBe("gpt");
        expect(rows[0].runCount).toBe(2);
        expect(rows[0].avgIssueCount).toBe(3);
        expect(rows[1].model).toBe("claude");
        expect(rows[0].compareHref).toContain("run_b");
        expect(rows[0].compareHref).toContain("run_c");
    });
});
