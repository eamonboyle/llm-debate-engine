import type { AnalysisIndex } from "./data";
import {
    buildPresetLeaderboard,
    type PresetLeaderboardFilterOptions,
    type PresetLeaderboardRow,
} from "./presetLeaderboard";

export type PresetComparePayload = {
    left: PresetLeaderboardRow;
    right: PresetLeaderboardRow;
    delta: {
        runCount: number;
        avgIssueCount: number | null;
        avgMaxSeverity: number | null;
        avgSolverToRevisionDelta: number | null;
        avgEvidenceRisk: number | null;
        avgCoherence: number | null;
    };
};

function delta(right: number | null, left: number | null): number | null {
    if (typeof right !== "number" || typeof left !== "number") return null;
    return right - left;
}

export function findPresetLeaderboardRow(
    index: AnalysisIndex,
    preset: string,
    opts: PresetLeaderboardFilterOptions = {},
): PresetLeaderboardRow | null {
    const normalized = preset.trim();
    if (!normalized) return null;
    const rows = buildPresetLeaderboard(index, opts);
    return (
        rows.find(
            (row) => row.preset.toLowerCase() === normalized.toLowerCase(),
        ) ?? null
    );
}

export function buildPresetComparePayload(
    index: AnalysisIndex,
    leftPreset: string,
    rightPreset: string,
    opts: PresetLeaderboardFilterOptions = {},
): PresetComparePayload | null {
    const left = findPresetLeaderboardRow(index, leftPreset, opts);
    const right = findPresetLeaderboardRow(index, rightPreset, opts);
    if (!left || !right) return null;

    return {
        left,
        right,
        delta: {
            runCount: right.runCount - left.runCount,
            avgIssueCount: delta(right.avgIssueCount, left.avgIssueCount),
            avgMaxSeverity: delta(right.avgMaxSeverity, left.avgMaxSeverity),
            avgSolverToRevisionDelta: delta(
                right.avgSolverToRevisionDelta,
                left.avgSolverToRevisionDelta,
            ),
            avgEvidenceRisk: delta(right.avgEvidenceRisk, left.avgEvidenceRisk),
            avgCoherence: delta(right.avgCoherence, left.avgCoherence),
        },
    };
}
