import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import { buildQualityRunRows, summarizeQuality } from "./qualityInsights";

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

describe("qualityInsights", () => {
    it("sorts runs by coherence then factual risk", () => {
        const index = makeIndex([
            {
                id: "low",
                question: "Q1",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "A",
                confidence: {},
                critique: { issueCount: 1 },
                quality: { coherence: 2, factualRisk: 4 },
            },
            {
                id: "high",
                question: "Q2",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "B",
                confidence: {},
                critique: { issueCount: 1 },
                quality: { coherence: 5, factualRisk: 1 },
            },
        ]);

        const rows = buildQualityRunRows(index);
        expect(rows[0]?.id).toBe("high");
        expect(rows[1]?.id).toBe("low");
    });

    it("summarizes averages across indexed runs", () => {
        const index = makeIndex([
            {
                id: "a",
                question: "Q",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "A",
                confidence: {},
                critique: { issueCount: 0 },
                quality: { coherence: 4, completeness: 3 },
            },
            {
                id: "b",
                question: "Q",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "B",
                confidence: {},
                critique: { issueCount: 0 },
                quality: { coherence: 2, completeness: 5 },
            },
        ]);

        const summary = summarizeQuality(index);
        expect(summary.withQualityScores).toBe(2);
        expect(summary.avgCoherence).toBe(3);
        expect(summary.avgCompleteness).toBe(4);
    });
});
