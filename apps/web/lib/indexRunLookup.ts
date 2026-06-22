import type { AnalysisIndex } from "./data";

export type IndexRunSnapshot = {
    issueCount: number;
    stepCount?: number;
    maxSeverity?: number;
    solverConfidence?: number;
    calibratedConfidence?: number;
    evidenceRiskLevel?: number;
    qualityCoherence?: number;
    factualRisk?: number;
    topCounterfactualMode?: string;
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
            calibratedConfidence: run.confidence.calibratedAdjusted,
            evidenceRiskLevel: run.research?.evidenceRiskLevel,
            qualityCoherence: run.quality?.coherence,
            factualRisk: run.quality?.factualRisk,
            topCounterfactualMode: run.research?.topCounterfactualFailureMode,
        });
    }

    return lookup;
}
