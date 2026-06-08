import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import { extractCritiqueByAgent } from "./critiqueByAgent";

function makeRun(steps: RunArtifact["run"]["steps"]): RunArtifact {
    return {
        kind: "run",
        id: "r1",
        question: "Q",
        metadata: {
            createdAt: "2026-01-01T00:00:00.000Z",
            model: "m",
            pipelinePreset: "research_deep",
            fastMode: false,
        },
        run: {
            id: "r1",
            finalAnswer: "a",
            steps,
            metrics: {},
        },
    };
}

describe("critiqueByAgent", () => {
    it("extracts per-agent critique summaries from trace steps", () => {
        const run = makeRun([
            {
                id: "s1",
                agentName: "SkepticAgent",
                role: "skeptic",
                output: {
                    kind: "critique",
                    data: {
                        targetAgent: "SolverAgent",
                        issues: [
                            { severity: 4, type: "factual", note: "a" },
                            { severity: 2, type: "logic", note: "b" },
                        ],
                    },
                },
            },
            {
                id: "s2",
                agentName: "RedTeamAgent",
                role: "redteam",
                output: {
                    kind: "critique",
                    data: {
                        targetAgent: "SolverAgent",
                        issues: [{ severity: 5, type: "missing", note: "c" }],
                    },
                },
            },
        ]);

        const rows = extractCritiqueByAgent(run);
        expect(rows).toHaveLength(2);
        expect(rows[0].agentName).toBe("SkepticAgent");
        expect(rows[0].issueCount).toBe(2);
        expect(rows[0].maxSeverity).toBe(4);
        expect(rows[0].byType).toEqual({ factual: 1, logic: 1 });
        expect(rows[1].agentName).toBe("RedTeamAgent");
        expect(rows[1].issueCount).toBe(1);
    });

    it("returns empty when no critique steps exist", () => {
        const run = makeRun([
            {
                id: "s1",
                agentName: "SolverAgent",
                role: "solver",
                output: { kind: "proposal", data: { answer: "x" } },
            },
        ]);
        expect(extractCritiqueByAgent(run)).toEqual([]);
    });
});
