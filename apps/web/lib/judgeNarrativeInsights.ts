import type { RunArtifact } from "./data";

export type NarrativeTheme = {
    text: string;
    count: number;
    runCount: number;
    sampleRunId: string;
};

function extractJudgementLists(output: unknown): {
    strengths: string[];
    weaknesses: string[];
} {
    if (!output || typeof output !== "object") {
        return { strengths: [], weaknesses: [] };
    }
    const data = (output as { data?: unknown }).data ?? output;
    if (!data || typeof data !== "object") {
        return { strengths: [], weaknesses: [] };
    }

    const pickStrings = (value: unknown): string[] => {
        if (!Array.isArray(value)) return [];
        return value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    };

    return {
        strengths: pickStrings((data as { strengths?: unknown }).strengths),
        weaknesses: pickStrings((data as { weaknesses?: unknown }).weaknesses),
    };
}

function aggregateThemes(
    entries: Array<{ text: string; runId: string }>,
    limit = 12,
): NarrativeTheme[] {
    const byText = new Map<
        string,
        { count: number; runIds: Set<string>; sampleRunId: string }
    >();

    for (const entry of entries) {
        const key = entry.text.toLowerCase();
        const existing = byText.get(key);
        if (existing) {
            existing.count += 1;
            existing.runIds.add(entry.runId);
        } else {
            byText.set(key, {
                count: 1,
                runIds: new Set([entry.runId]),
                sampleRunId: entry.runId,
            });
        }
    }

    return [...byText.entries()]
        .map(([key, value]) => {
            const text =
                entries.find((entry) => entry.text.toLowerCase() === key)
                    ?.text ?? key;
            return {
                text,
                count: value.count,
                runCount: value.runIds.size,
                sampleRunId: value.sampleRunId,
            };
        })
        .sort(
            (a, b) =>
                b.runCount - a.runCount ||
                b.count - a.count ||
                a.text.localeCompare(b.text),
        )
        .slice(0, limit);
}

export function aggregateJudgeNarratives(
    runs: RunArtifact[],
    runIds?: Set<string>,
): { strengths: NarrativeTheme[]; weaknesses: NarrativeTheme[] } {
    const strengthEntries: Array<{ text: string; runId: string }> = [];
    const weaknessEntries: Array<{ text: string; runId: string }> = [];

    for (const run of runs) {
        if (runIds && !runIds.has(run.id)) continue;
        for (const step of run.run.steps) {
            if (step.output?.kind !== "judgement") continue;
            const { strengths, weaknesses } = extractJudgementLists(
                step.output,
            );
            for (const text of strengths) {
                strengthEntries.push({ text, runId: run.id });
            }
            for (const text of weaknesses) {
                weaknessEntries.push({ text, runId: run.id });
            }
        }
    }

    return {
        strengths: aggregateThemes(strengthEntries),
        weaknesses: aggregateThemes(weaknessEntries),
    };
}
