import type { AnalysisIndex } from "./data";

export type QuestionHubMetrics = {
    indexedRunCount: number;
    avgIssueCount: number | null;
    avgSolverConfidence: number | null;
    avgEvidenceRisk: number | null;
    avgSolverToRevisionDelta: number | null;
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
    const solverConfidences = runs
        .map((run) => run.confidence.solver)
        .filter((value): value is number => typeof value === "number");
    const evidenceRisks = runs
        .map((run) => run.research?.evidenceRiskLevel)
        .filter((value): value is number => typeof value === "number");
    const driftDeltas = runs
        .map((run) => run.confidence.solverToRevisionDelta)
        .filter((value): value is number => typeof value === "number");

    return {
        indexedRunCount: runs.length,
        avgIssueCount: average(issueCounts),
        avgSolverConfidence: average(solverConfidences),
        avgEvidenceRisk: average(evidenceRisks),
        avgSolverToRevisionDelta: average(driftDeltas),
    };
}
