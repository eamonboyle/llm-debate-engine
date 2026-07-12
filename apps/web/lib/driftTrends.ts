import type { ConfidenceDriftRow } from "./confidenceDrift";

export type DriftTrendPoint = {
    label: string;
    createdAt: string;
    solverToRevisionDelta: number | null;
    revisionToSynthesizerDelta: number | null;
    calibratedMinusSynthDelta: number | null;
};

function shortLabel(id: string, createdAt: string, index: number): string {
    const date = new Date(createdAt);
    const stamp = Number.isNaN(date.getTime())
        ? `run-${index + 1}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
    return `${stamp}-${id.slice(-6)}`;
}

export function buildDriftTrendSeries(
    rows: ConfidenceDriftRow[],
): DriftTrendPoint[] {
    return rows
        .filter(
            (row) =>
                row.solverToRevisionDelta != null ||
                row.revisionToSynthesizerDelta != null ||
                row.calibratedMinusSynthDelta != null,
        )
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((row, index) => ({
            label: shortLabel(row.runId, row.createdAt, index),
            createdAt: row.createdAt,
            solverToRevisionDelta: row.solverToRevisionDelta ?? null,
            revisionToSynthesizerDelta: row.revisionToSynthesizerDelta ?? null,
            calibratedMinusSynthDelta: row.calibratedMinusSynthDelta ?? null,
        }));
}
