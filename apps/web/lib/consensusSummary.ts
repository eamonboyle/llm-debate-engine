import type { RunArtifact } from "./data";

type ConsensusPair = {
    a: string;
    b: string;
    similarity: number;
};

export type ConsensusSummaryData = {
    strength: number | null;
    included: string[];
    pairs: ConsensusPair[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

export function extractConsensusSummary(
    run: RunArtifact,
): ConsensusSummaryData | null {
    const consensus = run.run.metrics.consensus;
    if (!isRecord(consensus)) return null;

    const strength =
        typeof consensus.strength === "number" ? consensus.strength : null;
    const included = Array.isArray(consensus.included)
        ? consensus.included.filter((v): v is string => typeof v === "string")
        : [];
    const pairs = Array.isArray(consensus.pairs)
        ? consensus.pairs
              .filter((v): v is Record<string, unknown> => isRecord(v))
              .map((pair) => ({
                  a: String(pair.a ?? ""),
                  b: String(pair.b ?? ""),
                  similarity:
                      typeof pair.similarity === "number"
                          ? pair.similarity
                          : NaN,
              }))
              .filter((pair) => Number.isFinite(pair.similarity))
        : [];

    if (strength == null && included.length === 0 && pairs.length === 0) {
        return null;
    }

    return { strength, included, pairs };
}
