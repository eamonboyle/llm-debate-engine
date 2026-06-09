import type { AnalysisIndex, ArtifactFilterParams } from "./data";

export type ModelLeaderboardRow = {
    model: string;
    runCount: number;
    avgIssueCount: number;
    avgMaxSeverity: number | null;
    avgSolverToRevisionDelta: number | null;
    avgEvidenceRisk: number | null;
    avgSolverConfidence: number | null;
    runsHref: string;
};

function mean(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export type LeaderboardFilterOptions = {
    fastMode?: boolean;
    linkFilters?: ArtifactFilterParams;
};

function runsHref(
    model: string,
    fastMode?: boolean,
    linkFilters?: ArtifactFilterParams,
): string {
    const params = new URLSearchParams({ model });
    if (fastMode !== undefined) {
        params.set("fast", String(fastMode));
    }
    if (linkFilters?.preset) {
        params.set("preset", linkFilters.preset);
    }
    if (linkFilters?.fast && fastMode === undefined) {
        params.set("fast", linkFilters.fast);
    }
    if (linkFilters?.q) {
        params.set("q", linkFilters.q);
    }
    if (linkFilters?.from) {
        params.set("from", linkFilters.from);
    }
    if (linkFilters?.to) {
        params.set("to", linkFilters.to);
    }
    return `/runs?${params.toString()}`;
}

export function buildModelLeaderboard(
    index: AnalysisIndex,
    opts: LeaderboardFilterOptions = {},
): ModelLeaderboardRow[] {
    const sourceRuns =
        opts.fastMode === undefined
            ? index.runs
            : index.runs.filter((run) => run.fastMode === opts.fastMode);

    const byModel = new Map<string, AnalysisIndex["runs"]>();

    for (const run of sourceRuns) {
        const bucket = byModel.get(run.model) ?? [];
        bucket.push(run);
        byModel.set(run.model, bucket);
    }

    const rows: ModelLeaderboardRow[] = [];

    for (const [model, runs] of byModel.entries()) {
        const issueCounts = runs.map((run) => run.critique.issueCount);
        const maxSeverities = runs
            .map((run) => run.critique.maxSeverity)
            .filter((value): value is number => typeof value === "number");
        const solverDeltas = runs
            .map((run) => run.confidence.solverToRevisionDelta)
            .filter((value): value is number => typeof value === "number");
        const evidenceRisks = runs
            .map((run) => run.research?.evidenceRiskLevel)
            .filter((value): value is number => typeof value === "number");
        const solverConfs = runs
            .map((run) => run.confidence.solver)
            .filter((value): value is number => typeof value === "number");

        const avgIssueCount = mean(issueCounts) ?? 0;

        rows.push({
            model,
            runCount: runs.length,
            avgIssueCount,
            avgMaxSeverity: mean(maxSeverities),
            avgSolverToRevisionDelta: mean(solverDeltas),
            avgEvidenceRisk: mean(evidenceRisks),
            avgSolverConfidence: mean(solverConfs),
            runsHref: runsHref(model, opts.fastMode, opts.linkFilters),
        });
    }

    return rows.sort((a, b) => {
        if (b.runCount !== a.runCount) return b.runCount - a.runCount;
        return a.model.localeCompare(b.model);
    });
}
