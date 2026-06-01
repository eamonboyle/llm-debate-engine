import type { AnalysisIndex } from "./data";

export type FailureModeSummary = {
    mode: string;
    runCount: number;
};

export type RunFailureModeRow = {
    runId: string;
    question: string;
    model: string;
    pipelinePreset: string;
    failureModeCount: number;
    href: string;
};

function normalizeMode(mode: string): string {
    return mode.trim().toLowerCase();
}

export function buildFailureModeSummaries(
    index: AnalysisIndex,
): FailureModeSummary[] {
    const counts = index.aggregates.counterfactualFailureModeCounts ?? {};
    return Object.entries(counts)
        .map(([mode, runCount]) => ({ mode, runCount }))
        .sort((a, b) => b.runCount - a.runCount || a.mode.localeCompare(b.mode));
}

export function listRunsForFailureMode(
    index: AnalysisIndex,
    failureMode: string,
): RunFailureModeRow[] {
    const needle = normalizeMode(failureMode);
    if (!needle) return [];

    const rows: RunFailureModeRow[] = [];

    for (const run of index.runs) {
        const topMode = run.research?.topCounterfactualFailureMode;
        if (!topMode || normalizeMode(topMode) !== needle) continue;

        rows.push({
            runId: run.id,
            question: run.question,
            model: run.model,
            pipelinePreset: run.pipelinePreset,
            failureModeCount:
                run.research?.counterfactualFailureModeCount ?? 0,
            href: `/runs/${run.id}`,
        });
    }

    return rows.sort(
        (a, b) =>
            b.failureModeCount - a.failureModeCount ||
            a.runId.localeCompare(b.runId),
    );
}
