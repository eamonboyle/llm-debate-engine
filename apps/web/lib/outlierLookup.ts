import { findMostSimilarPeerRunId } from "./benchmarkPeers";
import type { AnalysisIndex } from "./data";
import { loadBenchmarkPairsById } from "./data";

export type RunOutlierContext = {
    benchmarkId: string;
    avgSimilarity: number;
    zScore: number;
    peerRunId: string | null;
    peerCompareHref: string | null;
};

export function findRunOutlierEntry(
    index: AnalysisIndex | null,
    runId: string,
): {
    benchmarkId: string;
    runId: string;
    avgSimilarity: number;
    zScore: number;
} | null {
    if (!index) return null;
    return (
        index.aggregates.outlierRuns?.find((row) => row.runId === runId) ?? null
    );
}

export function buildOutlierRunIdSet(
    index: AnalysisIndex | null,
): Set<string> {
    if (!index) return new Set();
    return new Set(
        index.aggregates.outlierRuns?.map((row) => row.runId) ?? [],
    );
}

export async function buildRunOutlierContext(
    index: AnalysisIndex | null,
    runId: string,
): Promise<RunOutlierContext | null> {
    const entry = findRunOutlierEntry(index, runId);
    if (!entry) return null;

    const pairsData = await loadBenchmarkPairsById(entry.benchmarkId);
    const peerRunId = findMostSimilarPeerRunId(
        runId,
        pairsData.runIds,
        pairsData.pairs,
    );

    return {
        benchmarkId: entry.benchmarkId,
        avgSimilarity: entry.avgSimilarity,
        zScore: entry.zScore,
        peerRunId,
        peerCompareHref: peerRunId
            ? `/runs/compare?left=${runId}&right=${peerRunId}`
            : null,
    };
}
