import type { AnalysisIndex } from "./data";

export type QuestionHubMetrics = {
    indexedRunCount: number;
    avgIssueCount: number | null;
    avgMaxSeverity: number | null;
    avgSolverConfidence: number | null;
    avgEvidenceRisk: number | null;
    avgSolverToRevisionDelta: number | null;
    avgCoherence: number | null;
    avgFactualRisk: number | null;
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
    const maxSeverities = runs
        .map((run) => run.critique.maxSeverity)
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
    const coherences = runs
        .map((run) => run.quality?.coherence)
        .filter((value): value is number => typeof value === "number");
    const factualRisks = runs
        .map((run) => run.quality?.factualRisk)
        .filter((value): value is number => typeof value === "number");

    return {
        indexedRunCount: runs.length,
        avgIssueCount: average(issueCounts),
        avgMaxSeverity: average(maxSeverities),
        avgSolverConfidence: average(solverConfidences),
        avgEvidenceRisk: average(evidenceRisks),
        avgSolverToRevisionDelta: average(driftDeltas),
        avgCoherence: average(coherences),
        avgFactualRisk: average(factualRisks),
    };
}
