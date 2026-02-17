import { describe, it, expect } from "vitest";
import {
    validateAgentResponse,
    validateCalibration,
    validateCritique,
    validateEvidencePlan,
    validateJudgement,
    validateQuestionDecomposition,
} from "./validator";

describe("validateAgentResponse", () => {
    const valid = {
        answer: "Rust is safer than C++ for memory safety.",
        keyClaims: ["Rust enforces ownership at compile time."],
        assumptions: ["Comparing typical usage."],
        confidence: 0.8,
    };

    it("accepts valid response", () => {
        const r = validateAgentResponse(valid);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.data.answer).toBe(valid.answer);
            expect(r.data.confidence).toBe(0.8);
        }
    });

    it("rejects non-object", () => {
        expect(validateAgentResponse(null).ok).toBe(false);
        expect(validateAgentResponse("x").ok).toBe(false);
    });

    it("rejects short answer", () => {
        const r = validateAgentResponse({ ...valid, answer: "x" });
        expect(r.ok).toBe(false);
        if (r.ok === false) {
            expect(r.error).toContain("answer");
        }
    });

    it("rejects empty keyClaims", () => {
        const r = validateAgentResponse({ ...valid, keyClaims: [] });
        expect(r.ok).toBe(false);
    });

    it("rejects invalid confidence", () => {
        expect(validateAgentResponse({ ...valid, confidence: 1.5 }).ok).toBe(false);
        expect(validateAgentResponse({ ...valid, confidence: -0.1 }).ok).toBe(false);
    });

    it("rejects keyClaims with JSON-like fragment", () => {
        const r = validateAgentResponse({
            ...valid,
            keyClaims: ["Valid claim", '{"invalid": true}'],
        });
        expect(r.ok).toBe(false);
    });
});

describe("validateCritique", () => {
    const valid = {
        targetAgent: "SolverAgent",
        issues: [
            { severity: 3, type: "ambiguity", note: "The claim is underspecified." },
        ],
    } as const;

    it("accepts valid critique", () => {
        const r = validateCritique(valid);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.data.targetAgent).toBe("SolverAgent");
            expect(r.data.issues).toHaveLength(1);
        }
    });

    it("rejects non-object", () => {
        expect(validateCritique(null).ok).toBe(false);
    });

    it("rejects short targetAgent", () => {
        const r = validateCritique({ ...valid, targetAgent: "x" });
        expect(r.ok).toBe(false);
    });

    it("rejects empty issues", () => {
        const r = validateCritique({ ...valid, issues: [] });
        expect(r.ok).toBe(false);
    });

    it("rejects invalid severity", () => {
        const r = validateCritique({
            ...valid,
            issues: [{ severity: 0, type: "factual", note: "Invalid severity." }],
        });
        expect(r.ok).toBe(false);
    });

    it("rejects invalid issue type", () => {
        const r = validateCritique({
            ...valid,
            issues: [{ severity: 2, type: "invalid", note: "Wrong type." }],
        });
        expect(r.ok).toBe(false);
    });
});

describe("validateQuestionDecomposition", () => {
    it("accepts valid decomposition", () => {
        const r = validateQuestionDecomposition({
            framing: "Evaluate tradeoffs and risks",
            subQuestions: ["What are key benefits?", "What are key risks?"],
            hypotheses: ["Benefits dominate short term", "Risks grow at scale"],
        });
        expect(r.ok).toBe(true);
    });

    it("rejects invalid decomposition", () => {
        const r = validateQuestionDecomposition({
            framing: "x",
            subQuestions: [],
            hypotheses: [],
        });
        expect(r.ok).toBe(false);
    });
});

describe("validateCalibration", () => {
    it("accepts valid calibration", () => {
        const r = validateCalibration({
            adjustedConfidence: 0.6,
            rationale: "Evidence is mixed",
            claimConfidences: [{ claim: "Claim A", confidence: 0.6 }],
        });
        expect(r.ok).toBe(true);
    });

    it("rejects invalid calibration", () => {
        const r = validateCalibration({
            adjustedConfidence: 2,
            rationale: "",
            claimConfidences: [],
        });
        expect(r.ok).toBe(false);
    });
});

describe("validateEvidencePlan", () => {
    it("accepts valid evidence plans", () => {
        const r = validateEvidencePlan({
            evidenceRequirements: ["Independent evaluations", "Domain citations"],
            verificationChecks: ["Cross-check core claims", "Verify quantitative assumptions"],
            majorUnknowns: ["Long-term model drift"],
            riskLevel: 4,
        });
        expect(r.ok).toBe(true);
    });

    it("rejects malformed evidence plans", () => {
        const r = validateEvidencePlan({
            evidenceRequirements: [],
            verificationChecks: ["x"],
            majorUnknowns: ["ok"],
            riskLevel: 9,
        });
        expect(r.ok).toBe(false);
    });
});

describe("validateJudgement", () => {
    it("accepts valid judgement", () => {
        const r = validateJudgement({
            rubricScores: {
                coherence: 4,
                completeness: 3,
                factualRisk: 2,
                uncertaintyHandling: 4,
            },
            strengths: ["clear argument"],
            weaknesses: ["few citations"],
            summary: "Overall solid with moderate caveats",
        });
        expect(r.ok).toBe(true);
    });

    it("rejects invalid judgement", () => {
        const r = validateJudgement({
            rubricScores: {
                coherence: 7,
                completeness: 3,
                factualRisk: 2,
                uncertaintyHandling: 4,
            },
            strengths: [],
            weaknesses: [],
            summary: "bad",
        });
        expect(r.ok).toBe(false);
    });
});
