import type { Metadata } from "next";
import Link from "next/link";
import { InsightFilterCard } from "../../components/InsightFilterCard";
import { MetricCard } from "../../components/MetricCard";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { StaleIndexBanner } from "../../components/StaleIndexBanner";
import { loadAnalysisIndex } from "../../lib/data";
import { applyIndexFilters, collectIndexFacets } from "../../lib/indexFilters";
import { buildQueryString } from "../../lib/listPagination";
import { buildOutlierExplorerRows } from "../../lib/outlierExplorer";

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
    benchmark?: string;
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
    const benchmarkId = (params.benchmark ?? "").trim();
    const benchmarkOptions = [...index.benchmarks].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
    );
    const rows = await buildOutlierExplorerRows(index, {
        benchmarkId: benchmarkId || undefined,
    });

    return (
        <section className="stack">
            <StaleIndexBanner />
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

            <form className="card" method="get">
                <h2 style={{ marginTop: 0 }}>Benchmark scope</h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Narrow outliers to a single parent benchmark, or browse all
                    benchmarks with outlier data.
                </p>
                <div className="filter-grid">
                    <label className="filter-field">
                        <span className="small muted">Benchmark</span>
                        <select
                            name="benchmark"
                            defaultValue={benchmarkId}
                            className="input"
                        >
                            <option value="">All benchmarks</option>
                            {benchmarkOptions.map((benchmark) => (
                                <option key={benchmark.id} value={benchmark.id}>
                                    {benchmark.id.slice(-12)} —{" "}
                                    {benchmark.question.length > 48
                                        ? `${benchmark.question.slice(0, 48)}…`
                                        : benchmark.question}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                {params.q ? (
                    <input type="hidden" name="q" value={params.q} />
                ) : null}
                {params.model ? (
                    <input type="hidden" name="model" value={params.model} />
                ) : null}
                {params.preset ? (
                    <input type="hidden" name="preset" value={params.preset} />
                ) : null}
                {params.fast ? (
                    <input type="hidden" name="fast" value={params.fast} />
                ) : null}
                {params.from ? (
                    <input type="hidden" name="from" value={params.from} />
                ) : null}
                {params.to ? (
                    <input type="hidden" name="to" value={params.to} />
                ) : null}
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Apply benchmark
                    </button>
                    {benchmarkId ? (
                        <Link
                            href={`/outliers${buildQueryString(
                                {
                                    q: params.q,
                                    model: params.model,
                                    preset: params.preset,
                                    fast: params.fast,
                                    from: params.from,
                                    to: params.to,
                                },
                                {},
                            )}`}
                            className="button secondary"
                        >
                            Clear benchmark
                        </Link>
                    ) : null}
                </div>
            </form>

            <InsightFilterCard
                action="/outliers"
                models={models}
                presets={presets}
                params={params}
                totalRuns={rawIndex.runs.length}
                filteredRuns={index.runs.length}
                preserveKeys={benchmarkId ? ["benchmark"] : []}
            />

            {benchmarkId ? (
                <div className="card">
                    <p className="muted" style={{ margin: 0 }}>
                        Showing outliers for benchmark{" "}
                        <Link href={`/benchmarks/${benchmarkId}`}>
                            <code>{benchmarkId}</code>
                        </Link>
                        .{" "}
                        <Link
                            href={`/outliers${buildQueryString(
                                {
                                    q: params.q,
                                    model: params.model,
                                    preset: params.preset,
                                    fast: params.fast,
                                    from: params.from,
                                    to: params.to,
                                },
                                {},
                            )}`}
                            className="button secondary"
                        >
                            Clear benchmark filter
                        </Link>
                    </p>
                </div>
            ) : null}

            {rows.length > 0 ? (
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <a
                        href={`/api/outliers${buildQueryString(params, {
                            benchmark: benchmarkId || undefined,
                        })}`}
                        className="button secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                    >
                        Export JSON
                    </a>
                    <a
                        href={`/api/outliers${buildQueryString(params, {
                            benchmark: benchmarkId || undefined,
                        })}&format=csv`}
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
