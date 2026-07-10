import { describe, expect, it } from "vitest";
import type { BenchmarkArtifact, RunArtifact } from "./data";
import {
    buildMatrixCellRunCompareHref,
    buildQuestionExperimentMatrix,
    lookupMatrixCell,
} from "./questionExperimentMatrix";

function makeRun(
    id: string,
    model: string,
    preset: string,
    createdAt: string,
): RunArtifact {
    return {
        kind: "run",
        id,
        question: "Shared?",
        metadata: {
            createdAt,
            model,
            pipelinePreset: preset,
            fastMode: false,
        },
        run: { id, finalAnswer: "a", steps: [], metrics: {} },
    };
}

function makeBenchmark(
    id: string,
    model: string,
    preset: string,
): BenchmarkArtifact {
    return {
        kind: "benchmark",
        id,
        question: "Shared?",
        metadata: {
            createdAt: "2026-01-03T00:00:00.000Z",
            model,
            pipelinePreset: preset,
            fastMode: false,
        },
        payload: {
            runs: 3,
            modeCount: 1,
            modeSizes: [3],
            divergenceEntropy: 0.5,
            runIds: [],
            summary: { stability: { pairwiseMean: 0.8, pairs: [] } },
        },
    };
}

describe("buildQuestionExperimentMatrix", () => {
    it("groups runs and benchmarks by model and preset", () => {
        const matrix = buildQuestionExperimentMatrix(
            [
                makeRun(
                    "run_a",
                    "gpt-a",
                    "standard",
                    "2026-01-01T00:00:00.000Z",
                ),
                makeRun(
                    "run_b",
                    "gpt-a",
                    "research_deep",
                    "2026-01-02T00:00:00.000Z",
                ),
                makeRun(
                    "run_c",
                    "gpt-b",
                    "standard",
                    "2026-01-02T00:00:00.000Z",
                ),
            ],
            [makeBenchmark("bench_a", "gpt-a", "standard")],
        );

        expect(matrix.models).toEqual(["gpt-a", "gpt-b"]);
        expect(matrix.presets).toEqual(["research_deep", "standard"]);

        const standardGptA = lookupMatrixCell(matrix, "gpt-a", "standard");
        expect(standardGptA).toMatchObject({
            runCount: 1,
            benchmarkCount: 1,
            latestRunId: "run_a",
            latestBenchmarkId: "bench_a",
        });

        const deepGptA = lookupMatrixCell(matrix, "gpt-a", "research_deep");
        expect(deepGptA?.runCount).toBe(1);
        expect(deepGptA?.latestRunId).toBe("run_b");
    });

    it("tracks second latest run for compare links", () => {
        const matrix = buildQuestionExperimentMatrix(
            [
                makeRun(
                    "run_old",
                    "gpt-a",
                    "standard",
                    "2026-01-01T00:00:00.000Z",
                ),
                makeRun(
                    "run_new",
                    "gpt-a",
                    "standard",
                    "2026-01-03T00:00:00.000Z",
                ),
            ],
            [],
        );

        const cell = lookupMatrixCell(matrix, "gpt-a", "standard");
        expect(cell).toMatchObject({
            runCount: 2,
            latestRunId: "run_new",
            secondLatestRunId: "run_old",
        });
        expect(buildMatrixCellRunCompareHref(cell!, "Shared?")).toBe(
            "/runs/compare?left=run_old&right=run_new&question=Shared%3F",
        );
    });

    it("returns null compare href when fewer than two runs", () => {
        const matrix = buildQuestionExperimentMatrix(
            [makeRun("run_a", "gpt-a", "standard", "2026-01-01T00:00:00.000Z")],
            [],
        );
        const cell = lookupMatrixCell(matrix, "gpt-a", "standard");
        expect(buildMatrixCellRunCompareHref(cell!, "Q?")).toBeNull();
    });

    it("returns empty axes when no artifacts", () => {
        const matrix = buildQuestionExperimentMatrix([], []);
        expect(matrix.models).toEqual([]);
        expect(matrix.presets).toEqual([]);
        expect(matrix.cells).toEqual([]);
    });
});
