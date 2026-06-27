import type { AnalysisIndex } from "./data";

export type QuestionHubMetrics = {
    indexedRunCount: number;
    avgIssueCount: number | null;
    avgSeverity: number | null;
    avgSolverConfidence: number | null;
    avgEvidenceRisk: number | null;
    avgSolverToRevisionDelta: number | null;
    avgCoherence: number | null;
    avgFactualRisk: number | null;
};

export type QuestionHubRunRow = {
    id: string;
    createdAt: string;
    model: string;
    preset: string;
    preview: string;
    issueCount?: number;
    avgSeverity?: number;
    solverConfidence?: number;
    coherence?: number;
    factualRisk?: number;
};

function average(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeQuestionHubMetrics(
    index: AnalysisIndex,
    question: string,
): QuestionHubMetrics | null {
    const runs = index.runs.filter((run) => run.question === question);
    if (runs.length === 0) return null;

    const issueCounts = runs.map((run) => run.critique.issueCount);
    const severities = runs
        .map((run) => run.critique.avgSeverity)
        .filter((value): value is number => typeof value === "number");
    const solverConfidences = runs
        .map((run) => run.confidence.solver)
        .filter((value): value is number => typeof value === "number");
    const evidenceRisks = runs
        .map((run) => run.research?.evidenceRiskLevel)
        .filter((value): value is number => typeof value === "number");
    const driftDeltas = runs
        .map((run) => run.confidence.solverToRevisionDelta)
        .filter((value): value is number => typeof value === "number");
    const coherenceScores = runs
        .map((run) => run.quality?.coherence)
        .filter((value): value is number => typeof value === "number");
    const factualRisks = runs
        .map((run) => run.quality?.factualRisk)
        .filter((value): value is number => typeof value === "number");

    return {
        indexedRunCount: runs.length,
        avgIssueCount: average(issueCounts),
        avgSeverity: average(severities),
        avgSolverConfidence: average(solverConfidences),
        avgEvidenceRisk: average(evidenceRisks),
        avgSolverToRevisionDelta: average(driftDeltas),
        avgCoherence: average(coherenceScores),
        avgFactualRisk: average(factualRisks),
    };
}

export function buildQuestionHubRunRows(
    index: AnalysisIndex,
    question: string,
    runIds: string[],
): Map<string, QuestionHubRunRow> {
    const rows = new Map<string, QuestionHubRunRow>();
    const indexed = index.runs.filter((run) => run.question === question);

    for (const run of indexed) {
        if (!runIds.includes(run.id)) continue;
        rows.set(run.id, {
            id: run.id,
            createdAt: run.createdAt,
            model: run.model,
            preset: run.pipelinePreset,
            preview: run.finalAnswerPreview,
            issueCount: run.critique.issueCount,
            avgSeverity: run.critique.avgSeverity,
            solverConfidence: run.confidence.solver,
            coherence: run.quality?.coherence,
            factualRisk: run.quality?.factualRisk,
        });
    }

    return rows;
}
