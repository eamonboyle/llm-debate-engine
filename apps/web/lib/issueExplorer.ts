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

function mean(values: number[]): number | undefined {
    if (values.length === 0) return undefined;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildIssueTypeSummaries(
    index: AnalysisIndex,
): IssueTypeSummary[] {
    const totalCounts = new Map<string, number>();
    const runCounts = new Map<string, number>();
    const severitiesByType = new Map<string, number[]>();

    for (const run of index.runs) {
        const byType = run.critique.byType ?? {};
        for (const [type, count] of Object.entries(byType)) {
            if (count <= 0) continue;
            totalCounts.set(type, (totalCounts.get(type) ?? 0) + count);
            runCounts.set(type, (runCounts.get(type) ?? 0) + 1);
            if (typeof run.critique.maxSeverity === "number") {
                const bucket = severitiesByType.get(type) ?? [];
                bucket.push(run.critique.maxSeverity);
                severitiesByType.set(type, bucket);
            }
        }
    }

    return [...totalCounts.entries()]
        .map(([type, totalCount]) => {
            const severities = severitiesByType.get(type) ?? [];
            return {
                type,
                totalCount,
                runCount: runCounts.get(type) ?? 0,
                avgSeverity: mean(severities),
                maxSeverity:
                    severities.length > 0 ? Math.max(...severities) : undefined,
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
