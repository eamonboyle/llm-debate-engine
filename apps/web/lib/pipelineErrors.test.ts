import { describe, expect, it } from "vitest";
import {
    buildPipelineErrorRows,
    collectPipelineErrorAgents,
} from "./pipelineErrors";
import type { RunArtifact } from "./data";

function makeRun(
    id: string,
    steps: Array<{ agentName: string; error?: string }>,
): RunArtifact {
    return {
        kind: "run",
        id,
        question: `Question ${id}`,
        metadata: {
            createdAt: "2025-01-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: {
            id,
            finalAnswer: "answer",
            steps: steps.map((step, index) => ({
                id: `step-${index}`,
                agentName: step.agentName,
                role: "research",
                ...(step.error ? { error: step.error } : {}),
                createdAt: "2025-01-01T00:00:00.000Z",
                completedAt: "2025-01-01T00:00:01.000Z",
            })),
            metrics: {},
        },
    };
}

describe("pipeline error helpers", () => {
    it("collects step errors with trace links", () => {
        const runs = [
            makeRun("run_a", [
                { agentName: "Solver" },
                { agentName: "Skeptic", error: "timeout" },
            ]),
            makeRun("run_b", [{ agentName: "Solver", error: "parse failure" }]),
        ];

        const rows = buildPipelineErrorRows(runs);
        expect(rows).toHaveLength(2);
        expect(rows[0].runId).toBe("run_a");
        expect(rows[0].traceHref).toBe("/runs/run_a#step-1");
    });

    it("filters by agent name", () => {
        const runs = [
            makeRun("run_a", [
                { agentName: "Solver", error: "a" },
                { agentName: "Skeptic", error: "b" },
            ]),
        ];

        const rows = buildPipelineErrorRows(runs, { agent: "Solver" });
        expect(rows).toHaveLength(1);
        expect(rows[0].agentName).toBe("Solver");
    });

    it("collects unique agents with errors", () => {
        const runs = [
            makeRun("run_a", [
                { agentName: "Skeptic", error: "x" },
                { agentName: "Solver", error: "y" },
            ]),
            makeRun("run_b", [{ agentName: "Skeptic", error: "z" }]),
        ];

        expect(collectPipelineErrorAgents(runs)).toEqual(["Skeptic", "Solver"]);
    });
});
