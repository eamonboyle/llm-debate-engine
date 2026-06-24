import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import { buildJudgeVerdictRows } from "./judgeVerdictBrowser";

function makeRun(overrides: Partial<RunArtifact> = {}): RunArtifact {
    return {
        kind: "run",
        id: "run_judge",
        question: "Should we adopt policy X?",
        metadata: {
            createdAt: "2026-01-02T00:00:00.000Z",
            model: "gpt-judge",
            pipelinePreset: "research_deep",
            fastMode: false,
        },
        run: {
            id: "run_judge",
            finalAnswer: "Yes, with caveats.",
            steps: [
                {
                    id: "step-judge",
                    agentName: "Judge",
                    role: "research",
                    output: {
                        kind: "judgement",
                        data: {
                            summary:
                                "Well-structured answer with clear tradeoffs.",
                            rubricScores: {
                                coherence: 4.5,
                                completeness: 4,
                                factualRisk: 2,
                                uncertaintyHandling: 4,
                            },
                            strengths: ["Clear framing"],
                            weaknesses: ["Limited evidence"],
                        },
                    },
                },
            ],
            metrics: {},
        },
        ...overrides,
    };
}

describe("judgeVerdictBrowser", () => {
    it("extracts judge verdict rows from run artifacts", () => {
        const rows = buildJudgeVerdictRows([makeRun()]);
        expect(rows).toHaveLength(1);
        expect(rows[0].summary).toContain("Well-structured");
        expect(rows[0].coherence).toBe(4.5);
        expect(rows[0].strengths).toEqual(["Clear framing"]);
    });

    it("filters by verdict query across summary and themes", () => {
        const rows = buildJudgeVerdictRows([makeRun()], {
            verdictQ: "limited evidence",
        });
        expect(rows).toHaveLength(1);

        const empty = buildJudgeVerdictRows([makeRun()], {
            verdictQ: "nonexistent phrase",
        });
        expect(empty).toHaveLength(0);
    });
});
