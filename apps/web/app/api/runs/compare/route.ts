import { loadRunArtifacts } from "../../../../lib/data";

function toNumberOrNull(value: unknown): number | null {
    return typeof value === "number" ? value : null;
}

function toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object") return {};
    return value as Record<string, unknown>;
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

function summarizeRun(run: Awaited<ReturnType<typeof loadRunArtifacts>>[number]) {
    const confidence = toRecord(run.run.metrics.confidence);
    const critique = toRecord(run.run.metrics.critique);
    const quality = toRecord(run.run.metrics.quality);

    const solverConfidence = toNumberOrNull(confidence.solver);
    const revisionConfidence = toNumberOrNull(confidence.revision);
    const synthesizerConfidence = toNumberOrNull(confidence.synthesizer);
    const calibratedAdjustedConfidence = toNumberOrNull(
        confidence.calibratedAdjusted,
    );
    const solverToRevisionDelta = toNumberOrNull(confidence.solverToRevisionDelta);
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
        },
    };
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const left = url.searchParams.get("left");
    const right = url.searchParams.get("right");

    if (!left || !right) {
        return Response.json(
            { error: "left and right run ids are required" },
            { status: 400 },
        );
    }

    const runs = await loadRunArtifacts();
    const leftRun = runs.find((run) => run.id === left);
    const rightRun = runs.find((run) => run.id === right);

    if (!leftRun || !rightRun) {
        return Response.json(
            { error: "one or both run ids not found" },
            { status: 404 },
        );
    }

    const leftSummary = summarizeRun(leftRun);
    const rightSummary = summarizeRun(rightRun);

    return Response.json({
        left: leftSummary,
        right: rightSummary,
        delta: {
            stepCount: rightSummary.stepCount - leftSummary.stepCount,
            confidence: {
                solver: delta(
                    rightSummary.metrics.confidence.solver,
                    leftSummary.metrics.confidence.solver,
                ),
                revision: delta(
                    rightSummary.metrics.confidence.revision,
                    leftSummary.metrics.confidence.revision,
                ),
                synthesizer: delta(
                    rightSummary.metrics.confidence.synthesizer,
                    leftSummary.metrics.confidence.synthesizer,
                ),
                calibratedAdjusted: delta(
                    rightSummary.metrics.confidence.calibratedAdjusted,
                    leftSummary.metrics.confidence.calibratedAdjusted,
                ),
                solverToRevisionDelta: delta(
                    rightSummary.metrics.confidence.solverToRevisionDelta,
                    leftSummary.metrics.confidence.solverToRevisionDelta,
                ),
                revisionToSynthesizerDelta: delta(
                    rightSummary.metrics.confidence.revisionToSynthesizerDelta,
                    leftSummary.metrics.confidence.revisionToSynthesizerDelta,
                ),
            },
            critique: {
                issueCount:
                    rightSummary.metrics.critique.issueCount -
                    leftSummary.metrics.critique.issueCount,
                maxSeverity: delta(
                    rightSummary.metrics.critique.maxSeverity,
                    leftSummary.metrics.critique.maxSeverity,
                ),
                avgSeverity: delta(
                    rightSummary.metrics.critique.avgSeverity,
                    leftSummary.metrics.critique.avgSeverity,
                ),
            },
            quality: {
                coherence: delta(
                    rightSummary.metrics.quality.coherence,
                    leftSummary.metrics.quality.coherence,
                ),
                completeness: delta(
                    rightSummary.metrics.quality.completeness,
                    leftSummary.metrics.quality.completeness,
                ),
                factualRisk: delta(
                    rightSummary.metrics.quality.factualRisk,
                    leftSummary.metrics.quality.factualRisk,
                ),
                uncertaintyHandling: delta(
                    rightSummary.metrics.quality.uncertaintyHandling,
                    leftSummary.metrics.quality.uncertaintyHandling,
                ),
            },
        },
    });
}
