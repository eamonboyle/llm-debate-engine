import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import { extractConsensusSummary } from "./consensusSummary";

function makeRun(consensus?: Record<string, unknown>): RunArtifact {
    return {
        kind: "run",
        id: "run_test",
        question: "Test?",
        metadata: {
            createdAt: "2026-01-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "research_deep",
            fastMode: false,
        },
        run: {
            id: "run_test",
            finalAnswer: "Answer",
            steps: [],
            metrics: { consensus },
        },
    };
}

describe("extractConsensusSummary", () => {
    it("returns null when consensus is missing", () => {
        expect(extractConsensusSummary(makeRun())).toBeNull();
    });

    it("extracts strength, included answers, and pairwise similarities", () => {
        const summary = extractConsensusSummary(
            makeRun({
                strength: 0.836,
                included: ["solver", "revision", "synthesizer"],
                pairs: [
                    { a: "solver", b: "revision", similarity: 0.778 },
                    { a: "solver", b: "synthesizer", similarity: 0.774 },
                ],
            }),
        );

        expect(summary?.strength).toBe(0.836);
        expect(summary?.included).toEqual([
            "solver",
            "revision",
            "synthesizer",
        ]);
        expect(summary?.pairs).toHaveLength(2);
        expect(summary?.pairs[0]?.similarity).toBe(0.778);
    });
});
