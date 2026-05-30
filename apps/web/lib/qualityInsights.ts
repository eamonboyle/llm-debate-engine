import type { AnalysisIndex } from "./data";

export type QualityRunRow = {
    id: string;
    question: string;
    model: string;
    preset: string;
    createdAt: string;
    coherence: number | null;
    completeness: number | null;
    factualRisk: number | null;
    uncertaintyHandling: number | null;
    issueCount: number;
    traceHref: string;
};

function mean(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildQualityRunRows(index: AnalysisIndex): QualityRunRow[] {
    return index.runs
        .map((run) => ({
            id: run.id,
            question: run.question,
            model: run.model,
            preset: run.pipelinePreset,
            createdAt: run.createdAt,
            coherence: run.quality?.coherence ?? null,
            completeness: run.quality?.completeness ?? null,
            factualRisk: run.quality?.factualRisk ?? null,
            uncertaintyHandling: run.quality?.uncertaintyHandling ?? null,
            issueCount: run.critique.issueCount,
            traceHref: `/runs/${run.id}`,
        }))
        .sort((a, b) => {
            const aCoherence = a.coherence ?? -1;
            const bCoherence = b.coherence ?? -1;
            if (bCoherence !== aCoherence) return bCoherence - aCoherence;
            const aRisk = a.factualRisk ?? 999;
            const bRisk = b.factualRisk ?? 999;
            if (aRisk !== bRisk) return aRisk - bRisk;
            return b.createdAt.localeCompare(a.createdAt);
        });
}

export type QualitySummary = {
    runCount: number;
    withQualityScores: number;
    avgCoherence: number | null;
    avgCompleteness: number | null;
    avgFactualRisk: number | null;
    avgUncertaintyHandling: number | null;
};

export function summarizeQuality(index: AnalysisIndex): QualitySummary {
    const rows = buildQualityRunRows(index);
    const withScores = rows.filter(
        (row) =>
            row.coherence != null ||
            row.completeness != null ||
            row.factualRisk != null ||
            row.uncertaintyHandling != null,
    );

    const pick = (values: Array<number | null>) =>
        mean(
            values.filter(
                (value): value is number => typeof value === "number",
            ),
        );

    return {
        runCount: rows.length,
        withQualityScores: withScores.length,
        avgCoherence: pick(rows.map((row) => row.coherence)),
        avgCompleteness: pick(rows.map((row) => row.completeness)),
        avgFactualRisk: pick(rows.map((row) => row.factualRisk)),
        avgUncertaintyHandling: pick(
            rows.map((row) => row.uncertaintyHandling),
        ),
    };
}
