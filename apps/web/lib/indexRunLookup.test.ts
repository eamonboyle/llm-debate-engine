import { describe, expect, it } from "vitest";
import { buildIndexRunLookup } from "./indexRunLookup";
import type { AnalysisIndex } from "./data";

function sampleIndex(): AnalysisIndex {
    return {
        generatedAt: new Date().toISOString(),
        totals: { runs: 1, benchmarks: 0, skippedFiles: 0 },
        runs: [
            {
                id: "run_a",
                question: "Q",
                createdAt: new Date().toISOString(),
                model: "gpt",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "A",
                stepCount: 10,
                confidence: { solver: 0.8 },
                critique: {
                    issueCount: 5,
                    maxSeverity: 4,
                    avgSeverity: 3.2,
                    byType: { factual: 2 },
                },
                research: { evidenceRiskLevel: 3 },
                quality: { coherence: 4.1, factualRisk: 2.5 },
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

describe("buildIndexRunLookup", () => {
    it("maps run id to indexed critique and confidence fields", () => {
        const lookup = buildIndexRunLookup(sampleIndex());
        expect(lookup.get("run_a")).toEqual({
            issueCount: 5,
            stepCount: 10,
            maxSeverity: 4,
            avgSeverity: 3.2,
            solverConfidence: 0.8,
            evidenceRiskLevel: 3,
            coherence: 4.1,
            factualRisk: 2.5,
        });
        expect(lookup.get("missing")).toBeUndefined();
    });
});
