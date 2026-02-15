import { AgentResponse } from "./types/agent";
import type { Critique, CritiqueIssue } from "./types/agent";

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
