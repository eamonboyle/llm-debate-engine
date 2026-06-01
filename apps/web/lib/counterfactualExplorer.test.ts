import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import {
    buildFailureModeSummaries,
    listRunsForFailureMode,
} from "./counterfactualExplorer";

function makeIndex(overrides: Partial<AnalysisIndex> = {}): AnalysisIndex {
    return {
        generatedAt: "2026-01-01T00:00:00.000Z",
        totals: { runs: 2, benchmarks: 0, skippedFiles: 0 },
        runs: [
            {
                id: "run-1",
                question: "Q1",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "m",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "a",
                confidence: {},
                critique: { issueCount: 0 },
                research: {
                    topCounterfactualFailureMode: "Mode Alpha",
                    counterfactualFailureModeCount: 3,
                },
            },
            {
                id: "run-2",
                question: "Q2",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "m",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "b",
                confidence: {},
                critique: { issueCount: 0 },
                research: {
                    topCounterfactualFailureMode: "Mode Beta",
                    counterfactualFailureModeCount: 1,
                },
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
            counterfactualFailureModeCounts: {
                "Mode Alpha": 2,
                "Mode Beta": 1,
            },
            presets: {},
            critiqueVsConfidence: [],
        },
        skipped: [],
        ...overrides,
    };
}

describe("counterfactualExplorer", () => {
    it("builds sorted failure mode summaries", () => {
        const summaries = buildFailureModeSummaries(makeIndex());
        expect(summaries[0]?.mode).toBe("Mode Alpha");
        expect(summaries[0]?.runCount).toBe(2);
    });

    it("lists runs for a selected failure mode", () => {
        const runs = listRunsForFailureMode(makeIndex(), "mode alpha");
        expect(runs).toHaveLength(1);
        expect(runs[0]?.runId).toBe("run-1");
    });
});
