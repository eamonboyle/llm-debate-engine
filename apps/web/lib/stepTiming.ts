import type { RunArtifact } from "./data";

export type AgentTimingRow = {
    agentName: string;
    role: string;
    sampleCount: number;
    avgDurationMs: number;
    medianDurationMs: number;
    totalDurationMs: number;
};

export type RunStepTimingRow = {
    stepId: string;
    agentName: string;
    role: string;
    durationMs: number | null;
    createdAt: string | null;
    completedAt: string | null;
};

function stepDurationMs(
    createdAt: string | undefined,
    completedAt: string | undefined,
): number | null {
    if (!createdAt || !completedAt) return null;
    const start = Date.parse(createdAt);
    const end = Date.parse(completedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        return null;
    }
    return end - start;
}

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

export function buildRunStepTiming(run: RunArtifact): RunStepTimingRow[] {
    return run.run.steps.map((step) => ({
        stepId: step.id,
        agentName: step.agentName,
        role: step.role,
        durationMs: stepDurationMs(step.createdAt, step.completedAt),
        createdAt: step.createdAt ?? null,
        completedAt: step.completedAt ?? null,
    }));
}

export function summarizeRunStepTiming(rows: RunStepTimingRow[]) {
    const durations = rows
        .map((row) => row.durationMs)
        .filter((value): value is number => value != null);
    const totalDurationMs = durations.reduce((sum, value) => sum + value, 0);

    return {
        stepCount: rows.length,
        timedStepCount: durations.length,
        totalDurationMs: durations.length > 0 ? totalDurationMs : null,
        avgStepDurationMs:
            durations.length > 0 ? totalDurationMs / durations.length : null,
    };
}

export function buildAgentTimingStats(runs: RunArtifact[]): AgentTimingRow[] {
    const buckets = new Map<
        string,
        { agentName: string; role: string; durations: number[] }
    >();

    for (const run of runs) {
        for (const step of run.run.steps) {
            const duration = stepDurationMs(step.createdAt, step.completedAt);
            if (duration == null) continue;

            const key = `${step.agentName}\0${step.role}`;
            const bucket = buckets.get(key) ?? {
                agentName: step.agentName,
                role: step.role,
                durations: [],
            };
            bucket.durations.push(duration);
            buckets.set(key, bucket);
        }
    }

    return [...buckets.values()]
        .map((bucket) => {
            const totalDurationMs = bucket.durations.reduce(
                (sum, value) => sum + value,
                0,
            );
            const sampleCount = bucket.durations.length;
            return {
                agentName: bucket.agentName,
                role: bucket.role,
                sampleCount,
                avgDurationMs: totalDurationMs / sampleCount,
                medianDurationMs: median(bucket.durations),
                totalDurationMs,
            };
        })
        .sort(
            (a, b) =>
                b.totalDurationMs - a.totalDurationMs ||
                a.agentName.localeCompare(b.agentName),
        );
}

export function summarizeStepTiming(runs: RunArtifact[]) {
    const rows = buildAgentTimingStats(runs);
    const withTiming = rows.filter((row) => row.sampleCount > 0);
    const totalSamples = withTiming.reduce(
        (sum, row) => sum + row.sampleCount,
        0,
    );
    const totalDurationMs = withTiming.reduce(
        (sum, row) => sum + row.totalDurationMs,
        0,
    );

    return {
        agentCount: withTiming.length,
        totalSamples,
        avgStepDurationMs:
            totalSamples > 0 ? totalDurationMs / totalSamples : null,
        runsWithTiming: runs.filter((run) =>
            run.run.steps.some(
                (step) =>
                    stepDurationMs(step.createdAt, step.completedAt) != null,
            ),
        ).length,
    };
}

export type SlowestRunRow = {
    runId: string;
    question: string;
    model: string;
    pipelinePreset: string;
    timedStepCount: number;
    totalDurationMs: number;
    avgStepDurationMs: number;
    traceHref: string;
};

export function buildSlowestRunRows(
    runs: RunArtifact[],
    limit = 15,
): SlowestRunRow[] {
    const rows: SlowestRunRow[] = [];

    for (const run of runs) {
        const stepRows = buildRunStepTiming(run);
        const summary = summarizeRunStepTiming(stepRows);
        if (summary.totalDurationMs == null || summary.timedStepCount === 0) {
            continue;
        }

        rows.push({
            runId: run.id,
            question: run.question,
            model: run.metadata.model,
            pipelinePreset: run.metadata.pipelinePreset,
            timedStepCount: summary.timedStepCount,
            totalDurationMs: summary.totalDurationMs,
            avgStepDurationMs: summary.avgStepDurationMs ?? 0,
            traceHref: `/runs/${run.id}`,
        });
    }

    return rows
        .sort(
            (a, b) =>
                b.totalDurationMs - a.totalDurationMs ||
                a.runId.localeCompare(b.runId),
        )
        .slice(0, limit);
}

export function formatDurationMs(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return `${minutes}m ${remainder}s`;
}
