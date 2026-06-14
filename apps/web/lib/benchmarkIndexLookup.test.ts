import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import {
    buildBenchmarkIndexLookup,
    formatTopModeLabel,
} from "./benchmarkIndexLookup";

function sampleIndex(): AnalysisIndex {
    return {
        generatedAt: "2026-01-01T00:00:00.000Z",
        totals: { runs: 0, benchmarks: 1, skippedFiles: 0 },
        runs: [],
        benchmarks: [
            {
                id: "bench-1",
                question: "Q",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "gpt",
                pipelinePreset: "research_deep",
                fastMode: false,
                runs: 5,
                modeCount: 2,
                modeSizes: [3, 2],
                divergenceEntropy: 0.9,
                stabilityPairwiseMean: 0.82,
                modeLabels: [
                    {
                        modeIndex: 0,
                        size: 3,
                        label: "Yes with safeguards",
                        exemplarPreview: "yes",
                    },
                    {
                        modeIndex: 1,
                        size: 2,
                        label: "No",
                        exemplarPreview: "no",
                    },
                ],
            },
        ],
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

describe("benchmarkIndexLookup", () => {
    it("maps benchmark ids to indexed enrichments", () => {
        const lookup = buildBenchmarkIndexLookup(sampleIndex());
        expect(lookup.get("bench-1")?.stabilityPairwiseMean).toBe(0.82);
        expect(lookup.get("bench-1")?.modeLabels).toHaveLength(2);
    });

    it("formats the largest mode label", () => {
        const lookup = buildBenchmarkIndexLookup(sampleIndex());
        const labels = lookup.get("bench-1")!.modeLabels;
        expect(formatTopModeLabel(labels)).toBe("Yes with safeguards");
    });
});
