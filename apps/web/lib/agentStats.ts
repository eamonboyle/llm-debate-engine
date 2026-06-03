import type { RunArtifact } from "./data";

export type AgentStatRow = {
    agentName: string;
    stepCount: number;
    runCount: number;
    errorCount: number;
    avgDurationMs: number | null;
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

export function buildAgentStats(runs: RunArtifact[]): AgentStatRow[] {
    const byAgent = new Map<
        string,
        {
            stepCount: number;
            runIds: Set<string>;
            errorCount: number;
            durations: number[];
        }
    >();

    for (const run of runs) {
        const seenInRun = new Set<string>();
        for (const step of run.run.steps) {
            const name = step.agentName;
            const bucket = byAgent.get(name) ?? {
                stepCount: 0,
                runIds: new Set<string>(),
                errorCount: 0,
                durations: [],
            };
            bucket.stepCount += 1;
            if (!seenInRun.has(name)) {
                bucket.runIds.add(run.id);
                seenInRun.add(name);
            }
            if (step.error) bucket.errorCount += 1;
            const duration = stepDurationMs(step.createdAt, step.completedAt);
            if (duration != null) bucket.durations.push(duration);
            byAgent.set(name, bucket);
        }
    }

    const rows: AgentStatRow[] = [];

    for (const [agentName, stats] of byAgent.entries()) {
        const avgDurationMs =
            stats.durations.length > 0
                ? stats.durations.reduce((sum, value) => sum + value, 0) /
                  stats.durations.length
                : null;
        rows.push({
            agentName,
            stepCount: stats.stepCount,
            runCount: stats.runIds.size,
            errorCount: stats.errorCount,
            avgDurationMs,
        });
    }

    return rows.sort((a, b) => {
        if (b.stepCount !== a.stepCount) return b.stepCount - a.stepCount;
        return a.agentName.localeCompare(b.agentName);
    });
}

export function formatAgentDuration(ms: number | null): string {
    if (ms == null) return "—";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return `${minutes}m ${remainder}s`;
}
