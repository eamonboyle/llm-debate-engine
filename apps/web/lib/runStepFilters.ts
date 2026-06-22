import type { RunArtifact } from "./data";
import { buildQueryString } from "./listPagination";

export type RunStepFilterParams = {
    agent?: string;
    errors?: string;
};

export function matchesRunStepFilters(
    run: RunArtifact,
    filters: RunStepFilterParams,
): boolean {
    const agent = (filters.agent ?? "").trim();
    const errorsOnly = filters.errors === "true";

    if (!agent && !errorsOnly) return true;

    const steps = run.run.steps;
    if (errorsOnly && !agent) {
        return steps.some((step) => Boolean(step.error));
    }
    if (agent && !errorsOnly) {
        return steps.some((step) => step.agentName === agent);
    }
    return steps.some(
        (step) => step.agentName === agent && Boolean(step.error),
    );
}

export function filterRunsByStepCriteria(
    runs: RunArtifact[],
    filters: RunStepFilterParams,
): RunArtifact[] {
    if (!filters.agent?.trim() && filters.errors !== "true") {
        return runs;
    }
    return runs.filter((run) => matchesRunStepFilters(run, filters));
}

export function hasActiveRunStepFilters(filters: RunStepFilterParams): boolean {
    return Boolean(filters.agent?.trim()) || filters.errors === "true";
}

export function buildAgentErrorRunsHref(
    agentName: string,
    baseFilters: Record<string, string | undefined> = {},
): string {
    return `/runs${buildQueryString(baseFilters, {
        agent: agentName,
        errors: "true",
    })}`;
}
