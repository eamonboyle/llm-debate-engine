import { describe, it, expect } from "vitest";
import { validateAgentResponse, validateCritique } from "./validator";

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
