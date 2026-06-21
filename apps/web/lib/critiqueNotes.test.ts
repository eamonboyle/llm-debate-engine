import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import {
    extractCritiqueNotesForRuns,
    extractCritiqueNotesFromRun,
} from "./critiqueNotes";

function makeRunWithCritique(
    id: string,
    issues: Array<{ severity: number; type: string; note: string }>,
): RunArtifact {
    return {
        kind: "run",
        id,
        question: "Test question?",
        metadata: {
            createdAt: "2026-01-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: {
            id,
            finalAnswer: "answer",
            steps: [
                {
                    id: "step-1",
                    agentName: "Skeptic",
                    role: "skeptic",
                    request: { model: "gpt-test", messages: [] },
                    rawAttempts: [],
                    output: {
                        kind: "critique",
                        data: {
                            targetAgent: "Solver",
                            issues,
                        },
                    },
                    completedAt: "2026-01-01T00:00:00.000Z",
                },
            ],
            metrics: {},
        },
    };
}

describe("critiqueNotes", () => {
    it("extracts notes for a matching issue type", () => {
        const run = makeRunWithCritique("run_a", [
            { severity: 4, type: "factual", note: "Missing citation" },
            { severity: 2, type: "logic", note: "Weak chain" },
        ]);

        const rows = extractCritiqueNotesFromRun(run, "factual");
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            runId: "run_a",
            type: "factual",
            note: "Missing citation",
            agentName: "Skeptic",
        });
    });

    it("filters runs and sorts by severity", () => {
        const runs = [
            makeRunWithCritique("run_a", [
                { severity: 3, type: "factual", note: "A" },
            ]),
            makeRunWithCritique("run_b", [
                { severity: 5, type: "factual", note: "B" },
            ]),
        ];

        const rows = extractCritiqueNotesForRuns(runs, "factual");
        expect(rows.map((row) => row.runId)).toEqual(["run_b", "run_a"]);
    });
});
