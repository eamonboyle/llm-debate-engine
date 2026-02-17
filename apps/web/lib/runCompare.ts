import type { RunArtifact } from "./data";

export type RunCompareSummary = {
    id: string;
    question: string;
    createdAt: string;
    model: string;
    pipelinePreset: string;
    fastMode: boolean;
    stepCount: number;
    finalAnswerPreview: string;
    metrics: {
        confidence: {
            solver: number | null;
            revision: number | null;
            synthesizer: number | null;
            calibratedAdjusted: number | null;
            solverToRevisionDelta: number | null;
            revisionToSynthesizerDelta: number | null;
        };
        critique: {
            issueCount: number;
            maxSeverity: number | null;
            avgSeverity: number | null;
        };
        quality: {
            coherence: number | null;
            completeness: number | null;
            factualRisk: number | null;
            uncertaintyHandling: number | null;
        };
        research: {
            evidenceRiskLevel: number | null;
            counterfactualFailureModeCount: number | null;
            topCounterfactualFailureMode: string | null;
        };
    };
};

export type RunComparePayload = {
    left: RunCompareSummary;
    right: RunCompareSummary;
    delta: {
        stepCount: number;
        confidence: {
            solver: number | null;
            revision: number | null;
            synthesizer: number | null;
            calibratedAdjusted: number | null;
            solverToRevisionDelta: number | null;
            revisionToSynthesizerDelta: number | null;
        };
        critique: {
            issueCount: number;
            maxSeverity: number | null;
            avgSeverity: number | null;
        };
        quality: {
            coherence: number | null;
            completeness: number | null;
            factualRisk: number | null;
            uncertaintyHandling: number | null;
        };
        research: {
            evidenceRiskLevel: number | null;
            counterfactualFailureModeCount: number | null;
        };
    };
};

function toNumberOrNull(value: unknown): number | null {
    return typeof value === "number" ? value : null;
}

function toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object") return {};
    return value as Record<string, unknown>;
}

function toStringOrNull(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

function sumObjectNumberValues(value: unknown): number {
    const record = toRecord(value);
    let sum = 0;
    for (const item of Object.values(record)) {
        if (typeof item === "number" && Number.isFinite(item)) {
            sum += item;
        }
    }
    return sum;
}

function delta(right: number | null, left: number | null): number | null {
    if (typeof right !== "number" || typeof left !== "number") return null;
    return right - left;
}

export function summarizeRun(run: RunArtifact): RunCompareSummary {
    const confidence = toRecord(run.run.metrics.confidence);
    const critique = toRecord(run.run.metrics.critique);
    const quality = toRecord(run.run.metrics.quality);
    const research = toRecord(run.run.metrics.research);

    const solverConfidence = toNumberOrNull(confidence.solver);
    const revisionConfidence = toNumberOrNull(confidence.revision);
    const synthesizerConfidence = toNumberOrNull(confidence.synthesizer);
    const calibratedAdjustedConfidence = toNumberOrNull(
        confidence.calibratedAdjusted,
    );
    const solverToRevisionDelta = toNumberOrNull(
        confidence.solverToRevisionDelta,
    );
    const revisionToSynthesizerDelta = toNumberOrNull(
        confidence.revisionToSynthesizerDelta,
    );
    const critiqueIssueCount = sumObjectNumberValues(critique.byType);
    const critiqueMaxSeverity = toNumberOrNull(critique.maxSeverity);
    const critiqueAvgSeverity = toNumberOrNull(critique.avgSeverity);

    const coherence = toNumberOrNull(quality.coherence);
    const completeness = toNumberOrNull(quality.completeness);
    const factualRisk = toNumberOrNull(quality.factualRisk);
    const uncertaintyHandling = toNumberOrNull(quality.uncertaintyHandling);
    const evidenceRiskLevel = toNumberOrNull(research.evidenceRiskLevel);
    const counterfactualFailureModeCount = toNumberOrNull(
        research.counterfactualFailureModeCount,
    );
    const topCounterfactualFailureMode = toStringOrNull(
        research.topCounterfactualFailureMode,
    );

    return {
        id: run.id,
        question: run.question,
        createdAt: run.metadata.createdAt,
        model: run.metadata.model,
        pipelinePreset: run.metadata.pipelinePreset,
        fastMode: run.metadata.fastMode,
        stepCount: run.run.steps.length,
        finalAnswerPreview: run.run.finalAnswer.slice(0, 220),
        metrics: {
            confidence: {
                solver: solverConfidence,
                revision: revisionConfidence,
                synthesizer: synthesizerConfidence,
                calibratedAdjusted: calibratedAdjustedConfidence,
                solverToRevisionDelta,
                revisionToSynthesizerDelta,
            },
            critique: {
                issueCount: critiqueIssueCount,
                maxSeverity: critiqueMaxSeverity,
                avgSeverity: critiqueAvgSeverity,
            },
            quality: {
                coherence,
                completeness,
                factualRisk,
                uncertaintyHandling,
            },
            research: {
                evidenceRiskLevel,
                counterfactualFailureModeCount,
                topCounterfactualFailureMode,
            },
        },
    };
}

export function buildRunComparePayload(
    leftRun: RunArtifact,
    rightRun: RunArtifact,
): RunComparePayload {
    const left = summarizeRun(leftRun);
    const right = summarizeRun(rightRun);
    return {
        left,
        right,
        delta: {
            stepCount: right.stepCount - left.stepCount,
            confidence: {
                solver: delta(
                    right.metrics.confidence.solver,
                    left.metrics.confidence.solver,
                ),
                revision: delta(
                    right.metrics.confidence.revision,
                    left.metrics.confidence.revision,
                ),
                synthesizer: delta(
                    right.metrics.confidence.synthesizer,
                    left.metrics.confidence.synthesizer,
                ),
                calibratedAdjusted: delta(
                    right.metrics.confidence.calibratedAdjusted,
                    left.metrics.confidence.calibratedAdjusted,
                ),
                solverToRevisionDelta: delta(
                    right.metrics.confidence.solverToRevisionDelta,
                    left.metrics.confidence.solverToRevisionDelta,
                ),
                revisionToSynthesizerDelta: delta(
                    right.metrics.confidence.revisionToSynthesizerDelta,
                    left.metrics.confidence.revisionToSynthesizerDelta,
                ),
            },
            critique: {
                issueCount:
                    right.metrics.critique.issueCount -
                    left.metrics.critique.issueCount,
                maxSeverity: delta(
                    right.metrics.critique.maxSeverity,
                    left.metrics.critique.maxSeverity,
                ),
                avgSeverity: delta(
                    right.metrics.critique.avgSeverity,
                    left.metrics.critique.avgSeverity,
                ),
            },
            quality: {
                coherence: delta(
                    right.metrics.quality.coherence,
                    left.metrics.quality.coherence,
                ),
                completeness: delta(
                    right.metrics.quality.completeness,
                    left.metrics.quality.completeness,
                ),
                factualRisk: delta(
                    right.metrics.quality.factualRisk,
                    left.metrics.quality.factualRisk,
                ),
                uncertaintyHandling: delta(
                    right.metrics.quality.uncertaintyHandling,
                    left.metrics.quality.uncertaintyHandling,
                ),
            },
            research: {
                evidenceRiskLevel: delta(
                    right.metrics.research.evidenceRiskLevel,
                    left.metrics.research.evidenceRiskLevel,
                ),
                counterfactualFailureModeCount: delta(
                    right.metrics.research.counterfactualFailureModeCount,
                    left.metrics.research.counterfactualFailureModeCount,
                ),
            },
        },
    };
}
