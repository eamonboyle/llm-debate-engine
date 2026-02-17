import { AgentResponse } from "./types/agent";
import type { Critique, CritiqueIssue } from "./types/agent";
import type {
    Calibration,
    Counterfactual,
    EvidencePlan,
    Judgement,
    QuestionDecomposition,
} from "./types/agent";

/**
 * Validates that a value conforms to the {@link AgentResponse} shape.
 * Used to validate LLM outputs before use in the debate pipeline.
 *
 * @param value - Unknown value (typically parsed JSON from an LLM response)
 * @returns Discriminated union: `{ ok: true, data }` on success, or `{ ok: false, error }` with a message on failure
 *
 * Validation rules:
 * - Must be a non-null object
 * - `answer`: non-empty string (min 5 chars after trim)
 * - `keyClaims`: non-empty array of strings (5–250 chars each, no JSON-like fragments)
 * - `assumptions`: array of strings (may be empty)
 * - `confidence`: number in [0, 1]
 */
export function validateAgentResponse(
    value: unknown,
): { ok: true; data: AgentResponse } | { ok: false; error: string } {
    if (typeof value !== "object" || value === null)
        return { ok: false, error: "Not an object" };

    const v = value as any;

    if (typeof v.answer !== "string" || v.answer.trim().length < 5)
        return { ok: false, error: "answer invalid" };
    if (!Array.isArray(v.keyClaims) || v.keyClaims.length < 1)
        return { ok: false, error: "keyClaims missing/empty" };
    if (!Array.isArray(v.assumptions))
        return { ok: false, error: "assumptions missing" };
    if (
        typeof v.confidence !== "number" ||
        v.confidence < 0 ||
        v.confidence > 1
    )
        return { ok: false, error: "confidence invalid" };

    const badFragment = /[\{\}\[\]]|"\]\}\{"|"\}\s*,|\\n\{|\]\}|\{\s*"/;

    for (const c of v.keyClaims) {
        if (typeof c !== "string")
            return { ok: false, error: "keyClaims contains non-string" };
        const t = c.trim();
        if (t.length < 5)
            return {
                ok: false,
                error: "keyClaims contains very short junk token",
            };
        if (t.length > 250)
            return { ok: false, error: "keyClaims contains overly long entry" };
        if (badFragment.test(t))
            return {
                ok: false,
                error: `keyClaims contains JSON-like fragment: ${t.slice(0, 30)}...`,
            };
    }

    for (const a of v.assumptions) {
        if (typeof a !== "string")
            return { ok: false, error: "assumptions contains non-string" };
    }

    return { ok: true, data: v as AgentResponse };
}

/**
 * Validates that a value conforms to the {@link Critique} shape.
 * Used to validate skeptic/critic LLM outputs before use in the debate pipeline.
 *
 * @param value - Unknown value (typically parsed JSON from an LLM response)
 * @returns Discriminated union: `{ ok: true, data }` on success, or `{ ok: false, error }` with a message on failure
 *
 * Validation rules:
 * - Must be a non-null object
 * - `targetAgent`: non-empty string (min 2 chars after trim)
 * - `issues`: non-empty array of issue objects, each with:
 *   - `severity`: 1–5
 *   - `type`: "factual" | "logic" | "missing" | "ambiguity" | "overconfidence"
 *   - `note`: non-empty string (min 5 chars after trim)
 */
export function validateCritique(
    value: unknown,
): { ok: true; data: Critique } | { ok: false; error: string } {
    if (typeof value !== "object" || value === null)
        return { ok: false, error: "Not an object" };
    const v = value as any;

    if (typeof v.targetAgent !== "string" || v.targetAgent.trim().length < 2) {
        return { ok: false, error: "targetAgent invalid" };
    }

    if (!Array.isArray(v.issues) || v.issues.length < 1) {
        return { ok: false, error: "issues missing/empty" };
    }

    for (const it of v.issues as any[]) {
        if (typeof it !== "object" || it === null)
            return { ok: false, error: "issue not an object" };

        const sev = it.severity;
        if (![1, 2, 3, 4, 5].includes(sev))
            return { ok: false, error: "issue severity invalid" };

        const t = it.type;
        if (
            ![
                "factual",
                "logic",
                "missing",
                "ambiguity",
                "overconfidence",
            ].includes(t)
        ) {
            return { ok: false, error: "issue type invalid" };
        }

        if (typeof it.note !== "string" || it.note.trim().length < 5) {
            return { ok: false, error: "issue note invalid" };
        }
    }

    return { ok: true, data: v as Critique };
}

export function validateQuestionDecomposition(
    value: unknown,
): { ok: true; data: QuestionDecomposition } | { ok: false; error: string } {
    if (typeof value !== "object" || value === null)
        return { ok: false, error: "Not an object" };
    const v = value as any;

    if (typeof v.framing !== "string" || v.framing.trim().length < 5) {
        return { ok: false, error: "framing invalid" };
    }

    if (!Array.isArray(v.subQuestions) || v.subQuestions.length < 1) {
        return { ok: false, error: "subQuestions missing/empty" };
    }
    if (!Array.isArray(v.hypotheses) || v.hypotheses.length < 1) {
        return { ok: false, error: "hypotheses missing/empty" };
    }

    const allStrings = [...v.subQuestions, ...v.hypotheses].every(
        (s) => typeof s === "string" && s.trim().length > 2,
    );
    if (!allStrings) {
        return { ok: false, error: "subQuestions/hypotheses contain invalid item" };
    }

    return { ok: true, data: v as QuestionDecomposition };
}

export function validateCalibration(
    value: unknown,
): { ok: true; data: Calibration } | { ok: false; error: string } {
    if (typeof value !== "object" || value === null)
        return { ok: false, error: "Not an object" };
    const v = value as any;

    if (
        typeof v.adjustedConfidence !== "number" ||
        v.adjustedConfidence < 0 ||
        v.adjustedConfidence > 1
    ) {
        return { ok: false, error: "adjustedConfidence invalid" };
    }
    if (typeof v.rationale !== "string" || v.rationale.trim().length < 5) {
        return { ok: false, error: "rationale invalid" };
    }
    if (!Array.isArray(v.claimConfidences)) {
        return { ok: false, error: "claimConfidences missing" };
    }

    for (const entry of v.claimConfidences as any[]) {
        if (typeof entry !== "object" || entry === null) {
            return { ok: false, error: "claim confidence entry invalid" };
        }
        if (typeof entry.claim !== "string" || entry.claim.trim().length < 3) {
            return { ok: false, error: "claim invalid" };
        }
        if (
            typeof entry.confidence !== "number" ||
            entry.confidence < 0 ||
            entry.confidence > 1
        ) {
            return { ok: false, error: "claim confidence invalid" };
        }
    }

    return { ok: true, data: v as Calibration };
}

export function validateEvidencePlan(
    value: unknown,
): { ok: true; data: EvidencePlan } | { ok: false; error: string } {
    if (typeof value !== "object" || value === null)
        return { ok: false, error: "Not an object" };
    const v = value as any;

    const listFields = [
        "evidenceRequirements",
        "verificationChecks",
        "majorUnknowns",
    ] as const;
    for (const field of listFields) {
        if (!Array.isArray(v[field]) || v[field].length < 1) {
            return { ok: false, error: `${field} missing/empty` };
        }
        const valid = v[field].every(
            (item: unknown) => typeof item === "string" && item.trim().length >= 3,
        );
        if (!valid) {
            return { ok: false, error: `${field} contains invalid item` };
        }
    }

    if (![1, 2, 3, 4, 5].includes(v.riskLevel)) {
        return { ok: false, error: "riskLevel invalid" };
    }

    return { ok: true, data: v as EvidencePlan };
}

export function validateCounterfactual(
    value: unknown,
): { ok: true; data: Counterfactual } | { ok: false; error: string } {
    if (typeof value !== "object" || value === null)
        return { ok: false, error: "Not an object" };
    const v = value as any;

    const fields = ["failureModes", "triggerConditions", "mitigations"] as const;
    for (const field of fields) {
        if (!Array.isArray(v[field]) || v[field].length < 1) {
            return { ok: false, error: `${field} missing/empty` };
        }
        const validItems = v[field].every(
            (item: unknown) => typeof item === "string" && item.trim().length >= 3,
        );
        if (!validItems) {
            return { ok: false, error: `${field} contains invalid item` };
        }
    }

    return { ok: true, data: v as Counterfactual };
}

export function validateJudgement(
    value: unknown,
): { ok: true; data: Judgement } | { ok: false; error: string } {
    if (typeof value !== "object" || value === null)
        return { ok: false, error: "Not an object" };
    const v = value as any;
    const scores = v.rubricScores;
    if (typeof scores !== "object" || scores === null) {
        return { ok: false, error: "rubricScores missing" };
    }

    const numericFields = [
        "coherence",
        "completeness",
        "factualRisk",
        "uncertaintyHandling",
    ] as const;
    for (const field of numericFields) {
        const score = scores[field];
        if (typeof score !== "number" || score < 1 || score > 5) {
            return { ok: false, error: `${field} score invalid` };
        }
    }

    if (
        !Array.isArray(v.strengths) ||
        !v.strengths.every((s: unknown) => typeof s === "string")
    ) {
        return { ok: false, error: "strengths invalid" };
    }
    if (
        !Array.isArray(v.weaknesses) ||
        !v.weaknesses.every((s: unknown) => typeof s === "string")
    ) {
        return { ok: false, error: "weaknesses invalid" };
    }
    if (typeof v.summary !== "string" || v.summary.trim().length < 5) {
        return { ok: false, error: "summary invalid" };
    }

    return { ok: true, data: v as Judgement };
}
