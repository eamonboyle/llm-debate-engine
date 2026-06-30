import { describe, expect, it } from "vitest";
import type { QuestionGroup } from "./questionGroups";
import { buildTopQuestions } from "./topQuestions";

function makeGroup(
    question: string,
    runCount: number,
    benchmarkCount: number,
    latestCreatedAt: string,
): QuestionGroup {
    return {
        question,
        runCount,
        benchmarkCount,
        latestCreatedAt,
        models: [],
        presets: [],
        sampleRunId: null,
        sampleBenchmarkId: null,
    };
}

describe("buildTopQuestions", () => {
    it("returns questions sorted by total experiment count", () => {
        const rows = buildTopQuestions(
            [
                makeGroup("Small", 1, 0, "2026-01-03T00:00:00.000Z"),
                makeGroup("Large", 5, 2, "2026-01-01T00:00:00.000Z"),
                makeGroup("Medium", 2, 2, "2026-01-02T00:00:00.000Z"),
            ],
            2,
        );

        expect(rows).toHaveLength(2);
        expect(rows[0].question).toBe("Large");
        expect(rows[0].totalExperiments).toBe(7);
        expect(rows[1].question).toBe("Medium");
        expect(rows[0].hubHref).toContain("question=Large");
    });
});
