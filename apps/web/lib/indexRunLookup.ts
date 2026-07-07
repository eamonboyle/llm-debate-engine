import type { AnalysisIndex } from "./data";

export type IndexRunSnapshot = {
    issueCount: number;
    stepCount?: number;
    maxSeverity?: number;
    avgSeverity?: number;
    solverConfidence?: number;
    solverToRevisionDelta?: number;
    revisionToSynthesizerDelta?: number;
    evidenceRiskLevel?: number;
    coherence?: number;
    factualRisk?: number;
    topCounterfactualFailureMode?: string;
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
            solverToRevisionDelta: run.confidence.solverToRevisionDelta,
            revisionToSynthesizerDelta:
                run.confidence.revisionToSynthesizerDelta,
            evidenceRiskLevel: run.research?.evidenceRiskLevel,
            coherence: run.quality?.coherence,
            factualRisk: run.quality?.factualRisk,
            topCounterfactualFailureMode:
                run.research?.topCounterfactualFailureMode,
        });
    }

    return lookup;
}
