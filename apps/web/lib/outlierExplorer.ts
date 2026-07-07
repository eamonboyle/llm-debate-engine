import { findMostSimilarPeerRunId } from "./benchmarkPeers";
import type { AnalysisIndex } from "./data";
import { loadBenchmarkPairsById } from "./data";

export type OutlierExplorerRow = {
    benchmarkId: string;
    runId: string;
    avgSimilarity: number;
    zScore: number;
    peerRunId: string | null;
    peerCompareHref: string | null;
};

export async function buildOutlierExplorerRows(
    index: AnalysisIndex,
    options?: { benchmarkId?: string },
): Promise<OutlierExplorerRow[]> {
    const benchmarkId = options?.benchmarkId?.trim();
    const outliers = benchmarkId
        ? (index.aggregates.outlierRuns ?? []).filter(
              (row) => row.benchmarkId === benchmarkId,
          )
        : (index.aggregates.outlierRuns ?? []);
    const sorted = [...outliers].sort(
        (a, b) => a.avgSimilarity - b.avgSimilarity,
    );

    return Promise.all(
        sorted.map(async (row) => {
            const pairsData = await loadBenchmarkPairsById(row.benchmarkId);
            const peerRunId = findMostSimilarPeerRunId(
                row.runId,
                pairsData.runIds,
                pairsData.pairs,
            );
            return {
                ...row,
                peerRunId,
                peerCompareHref: peerRunId
                    ? `/runs/compare?left=${row.runId}&right=${peerRunId}`
                    : null,
            };
        }),
    );
}
