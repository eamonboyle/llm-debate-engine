import { describe, expect, it } from "vitest";
import type { BenchmarkArtifact, RunArtifact } from "./data";
import {
    resolveBenchmarkSortOrder,
    resolveRunSortOrder,
    sortArtifactsByCreatedAt,
    sortBenchmarkArtifacts,
    sortRunArtifacts,
} from "./artifactSort";

type FakeArtifact = {
    id: string;
    metadata: {
        createdAt: string;
    };
};

function makeRun(
    id: string,
    createdAt: string,
    metrics: RunArtifact["run"]["metrics"] = {},
): RunArtifact {
    return {
        kind: "run",
        id,
        question: "Q",
        metadata: {
            createdAt,
            model: "gpt",
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: { id, finalAnswer: "A", steps: [], metrics },
    };
}

function makeBenchmark(
    id: string,
    createdAt: string,
    payload: Partial<BenchmarkArtifact["payload"]> = {},
): BenchmarkArtifact {
    return {
        kind: "benchmark",
        id,
        question: "Q",
        metadata: {
            createdAt,
            model: "gpt",
            pipelinePreset: "standard",
            fastMode: false,
        },
        payload: {
            runs: 2,
            modeCount: 2,
            modeSizes: [1, 1],
            divergenceEntropy: 0.2,
            ...payload,
        },
    };
}

describe("artifact sort helpers", () => {
    it("sorts artifacts newest first by default semantics", () => {
        const artifacts: FakeArtifact[] = [
            { id: "b", metadata: { createdAt: "2025-01-01T00:00:00.000Z" } },
            { id: "a", metadata: { createdAt: "2025-01-01T00:00:00.000Z" } },
            { id: "c", metadata: { createdAt: "2025-02-01T00:00:00.000Z" } },
        ];
        const sorted = sortArtifactsByCreatedAt(artifacts, "newest");
        expect(sorted.map((item) => item.id)).toEqual(["c", "a", "b"]);
    });

    it("sorts artifacts oldest first with deterministic id tie-breaks", () => {
        const artifacts: FakeArtifact[] = [
            { id: "b", metadata: { createdAt: "2025-01-01T00:00:00.000Z" } },
            { id: "a", metadata: { createdAt: "2025-01-01T00:00:00.000Z" } },
            { id: "c", metadata: { createdAt: "2025-02-01T00:00:00.000Z" } },
        ];
        const sorted = sortArtifactsByCreatedAt(artifacts, "oldest");
        expect(sorted.map((item) => item.id)).toEqual(["a", "b", "c"]);
    });

    it("resolves unknown run sort to newest", () => {
        expect(resolveRunSortOrder("invalid")).toBe("newest");
        expect(resolveRunSortOrder("issues_desc")).toBe("issues_desc");
    });

    it("sorts runs by critique issue count descending", () => {
        const runs = [
            makeRun("low", "2025-01-01T00:00:00.000Z", {
                critique: { byType: { omission: 1 } },
            }),
            makeRun("high", "2025-01-01T00:00:00.000Z", {
                critique: { byType: { factual_error: 2, omission: 2 } },
            }),
        ];
        const sorted = sortRunArtifacts(runs, "issues_desc");
        expect(sorted.map((r) => r.id)).toEqual(["high", "low"]);
    });

    it("sorts runs by absolute confidence drift descending", () => {
        const runs = [
            makeRun("small", "2025-01-01T00:00:00.000Z", {
                confidence: { solverToRevisionDelta: -0.05 },
            }),
            makeRun("large", "2025-01-01T00:00:00.000Z", {
                confidence: { solverToRevisionDelta: 0.4 },
            }),
            makeRun("mid", "2025-01-01T00:00:00.000Z", {
                confidence: { solverToRevisionDelta: -0.25 },
            }),
        ];
        const sorted = sortRunArtifacts(runs, "drift_desc");
        expect(sorted.map((r) => r.id)).toEqual(["large", "mid", "small"]);
    });

    it("sorts runs by judge coherence descending", () => {
        const runs = [
            makeRun("low", "2025-01-01T00:00:00.000Z", {
                quality: { coherence: 2 },
            }),
            makeRun("high", "2025-01-01T00:00:00.000Z", {
                quality: { coherence: 5 },
            }),
        ];
        const sorted = sortRunArtifacts(runs, "coherence_desc");
        expect(sorted.map((r) => r.id)).toEqual(["high", "low"]);
    });

    it("sorts runs by factual risk descending", () => {
        const runs = [
            makeRun("low", "2025-01-01T00:00:00.000Z", {
                quality: { factualRisk: 1 },
            }),
            makeRun("high", "2025-01-01T00:00:00.000Z", {
                quality: { factualRisk: 4 },
            }),
        ];
        const sorted = sortRunArtifacts(runs, "factual_risk_desc");
        expect(sorted.map((r) => r.id)).toEqual(["high", "low"]);
    });

    it("sorts benchmarks by entropy descending", () => {
        const benchmarks = [
            makeBenchmark("low", "2025-01-01T00:00:00.000Z", {
                divergenceEntropy: 0.1,
            }),
            makeBenchmark("high", "2025-01-01T00:00:00.000Z", {
                divergenceEntropy: 0.9,
            }),
        ];
        const sorted = sortBenchmarkArtifacts(benchmarks, "entropy_desc");
        expect(sorted.map((b) => b.id)).toEqual(["high", "low"]);
    });

    it("resolves unknown benchmark sort to newest", () => {
        expect(resolveBenchmarkSortOrder("nope")).toBe("newest");
        expect(resolveBenchmarkSortOrder("modes_desc")).toBe("modes_desc");
    });
});
