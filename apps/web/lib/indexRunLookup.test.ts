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
                confidence: { solver: 0.8, calibratedAdjusted: 0.75 },
                critique: {
                    issueCount: 5,
                    maxSeverity: 4,
                    byType: { factual: 2 },
                },
                research: {
                    evidenceRiskLevel: 3,
                    topCounterfactualFailureMode: "omission",
                },
                quality: { coherence: 0.9, factualRisk: 0.2 },
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
            solverConfidence: 0.8,
            calibratedConfidence: 0.75,
            evidenceRiskLevel: 3,
            qualityCoherence: 0.9,
            factualRisk: 0.2,
            topCounterfactualMode: "omission",
        });
        expect(lookup.get("missing")).toBeUndefined();
    });
});
