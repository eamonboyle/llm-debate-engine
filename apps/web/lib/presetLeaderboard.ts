import type { AnalysisIndex, ArtifactFilterParams } from "./data";

export type PresetLeaderboardRow = {
    preset: string;
    runCount: number;
    avgIssueCount: number;
    avgMaxSeverity: number | null;
    avgSolverToRevisionDelta: number | null;
    avgEvidenceRisk: number | null;
    avgCoherence: number | null;
    runsHref: string;
};

function mean(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export type PresetLeaderboardFilterOptions = {
    fastMode?: boolean;
    linkFilters?: ArtifactFilterParams;
};

function runsHref(
    preset: string,
    fastMode?: boolean,
    linkFilters?: ArtifactFilterParams,
): string {
    const params = new URLSearchParams({ preset });
    if (fastMode !== undefined) {
        params.set("fast", String(fastMode));
    }
    if (linkFilters?.model) {
        params.set("model", linkFilters.model);
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

export function buildPresetLeaderboard(
    index: AnalysisIndex,
    opts: PresetLeaderboardFilterOptions = {},
): PresetLeaderboardRow[] {
    const sourceRuns =
        opts.fastMode === undefined
            ? index.runs
            : index.runs.filter((run) => run.fastMode === opts.fastMode);

    const byPreset = new Map<string, AnalysisIndex["runs"]>();

    for (const run of sourceRuns) {
        const bucket = byPreset.get(run.pipelinePreset) ?? [];
        bucket.push(run);
        byPreset.set(run.pipelinePreset, bucket);
    }

    const rows: PresetLeaderboardRow[] = [];

    for (const [preset, runs] of byPreset.entries()) {
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
        const coherenceScores = runs
            .map((run) => run.quality?.coherence)
            .filter((value): value is number => typeof value === "number");

        rows.push({
            preset,
            runCount: runs.length,
            avgIssueCount: mean(issueCounts) ?? 0,
            avgMaxSeverity: mean(maxSeverities),
            avgSolverToRevisionDelta: mean(solverDeltas),
            avgEvidenceRisk: mean(evidenceRisks),
            avgCoherence: mean(coherenceScores),
            runsHref: runsHref(preset, opts.fastMode, opts.linkFilters),
        });
    }

    return rows.sort((a, b) => {
        if (b.runCount !== a.runCount) return b.runCount - a.runCount;
        return a.preset.localeCompare(b.preset);
    });
}
