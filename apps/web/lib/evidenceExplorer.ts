import type { AnalysisIndex } from "./data";

export type EvidenceRiskSummary = {
    riskLevel: number;
    runCount: number;
};

export type RunEvidenceRow = {
    runId: string;
    question: string;
    model: string;
    pipelinePreset: string;
    evidenceRiskLevel: number;
    href: string;
};

export function buildEvidenceRiskSummaries(
    index: AnalysisIndex,
): EvidenceRiskSummary[] {
    const distribution =
        index.aggregates.evidencePlanning?.riskLevelDistribution ?? {};
    const fromRuns = new Map<number, number>();

    for (const run of index.runs) {
        const level = run.research?.evidenceRiskLevel;
        if (typeof level === "number" && Number.isFinite(level)) {
            fromRuns.set(level, (fromRuns.get(level) ?? 0) + 1);
        }
    }

    const levels = new Set([
        ...Object.keys(distribution).map((key) => Number(key)),
        ...fromRuns.keys(),
    ]);

    return [...levels]
        .filter((level) => Number.isFinite(level))
        .sort((a, b) => a - b)
        .map((riskLevel) => ({
            riskLevel,
            runCount:
                fromRuns.get(riskLevel) ??
                Number(distribution[String(riskLevel)] ?? 0),
        }))
        .filter((row) => row.runCount > 0);
}

export function listRunsForEvidenceRisk(
    index: AnalysisIndex,
    riskLevel: number,
): RunEvidenceRow[] {
    if (!Number.isFinite(riskLevel)) return [];

    const rows: RunEvidenceRow[] = [];

    for (const run of index.runs) {
        const level = run.research?.evidenceRiskLevel;
        if (level !== riskLevel) continue;

        rows.push({
            runId: run.id,
            question: run.question,
            model: run.model,
            pipelinePreset: run.pipelinePreset,
            evidenceRiskLevel: level,
            href: `/runs/${run.id}`,
        });
    }

    return rows.sort(
        (a, b) =>
            b.evidenceRiskLevel - a.evidenceRiskLevel ||
            a.runId.localeCompare(b.runId),
    );
}

export function summarizeEvidencePlanning(index: AnalysisIndex) {
    const planning = index.aggregates.evidencePlanning;
    const rows = index.runs.filter(
        (run) => typeof run.research?.evidenceRiskLevel === "number",
    );

    return {
        runCountWithRisk: rows.length,
        riskLevelMean: planning?.riskLevelMean ?? null,
        distribution: planning?.riskLevelDistribution ?? {},
        highRiskCount: rows.filter(
            (run) => (run.research?.evidenceRiskLevel ?? 0) >= 4,
        ).length,
    };
}
