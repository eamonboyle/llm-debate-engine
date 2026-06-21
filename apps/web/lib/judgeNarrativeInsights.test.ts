import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import { aggregateJudgeNarratives } from "./judgeNarrativeInsights";

function makeRunWithJudgement(
    id: string,
    strengths: string[],
    weaknesses: string[],
): RunArtifact {
    return {
        kind: "run",
        id,
        question: "Test?",
        metadata: {
            createdAt: "2026-01-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "research_deep",
            fastMode: false,
        },
        run: {
            id,
            finalAnswer: "answer",
            steps: [
                {
                    id: "step-1",
                    agentName: "Judge",
                    role: "research",
                    request: { model: "gpt-test", messages: [] },
                    rawAttempts: [],
                    output: {
                        kind: "judgement",
                        data: {
                            rubricScores: {
                                coherence: 4,
                                completeness: 3,
                                factualRisk: 2,
                                uncertaintyHandling: 3,
                            },
                            strengths,
                            weaknesses,
                            summary: "Summary",
                        },
                    },
                    completedAt: "2026-01-01T00:00:00.000Z",
                },
            ],
            metrics: {},
        },
    };
}

describe("aggregateJudgeNarratives", () => {
    it("aggregates recurring strengths and weaknesses", () => {
        const runs = [
            makeRunWithJudgement("run_a", ["Clear structure"], ["Thin evidence"]),
            makeRunWithJudgement(
                "run_b",
                ["Clear structure"],
                ["Thin evidence", "No scenarios"],
            ),
        ];

        const { strengths, weaknesses } = aggregateJudgeNarratives(runs);
        expect(strengths[0]).toMatchObject({
            text: "Clear structure",
            runCount: 2,
        });
        expect(weaknesses[0]).toMatchObject({
            text: "Thin evidence",
            runCount: 2,
        });
        expect(weaknesses[1]?.text).toBe("No scenarios");
    });
});
