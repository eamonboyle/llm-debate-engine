export function validateAgentResponse(value: unknown): { ok: true; data: AgentResponse } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) return { ok: false, error: "Not an object" }

  const v = value as any

  if (typeof v.answer !== "string" || v.answer.trim().length < 5) return { ok: false, error: "answer invalid" }
  if (!Array.isArray(v.keyClaims) || v.keyClaims.length < 1) return { ok: false, error: "keyClaims missing/empty" }
  if (!Array.isArray(v.assumptions)) return { ok: false, error: "assumptions missing" }
  if (typeof v.confidence !== "number" || v.confidence < 0 || v.confidence > 1) return { ok: false, error: "confidence invalid" }

  const badFragment = /[\{\}\[\]]|"\]\}\{"|"\}\s*,|\\n\{|\]\}|\{\s*"/

  for (const c of v.keyClaims) {
    if (typeof c !== "string") return { ok: false, error: "keyClaims contains non-string" }
    const t = c.trim()
    if (t.length < 5) return { ok: false, error: "keyClaims contains very short junk token" }
    if (t.length > 250) return { ok: false, error: "keyClaims contains overly long entry" }
    if (badFragment.test(t)) return { ok: false, error: `keyClaims contains JSON-like fragment: ${t.slice(0, 30)}...` }
  }

  for (const a of v.assumptions) {
    if (typeof a !== "string") return { ok: false, error: "assumptions contains non-string" }
  }

  return { ok: true, data: v as AgentResponse }
}
