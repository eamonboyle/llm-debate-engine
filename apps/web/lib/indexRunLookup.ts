import type { AnalysisIndex } from "./data";

export type IndexRunSnapshot = {
    issueCount: number;
    stepCount?: number;
    maxSeverity?: number;
    avgSeverity?: number;
    solverConfidence?: number;
    evidenceRiskLevel?: number;
    qualityCoherence?: number;
    factualRisk?: number;
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
            avgSeverity: run.critique.avgSeverity,
            solverConfidence: run.confidence.solver,
            evidenceRiskLevel: run.research?.evidenceRiskLevel,
            qualityCoherence: run.quality?.coherence,
            factualRisk: run.quality?.factualRisk,
        });
    }

    return lookup;
}
