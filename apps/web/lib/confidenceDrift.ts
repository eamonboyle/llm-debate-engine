import { buildCompareSuggestions } from "./compareSuggestions";
import type { AnalysisIndex, RunArtifact } from "./data";

export type ConfidenceDriftRow = {
    runId: string;
    question: string;
    model: string;
    pipelinePreset: string;
    maxSeverity?: number;
    solverToRevisionDelta?: number;
    revisionToSynthesizerDelta?: number;
    calibratedMinusSynthDelta?: number;
    driftMagnitude: number | null;
    traceHref: string;
    compareHref: string;
};

function calibratedMinusSynthDelta(
    calibratedAdjusted?: number,
    synthesizer?: number,
): number | undefined {
    if (
        typeof calibratedAdjusted !== "number" ||
        typeof synthesizer !== "number"
    ) {
        return undefined;
    }
    return calibratedAdjusted - synthesizer;
}

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

export function buildDriftCompareHref(
    runs: RunArtifact[],
    runId: string,
): string {
    const [suggestion] = buildCompareSuggestions(runs, { left: runId }, 1);
    return suggestion?.href ?? `/runs/compare?left=${runId}`;
}

export function buildConfidenceDriftRows(
    index: AnalysisIndex,
    options?: { runs?: RunArtifact[] },
): ConfidenceDriftRow[] {
    const runs = options?.runs ?? [];
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

            const calibratedDelta = calibratedMinusSynthDelta(
                run.confidence.calibratedAdjusted,
                run.confidence.synthesizer,
            );

            return {
                runId: run.id,
                question: run.question,
                model: run.model,
                pipelinePreset: run.pipelinePreset,
                maxSeverity: run.critique.maxSeverity ?? critique?.maxSeverity,
                solverToRevisionDelta: solverToRevision,
                revisionToSynthesizerDelta: revisionToSynthesizer,
                calibratedMinusSynthDelta: calibratedDelta,
                driftMagnitude: driftMagnitude(
                    solverToRevision,
                    revisionToSynthesizer,
                ),
                traceHref: `/runs/${run.id}`,
                compareHref:
                    runs.length > 0
                        ? buildDriftCompareHref(runs, run.id)
                        : `/runs/compare?left=${run.id}`,
            };
        })
        .sort((a, b) => {
            const aDrift = a.driftMagnitude ?? -1;
            const bDrift = b.driftMagnitude ?? -1;
            if (aDrift !== bDrift) return bDrift - aDrift;
            return a.runId.localeCompare(b.runId);
        });
}

function mean(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeConfidenceDrift(index: AnalysisIndex) {
    const rows = buildConfidenceDriftRows(index);
    const withDrift = rows.filter((row) => row.driftMagnitude != null);
    const avgDrift =
        withDrift.length > 0
            ? withDrift.reduce((sum, row) => sum + row.driftMagnitude!, 0) /
              withDrift.length
            : null;

    const solverDeltas = rows
        .map((row) => row.solverToRevisionDelta)
        .filter((value): value is number => typeof value === "number");
    const revisionDeltas = rows
        .map((row) => row.revisionToSynthesizerDelta)
        .filter((value): value is number => typeof value === "number");
    const calibratedDeltas = rows
        .map((row) => row.calibratedMinusSynthDelta)
        .filter((value): value is number => typeof value === "number");

    return {
        runCount: rows.length,
        withDriftCount: withDrift.length,
        avgDriftMagnitude: avgDrift,
        solverToRevisionMean:
            mean(solverDeltas) ??
            index.aggregates.confidenceDrift.solverToRevisionMean,
        revisionToSynthesizerMean:
            mean(revisionDeltas) ??
            index.aggregates.confidenceDrift.revisionToSynthesizerMean,
        severityVsSolverToRevision:
            index.aggregates.confidenceCorrelation
                ?.severityVsSolverToRevisionDelta,
        severityVsRevisionToSynthesizer:
            index.aggregates.confidenceCorrelation
                ?.severityVsRevisionToSynthesizerDelta,
        calibratedMinusSynthMean:
            mean(calibratedDeltas) ??
            index.aggregates.confidenceDrift.calibratedMinusSynthMean,
    };
}
