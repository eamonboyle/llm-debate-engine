import { describe, expect, it, vi } from "vitest";
import { DebateEngine } from "./DebateEngine";
import type { LLMClient } from "../types/llm";

function step(id: string, agentName: string, role: any, output: any) {
    return {
        id,
        agentName,
        role,
        request: {
            model: "test",
            temperature: 0,
            messages: [],
            schemaName: "x",
            schema: {},
        },
        rawAttempts: [],
        createdAt: new Date().toISOString(),
        output,
        completedAt: new Date().toISOString(),
    };
}

describe("DebateEngine presets", () => {
    const llm: LLMClient = {
        complete: vi.fn(),
        completeStructured: vi.fn(),
    };

    it("runs research preset with decomposition, calibration, and judgement", async () => {
        const engine = new DebateEngine({
            llm,
            agents: {
                decomposer: {
                    name: "QuestionDecomposerAgent",
                    run: vi.fn().mockResolvedValue(
                        step("d1", "QuestionDecomposerAgent", "research", {
                            kind: "decomposition",
                            data: {
                                framing: "Frame",
                                subQuestions: ["SQ1", "SQ2"],
                                hypotheses: ["H1", "H2"],
                            },
                        }),
                    ),
                } as any,
                evidencePlanner: {
                    name: "EvidencePlannerAgent",
                    run: vi.fn().mockResolvedValue(
                        step("e1", "EvidencePlannerAgent", "research", {
                            kind: "evidence_plan",
                            data: {
                                evidenceRequirements: ["Evidence A", "Evidence B"],
                                verificationChecks: ["Check 1", "Check 2"],
                                majorUnknowns: ["Unknown A"],
                                riskLevel: 3,
                            },
                        }),
                    ),
                } as any,
                solver: {
                    name: "SolverAgent",
                    run: vi.fn().mockResolvedValue(
                        step("s1", "SolverAgent", "solver", {
                            kind: "proposal",
                            data: {
                                answer: "A",
                                keyClaims: ["C1"],
                                assumptions: [],
                                confidence: 0.8,
                            },
                        }),
                    ),
                } as any,
                skeptic: {
                    name: "SkepticAgent",
                    run: vi.fn().mockResolvedValue(
                        step("s2", "SkepticAgent", "skeptic", {
                            kind: "critique",
                            data: {
                                targetAgent: "SolverAgent",
                                issues: [
                                    { severity: 3, type: "missing", note: "Missing edge cases" },
                                ],
                            },
                        }),
                    ),
                } as any,
                redTeam: {
                    name: "RedTeamAgent",
                    run: vi.fn().mockResolvedValue(
                        step("s3", "RedTeamAgent", "research", {
                            kind: "critique",
                            data: {
                                targetAgent: "SolverAgent",
                                issues: [
                                    { severity: 4, type: "logic", note: "Adversarial gap" },
                                ],
                            },
                        }),
                    ),
                } as any,
                revision: {
                    name: "SolverRevisionAgent",
                    run: vi.fn().mockResolvedValue(
                        step("s4", "SolverRevisionAgent", "solver", {
                            kind: "proposal",
                            data: {
                                answer: "A revised",
                                keyClaims: ["C1 revised"],
                                assumptions: ["Assume X"],
                                confidence: 0.7,
                            },
                        }),
                    ),
                } as any,
                synthesizer: {
                    name: "SynthesizerAgent",
                    run: vi.fn().mockResolvedValue(
                        step("s5", "SynthesizerAgent", "synthesizer", {
                            kind: "proposal",
                            data: {
                                answer: "Final",
                                keyClaims: ["C final"],
                                assumptions: [],
                                confidence: 0.75,
                            },
                        }),
                    ),
                } as any,
                calibration: {
                    name: "CalibrationAgent",
                    run: vi.fn().mockResolvedValue(
                        step("s6", "CalibrationAgent", "research", {
                            kind: "calibration",
                            data: {
                                adjustedConfidence: 0.65,
                                rationale: "High uncertainty",
                                claimConfidences: [{ claim: "C final", confidence: 0.65 }],
                            },
                        }),
                    ),
                } as any,
                judge: {
                    name: "JudgeAgent",
                    run: vi.fn().mockResolvedValue(
                        step("s7", "JudgeAgent", "research", {
                            kind: "judgement",
                            data: {
                                rubricScores: {
                                    coherence: 4,
                                    completeness: 4,
                                    factualRisk: 3,
                                    uncertaintyHandling: 4,
                                },
                                strengths: ["Clear"],
                                weaknesses: ["Sparse evidence"],
                                summary: "Good but uncertain",
                            },
                        }),
                    ),
                } as any,
            },
        });

        const result = await engine.run(
            { question: "Q" },
            { model: "test", preset: "research_deep", quiet: true },
        );

        expect(result.pipelinePreset).toBe("research_deep");
        expect(result.steps.map((s) => s.agentName)).toEqual([
            "QuestionDecomposerAgent",
            "EvidencePlannerAgent",
            "SolverAgent",
            "SkepticAgent",
            "RedTeamAgent",
            "SolverRevisionAgent",
            "SynthesizerAgent",
            "CalibrationAgent",
            "JudgeAgent",
        ]);
        expect(result.metrics.confidence.calibratedAdjusted).toBe(0.65);
        expect(result.metrics.quality?.coherence).toBe(4);
        expect(result.finalAnswer).toBe("Final");
    });
});
