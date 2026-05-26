import { describe, expect, it } from "vitest";
import { collectArtifactFacets } from "./artifactFacets";
import type { BenchmarkArtifact, RunArtifact } from "./data";

function makeRun(model: string, preset: string): RunArtifact {
    return {
        kind: "run",
        id: `run-${model}-${preset}`,
        question: "Q",
        metadata: {
            createdAt: "2025-01-01T00:00:00.000Z",
            model,
            pipelinePreset: preset,
            fastMode: false,
        },
        run: { id: "r", finalAnswer: "A", steps: [], metrics: {} },
    };
}

function makeBenchmark(model: string, preset: string): BenchmarkArtifact {
    return {
        kind: "benchmark",
        id: `bench-${model}-${preset}`,
        question: "Q",
        metadata: {
            createdAt: "2025-01-01T00:00:00.000Z",
            model,
            pipelinePreset: preset,
            fastMode: false,
        },
        payload: {
            runs: 1,
            modeCount: 1,
            modeSizes: [1],
            divergenceEntropy: 0,
        },
    };
}

describe("collectArtifactFacets", () => {
    it("returns sorted unique models and presets with known presets first", () => {
        const facets = collectArtifactFacets(
            [
                makeRun("gpt-beta", "custom_preset"),
                makeRun("gpt-alpha", "research_deep"),
            ],
            [makeBenchmark("gpt-alpha", "standard")],
        );

        expect(facets.models).toEqual(["gpt-alpha", "gpt-beta"]);
        expect(facets.presets[0]).toBe("standard");
        expect(facets.presets).toContain("research_deep");
        expect(facets.presets).toContain("custom_preset");
    });
});
