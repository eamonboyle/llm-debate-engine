import { describe, expect, it } from "vitest";
import type { BenchmarkArtifact, RunArtifact } from "./data";
import { buildActivityFeed } from "./activityFeed";
import { attachActivityCompareLinks } from "./activityCompare";

function sampleRun(
    id: string,
    question: string,
    createdAt: string,
): RunArtifact {
    return {
        kind: "run",
        id,
        question,
        metadata: {
            createdAt,
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
    };
}

function sampleBenchmark(
    id: string,
    question: string,
    createdAt: string,
): BenchmarkArtifact {
    return {
        kind: "benchmark",
        id,
        question,
        metadata: {
            createdAt,
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

describe("attachActivityCompareLinks", () => {
    it("adds run compare links against the latest same-question peer", () => {
        const runs = [
            sampleRun("run_old", "Shared?", "2026-01-01T00:00:00.000Z"),
            sampleRun("run_new", "Shared?", "2026-01-02T00:00:00.000Z"),
        ];
        const feed = buildActivityFeed(runs, [], { kind: "run" });
        const linked = attachActivityCompareLinks(feed, runs, []);

        expect(linked[0]?.compareHref).toBe(
            "/runs/compare?left=run_new&right=run_old",
        );
        expect(linked[1]?.compareHref).toBe(
            "/runs/compare?left=run_old&right=run_new",
        );
    });

    it("adds benchmark compare links when another benchmark shares the question", () => {
        const benchmarks = [
            sampleBenchmark("bench_a", "Shared?", "2026-01-01T00:00:00.000Z"),
            sampleBenchmark("bench_b", "Shared?", "2026-01-02T00:00:00.000Z"),
        ];
        const feed = buildActivityFeed([], benchmarks, { kind: "benchmark" });
        const linked = attachActivityCompareLinks(feed, [], benchmarks);

        expect(linked[0]?.compareHref).toBe(
            "/benchmarks/compare?left=bench_b&right=bench_a",
        );
    });
});
