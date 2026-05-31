import { describe, expect, it } from "vitest";
import type { QuestionGroup } from "./questionGroups";
import { resolveQuestionSortOrder, sortQuestionGroups } from "./questionSort";

const groups: QuestionGroup[] = [
    {
        question: "Alpha",
        runCount: 2,
        benchmarkCount: 0,
        latestCreatedAt: "2026-01-03T00:00:00.000Z",
        models: ["gpt-a"],
        presets: ["standard"],
        sampleRunId: "r1",
        sampleBenchmarkId: null,
    },
    {
        question: "Beta",
        runCount: 5,
        benchmarkCount: 1,
        latestCreatedAt: "2026-01-02T00:00:00.000Z",
        models: ["gpt-b"],
        presets: ["research_deep"],
        sampleRunId: "r2",
        sampleBenchmarkId: "b1",
    },
    {
        question: "Gamma",
        runCount: 1,
        benchmarkCount: 3,
        latestCreatedAt: "2026-01-01T00:00:00.000Z",
        models: ["gpt-c"],
        presets: ["fast_research"],
        sampleRunId: "r3",
        sampleBenchmarkId: "b2",
    },
];

describe("questionSort", () => {
    it("defaults to newest", () => {
        expect(resolveQuestionSortOrder(undefined)).toBe("newest");
        expect(resolveQuestionSortOrder("invalid")).toBe("newest");
    });

    it("sorts by most runs", () => {
        const sorted = sortQuestionGroups(groups, "most-runs");
        expect(sorted.map((g) => g.question)).toEqual([
            "Beta",
            "Alpha",
            "Gamma",
        ]);
    });

    it("sorts by most experiments", () => {
        const sorted = sortQuestionGroups(groups, "most-experiments");
        expect(sorted.map((g) => g.question)).toEqual([
            "Beta",
            "Gamma",
            "Alpha",
        ]);
    });
});
