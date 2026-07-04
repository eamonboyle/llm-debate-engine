import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import { buildModelComparePayload } from "./modelCompare";

function sampleIndex(): AnalysisIndex {
    return {
        generatedAt: "2026-01-01T00:00:00.000Z",
        totals: { runs: 2, benchmarks: 0, skippedFiles: 0 },
        runs: [
            {
                id: "run-a",
                question: "Q1",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "model-a",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "a",
                confidence: { solver: 0.8, solverToRevisionDelta: -0.1 },
                critique: { issueCount: 10, maxSeverity: 4 },
                research: { evidenceRiskLevel: 3 },
                quality: { coherence: 4, factualRisk: 2 },
            },
            {
                id: "run-b",
                question: "Q2",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "model-b",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "b",
                confidence: { solver: 0.6, solverToRevisionDelta: -0.3 },
                critique: { issueCount: 20, maxSeverity: 5 },
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

describe("modelCompare", () => {
    it("builds compare payload with metric deltas", () => {
        const payload = buildModelComparePayload(
            sampleIndex(),
            "model-a",
            "model-b",
        );
        expect(payload).not.toBeNull();
        expect(payload!.left.model).toBe("model-a");
        expect(payload!.right.model).toBe("model-b");
        expect(payload!.delta.avgIssueCount).toBe(10);
        expect(payload!.delta.avgSolverConfidence).toBeCloseTo(-0.2);
        expect(payload!.delta.avgCoherence).toBe(-2);
        expect(payload!.delta.avgFactualRisk).toBe(2);
    });

    it("returns null when a model is missing", () => {
        expect(
            buildModelComparePayload(sampleIndex(), "model-a", "missing"),
        ).toBeNull();
    });
});
