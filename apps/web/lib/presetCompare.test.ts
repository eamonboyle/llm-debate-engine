import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import { buildPresetComparePayload } from "./presetCompare";

function sampleIndex(): AnalysisIndex {
    return {
        generatedAt: "2026-01-01T00:00:00.000Z",
        totals: { runs: 2, benchmarks: 0, skippedFiles: 0 },
        runs: [
            {
                id: "run-a",
                question: "Q1",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "a",
                confidence: { solverToRevisionDelta: -0.1 },
                critique: { issueCount: 10, maxSeverity: 4 },
                quality: { coherence: 3 },
            },
            {
                id: "run-b",
                question: "Q2",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "b",
                confidence: { solverToRevisionDelta: -0.3 },
                critique: { issueCount: 20, maxSeverity: 5 },
                quality: { coherence: 4 },
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

describe("presetCompare", () => {
    it("builds compare payload with metric deltas", () => {
        const payload = buildPresetComparePayload(
            sampleIndex(),
            "standard",
            "research_deep",
        );
        expect(payload).not.toBeNull();
        expect(payload!.left.preset).toBe("standard");
        expect(payload!.right.preset).toBe("research_deep");
        expect(payload!.delta.avgIssueCount).toBe(10);
        expect(payload!.delta.avgCoherence).toBe(1);
    });

    it("returns null when a preset is missing", () => {
        expect(
            buildPresetComparePayload(sampleIndex(), "standard", "missing"),
        ).toBeNull();
    });
});
