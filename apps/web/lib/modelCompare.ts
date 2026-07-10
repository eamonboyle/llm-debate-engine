import type { AnalysisIndex } from "./data";
import {
    buildModelLeaderboard,
    type LeaderboardFilterOptions,
    type ModelLeaderboardRow,
} from "./modelLeaderboard";

export type ModelComparePayload = {
    left: ModelLeaderboardRow;
    right: ModelLeaderboardRow;
    delta: {
        runCount: number;
        avgIssueCount: number | null;
        avgMaxSeverity: number | null;
        avgSolverToRevisionDelta: number | null;
        avgEvidenceRisk: number | null;
        avgSolverConfidence: number | null;
        avgCoherence: number | null;
        avgFactualRisk: number | null;
    };
};

function delta(right: number | null, left: number | null): number | null {
    if (typeof right !== "number" || typeof left !== "number") return null;
    return right - left;
}

export function findModelLeaderboardRow(
    index: AnalysisIndex,
    model: string,
    opts: LeaderboardFilterOptions = {},
): ModelLeaderboardRow | null {
    const normalized = model.trim();
    if (!normalized) return null;
    const rows = buildModelLeaderboard(index, opts);
    return (
        rows.find(
            (row) => row.model.toLowerCase() === normalized.toLowerCase(),
        ) ?? null
    );
}

export function buildModelComparePayload(
    index: AnalysisIndex,
    leftModel: string,
    rightModel: string,
    opts: LeaderboardFilterOptions = {},
): ModelComparePayload | null {
    const left = findModelLeaderboardRow(index, leftModel, opts);
    const right = findModelLeaderboardRow(index, rightModel, opts);
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
            avgSolverConfidence: delta(
                right.avgSolverConfidence,
                left.avgSolverConfidence,
            ),
            avgCoherence: delta(right.avgCoherence, left.avgCoherence),
            avgFactualRisk: delta(right.avgFactualRisk, left.avgFactualRisk),
        },
    };
}
