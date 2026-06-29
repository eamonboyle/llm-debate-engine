import type { BenchmarkArtifact } from "./data";
import { loadBenchmarkPairsExport } from "./data";

export type BenchmarkPairSummaryRow = {
    benchmarkId: string;
    question: string;
    model: string;
    pipelinePreset: string;
    runCount: number;
    pairCount: number;
    minSimilarity: number | null;
    maxSimilarity: number | null;
    avgSimilarity: number | null;
};

export type BenchmarkPairDetailRow = {
    runIdA: string;
    runIdB: string;
    similarity: number;
    compareHref: string;
};

function summarizePairs(
    pairs: Array<{ i: number; j: number; similarity: number }>,
    runIds: string[],
): {
    pairCount: number;
    minSimilarity: number | null;
    maxSimilarity: number | null;
    avgSimilarity: number | null;
} {
    if (pairs.length === 0) {
        return {
            pairCount: 0,
            minSimilarity: null,
            maxSimilarity: null,
            avgSimilarity: null,
        };
    }

    const similarities = pairs.map((pair) => pair.similarity);
    const sum = similarities.reduce((total, value) => total + value, 0);

    return {
        pairCount: pairs.length,
        minSimilarity: Math.min(...similarities),
        maxSimilarity: Math.max(...similarities),
        avgSimilarity: sum / similarities.length,
    };
}

export async function buildBenchmarkPairSummaries(
    benchmarks: BenchmarkArtifact[],
): Promise<BenchmarkPairSummaryRow[]> {
    const exportData = await loadBenchmarkPairsExport();
    const benchmarkById = new Map(benchmarks.map((b) => [b.id, b]));
    const rows: BenchmarkPairSummaryRow[] = [];

    if (exportData?.pairwise?.length) {
        for (const entry of exportData.pairwise) {
            const benchmark = benchmarkById.get(entry.benchmarkId);
            const pairs = entry.pairs ?? [];
            const stats = summarizePairs(pairs, entry.runIds ?? []);

            rows.push({
                benchmarkId: entry.benchmarkId,
                question: benchmark?.question ?? "(unknown question)",
                model: benchmark?.metadata.model ?? "—",
                pipelinePreset: benchmark?.metadata.pipelinePreset ?? "—",
                runCount: entry.runIds?.length ?? benchmark?.payload.runs ?? 0,
                ...stats,
            });
        }
    } else {
        for (const benchmark of benchmarks) {
            const pairs = benchmark.payload.summary?.stability?.pairs ?? [];
            const runIds = benchmark.payload.runIds ?? [];
            const stats = summarizePairs(pairs, runIds);

            if (stats.pairCount === 0) continue;

            rows.push({
                benchmarkId: benchmark.id,
                question: benchmark.question,
                model: benchmark.metadata.model,
                pipelinePreset: benchmark.metadata.pipelinePreset,
                runCount: runIds.length || benchmark.payload.runs,
                ...stats,
            });
        }
    }

    return rows.sort((a, b) => {
        const aMin = a.minSimilarity ?? 1;
        const bMin = b.minSimilarity ?? 1;
        if (aMin !== bMin) return aMin - bMin;
        return a.benchmarkId.localeCompare(b.benchmarkId);
    });
}

export async function buildBenchmarkPairDetails(
    benchmarkId: string,
    benchmarks: BenchmarkArtifact[],
): Promise<{
    summary: BenchmarkPairSummaryRow | null;
    pairs: BenchmarkPairDetailRow[];
}> {
    const exportData = await loadBenchmarkPairsExport();
    const benchmark = benchmarks.find((entry) => entry.id === benchmarkId);
    const fromExport = exportData?.pairwise?.find(
        (entry) => entry.benchmarkId === benchmarkId,
    );

    const runIds = fromExport?.runIds ?? benchmark?.payload.runIds ?? [];
    const rawPairs =
        fromExport?.pairs ?? benchmark?.payload.summary?.stability?.pairs ?? [];

    const summaryRow: BenchmarkPairSummaryRow | null = benchmark
        ? {
              benchmarkId,
              question: benchmark.question,
              model: benchmark.metadata.model,
              pipelinePreset: benchmark.metadata.pipelinePreset,
              runCount: runIds.length || benchmark.payload.runs,
              ...summarizePairs(rawPairs, runIds),
          }
        : fromExport
          ? {
                benchmarkId,
                question: "(unknown question)",
                model: "—",
                pipelinePreset: "—",
                runCount: runIds.length,
                ...summarizePairs(rawPairs, runIds),
            }
          : null;

    const pairs: BenchmarkPairDetailRow[] = rawPairs
        .map((pair) => {
            const runIdA = runIds[pair.i];
            const runIdB = runIds[pair.j];
            if (!runIdA || !runIdB) return null;
            return {
                runIdA,
                runIdB,
                similarity: pair.similarity,
                compareHref: `/runs/compare?left=${runIdA}&right=${runIdB}`,
            };
        })
        .filter((row): row is BenchmarkPairDetailRow => row != null)
        .sort((a, b) => a.similarity - b.similarity);

    return { summary: summaryRow, pairs };
}
