import type { Metadata } from "next";
import Link from "next/link";
import { InsightFilterCard } from "../../components/InsightFilterCard";
import { MetricCard } from "../../components/MetricCard";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { buildOutlierRows } from "../../lib/outlierRows";
import { loadAnalysisIndex } from "../../lib/data";
import { applyIndexFilters, collectIndexFacets } from "../../lib/indexFilters";
import { buildQueryString } from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Outlier runs",
};

type OutliersSearchParams = {
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};

export default async function OutliersPage({
    searchParams,
}: {
    searchParams: Promise<OutliersSearchParams>;
}) {
    const params = await searchParams;
    const rawIndex = await loadAnalysisIndex();

    if (!rawIndex) {
        return (
            <section className="stack">
                <h1 className="title">Outlier runs</h1>
                <p className="subtitle">
                    Outlier detection requires an analysis index with benchmark
                    pairwise similarity. Run <code>pnpm analyze</code> after
                    generating benchmark artifacts.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const { models, presets } = collectIndexFacets(rawIndex);
    const index = applyIndexFilters(rawIndex, params);
    const rows = await buildOutlierRows(index);

    return (
        <section className="stack">
            <div>
                <h1 className="title">Outlier runs</h1>
                <p className="subtitle">
                    Runs with the lowest average pairwise similarity within
                    their parent benchmark — useful for spotting divergent
                    answers in multi-run experiments.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/" className="button secondary">
                        Overview
                    </Link>
                    <Link href="/benchmarks" className="button secondary">
                        All benchmarks
                    </Link>
                </div>
            </div>

            <InsightFilterCard
                action="/outliers"
                models={models}
                presets={presets}
                params={params}
                totalRuns={rawIndex.runs.length}
                filteredRuns={index.runs.length}
            />

            {rows.length > 0 ? (
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <a
                        href={`/api/outliers${buildQueryString(params, {})}`}
                        className="button secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                    >
                        Export JSON
                    </a>
                    <a
                        href={`/api/outliers${buildQueryString(params, {})}&format=csv`}
                        className="button secondary"
                        download="outlier-runs.csv"
                    >
                        Export CSV
                    </a>
                </div>
            ) : null}

            <div className="grid-4">
                <MetricCard
                    label="Outliers indexed"
                    value={rows.length}
                    helpKey="outlierRuns"
                />
                <MetricCard
                    label="Benchmark artifacts"
                    value={rawIndex.totals.benchmarks}
                    helpKey="benchmarkArtifacts"
                />
                <MetricCard
                    label="Lowest avg similarity"
                    value={rows[0] ? rows[0].avgSimilarity.toFixed(3) : "—"}
                    helpKey="avgSimilarity"
                />
                <MetricCard
                    label="Most negative z-score"
                    value={
                        rows.length > 0
                            ? Math.min(
                                  ...rows.map((row) => row.zScore),
                              ).toFixed(2)
                            : "—"
                    }
                    helpKey="zScore"
                />
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Ranked outlier list</h2>
                {rows.length === 0 ? (
                    <p className="muted">
                        No outlier data in the current index. Re-run analysis
                        after benchmarks with stability pairs are available, or
                        use <code>pnpm analyze -- --chunks</code> for pairwise
                        exports.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "benchmarkId", label: "Benchmark" },
                            { key: "runId", label: "Run ID" },
                            {
                                key: "avgSimilarity",
                                label: "Avg similarity",
                                helpKey: "avgSimilarity",
                            },
                            {
                                key: "zScore",
                                label: "Z-score",
                                helpKey: "zScore",
                            },
                            {
                                key: "benchmark",
                                label: "Benchmark",
                                hideOnMobile: true,
                                render: (row) => (
                                    <Link
                                        href={`/benchmarks/${(row as { benchmarkId: string }).benchmarkId}`}
                                    >
                                        Open
                                    </Link>
                                ),
                            },
                            {
                                key: "trace",
                                label: "Trace",
                                render: (row) => (
                                    <Link
                                        href={`/runs/${(row as { runId: string }).runId}`}
                                    >
                                        Open
                                    </Link>
                                ),
                            },
                            {
                                key: "peerCompare",
                                label: "vs peer",
                                hideOnMobile: true,
                                render: (row) => {
                                    const r = row as {
                                        peerCompareHref: string | null;
                                        peerRunId: string | null;
                                    };
                                    if (!r.peerCompareHref || !r.peerRunId) {
                                        return <span className="muted">—</span>;
                                    }
                                    return (
                                        <Link href={r.peerCompareHref}>
                                            {r.peerRunId.slice(-8)}
                                        </Link>
                                    );
                                },
                            },
                            {
                                key: "compare",
                                label: "Compare",
                                hideOnMobile: true,
                                render: (row) => {
                                    const r = row as {
                                        runId: string;
                                        peerCompareHref: string | null;
                                    };
                                    const href =
                                        r.peerCompareHref ??
                                        `/runs/compare?left=${r.runId}`;
                                    return <Link href={href}>Compare</Link>;
                                },
                            },
                        ]}
                        data={rows}
                        getRowId={(row) =>
                            `${(row as { benchmarkId: string }).benchmarkId}-${(row as { runId: string }).runId}`
                        }
                        renderCardActions={(row) => {
                            const r = row as {
                                benchmarkId: string;
                                runId: string;
                                peerCompareHref: string | null;
                            };
                            return (
                                <>
                                    <Link
                                        href={`/runs/${r.runId}`}
                                        className="button"
                                    >
                                        View trace
                                    </Link>
                                    {r.peerCompareHref ? (
                                        <Link
                                            href={r.peerCompareHref}
                                            className="button secondary"
                                        >
                                            Compare to peer
                                        </Link>
                                    ) : (
                                        <Link
                                            href={`/benchmarks/${r.benchmarkId}`}
                                            className="button secondary"
                                        >
                                            Benchmark
                                        </Link>
                                    )}
                                </>
                            );
                        }}
                    />
                )}
            </div>
        </section>
    );
}
