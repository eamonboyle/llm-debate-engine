import type { PipelineErrorRow } from "./pipelineErrors";

export type PipelineErrorTrendPoint = {
    label: string;
    dateKey: string;
    errorCount: number;
    runCount: number;
};

export type PipelineErrorAgentPoint = {
    agent: string;
    errorCount: number;
};

function dayKey(createdAt: string): string | null {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

function formatDayLabel(dateKey: string): string {
    const date = new Date(`${dateKey}T12:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return dateKey;
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}

export function buildPipelineErrorTrendSeries(
    rows: PipelineErrorRow[],
): PipelineErrorTrendPoint[] {
    const byDay = new Map<
        string,
        { errorCount: number; runIds: Set<string> }
    >();

    for (const row of rows) {
        const key = dayKey(row.createdAt);
        if (!key) continue;
        const bucket = byDay.get(key) ?? {
            errorCount: 0,
            runIds: new Set<string>(),
        };
        bucket.errorCount += 1;
        bucket.runIds.add(row.runId);
        byDay.set(key, bucket);
    }

    return [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, bucket]) => ({
            label: formatDayLabel(dateKey),
            dateKey,
            errorCount: bucket.errorCount,
            runCount: bucket.runIds.size,
        }));
}

export function buildPipelineErrorByAgent(
    rows: PipelineErrorRow[],
): PipelineErrorAgentPoint[] {
    const counts = new Map<string, number>();
    for (const row of rows) {
        counts.set(row.agentName, (counts.get(row.agentName) ?? 0) + 1);
    }

    return [...counts.entries()]
        .map(([agent, errorCount]) => ({ agent, errorCount }))
        .sort((a, b) => {
            if (b.errorCount !== a.errorCount) {
                return b.errorCount - a.errorCount;
            }
            return a.agent.localeCompare(b.agent);
        });
}
