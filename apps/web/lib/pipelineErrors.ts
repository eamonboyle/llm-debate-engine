import type { RunArtifact } from "./data";

export type PipelineErrorRow = {
    runId: string;
    question: string;
    model: string;
    pipelinePreset: string;
    fastMode: boolean;
    agentName: string;
    stepIndex: number;
    error: string;
    createdAt: string;
    traceHref: string;
};

export function buildPipelineErrorRows(
    runs: RunArtifact[],
    options?: { agent?: string },
): PipelineErrorRow[] {
    const agentFilter = options?.agent?.trim().toLowerCase();
    const rows: PipelineErrorRow[] = [];

    for (const run of runs) {
        run.run.steps.forEach((step, stepIndex) => {
            if (!step.error) return;
            if (agentFilter && step.agentName.toLowerCase() !== agentFilter) {
                return;
            }

            rows.push({
                runId: run.id,
                question: run.question,
                model: run.metadata.model,
                pipelinePreset: run.metadata.pipelinePreset,
                fastMode: run.metadata.fastMode,
                agentName: step.agentName,
                stepIndex,
                error: step.error,
                createdAt: step.createdAt ?? run.metadata.createdAt,
                traceHref: `/runs/${run.id}#step-${stepIndex}`,
            });
        });
    }

    return rows.sort((a, b) => {
        const timeDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
        if (timeDiff !== 0) return timeDiff;
        return a.runId.localeCompare(b.runId);
    });
}

export function collectPipelineErrorAgents(runs: RunArtifact[]): string[] {
    const agents = new Set<string>();
    for (const run of runs) {
        for (const step of run.run.steps) {
            if (step.error) agents.add(step.agentName);
        }
    }
    return [...agents].sort((a, b) => a.localeCompare(b));
}
