import type { RunArtifact } from "./data";

export type CritiqueTypeCount = {
    type: string;
    count: number;
};

function toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object") return {};
    return value as Record<string, unknown>;
}

export function extractCritiqueByType(run: RunArtifact): CritiqueTypeCount[] {
    const critique = toRecord(run.run.metrics.critique);
    const byType = toRecord(critique.byType);

    return Object.entries(byType)
        .map(([type, value]) => ({
            type,
            count:
                typeof value === "number" && Number.isFinite(value) ? value : 0,
        }))
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}
