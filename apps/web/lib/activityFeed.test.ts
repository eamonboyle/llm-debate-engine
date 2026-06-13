import { describe, expect, it } from "vitest";
import { buildActivityFeed } from "./activityFeed";
import type { BenchmarkArtifact, RunArtifact } from "./data";

const runA: RunArtifact = {
    kind: "run",
    id: "run_a",
    question: "Alpha question",
    metadata: {
        createdAt: "2026-01-02T00:00:00.000Z",
        model: "gpt-a",
        pipelinePreset: "standard",
        fastMode: false,
    },
    run: {
        id: "run_a",
        finalAnswer: "answer",
        steps: [],
        metrics: { critique: { issueCount: 2 } },
    },
};

const runB: RunArtifact = {
    ...runA,
    id: "run_b",
    question: "Beta question",
    metadata: {
        ...runA.metadata,
        createdAt: "2026-01-03T00:00:00.000Z",
    },
};

const benchmarkA: BenchmarkArtifact = {
    kind: "benchmark",
    id: "bench_a",
    question: "Alpha question",
    metadata: {
        createdAt: "2026-01-04T00:00:00.000Z",
        model: "gpt-a",
        pipelinePreset: "research_deep",
        fastMode: true,
    },
    payload: {
        runs: 5,
        modeCount: 2,
        modeSizes: [3, 2],
        divergenceEntropy: 0.97,
    },
};

describe("buildActivityFeed", () => {
    it("merges runs and benchmarks sorted newest first", () => {
        const feed = buildActivityFeed([runA, runB], [benchmarkA]);
        expect(feed.map((e) => e.id)).toEqual(["bench_a", "run_b", "run_a"]);
    });

    it("filters by kind and query", () => {
        const runsOnly = buildActivityFeed([runA, runB], [benchmarkA], {
            kind: "run",
        });
        expect(runsOnly.every((e) => e.kind === "run")).toBe(true);

        const alpha = buildActivityFeed([runA, runB], [benchmarkA], {
            q: "alpha",
        });
        expect(alpha.map((e) => e.id)).toEqual(["bench_a", "run_a"]);
    });

    it("filters by model, preset, and fast mode", () => {
        const deepFast = buildActivityFeed([runA, runB], [benchmarkA], {
            preset: "research_deep",
            fast: "true",
        });
        expect(deepFast.map((e) => e.id)).toEqual(["bench_a"]);

        const gptA = buildActivityFeed([runA, runB], [benchmarkA], {
            model: "gpt-a",
        });
        expect(gptA.map((e) => e.id)).toEqual(["bench_a", "run_b", "run_a"]);
    });

    it("sorts oldest first when requested", () => {
        const feed = buildActivityFeed([runA, runB], [benchmarkA], {
            sort: "oldest",
        });
        expect(feed.map((e) => e.id)).toEqual(["run_a", "run_b", "bench_a"]);
    });
});
