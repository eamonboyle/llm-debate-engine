import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import { buildPresetLeaderboard } from "./presetLeaderboard";

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

describe("buildPresetLeaderboard", () => {
    it("aggregates metrics per pipeline preset", () => {
        const index = makeIndex([
            {
                id: "run_a",
                question: "Q1",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "A",
                confidence: { solverToRevisionDelta: -0.2 },
                critique: { issueCount: 8, maxSeverity: 4 },
                quality: { coherence: 4, factualRisk: 2 },
            },
            {
                id: "run_b",
                question: "Q2",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "B",
                confidence: { solverToRevisionDelta: -0.1 },
                critique: { issueCount: 4, maxSeverity: 2 },
                quality: { coherence: 3, factualRisk: 3 },
            },
            {
                id: "run_c",
                question: "Q3",
                createdAt: "2026-01-03T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "C",
                confidence: { solverToRevisionDelta: -0.3 },
                critique: { issueCount: 12, maxSeverity: 5 },
                quality: { coherence: 5, factualRisk: 1 },
            },
        ]);

        const rows = buildPresetLeaderboard(index);
        expect(rows).toHaveLength(2);
        expect(rows[0]?.preset).toBe("research_deep");
        expect(rows[0]?.runCount).toBe(2);
        expect(rows[0]?.avgCoherence).toBe(4.5);
        expect(rows[0]?.runsHref).toContain("preset=research_deep");
    });
});
