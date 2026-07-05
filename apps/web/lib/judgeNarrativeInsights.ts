import type { RunArtifact } from "./data";

export type NarrativeThemeKind = "strength" | "weakness";

export type NarrativeThemeRunRow = {
    runId: string;
    question: string;
    model: string;
    preset: string;
    traceHref: string;
};

export type JudgeSummaryRow = {
    runId: string;
    question: string;
    model: string;
    preset: string;
    summary: string;
    coherence: number | null;
    factualRisk: number | null;
    traceHref: string;
};

export type NarrativeTheme = {
    text: string;
    count: number;
    runCount: number;
    sampleRunId: string;
};

function extractJudgementSummary(output: unknown): string | null {
    if (!output || typeof output !== "object") return null;
    const data = (output as { data?: unknown }).data ?? output;
    if (!data || typeof data !== "object") return null;
    const summary = (data as { summary?: unknown }).summary;
    if (typeof summary !== "string") return null;
    const trimmed = summary.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function extractRubricScores(output: unknown): {
    coherence: number | null;
    factualRisk: number | null;
} {
    if (!output || typeof output !== "object") {
        return { coherence: null, factualRisk: null };
    }
    const data = (output as { data?: unknown }).data ?? output;
    if (!data || typeof data !== "object") {
        return { coherence: null, factualRisk: null };
    }
    const rubric = (data as { rubricScores?: unknown }).rubricScores;
    if (!rubric || typeof rubric !== "object") {
        return { coherence: null, factualRisk: null };
    }
    const coherence = (rubric as { coherence?: unknown }).coherence;
    const factualRisk = (rubric as { factualRisk?: unknown }).factualRisk;
    return {
        coherence:
            typeof coherence === "number" && Number.isFinite(coherence)
                ? coherence
                : null,
        factualRisk:
            typeof factualRisk === "number" && Number.isFinite(factualRisk)
                ? factualRisk
                : null,
    };
}

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

function normalizeThemeText(text: string): string {
    return text.trim().toLowerCase();
}

export function listRunsForNarrativeTheme(
    runs: RunArtifact[],
    themeText: string,
    kind: NarrativeThemeKind,
    scopeRunIds?: Set<string>,
): NarrativeThemeRunRow[] {
    const needle = normalizeThemeText(themeText);
    if (!needle) return [];

    const matches = new Map<string, NarrativeThemeRunRow>();

    for (const run of runs) {
        if (scopeRunIds && !scopeRunIds.has(run.id)) continue;

        for (const step of run.run.steps) {
            if (step.output?.kind !== "judgement") continue;
            const { strengths, weaknesses } = extractJudgementLists(
                step.output,
            );
            const texts = kind === "strength" ? strengths : weaknesses;
            const hasTheme = texts.some(
                (text) => normalizeThemeText(text) === needle,
            );
            if (!hasTheme || matches.has(run.id)) continue;

            matches.set(run.id, {
                runId: run.id,
                question: run.question,
                model: run.metadata.model,
                preset: run.metadata.pipelinePreset,
                traceHref: `/runs/${run.id}`,
            });
        }
    }

    return [...matches.values()].sort((a, b) => b.runId.localeCompare(a.runId));
}

export function listJudgeSummaries(
    runs: RunArtifact[],
    scopeRunIds?: Set<string>,
    searchQuery?: string,
): JudgeSummaryRow[] {
    const needle = searchQuery?.trim().toLowerCase();
    const rows: JudgeSummaryRow[] = [];

    for (const run of runs) {
        if (scopeRunIds && !scopeRunIds.has(run.id)) continue;

        for (const step of run.run.steps) {
            if (step.output?.kind !== "judgement") continue;
            const summary = extractJudgementSummary(step.output);
            if (!summary) continue;
            if (
                needle &&
                !summary.toLowerCase().includes(needle) &&
                !run.question.toLowerCase().includes(needle)
            ) {
                continue;
            }

            const scores = extractRubricScores(step.output);
            rows.push({
                runId: run.id,
                question: run.question,
                model: run.metadata.model,
                preset: run.metadata.pipelinePreset,
                summary,
                coherence: scores.coherence,
                factualRisk: scores.factualRisk,
                traceHref: `/runs/${run.id}`,
            });
            break;
        }
    }

    return rows.sort(
        (a, b) =>
            (b.coherence ?? 0) - (a.coherence ?? 0) ||
            (a.factualRisk ?? 99) - (b.factualRisk ?? 99) ||
            b.runId.localeCompare(a.runId),
    );
}
