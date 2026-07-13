import type { RunArtifact } from "./data";
import { buildPipelineErrorRows } from "./pipelineErrors";

export type RunListExtraFilterParams = {
    outlier?: string;
    errors?: string;
};

export type RunListExtraFilterFlags = {
    outlierOnly: boolean;
    errorsOnly: boolean;
};

export function parseRunListExtraFilters(
    params: RunListExtraFilterParams,
): RunListExtraFilterFlags {
    return {
        outlierOnly: params.outlier === "true",
        errorsOnly: params.errors === "true",
    };
}

export function hasActiveRunListExtraFilters(
    flags: RunListExtraFilterFlags,
): boolean {
    return flags.outlierOnly || flags.errorsOnly;
}

export function buildPipelineErrorRunIdSet(runs: RunArtifact[]): Set<string> {
    const ids = new Set<string>();
    for (const row of buildPipelineErrorRows(runs)) {
        ids.add(row.runId);
    }
    return ids;
}

export function applyRunListExtraFilters(
    runs: RunArtifact[],
    flags: RunListExtraFilterFlags,
    context: {
        outlierRunIds: Set<string>;
        errorRunIds: Set<string>;
    },
): RunArtifact[] {
    let result = runs;
    if (flags.outlierOnly) {
        result = result.filter((run) => context.outlierRunIds.has(run.id));
    }
    if (flags.errorsOnly) {
        result = result.filter((run) => context.errorRunIds.has(run.id));
    }
    return result;
}
