import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import { buildCompareSuggestions } from "./compareSuggestions";

function makeRun(
    id: string,
    question: string,
    model = "gpt-test",
    createdAt = "2026-01-01T00:00:00.000Z",
): RunArtifact {
    return {
        kind: "run",
        id,
        question,
        metadata: {
            createdAt,
            model,
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: { id, finalAnswer: "a", steps: [], metrics: {} },
    };
}

describe("compareSuggestions", () => {
    const runs = [
        makeRun("run_a", "Question A", "gpt-a", "2026-01-03T00:00:00.000Z"),
        makeRun("run_b", "Question A", "gpt-b", "2026-01-02T00:00:00.000Z"),
        makeRun("run_c", "Question B", "gpt-a", "2026-01-01T00:00:00.000Z"),
    ];

    it("suggests same-question runs when only left is selected", () => {
        const suggestions = buildCompareSuggestions(runs, { left: "run_a" });
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].id).toBe("run_b");
        expect(suggestions[0].href).toContain("left=run_a");
        expect(suggestions[0].href).toContain("right=run_b");
        expect(suggestions[0].reason).toBe("Same research question");
    });

    it("suggests same-question runs when only right is selected", () => {
        const suggestions = buildCompareSuggestions(runs, { right: "run_b" });
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].id).toBe("run_a");
        expect(suggestions[0].href).toContain("left=run_a");
        expect(suggestions[0].href).toContain("right=run_b");
    });

    it("returns empty when both sides are selected", () => {
        expect(
            buildCompareSuggestions(runs, {
                left: "run_a",
                right: "run_b",
            }),
        ).toEqual([]);
    });
});
