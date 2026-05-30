import type { AnalysisIndex } from "./data";

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

export function buildPresetLeaderboard(
    index: AnalysisIndex,
): PresetLeaderboardRow[] {
    const byPreset = new Map<string, AnalysisIndex["runs"]>();

    for (const run of index.runs) {
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
            runsHref: `/runs?preset=${encodeURIComponent(preset)}`,
        });
    }

    return rows.sort((a, b) => {
        if (b.runCount !== a.runCount) return b.runCount - a.runCount;
        return a.preset.localeCompare(b.preset);
    });
}
