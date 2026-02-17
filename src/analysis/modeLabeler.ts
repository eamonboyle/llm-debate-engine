export type ModeLabel =
    | "high-risk framing"
    | "policy-oriented"
    | "technical framing"
    | "economic framing"
    | "general framing";

export function inferModeLabel(exemplarPreview: string): ModeLabel {
    const text = exemplarPreview.toLowerCase();
    if (text.includes("existential") || text.includes("catastrophic")) {
        return "high-risk framing";
    }
    if (text.includes("policy") || text.includes("governance")) {
        return "policy-oriented";
    }
    if (text.includes("technical") || text.includes("alignment")) {
        return "technical framing";
    }
    if (text.includes("economic") || text.includes("jobs")) {
        return "economic framing";
    }
    return "general framing";
}
