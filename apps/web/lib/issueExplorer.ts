import type { AnalysisIndex } from "./data";

export type IssueTypeSummary = {
    type: string;
    totalCount: number;
    runCount: number;
};

export type RunIssueRow = {
    runId: string;
    question: string;
    model: string;
    pipelinePreset: string;
    issueCount: number;
    countForType: number;
    maxSeverity?: number;
    href: string;
};

export function buildIssueTypeSummaries(
    index: AnalysisIndex,
): IssueTypeSummary[] {
    const runCounts = new Map<string, number>();

    for (const run of index.runs) {
        const byType = run.critique.byType ?? {};
        for (const [type, count] of Object.entries(byType)) {
            if (count > 0) {
                runCounts.set(type, (runCounts.get(type) ?? 0) + 1);
            }
        }
    }

    return Object.entries(index.aggregates.issueTypeCounts)
        .map(([type, totalCount]) => ({
            type,
            totalCount,
            runCount: runCounts.get(type) ?? 0,
        }))
        .sort((a, b) => b.totalCount - a.totalCount);
}

export function listRunsForIssueType(
    index: AnalysisIndex,
    issueType: string,
): RunIssueRow[] {
    const normalized = issueType.trim().toLowerCase();
    if (!normalized) return [];

    const rows: RunIssueRow[] = [];

    for (const run of index.runs) {
        const byType = run.critique.byType ?? {};
        const countForType = Object.entries(byType).find(
            ([type]) => type.toLowerCase() === normalized,
        )?.[1];
        if (!countForType || countForType <= 0) continue;

        rows.push({
            runId: run.id,
            question: run.question,
            model: run.model,
            pipelinePreset: run.pipelinePreset,
            issueCount: run.critique.issueCount,
            countForType,
            maxSeverity: run.critique.maxSeverity,
            href: `/runs/${run.id}`,
        });
    }

    return rows.sort((a, b) => b.countForType - a.countForType);
}
