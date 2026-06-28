import { findMostSimilarPeerRunId } from "./benchmarkPeers";
import type { AnalysisIndex } from "./data";
import { loadBenchmarkPairsById } from "./data";

export type RunOutlierEntry = {
    benchmarkId: string;
    avgSimilarity: number;
    zScore: number;
    peerRunId: string | null;
    peerCompareHref: string | null;
    benchmarkHref: string;
};

export type RunOutlierContext = {
    entries: RunOutlierEntry[];
};

export async function buildRunOutlierContext(
    index: AnalysisIndex | null,
    runId: string,
): Promise<RunOutlierContext | null> {
    if (!index) return null;

    const matches = (index.aggregates.outlierRuns ?? []).filter(
        (row) => row.runId === runId,
    );
    if (matches.length === 0) return null;

    const entries = await Promise.all(
        matches.map(async (row) => {
            const pairsData = await loadBenchmarkPairsById(row.benchmarkId);
            const peerRunId = findMostSimilarPeerRunId(
                row.runId,
                pairsData.runIds,
                pairsData.pairs,
            );
            return {
                benchmarkId: row.benchmarkId,
                avgSimilarity: row.avgSimilarity,
                zScore: row.zScore,
                peerRunId,
                peerCompareHref: peerRunId
                    ? `/runs/compare?left=${row.runId}&right=${peerRunId}`
                    : null,
                benchmarkHref: `/benchmarks/${row.benchmarkId}`,
            };
        }),
    );

    return { entries };
}
