import type { AnalysisIndex } from "./data";

export type IndexRunSnapshot = {
    issueCount: number;
    stepCount?: number;
    maxSeverity?: number;
    solverConfidence?: number;
    evidenceRiskLevel?: number;
};

export function buildIndexRunLookup(
    index: AnalysisIndex,
): Map<string, IndexRunSnapshot> {
    const lookup = new Map<string, IndexRunSnapshot>();

    for (const run of index.runs) {
        lookup.set(run.id, {
            issueCount: run.critique.issueCount,
            stepCount: run.stepCount,
            maxSeverity: run.critique.maxSeverity,
            solverConfidence: run.confidence.solver,
            evidenceRiskLevel: run.research?.evidenceRiskLevel,
        });
    }

    return lookup;
}
