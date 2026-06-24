import type { RunArtifact } from "./data";
import { filterRunArtifacts, type ArtifactFilterParams } from "./data";

export type JudgeVerdictRow = {
    runId: string;
    question: string;
    model: string;
    preset: string;
    createdAt: string;
    summary: string;
    coherence: number | null;
    completeness: number | null;
    factualRisk: number | null;
    uncertaintyHandling: number | null;
    strengths: string[];
    weaknesses: string[];
    traceHref: string;
};

type JudgementData = {
    summary: string;
    coherence: number | null;
    completeness: number | null;
    factualRisk: number | null;
    uncertaintyHandling: number | null;
    strengths: string[];
    weaknesses: string[];
};

function toNumberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pickStrings(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

function extractJudgement(output: unknown): JudgementData | null {
    if (!output || typeof output !== "object") return null;
    const data = (output as { data?: unknown }).data ?? output;
    if (!data || typeof data !== "object") return null;

    const record = data as Record<string, unknown>;
    const summary =
        typeof record.summary === "string" ? record.summary.trim() : "";
    const strengths = pickStrings(record.strengths);
    const weaknesses = pickStrings(record.weaknesses);
    const rubric =
        record.rubricScores && typeof record.rubricScores === "object"
            ? (record.rubricScores as Record<string, unknown>)
            : record;

    if (
        !summary &&
        strengths.length === 0 &&
        weaknesses.length === 0 &&
        rubric.coherence == null &&
        rubric.completeness == null
    ) {
        return null;
    }

    return {
        summary,
        coherence: toNumberOrNull(rubric.coherence),
        completeness: toNumberOrNull(rubric.completeness),
        factualRisk: toNumberOrNull(rubric.factualRisk),
        uncertaintyHandling: toNumberOrNull(rubric.uncertaintyHandling),
        strengths,
        weaknesses,
    };
}

function verdictMatchesQuery(row: JudgeVerdictRow, query: string): boolean {
    const haystack = [
        row.summary,
        ...row.strengths,
        ...row.weaknesses,
        row.question,
        row.model,
        row.runId,
    ]
        .join(" ")
        .toLowerCase();
    return haystack.includes(query.toLowerCase());
}

export function buildJudgeVerdictRows(
    runs: RunArtifact[],
    filters: ArtifactFilterParams & { verdictQ?: string } = {},
): JudgeVerdictRow[] {
    const filteredRuns = filterRunArtifacts(runs, filters);
    const verdictQuery = filters.verdictQ?.trim();

    const rows: JudgeVerdictRow[] = [];

    for (const run of filteredRuns) {
        for (const step of run.run.steps) {
            if (step.output?.kind !== "judgement") continue;
            const judgement = extractJudgement(step.output);
            if (!judgement) continue;

            const row: JudgeVerdictRow = {
                runId: run.id,
                question: run.question,
                model: run.metadata.model,
                preset: run.metadata.pipelinePreset,
                createdAt: run.metadata.createdAt,
                summary: judgement.summary,
                coherence: judgement.coherence,
                completeness: judgement.completeness,
                factualRisk: judgement.factualRisk,
                uncertaintyHandling: judgement.uncertaintyHandling,
                strengths: judgement.strengths,
                weaknesses: judgement.weaknesses,
                traceHref: `/runs/${run.id}`,
            };

            if (verdictQuery && !verdictMatchesQuery(row, verdictQuery)) {
                continue;
            }

            rows.push(row);
        }
    }

    return rows.sort((a, b) => {
        const aCoherence = a.coherence ?? -1;
        const bCoherence = b.coherence ?? -1;
        if (bCoherence !== aCoherence) return bCoherence - aCoherence;
        const aRisk = a.factualRisk ?? 999;
        const bRisk = b.factualRisk ?? 999;
        if (aRisk !== bRisk) return aRisk - bRisk;
        return b.createdAt.localeCompare(a.createdAt);
    });
}
