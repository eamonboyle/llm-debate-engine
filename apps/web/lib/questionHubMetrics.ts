import type { AnalysisIndex } from "./data";

export type QuestionHubMetrics = {
    indexedRunCount: number;
    avgIssueCount: number | null;
    avgSolverConfidence: number | null;
    avgEvidenceRisk: number | null;
    avgSolverToRevisionDelta: number | null;
};

export type QuestionModelRow = {
    model: string;
    runCount: number;
    avgIssueCount: number | null;
    avgSolverConfidence: number | null;
    avgEvidenceRisk: number | null;
    latestRunId: string | null;
    latestCreatedAt: string | null;
    compareHref: string | null;
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

export function buildQuestionModelRows(
    index: AnalysisIndex,
    question: string,
): QuestionModelRow[] {
    const runs = index.runs
        .filter((run) => run.question === question)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const byModel = new Map<string, typeof runs>();
    for (const run of runs) {
        const group = byModel.get(run.model) ?? [];
        group.push(run);
        byModel.set(run.model, group);
    }

    const rows: QuestionModelRow[] = [...byModel.entries()]
        .map(([model, modelRuns]) => {
            const issueCounts = modelRuns.map((run) => run.critique.issueCount);
            const solverConfidences = modelRuns
                .map((run) => run.confidence.solver)
                .filter((value): value is number => typeof value === "number");
            const evidenceRisks = modelRuns
                .map((run) => run.research?.evidenceRiskLevel)
                .filter((value): value is number => typeof value === "number");
            const latest = modelRuns[0] ?? null;

            return {
                model,
                runCount: modelRuns.length,
                avgIssueCount: average(issueCounts),
                avgSolverConfidence: average(solverConfidences),
                avgEvidenceRisk: average(evidenceRisks),
                latestRunId: latest?.id ?? null,
                latestCreatedAt: latest?.createdAt ?? null,
                compareHref: null,
            };
        })
        .sort(
            (a, b) => b.runCount - a.runCount || a.model.localeCompare(b.model),
        );

    if (rows.length >= 2) {
        const left = rows[0].latestRunId;
        const right = rows[1].latestRunId;
        if (left && right) {
            rows[0].compareHref = `/runs/compare?left=${left}&right=${right}&question=${encodeURIComponent(question)}`;
        }
    }

    return rows;
}
