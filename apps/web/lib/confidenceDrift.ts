import type { AnalysisIndex } from "./data";

export type ConfidenceDriftRow = {
    runId: string;
    question: string;
    model: string;
    pipelinePreset: string;
    maxSeverity?: number;
    solverToRevisionDelta?: number;
    revisionToSynthesizerDelta?: number;
    driftMagnitude: number | null;
    traceHref: string;
    compareHref: string;
};

function driftMagnitude(
    solverToRevision?: number,
    revisionToSynthesizer?: number,
): number | null {
    const values = [solverToRevision, revisionToSynthesizer].filter(
        (v): v is number => typeof v === "number" && Number.isFinite(v),
    );
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + Math.abs(v), 0);
}

export function buildConfidenceDriftRows(
    index: AnalysisIndex,
): ConfidenceDriftRow[] {
    const critiqueByRunId = new Map(
        index.aggregates.critiqueVsConfidence.map((row) => [row.runId, row]),
    );

    return index.runs
        .map((run) => {
            const critique = critiqueByRunId.get(run.id);
            const solverToRevision =
                run.confidence.solverToRevisionDelta ??
                critique?.solverToRevisionDelta;
            const revisionToSynthesizer =
                run.confidence.revisionToSynthesizerDelta ??
                critique?.revisionToSynthesizerDelta;

            return {
                runId: run.id,
                question: run.question,
                model: run.model,
                pipelinePreset: run.pipelinePreset,
                maxSeverity: run.critique.maxSeverity ?? critique?.maxSeverity,
                solverToRevisionDelta: solverToRevision,
                revisionToSynthesizerDelta: revisionToSynthesizer,
                driftMagnitude: driftMagnitude(
                    solverToRevision,
                    revisionToSynthesizer,
                ),
                traceHref: `/runs/${run.id}`,
                compareHref: `/runs/compare?left=${run.id}`,
            };
        })
        .sort((a, b) => {
            const aDrift = a.driftMagnitude ?? -1;
            const bDrift = b.driftMagnitude ?? -1;
            if (aDrift !== bDrift) return bDrift - aDrift;
            return a.runId.localeCompare(b.runId);
        });
}

export function summarizeConfidenceDrift(index: AnalysisIndex) {
    const rows = buildConfidenceDriftRows(index);
    const withDrift = rows.filter((row) => row.driftMagnitude != null);
    const avgDrift =
        withDrift.length > 0
            ? withDrift.reduce((sum, row) => sum + row.driftMagnitude!, 0) /
              withDrift.length
            : null;

    return {
        runCount: rows.length,
        withDriftCount: withDrift.length,
        avgDriftMagnitude: avgDrift,
        solverToRevisionMean:
            index.aggregates.confidenceDrift.solverToRevisionMean,
        revisionToSynthesizerMean:
            index.aggregates.confidenceDrift.revisionToSynthesizerMean,
        severityVsSolverToRevision:
            index.aggregates.confidenceCorrelation
                ?.severityVsSolverToRevisionDelta,
        severityVsRevisionToSynthesizer:
            index.aggregates.confidenceCorrelation
                ?.severityVsRevisionToSynthesizerDelta,
    };
}
