import type { AnalysisIndex, BenchmarkPairsExport } from "./data";

export type BenchmarkSimilaritySummary = {
    benchmarkId: string;
    question: string;
    model: string;
    preset: string;
    createdAt: string;
    runCount: number;
    pairCount: number;
    stabilityMean: number | null;
    minPairSimilarity: number | null;
    minPairRunIds: [string, string] | null;
    benchmarkHref: string;
    compareHref: string | null;
};

export type GlobalLowSimilarityPair = {
    benchmarkId: string;
    runIdI: string;
    runIdJ: string;
    similarity: number;
    compareHref: string;
    benchmarkHref: string;
};

function mean(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildBenchmarkSimilaritySummaries(
    index: AnalysisIndex,
    pairsExport: BenchmarkPairsExport,
): BenchmarkSimilaritySummary[] {
    const benchmarkById = new Map(
        index.benchmarks.map((benchmark) => [benchmark.id, benchmark]),
    );

    return pairsExport.pairwise
        .map((entry) => {
            const benchmark = benchmarkById.get(entry.benchmarkId);
            const runIds = entry.runIds ?? [];
            const pairs = entry.pairs ?? [];
            const similarities = pairs.map((pair) => pair.similarity);
            const minPair =
                pairs.length > 0
                    ? pairs.reduce((lowest, pair) =>
                          pair.similarity < lowest.similarity ? pair : lowest,
                      )
                    : null;
            const minPairRunIds =
                minPair &&
                runIds[minPair.i] != null &&
                runIds[minPair.j] != null
                    ? ([runIds[minPair.i], runIds[minPair.j]] as [
                          string,
                          string,
                      ])
                    : null;

            return {
                benchmarkId: entry.benchmarkId,
                question: benchmark?.question ?? "(unknown question)",
                model: benchmark?.model ?? "—",
                preset: benchmark?.pipelinePreset ?? "—",
                createdAt: benchmark?.createdAt ?? "",
                runCount: runIds.length,
                pairCount: pairs.length,
                stabilityMean: mean(similarities),
                minPairSimilarity: minPair?.similarity ?? null,
                minPairRunIds,
                benchmarkHref: `/benchmarks/${entry.benchmarkId}`,
                compareHref: minPairRunIds
                    ? `/runs/compare?left=${minPairRunIds[0]}&right=${minPairRunIds[1]}`
                    : null,
            };
        })
        .sort((a, b) => {
            const aMin = a.minPairSimilarity ?? 999;
            const bMin = b.minPairSimilarity ?? 999;
            if (aMin !== bMin) return aMin - bMin;
            const aMean = a.stabilityMean ?? 999;
            const bMean = b.stabilityMean ?? 999;
            if (aMean !== bMean) return aMean - bMean;
            return b.benchmarkId.localeCompare(a.benchmarkId);
        });
}

export function collectGlobalLowSimilarityPairs(
    pairsExport: BenchmarkPairsExport,
    limit = 24,
): GlobalLowSimilarityPair[] {
    const collected: GlobalLowSimilarityPair[] = [];

    for (const entry of pairsExport.pairwise) {
        const runIds = entry.runIds ?? [];
        for (const pair of entry.pairs ?? []) {
            const runIdI = runIds[pair.i];
            const runIdJ = runIds[pair.j];
            if (!runIdI || !runIdJ) continue;
            collected.push({
                benchmarkId: entry.benchmarkId,
                runIdI,
                runIdJ,
                similarity: pair.similarity,
                compareHref: `/runs/compare?left=${runIdI}&right=${runIdJ}`,
                benchmarkHref: `/benchmarks/${entry.benchmarkId}`,
            });
        }
    }

    return collected
        .sort((a, b) => a.similarity - b.similarity)
        .slice(0, limit);
}
