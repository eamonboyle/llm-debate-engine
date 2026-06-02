import { describe, expect, it } from "vitest";
import { buildAgentStats } from "./agentStats";
import type { RunArtifact } from "./data";

function makeRun(
    id: string,
    steps: Array<{
        agentName: string;
        error?: string;
        createdAt?: string;
        completedAt?: string;
    }>,
): RunArtifact {
    return {
        kind: "run",
        id,
        question: "Q",
        metadata: {
            createdAt: "2026-01-01T00:00:00.000Z",
            model: "gpt",
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: {
            id,
            finalAnswer: "A",
            steps: steps.map((step, index) => ({
                id: `step-${index}`,
                agentName: step.agentName,
                role: "research",
                error: step.error,
                createdAt: step.createdAt,
                completedAt: step.completedAt,
            })),
            metrics: {},
        },
    };
}

describe("buildAgentStats", () => {
    it("aggregates steps and errors per agent", () => {
        const rows = buildAgentStats([
            makeRun("r1", [
                {
                    agentName: "SolverAgent",
                    createdAt: "2026-01-01T00:00:00.000Z",
                    completedAt: "2026-01-01T00:00:02.000Z",
                },
                { agentName: "SkepticAgent", error: "timeout" },
            ]),
            makeRun("r2", [
                {
                    agentName: "SolverAgent",
                    createdAt: "2026-01-01T00:00:00.000Z",
                    completedAt: "2026-01-01T00:00:01.000Z",
                },
            ]),
        ]);

        const solver = rows.find((row) => row.agentName === "SolverAgent");
        const skeptic = rows.find((row) => row.agentName === "SkepticAgent");

        expect(solver?.stepCount).toBe(2);
        expect(solver?.runCount).toBe(2);
        expect(solver?.avgDurationMs).toBe(1500);
        expect(skeptic?.errorCount).toBe(1);
    });
});
