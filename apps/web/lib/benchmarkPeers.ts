export type SimilarityPair = {
    i: number;
    j: number;
    similarity: number;
};

/**
 * For a run inside a benchmark, find the peer run with the highest average
 * pairwise similarity (best match within the same benchmark).
 */
export function findMostSimilarPeerRunId(
    targetRunId: string,
    runIds: string[],
    pairs: SimilarityPair[],
): string | null {
    const targetIndex = runIds.indexOf(targetRunId);
    if (targetIndex < 0 || runIds.length < 2) return null;

    const similaritySums = new Map<number, { sum: number; count: number }>();

    for (const pair of pairs) {
        if (pair.i === targetIndex) {
            const entry = similaritySums.get(pair.j) ?? { sum: 0, count: 0 };
            entry.sum += pair.similarity;
            entry.count += 1;
            similaritySums.set(pair.j, entry);
        } else if (pair.j === targetIndex) {
            const entry = similaritySums.get(pair.i) ?? { sum: 0, count: 0 };
            entry.sum += pair.similarity;
            entry.count += 1;
            similaritySums.set(pair.i, entry);
        }
    }

    let bestIndex: number | null = null;
    let bestAvg = -1;

    for (const [index, stats] of similaritySums) {
        if (index === targetIndex || stats.count === 0) continue;
        const avg = stats.sum / stats.count;
        if (avg > bestAvg) {
            bestAvg = avg;
            bestIndex = index;
        }
    }

    return bestIndex == null ? null : (runIds[bestIndex] ?? null);
}
