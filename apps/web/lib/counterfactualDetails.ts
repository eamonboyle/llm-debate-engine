import type { RunArtifact } from "./data";

export type CounterfactualDetailRow = {
    runId: string;
    question: string;
    model: string;
    pipelinePreset: string;
    failureModes: string[];
    mitigations: string[];
    triggerConditions: string[];
    href: string;
};

function pickStrings(value: unknown, limit = 8): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, limit);
}

function extractCounterfactual(output: unknown): {
    failureModes: string[];
    mitigations: string[];
    triggerConditions: string[];
} {
    if (!output || typeof output !== "object") {
        return { failureModes: [], mitigations: [], triggerConditions: [] };
    }
    const data = (output as { data?: unknown }).data ?? output;
    if (!data || typeof data !== "object") {
        return { failureModes: [], mitigations: [], triggerConditions: [] };
    }

    return {
        failureModes: pickStrings(
            (data as { failureModes?: unknown }).failureModes,
        ),
        mitigations: pickStrings(
            (data as { mitigations?: unknown }).mitigations,
        ),
        triggerConditions: pickStrings(
            (data as { triggerConditions?: unknown }).triggerConditions,
        ),
    };
}

function normalizeText(value: string): string {
    return value.trim().toLowerCase();
}

export function extractCounterfactualDetailsForRuns(
    runs: RunArtifact[],
    opts: {
        failureMode?: string;
        runIds?: Set<string>;
    } = {},
): CounterfactualDetailRow[] {
    const needle = opts.failureMode
        ? normalizeText(opts.failureMode)
        : undefined;
    const rows: CounterfactualDetailRow[] = [];

    for (const run of runs) {
        if (opts.runIds && !opts.runIds.has(run.id)) continue;

        for (const step of run.run.steps) {
            if (step.output?.kind !== "counterfactual") continue;
            const detail = extractCounterfactual(step.output);
            if (detail.failureModes.length === 0) continue;

            if (
                needle &&
                !detail.failureModes.some(
                    (mode) => normalizeText(mode) === needle,
                )
            ) {
                continue;
            }

            rows.push({
                runId: run.id,
                question: run.question,
                model: run.metadata.model,
                pipelinePreset: run.metadata.pipelinePreset,
                failureModes: detail.failureModes,
                mitigations: detail.mitigations,
                triggerConditions: detail.triggerConditions,
                href: `/runs/${run.id}`,
            });
            break;
        }
    }

    return rows.sort((a, b) => a.runId.localeCompare(b.runId));
}

export function aggregateCounterfactualStrings(
    rows: CounterfactualDetailRow[],
    field: "mitigations" | "triggerConditions",
    limit = 12,
): Array<{ text: string; runCount: number }> {
    const counts = new Map<string, { text: string; runIds: Set<string> }>();

    for (const row of rows) {
        for (const text of row[field]) {
            const key = normalizeText(text);
            const existing = counts.get(key);
            if (existing) {
                existing.runIds.add(row.runId);
            } else {
                counts.set(key, { text, runIds: new Set([row.runId]) });
            }
        }
    }

    return [...counts.values()]
        .map((entry) => ({
            text: entry.text,
            runCount: entry.runIds.size,
        }))
        .sort(
            (a, b) =>
                b.runCount - a.runCount || a.text.localeCompare(b.text),
        )
        .slice(0, limit);
}
