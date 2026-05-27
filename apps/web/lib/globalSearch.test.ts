import { describe, expect, it } from "vitest";
import type { BenchmarkArtifact, RunArtifact } from "./data";
import { searchArtifacts } from "./globalSearch";

function makeRun(id: string, question: string, answer: string): RunArtifact {
    return {
        kind: "run",
        id,
        question,
        metadata: {
            createdAt: "2025-02-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: {
            id,
            finalAnswer: answer,
            steps: [],
            metrics: {},
        },
    };
}

function makeBenchmark(id: string, question: string): BenchmarkArtifact {
    return {
        kind: "benchmark",
        id,
        question,
        metadata: {
            createdAt: "2025-02-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "standard",
            fastMode: false,
        },
        payload: {
            runs: 3,
            modeCount: 2,
            modeSizes: [2, 1],
            divergenceEntropy: 0.5,
        },
    };
}

describe("globalSearch", () => {
    it("returns grouped matches for a query", () => {
        const runs = [
            makeRun("run_a", "Alpha policy debate", "answer alpha"),
            makeRun("run_b", "Beta economics", "answer beta"),
        ];
        const benchmarks = [
            makeBenchmark("bench_a", "Alpha policy debate"),
            makeBenchmark("bench_b", "Gamma topic"),
        ];

        const result = searchArtifacts(runs, benchmarks, "alpha", {
            limitPerSection: 10,
        });

        expect(result.totals.runs).toBe(1);
        expect(result.totals.benchmarks).toBe(1);
        expect(result.totals.questions).toBe(1);
        expect(result.runs[0].id).toBe("run_a");
        expect(result.benchmarks[0].id).toBe("bench_a");
        expect(result.questions[0].question).toBe("Alpha policy debate");
    });

    it("returns empty sections when query matches nothing", () => {
        const result = searchArtifacts([makeRun("run_a", "Q", "A")], [], "zzz");
        expect(result.totals.runs).toBe(0);
        expect(result.runs).toHaveLength(0);
    });
});
