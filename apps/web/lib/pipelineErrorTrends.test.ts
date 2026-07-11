import { describe, expect, it } from "vitest";
import {
    buildPipelineErrorByAgent,
    buildPipelineErrorTrendSeries,
} from "./pipelineErrorTrends";
import type { PipelineErrorRow } from "./pipelineErrors";

function makeError(
    overrides: Partial<PipelineErrorRow> = {},
): PipelineErrorRow {
    return {
        runId: "run_a",
        question: "Q",
        model: "gpt-test",
        pipelinePreset: "standard",
        fastMode: false,
        agentName: "SolverAgent",
        stepIndex: 1,
        error: "timeout",
        createdAt: "2025-06-15T12:00:00.000Z",
        traceHref: "/runs/run_a#step-1",
        ...overrides,
    };
}

describe("pipeline error trends", () => {
    it("groups errors by day and counts affected runs", () => {
        const series = buildPipelineErrorTrendSeries([
            makeError(),
            makeError({
                runId: "run_b",
                createdAt: "2025-06-15T18:00:00.000Z",
            }),
            makeError({
                runId: "run_c",
                createdAt: "2025-06-16T12:00:00.000Z",
            }),
        ]);

        expect(series).toHaveLength(2);
        expect(series[0].errorCount).toBe(2);
        expect(series[0].runCount).toBe(2);
        expect(series[1].errorCount).toBe(1);
    });

    it("counts errors by agent", () => {
        const agents = buildPipelineErrorByAgent([
            makeError(),
            makeError({ agentName: "JudgeAgent" }),
            makeError({ agentName: "JudgeAgent" }),
        ]);

        expect(agents[0]).toEqual({ agent: "JudgeAgent", errorCount: 2 });
        expect(agents[1]).toEqual({ agent: "SolverAgent", errorCount: 1 });
    });
});
