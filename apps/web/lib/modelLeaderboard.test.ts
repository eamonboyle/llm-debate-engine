import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import { buildModelLeaderboard } from "./modelLeaderboard";

function makeIndex(runs: AnalysisIndex["runs"]): AnalysisIndex {
    return {
        generatedAt: new Date().toISOString(),
        totals: { runs: runs.length, benchmarks: 0, skippedFiles: 0 },
        runs,
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

describe("buildModelLeaderboard", () => {
    it("aggregates metrics per model and sorts by run count", () => {
        const index = makeIndex([
            {
                id: "run_a",
                question: "Q1",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "gpt-a",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "A",
                confidence: {
                    solver: 0.8,
                    solverToRevisionDelta: -0.2,
                },
                critique: { issueCount: 10, maxSeverity: 4 },
                research: { evidenceRiskLevel: 3 },
            },
            {
                id: "run_b",
                question: "Q2",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "gpt-b",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "B",
                confidence: {
                    solver: 0.6,
                    solverToRevisionDelta: -0.4,
                },
                critique: { issueCount: 4, maxSeverity: 2 },
                research: { evidenceRiskLevel: 2 },
            },
            {
                id: "run_c",
                question: "Q3",
                createdAt: "2026-01-03T00:00:00.000Z",
                model: "gpt-a",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "C",
                confidence: {
                    solver: 0.7,
                    solverToRevisionDelta: -0.3,
                },
                critique: { issueCount: 6, maxSeverity: 3 },
                research: { evidenceRiskLevel: 4 },
            },
        ]);

        const rows = buildModelLeaderboard(index);
        expect(rows).toHaveLength(2);
        expect(rows[0]?.model).toBe("gpt-a");
        expect(rows[0]?.runCount).toBe(2);
        expect(rows[0]?.avgIssueCount).toBe(8);
        expect(rows[0]?.avgSolverToRevisionDelta).toBeCloseTo(-0.25);
        expect(rows[0]?.runsHref).toContain("model=gpt-a");
    });
});
