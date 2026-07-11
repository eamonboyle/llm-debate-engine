import type { QualityRunRow } from "./qualityInsights";

export type QualityTrendPoint = {
    label: string;
    createdAt: string;
    coherence: number | null;
    completeness: number | null;
    factualRisk: number | null;
    uncertaintyHandling: number | null;
};

function shortLabel(id: string, createdAt: string, index: number): string {
    const date = new Date(createdAt);
    const stamp = Number.isNaN(date.getTime())
        ? `run-${index + 1}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
    return `${stamp}-${id.slice(-6)}`;
}

export function buildQualityTrendSeries(
    rows: QualityRunRow[],
): QualityTrendPoint[] {
    return rows
        .filter(
            (row) =>
                row.coherence != null ||
                row.completeness != null ||
                row.factualRisk != null ||
                row.uncertaintyHandling != null,
        )
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((row, index) => ({
            label: shortLabel(row.id, row.createdAt, index),
            createdAt: row.createdAt,
            coherence: row.coherence,
            completeness: row.completeness,
            factualRisk: row.factualRisk,
            uncertaintyHandling: row.uncertaintyHandling,
        }));
}
