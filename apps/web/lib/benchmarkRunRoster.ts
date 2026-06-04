import type { SimilarityPair } from "./benchmarkPeers";

export type BenchmarkRunRosterRow = {
    runId: string;
    runIndex: number;
    avgSimilarity: number | null;
    modeIndex: number | null;
};

function averageSimilarityByRunIndex(
    runCount: number,
    pairs: SimilarityPair[],
): Map<number, number> {
    const sums = new Map<number, { sum: number; count: number }>();

    for (const pair of pairs) {
        if (
            pair.i < 0 ||
            pair.j < 0 ||
            pair.i >= runCount ||
            pair.j >= runCount
        ) {
            continue;
        }
        for (const index of [pair.i, pair.j]) {
            const entry = sums.get(index) ?? { sum: 0, count: 0 };
            entry.sum += pair.similarity;
            entry.count += 1;
            sums.set(index, entry);
        }
    }

    const averages = new Map<number, number>();
    for (const [index, stats] of sums) {
        if (stats.count > 0) {
            averages.set(index, stats.sum / stats.count);
        }
    }
    return averages;
}

function modeIndexForRun(
    runIndex: number,
    modes: Array<{ members: number[] }> | undefined,
): number | null {
    if (!modes?.length) return null;
    for (let modeIndex = 0; modeIndex < modes.length; modeIndex++) {
        if (modes[modeIndex].members.includes(runIndex)) {
            return modeIndex;
        }
    }
    return null;
}

export function buildBenchmarkRunRoster(input: {
    runIds: string[];
    pairs: SimilarityPair[];
    modes?: Array<{ members: number[] }>;
}): BenchmarkRunRosterRow[] {
    const { runIds, pairs, modes } = input;
    const avgByIndex = averageSimilarityByRunIndex(runIds.length, pairs);

    return runIds.map((runId, runIndex) => ({
        runId,
        runIndex,
        avgSimilarity: avgByIndex.get(runIndex) ?? null,
        modeIndex: modeIndexForRun(runIndex, modes),
    }));
}

/** Lowest average similarity first — surfaces divergent runs within a benchmark. */
export function sortBenchmarkRunRoster(
    roster: BenchmarkRunRosterRow[],
): BenchmarkRunRosterRow[] {
    return roster.slice().sort((a, b) => {
        if (a.avgSimilarity == null && b.avgSimilarity == null) {
            return a.runIndex - b.runIndex;
        }
        if (a.avgSimilarity == null) return 1;
        if (b.avgSimilarity == null) return -1;
        if (a.avgSimilarity !== b.avgSimilarity) {
            return a.avgSimilarity - b.avgSimilarity;
        }
        return a.runIndex - b.runIndex;
    });
}
