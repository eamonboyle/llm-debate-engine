import type { Metadata } from "next";
import Link from "next/link";
import { InsightFilterCard } from "../../components/InsightFilterCard";
import { MetricCard } from "../../components/MetricCard";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { collectArtifactFacets } from "../../lib/artifactFacets";
import {
    loadBenchmarkArtifacts,
    type ArtifactFilterParams,
} from "../../lib/data";
import { buildQueryString } from "../../lib/listPagination";
import {
    buildBenchmarkPairDetails,
    buildBenchmarkPairSummaries,
    filterPairSummaries,
} from "../../lib/pairsExplorer";

export const metadata: Metadata = {
    title: "Benchmark pairs",
};

type PairsSearchParams = ArtifactFilterParams & {
    benchmark?: string;
};

export default async function PairsExplorerPage({
    searchParams,
}: {
    searchParams: Promise<PairsSearchParams>;
}) {
    const params = await searchParams;
    const allBenchmarks = await loadBenchmarkArtifacts();
    const { models, presets } = collectArtifactFacets([], allBenchmarks);
    const allSummaries = await buildBenchmarkPairSummaries(allBenchmarks);
    const summaries = filterPairSummaries(allSummaries, params);
    const selectedBenchmark = (params.benchmark ?? "").trim();
    const details = selectedBenchmark
        ? await buildBenchmarkPairDetails(selectedBenchmark, allBenchmarks)
        : { summary: null, pairs: [] };

    return (
        <section className="stack">
            <div>
                <h1 className="title">Benchmark pairwise similarity</h1>
                <p className="subtitle">
                    Browse cross-benchmark pairwise similarity exports — lowest
                    similarity pairs first to spot divergent answers quickly.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/benchmarks" className="button secondary">
                        All benchmarks
                    </Link>
                    <Link href="/outliers" className="button secondary">
                        Outlier runs
                    </Link>
                    <Link href="/status" className="button secondary">
                        Data status
                    </Link>
                </div>
            </div>

            <InsightFilterCard
                action="/pairs"
                models={models}
                presets={presets}
                params={params}
                totalRuns={allSummaries.length}
                filteredRuns={summaries.length}
                preserveKeys={["benchmark"]}
                entityLabel="benchmarks with pairs"
            />

            {summaries.length > 0 ? (
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <a
                        href={`/api/pairs${buildQueryString(params, {})}`}
                        className="button secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                    >
                        Export JSON
                    </a>
                    <a
                        href={`/api/pairs${buildQueryString(params, {})}&format=csv`}
                        className="button secondary"
                        download="benchmark-pairs.csv"
                    >
                        Export CSV
                    </a>
                    <a
                        href="/api/analysis/pairs?download=1"
                        className="button secondary"
                        download="analysis-benchmark-pairs.json"
                    >
                        Download raw pairs file
                    </a>
                </div>
            ) : null}

            <div className="grid-4">
                <MetricCard
                    label="Benchmarks with pairs"
                    value={summaries.length}
                    helpKey="benchmarkArtifacts"
                />
                <MetricCard
                    label="Total pairwise entries"
                    value={summaries.reduce(
                        (sum, row) => sum + row.pairCount,
                        0,
                    )}
                    helpKey="avgSimilarity"
                />
                <MetricCard
                    label="Lowest min similarity"
                    value={
                        summaries[0]?.minSimilarity != null
                            ? summaries[0].minSimilarity.toFixed(3)
                            : "—"
                    }
                    helpKey="avgSimilarity"
                />
                <MetricCard
                    label="Selected benchmark"
                    value={
                        selectedBenchmark ? selectedBenchmark.slice(-12) : "—"
                    }
                    helpKey="benchmarkArtifacts"
                />
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Benchmark summaries</h2>
                {summaries.length === 0 ? (
                    <p className="muted">
                        No pairwise similarity data found. Generate benchmark
                        artifacts and run <code>pnpm analyze -- --chunks</code>{" "}
                        to build <code>analysis-benchmark-pairs.json</code>, or
                        open individual benchmark detail pages.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "benchmarkId", label: "Benchmark" },
                            {
                                key: "question",
                                label: "Question",
                                cellClass: "cell-question",
                                render: (row) => (
                                    <TruncateText
                                        text={
                                            (row as { question: string })
                                                .question
                                        }
                                        maxLength={72}
                                        className="muted"
                                    />
                                ),
                            },
                            {
                                key: "model",
                                label: "Model",
                                hideOnMobile: true,
                            },
                            {
                                key: "runCount",
                                label: "Runs",
                                helpKey: "runs",
                            },
                            {
                                key: "pairCount",
                                label: "Pairs",
                                helpKey: "avgSimilarity",
                            },
                            {
                                key: "minSimilarity",
                                label: "Min sim",
                                helpKey: "avgSimilarity",
                                render: (row) => {
                                    const value = (
                                        row as { minSimilarity: number | null }
                                    ).minSimilarity;
                                    return value != null
                                        ? value.toFixed(3)
                                        : "—";
                                },
                            },
                            {
                                key: "avgSimilarity",
                                label: "Avg sim",
                                helpKey: "avgSimilarity",
                                render: (row) => {
                                    const value = (
                                        row as { avgSimilarity: number | null }
                                    ).avgSimilarity;
                                    return value != null
                                        ? value.toFixed(3)
                                        : "—";
                                },
                            },
                            {
                                key: "actions",
                                label: "Explore",
                                cellClass: "cell-actions",
                                render: (row) => {
                                    const benchmarkId = (
                                        row as { benchmarkId: string }
                                    ).benchmarkId;
                                    return (
                                        <Link
                                            href={`/pairs?benchmark=${benchmarkId}`}
                                        >
                                            Pairs
                                        </Link>
                                    );
                                },
                            },
                        ]}
                        data={summaries}
                        getRowId={(row) =>
                            (row as { benchmarkId: string }).benchmarkId
                        }
                        renderCardActions={(row) => {
                            const benchmarkId = (row as { benchmarkId: string })
                                .benchmarkId;
                            return (
                                <>
                                    <Link
                                        href={`/pairs?benchmark=${benchmarkId}`}
                                        className="button"
                                    >
                                        View pairs
                                    </Link>
                                    <Link
                                        href={`/benchmarks/${benchmarkId}`}
                                        className="button secondary"
                                    >
                                        Benchmark
                                    </Link>
                                </>
                            );
                        }}
                    />
                )}
            </div>

            {selectedBenchmark ? (
                <div className="card">
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "1rem",
                            flexWrap: "wrap",
                            alignItems: "baseline",
                        }}
                    >
                        <h2 style={{ margin: 0 }}>Pair details</h2>
                        <Link href="/pairs" className="button secondary">
                            Clear selection
                        </Link>
                    </div>
                    {details.summary ? (
                        <p className="small muted" style={{ marginTop: 12 }}>
                            {details.summary.question} ·{" "}
                            {details.summary.pairCount} pairs · min{" "}
                            {details.summary.minSimilarity?.toFixed(3) ?? "—"} ·
                            avg{" "}
                            {details.summary.avgSimilarity?.toFixed(3) ?? "—"}
                        </p>
                    ) : null}
                    {details.pairs.length === 0 ? (
                        <p className="muted" style={{ marginTop: 12 }}>
                            No pairwise entries for this benchmark.
                        </p>
                    ) : (
                        <ResponsiveTable
                            columns={[
                                { key: "runIdA", label: "Run A" },
                                { key: "runIdB", label: "Run B" },
                                {
                                    key: "similarity",
                                    label: "Similarity",
                                    helpKey: "avgSimilarity",
                                    render: (row) =>
                                        (
                                            row as { similarity: number }
                                        ).similarity.toFixed(3),
                                },
                                {
                                    key: "compare",
                                    label: "Compare",
                                    cellClass: "cell-actions",
                                    render: (row) => (
                                        <Link
                                            href={
                                                (row as { compareHref: string })
                                                    .compareHref
                                            }
                                        >
                                            Open
                                        </Link>
                                    ),
                                },
                            ]}
                            data={details.pairs}
                            getRowId={(row) =>
                                `${(row as { runIdA: string }).runIdA}-${(row as { runIdB: string }).runIdB}`
                            }
                            renderCardActions={(row) => {
                                const r = row as {
                                    compareHref: string;
                                    runIdA: string;
                                    runIdB: string;
                                };
                                return (
                                    <>
                                        <Link
                                            href={r.compareHref}
                                            className="button"
                                        >
                                            Compare runs
                                        </Link>
                                        <Link
                                            href={`/runs/${r.runIdA}`}
                                            className="button secondary"
                                        >
                                            Trace A
                                        </Link>
                                        <Link
                                            href={`/runs/${r.runIdB}`}
                                            className="button secondary"
                                        >
                                            Trace B
                                        </Link>
                                    </>
                                );
                            }}
                        />
                    )}
                </div>
            ) : null}
        </section>
    );
}
