import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import {
    applyRunListExtraFilters,
    buildPipelineErrorRunIdSet,
    hasActiveRunListExtraFilters,
    parseRunListExtraFilters,
} from "./runListFilters";

function sampleRun(
    id: string,
    overrides: Partial<RunArtifact> = {},
): RunArtifact {
    return {
        kind: "run",
        id,
        question: "Sample?",
        metadata: {
            createdAt: "2026-01-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: {
            id,
            finalAnswer: "answer",
            steps: [],
            metrics: {},
        },
        ...overrides,
    };
}

describe("runListFilters", () => {
    it("parses outlier and error flags", () => {
        expect(parseRunListExtraFilters({})).toEqual({
            outlierOnly: false,
            errorsOnly: false,
        });
        expect(
            parseRunListExtraFilters({ outlier: "true", errors: "true" }),
        ).toEqual({
            outlierOnly: true,
            errorsOnly: true,
        });
    });

    it("detects active extra filters", () => {
        expect(
            hasActiveRunListExtraFilters({
                outlierOnly: false,
                errorsOnly: false,
            }),
        ).toBe(false);
        expect(
            hasActiveRunListExtraFilters({
                outlierOnly: true,
                errorsOnly: false,
            }),
        ).toBe(true);
    });

    it("builds a set of run ids with pipeline errors", () => {
        const runs = [
            sampleRun("run_ok"),
            sampleRun("run_fail", {
                run: {
                    id: "run_fail",
                    finalAnswer: "answer",
                    steps: [
                        {
                            id: "step_1",
                            agentName: "Solver",
                            role: "solver",
                            createdAt: "2026-01-01T00:00:00.000Z",
                            error: "timeout",
                        },
                    ],
                    metrics: {},
                },
            }),
        ];

        expect([...buildPipelineErrorRunIdSet(runs)]).toEqual(["run_fail"]);
    });

    it("filters runs by outlier and error flags", () => {
        const runs = [
            sampleRun("run_a"),
            sampleRun("run_b"),
            sampleRun("run_c"),
        ];
        const filtered = applyRunListExtraFilters(
            runs,
            { outlierOnly: true, errorsOnly: true },
            {
                outlierRunIds: new Set(["run_a", "run_b"]),
                errorRunIds: new Set(["run_b", "run_c"]),
            },
        );

        expect(filtered.map((run) => run.id)).toEqual(["run_b"]);
    });
});
