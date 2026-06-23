import { findMostSimilarPeerRunId } from "./benchmarkPeers";
import type { AnalysisIndex } from "./data";
import { loadBenchmarkPairsById } from "./data";

export type OutlierRunEntry = NonNullable<
    AnalysisIndex["aggregates"]["outlierRuns"]
>[number];

export type RunOutlierContext = OutlierRunEntry & {
    peerRunId: string | null;
    peerCompareHref: string | null;
};

export function findOutlierForRun(
    index: AnalysisIndex,
    runId: string,
): OutlierRunEntry | null {
    return (
        index.aggregates.outlierRuns?.find((entry) => entry.runId === runId) ??
        null
    );
}

export async function buildRunOutlierContext(
    index: AnalysisIndex,
    runId: string,
): Promise<RunOutlierContext | null> {
    const entry = findOutlierForRun(index, runId);
    if (!entry) return null;

    const pairsData = await loadBenchmarkPairsById(entry.benchmarkId);
    const peerRunId = findMostSimilarPeerRunId(
        runId,
        pairsData.runIds,
        pairsData.pairs,
    );

    return {
        ...entry,
        peerRunId,
        peerCompareHref: peerRunId
            ? `/runs/compare?left=${runId}&right=${peerRunId}`
            : null,
    };
}
