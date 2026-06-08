import type { AnalysisIndex } from "./data";

export type IssueTypeSummary = {
    type: string;
    totalCount: number;
    runCount: number;
    avgSeverity?: number;
    maxSeverity?: number;
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
    options?: { useAggregateSeverity?: boolean },
): IssueTypeSummary[] {
    const runCounts = new Map<string, number>();
    const totalCounts = new Map<string, number>();

    for (const run of index.runs) {
        const byType = run.critique.byType ?? {};
        for (const [type, count] of Object.entries(byType)) {
            if (count > 0) {
                runCounts.set(type, (runCounts.get(type) ?? 0) + 1);
                totalCounts.set(type, (totalCounts.get(type) ?? 0) + count);
            }
        }
    }

    const severityByType = new Map(
        (index.aggregates.issueSeverityByType ?? []).map((entry) => [
            entry.type,
            entry,
        ]),
    );

    const useAggregateSeverity = options?.useAggregateSeverity ?? true;

    return [...totalCounts.entries()]
        .map(([type, totalCount]) => {
            const aggregateSeverity = severityByType.get(type);
            let avgSeverity = aggregateSeverity?.avgSeverity;
            let maxSeverity = aggregateSeverity?.maxSeverity;

            if (!useAggregateSeverity) {
                const severities: number[] = [];
                for (const run of index.runs) {
                    const byType = run.critique.byType ?? {};
                    const countForType = Object.entries(byType).find(
                        ([issueType]) =>
                            issueType.toLowerCase() === type.toLowerCase(),
                    )?.[1];
                    if (!countForType || countForType <= 0) continue;
                    if (typeof run.critique.maxSeverity === "number") {
                        severities.push(run.critique.maxSeverity);
                    }
                }
                avgSeverity =
                    severities.length > 0
                        ? severities.reduce((sum, value) => sum + value, 0) /
                          severities.length
                        : undefined;
                maxSeverity =
                    severities.length > 0 ? Math.max(...severities) : undefined;
            }

            return {
                type,
                totalCount,
                runCount: runCounts.get(type) ?? 0,
                avgSeverity,
                maxSeverity,
            };
        })
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
