import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import {
    buildAgentErrorRunsHref,
    filterRunsByStepCriteria,
    hasActiveRunStepFilters,
    matchesRunStepFilters,
} from "./runStepFilters";

function makeRun(id: string, steps: RunArtifact["run"]["steps"]): RunArtifact {
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
        run: { id, finalAnswer: "A", steps, metrics: {} },
    };
}

describe("runStepFilters", () => {
    const runs = [
        makeRun("clean", [
            {
                id: "s1",
                agentName: "SolverAgent",
                role: "solver",
            },
        ]),
        makeRun("judge_error", [
            {
                id: "s2",
                agentName: "JudgeAgent",
                role: "judge",
                error: "timeout",
            },
        ]),
    ];

    it("matches runs with any step error", () => {
        expect(matchesRunStepFilters(runs[1], { errors: "true" })).toBe(true);
        expect(matchesRunStepFilters(runs[0], { errors: "true" })).toBe(false);
    });

    it("matches runs with agent-specific errors", () => {
        expect(
            matchesRunStepFilters(runs[1], {
                agent: "JudgeAgent",
                errors: "true",
            }),
        ).toBe(true);
        expect(
            matchesRunStepFilters(runs[1], {
                agent: "SolverAgent",
                errors: "true",
            }),
        ).toBe(false);
    });

    it("filters runs and builds agent error href", () => {
        const filtered = filterRunsByStepCriteria(runs, {
            agent: "JudgeAgent",
            errors: "true",
        });
        expect(filtered.map((run) => run.id)).toEqual(["judge_error"]);
        expect(hasActiveRunStepFilters({ errors: "true" })).toBe(true);
        expect(
            buildAgentErrorRunsHref("JudgeAgent", { preset: "standard" }),
        ).toBe("/runs?preset=standard&agent=JudgeAgent&errors=true");
    });
});
