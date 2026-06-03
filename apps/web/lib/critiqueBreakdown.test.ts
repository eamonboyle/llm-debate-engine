import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import { extractCritiqueByType } from "./critiqueBreakdown";

describe("critiqueBreakdown", () => {
    it("extracts sorted issue type counts", () => {
        const run: RunArtifact = {
            kind: "run",
            id: "r1",
            question: "Q",
            metadata: {
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "m",
                pipelinePreset: "standard",
                fastMode: false,
            },
            run: {
                id: "r1",
                finalAnswer: "a",
                steps: [],
                metrics: {
                    critique: {
                        byType: { missing: 5, factual: 2 },
                    },
                },
            },
        };

        expect(extractCritiqueByType(run)).toEqual([
            { type: "missing", count: 5 },
            { type: "factual", count: 2 },
        ]);
    });
});
