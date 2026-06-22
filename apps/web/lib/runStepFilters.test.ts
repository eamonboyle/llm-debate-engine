import { describe, expect, it } from "vitest";
import {
    buildAgentErrorRunsHref,
    filterRunsByStepCriteria,
    matchesRunStepFilters,
} from "./runStepFilters";
import type { RunArtifact } from "./data";

function sampleRun(
    id: string,
    steps: Array<{ agentName: string; error?: string }>,
): RunArtifact {
    return {
        kind: "run",
        id,
        question: "Q",
        metadata: {
            createdAt: new Date().toISOString(),
            model: "gpt",
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: {
            id,
            finalAnswer: "A",
            steps: steps.map((step, index) => ({
                id: `step_${index}`,
                agentName: step.agentName,
                role: "agent",
                error: step.error,
            })),
            metrics: {},
        },
    };
}

describe("matchesRunStepFilters", () => {
    const run = sampleRun("run_a", [
        { agentName: "SolverAgent" },
        { agentName: "SkepticAgent", error: "timeout" },
    ]);

    it("passes when no step filters are active", () => {
        expect(matchesRunStepFilters(run, {})).toBe(true);
    });

    it("filters by agent name", () => {
        expect(matchesRunStepFilters(run, { agent: "SkepticAgent" })).toBe(
            true,
        );
        expect(matchesRunStepFilters(run, { agent: "JudgeAgent" })).toBe(false);
    });

    it("filters by any step error", () => {
        expect(matchesRunStepFilters(run, { errors: "true" })).toBe(true);
        expect(
            matchesRunStepFilters(
                sampleRun("run_b", [{ agentName: "SolverAgent" }]),
                { errors: "true" },
            ),
        ).toBe(false);
    });

    it("filters by agent-specific errors", () => {
        expect(
            matchesRunStepFilters(run, {
                agent: "SkepticAgent",
                errors: "true",
            }),
        ).toBe(true);
        expect(
            matchesRunStepFilters(run, {
                agent: "SolverAgent",
                errors: "true",
            }),
        ).toBe(false);
    });
});

describe("filterRunsByStepCriteria", () => {
    it("returns all runs when filters are inactive", () => {
        const runs = [
            sampleRun("a", [{ agentName: "SolverAgent" }]),
            sampleRun("b", [{ agentName: "SkepticAgent", error: "x" }]),
        ];
        expect(filterRunsByStepCriteria(runs, {})).toEqual(runs);
    });
});

describe("buildAgentErrorRunsHref", () => {
    it("builds a runs link with agent and errors query params", () => {
        expect(buildAgentErrorRunsHref("SkepticAgent")).toBe(
            "/runs?agent=SkepticAgent&errors=true",
        );
        expect(
            buildAgentErrorRunsHref("SkepticAgent", { model: "gpt-4" }),
        ).toBe("/runs?model=gpt-4&agent=SkepticAgent&errors=true");
    });
});
