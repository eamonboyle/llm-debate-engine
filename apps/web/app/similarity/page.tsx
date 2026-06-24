import type { Metadata } from "next";
import Link from "next/link";
import { MetricCard } from "../../components/MetricCard";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import {
    loadAnalysisIndex,
    loadBenchmarkPairsExport,
    loadDataStatus,
} from "../../lib/data";
import {
    buildBenchmarkSimilaritySummaries,
    collectGlobalLowSimilarityPairs,
} from "../../lib/similarityExplorer";

export const metadata: Metadata = {
    title: "Similarity explorer",
};

function formatSimilarity(value: number | null) {
    return typeof value === "number" ? value.toFixed(3) : "—";
}

export default async function SimilarityExplorerPage() {
    const [pairsExport, index, status] = await Promise.all([
        loadBenchmarkPairsExport(),
        loadAnalysisIndex(),
        loadDataStatus(),
    ]);

    if (!pairsExport) {
        return (
            <section className="stack">
                <h1 className="title">Similarity explorer</h1>
                <p className="subtitle">
                    Cross-benchmark pairwise similarity requires{" "}
                    <code>analysis-benchmark-pairs.json</code>. Generate it with{" "}
                    <code>pnpm analyze -- --chunks</code> or a full analyze run.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/status" className="button">
                        Check data status
                    </Link>
                    <Link href="/benchmarks" className="button secondary">
                        Browse benchmarks
                    </Link>
                    <Link href="/outliers" className="button secondary">
                        Outlier runs
                    </Link>
                </div>
            </section>
        );
    }

    const summaries = index
        ? buildBenchmarkSimilaritySummaries(index, pairsExport)
        : pairsExport.pairwise.map((entry) => ({
              benchmarkId: entry.benchmarkId,
              question: "(index unavailable)",
              model: "—",
              preset: "—",
              createdAt: "",
              runCount: entry.runIds?.length ?? 0,
              pairCount: entry.pairs?.length ?? 0,
              stabilityMean: null,
              minPairSimilarity: null,
              minPairRunIds: null,
              benchmarkHref: `/benchmarks/${entry.benchmarkId}`,
              compareHref: null,
          }));

    const lowPairs = collectGlobalLowSimilarityPairs(pairsExport);
    const benchmarkCount = summaries.length;
    const pairCount = summaries.reduce((sum, row) => sum + row.pairCount, 0);
    const lowestBenchmark = summaries[0] ?? null;

    return (
        <section className="stack">
            <div>
                <h1 className="title">Similarity explorer</h1>
                <p className="subtitle">
                    Browse benchmark answer stability from the global pairwise
                    export — spot divergent experiments and jump into run
                    comparisons.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/outliers" className="button secondary">
                        Outlier runs
                    </Link>
                    <Link href="/benchmarks" className="button secondary">
                        All benchmarks
                    </Link>
                    <a
                        href="/api/analysis/pairs?download=1"
                        className="button secondary"
                        download="analysis-benchmark-pairs.json"
                    >
                        Download pairs JSON
                    </a>
                </div>
            </div>

            <div className="grid-4">
                <MetricCard
                    label="Benchmarks with pairs"
                    value={benchmarkCount}
                    helpKey="benchmarkArtifacts"
                />
                <MetricCard
                    label="Pairwise comparisons"
                    value={pairCount}
                    helpKey="pairwiseSimilarityHeatmap"
                />
                <MetricCard
                    label="Lowest benchmark min-pair"
                    value={formatSimilarity(
                        lowestBenchmark?.minPairSimilarity ?? null,
                    )}
                    helper={
                        lowestBenchmark
                            ? lowestBenchmark.benchmarkId.slice(-12)
                            : undefined
                    }
                />
                <MetricCard
                    label="Pairs export"
                    value={
                        pairsExport.generatedAt
                            ? new Date(
                                  pairsExport.generatedAt,
                              ).toLocaleDateString()
                            : status.hasBenchmarkPairs
                              ? "Ready"
                              : "—"
                    }
                    helper="analysis-benchmark-pairs.json"
                />
            </div>

            {lowPairs.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Lowest similarity pairs</h2>
                    <p className="small muted">
                        Globally lowest cosine similarities across all benchmark
                        runs — useful for qualitative review of divergent
                        answers.
                    </p>
                    <ResponsiveTable
                        columns={[
                            {
                                key: "similarity",
                                label: "Similarity",
                                helpKey: "stability.pairwiseMean",
                            },
                            { key: "benchmarkId", label: "Benchmark" },
                            { key: "runIdI", label: "Run A" },
                            { key: "runIdJ", label: "Run B" },
                            {
                                key: "actions",
                                label: "Open",
                                cellClass: "cell-actions",
                                render: (row) => (
                                    <Link
                                        href={
                                            (
                                                row as {
                                                    compareHref: string;
                                                }
                                            ).compareHref
                                        }
                                    >
                                        Compare
                                    </Link>
                                ),
                            },
                        ]}
                        data={lowPairs.map((pair) => ({
                            similarity: formatSimilarity(pair.similarity),
                            benchmarkId: pair.benchmarkId,
                            runIdI: pair.runIdI,
                            runIdJ: pair.runIdJ,
                            compareHref: pair.compareHref,
                        }))}
                        getRowId={(row) =>
                            `${(row as { benchmarkId: string }).benchmarkId}:${(row as { runIdI: string }).runIdI}:${(row as { runIdJ: string }).runIdJ}`
                        }
                        renderCardActions={(row) => (
                            <Link
                                href={
                                    (row as { compareHref: string }).compareHref
                                }
                                className="button"
                            >
                                Compare runs
                            </Link>
                        )}
                    />
                </div>
            ) : null}

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Benchmark stability</h2>
                <p className="small muted">
                    Sorted by lowest minimum pairwise similarity within each
                    benchmark. Open a benchmark for the full heatmap.
                </p>
                <ResponsiveTable
                    columns={[
                        {
                            key: "minPairSimilarity",
                            label: "Min pair",
                            helpKey: "stability.pairwiseMean",
                        },
                        {
                            key: "stabilityMean",
                            label: "Mean pair",
                            helpKey: "stability.pairwiseMean",
                        },
                        { key: "runCount", label: "Runs" },
                        {
                            key: "question",
                            label: "Question",
                            cellClass: "cell-question",
                            render: (row) => (
                                <TruncateText
                                    text={
                                        (row as { question: string }).question
                                    }
                                    maxLength={72}
                                    className="muted"
                                />
                            ),
                        },
                        { key: "model", label: "Model", helpKey: "model" },
                        { key: "preset", label: "Preset", helpKey: "preset" },
                        {
                            key: "actions",
                            label: "Open",
                            cellClass: "cell-actions",
                            render: (row) => (
                                <Link
                                    href={
                                        (row as { benchmarkHref: string })
                                            .benchmarkHref
                                    }
                                >
                                    Benchmark
                                </Link>
                            ),
                        },
                    ]}
                    data={summaries.map((row) => ({
                        minPairSimilarity: formatSimilarity(
                            row.minPairSimilarity,
                        ),
                        stabilityMean: formatSimilarity(row.stabilityMean),
                        runCount: row.runCount,
                        question: row.question,
                        model: row.model,
                        preset: row.preset,
                        benchmarkHref: row.benchmarkHref,
                    }))}
                    getRowId={(row) =>
                        (row as { benchmarkHref: string }).benchmarkHref
                    }
                    renderCardActions={(row) => (
                        <Link
                            href={
                                (row as { benchmarkHref: string }).benchmarkHref
                            }
                            className="button"
                        >
                            View benchmark
                        </Link>
                    )}
                />
            </div>
        </section>
    );
}
