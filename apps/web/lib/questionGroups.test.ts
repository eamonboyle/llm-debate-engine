import { describe, expect, it } from "vitest";
import type { BenchmarkArtifact, RunArtifact } from "./data";
import { groupArtifactsByQuestion, questionHubHref } from "./questionGroups";

function makeRun(id: string, question: string, createdAt: string): RunArtifact {
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

function makeBenchmark(
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
            pipelinePreset: "research_deep",
            fastMode: false,
        },
        payload: {
            runs: 3,
            modeCount: 2,
            modeSizes: [2, 1],
            divergenceEntropy: 0.9,
        },
    };
}

describe("questionHubHref", () => {
    it("encodes question text in the query string", () => {
        expect(questionHubHref("Is AI safe?")).toBe(
            "/questions/view?question=Is+AI+safe%3F",
        );
    });
});

describe("groupArtifactsByQuestion", () => {
    it("groups runs and benchmarks by question", () => {
        const groups = groupArtifactsByQuestion(
            [
                makeRun("r1", "Q1?", "2026-01-02T00:00:00.000Z"),
                makeRun("r2", "Q1?", "2026-01-03T00:00:00.000Z"),
                makeRun("r3", "Q2?", "2026-01-01T00:00:00.000Z"),
            ],
            [makeBenchmark("b1", "Q1?", "2026-01-04T00:00:00.000Z")],
        );

        expect(groups).toHaveLength(2);
        expect(groups[0].question).toBe("Q1?");
        expect(groups[0].runCount).toBe(2);
        expect(groups[0].benchmarkCount).toBe(1);
        expect(groups[0].latestCreatedAt).toBe("2026-01-04T00:00:00.000Z");
        expect(groups[0].presets).toEqual(["research_deep", "standard"]);
    });
});
