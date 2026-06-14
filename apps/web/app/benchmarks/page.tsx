import type { Metadata } from "next";
import Link from "next/link";
import { CollapsibleFilterCard } from "../../components/CollapsibleFilterCard";
import { ExportFilteredLink } from "../../components/ExportFilteredLink";
import { ModelFilterSelect } from "../../components/ModelFilterSelect";
import { PresetFilterSelect } from "../../components/PresetFilterSelect";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { MetricCard } from "../../components/MetricCard";
import { collectArtifactFacets } from "../../lib/artifactFacets";
import {
    filterBenchmarkArtifacts,
    loadAnalysisIndex,
    loadBenchmarkArtifacts,
    loadRunArtifacts,
} from "../../lib/data";
import {
    buildBenchmarkIndexLookup,
    formatTopModeLabel,
} from "../../lib/benchmarkIndexLookup";
import {
    resolveBenchmarkSortOrder,
    sortBenchmarkArtifacts,
} from "../../lib/artifactSort";
import { buildQueryString, paginateItems } from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Benchmarks",
};

type BenchmarkSearchParams = {
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
};

export default async function BenchmarksPage({
    searchParams,
}: {
    searchParams: Promise<BenchmarkSearchParams>;
}) {
    const [benchmarks, runs, index] = await Promise.all([
        loadBenchmarkArtifacts(),
        loadRunArtifacts(),
        loadAnalysisIndex(),
    ]);
    const benchmarkIndex = index ? buildBenchmarkIndexLookup(index) : null;
    const { models, presets } = collectArtifactFacets(runs, benchmarks);
    const params = await searchParams;
    const filtered = filterBenchmarkArtifacts(benchmarks, {
        q: params.q,
        model: params.model,
        preset: params.preset,
        fast: params.fast,
        from: params.from,
        to: params.to,
    });
    const sort = resolveBenchmarkSortOrder(params.sort);
    const sorted = sortBenchmarkArtifacts(filtered, sort);
    const paging = paginateItems(sorted, params, {
        defaultPageSize: 25,
        maxPageSize: 200,
    });

    return (
        <section className="stack">
            <div>
                <h1 className="title">Benchmark artifacts</h1>
                <p className="subtitle">
                    Inspect benchmark-level divergence, mode structure, and
                    stability.
                </p>
            </div>

            <div className="grid-4">
                <MetricCard
                    label="Total benchmarks"
                    value={benchmarks.length}
                    helpKey="benchmarkArtifacts"
                />
                <MetricCard
                    label="Filtered"
                    value={filtered.length}
                    helper={
                        filtered.length < benchmarks.length
                            ? "matching filters"
                            : undefined
                    }
                />
                <MetricCard
                    label="Total runs"
                    value={filtered.reduce((s, b) => s + b.payload.runs, 0)}
                    helper="across filtered benchmarks"
                    helpKey="runs"
                />
                <MetricCard
                    label="Avg entropy"
                    helpKey="divergenceEntropy"
                    value={
                        filtered.length > 0
                            ? (
                                  filtered.reduce(
                                      (s, b) => s + b.payload.divergenceEntropy,
                                      0,
                                  ) / filtered.length
                              ).toFixed(3)
                            : "—"
                    }
                />
            </div>

            <CollapsibleFilterCard
                resultsSummary={
                    <>
                        {paging.startDisplay}-{paging.endDisplay} of{" "}
                        {filtered.length} benchmarks
                    </>
                }
            >
                <form method="get">
                    <div className="filter-grid">
                        <input
                            name="q"
                            placeholder="Search benchmark question"
                            defaultValue={params.q ?? ""}
                            className="input"
                        />
                        <ModelFilterSelect
                            models={models}
                            defaultValue={params.model ?? ""}
                            listId="benchmark-model-filter-options"
                        />
                        <PresetFilterSelect
                            presets={presets}
                            defaultValue={params.preset ?? ""}
                        />
                        <select
                            name="fast"
                            defaultValue={params.fast ?? ""}
                            className="input"
                        >
                            <option value="">Fast mode: any</option>
                            <option value="true">Fast only</option>
                            <option value="false">Non-fast only</option>
                        </select>
                        <input
                            type="datetime-local"
                            name="from"
                            defaultValue={params.from ?? ""}
                            className="input"
                            title="Created at or after"
                        />
                        <input
                            type="datetime-local"
                            name="to"
                            defaultValue={params.to ?? ""}
                            className="input"
                            title="Created at or before"
                        />
                    </div>
                    <div className="filter-sort-row">
                        <select
                            name="sort"
                            defaultValue={sort}
                            className="input"
                        >
                            <option value="newest">Sort: newest first</option>
                            <option value="oldest">Sort: oldest first</option>
                            <option value="entropy_desc">
                                Sort: highest entropy
                            </option>
                            <option value="modes_desc">
                                Sort: most answer modes
                            </option>
                            <option value="stability_desc">
                                Sort: highest stability
                            </option>
                            <option value="runs_desc">
                                Sort: most runs per benchmark
                            </option>
                        </select>
                        <select
                            name="pageSize"
                            defaultValue={String(paging.pageSize)}
                            className="input"
                        >
                            <option value="10">10 per page</option>
                            <option value="25">25 per page</option>
                            <option value="50">50 per page</option>
                            <option value="100">100 per page</option>
                        </select>
                    </div>
                    <div className="filter-actions">
                        <button type="submit" className="button">
                            Apply filters
                        </button>
                        <Link href="/benchmarks" className="button secondary">
                            Clear
                        </Link>
                        <ExportFilteredLink
                            apiPath="/api/benchmarks"
                            params={{
                                q: params.q,
                                model: params.model,
                                preset: params.preset,
                                fast: params.fast,
                                from: params.from,
                                to: params.to,
                                sort,
                            }}
                        />
                        <a
                            href={`/api/benchmarks${buildQueryString(params, {
                                q: params.q,
                                model: params.model,
                                preset: params.preset,
                                fast: params.fast,
                                from: params.from,
                                to: params.to,
                                sort,
                                pageSize: "500",
                                page: "1",
                            })}&format=csv`}
                            className="button secondary"
                            download="benchmarks.csv"
                        >
                            Export CSV
                        </a>
                        <span className="small muted">
                            Showing {paging.startDisplay}-{paging.endDisplay} of{" "}
                            {filtered.length} filtered benchmarks (
                            {benchmarks.length} total)
                        </span>
                    </div>
                </form>
            </CollapsibleFilterCard>

            <div className="card">
                <ResponsiveTable
                    columns={[
                        {
                            key: "details",
                            label: "Actions",
                            cellClass: "cell-actions",
                            hideOnMobile: true,
                            render: (row) => (
                                <Link
                                    href={`/benchmarks/${(row as { id: string }).id}`}
                                    className="button"
                                    style={{
                                        padding: "0.35rem 0.6rem",
                                        fontSize: "0.75rem",
                                    }}
                                >
                                    Details
                                </Link>
                            ),
                        },
                        { key: "id", label: "ID" },
                        {
                            key: "createdAt",
                            label: "Created",
                            render: (row) =>
                                new Date(
                                    (row as { createdAt: string }).createdAt,
                                ).toLocaleString(),
                        },
                        {
                            key: "question",
                            label: "Question",
                            cellClass: "cell-question",
                            render: (row) => (
                                <TruncateText
                                    text={
                                        (row as { question: string }).question
                                    }
                                    maxLength={80}
                                    className="muted"
                                />
                            ),
                        },
                        {
                            key: "runs",
                            label: "Runs",
                            helpKey: "runs",
                        },
                        {
                            key: "modeCount",
                            label: "Modes",
                            helpKey: "modeCount",
                        },
                        {
                            key: "entropy",
                            label: "Entropy",
                            helpKey: "entropy",
                            render: (row) => (
                                <span className="benchmark-entropy">
                                    {(
                                        row as { entropy: number }
                                    ).entropy.toFixed(3)}
                                </span>
                            ),
                        },
                        {
                            key: "stability",
                            label: "Stability",
                            helpKey: "stabilityPairwiseMean",
                            hideOnMobile: true,
                            render: (row) => {
                                const value = (row as { stability?: number })
                                    .stability;
                                return typeof value === "number"
                                    ? value.toFixed(3)
                                    : "—";
                            },
                        },
                        {
                            key: "topMode",
                            label: "Top mode",
                            cellClass: "cell-question",
                            hideOnMobile: true,
                            render: (row) => {
                                const label = (
                                    row as { topMode?: string | null }
                                ).topMode;
                                return label ? (
                                    <TruncateText
                                        text={label}
                                        maxLength={56}
                                        className="muted"
                                    />
                                ) : (
                                    <span className="muted">—</span>
                                );
                            },
                        },
                        {
                            key: "compare",
                            label: "Compare",
                            cellClass: "cell-actions",
                            hideOnMobile: true,
                            render: (row) => (
                                <span className="cell-compare-links">
                                    <Link
                                        href={`/benchmarks/compare?left=${(row as { id: string }).id}`}
                                    >
                                        L
                                    </Link>
                                    <Link
                                        href={`/benchmarks/compare?right=${(row as { id: string }).id}`}
                                    >
                                        R
                                    </Link>
                                </span>
                            ),
                        },
                    ]}
                    data={paging.paged.map((benchmark) => {
                        const indexed = benchmarkIndex?.get(benchmark.id);
                        return {
                            id: benchmark.id,
                            createdAt: benchmark.metadata.createdAt,
                            question: benchmark.question,
                            runs: benchmark.payload.runs,
                            modeCount: benchmark.payload.modeCount,
                            entropy: benchmark.payload.divergenceEntropy,
                            stability:
                                indexed?.stabilityPairwiseMean ??
                                benchmark.payload.summary?.stability
                                    ?.pairwiseMean,
                            topMode: indexed
                                ? formatTopModeLabel(indexed.modeLabels)
                                : null,
                        };
                    })}
                    getRowId={(row) => (row as { id: string }).id}
                    renderCardActions={(row) => (
                        <>
                            <Link
                                href={`/benchmarks/${(row as { id: string }).id}`}
                                className="button"
                            >
                                Details
                            </Link>
                            <Link
                                href={`/benchmarks/compare?left=${(row as { id: string }).id}`}
                                className="button secondary"
                            >
                                Set left
                            </Link>
                            <Link
                                href={`/benchmarks/compare?right=${(row as { id: string }).id}`}
                                className="button secondary"
                            >
                                Set right
                            </Link>
                        </>
                    )}
                />
            </div>

            <div className="card pagination">
                <a
                    className="button secondary"
                    aria-disabled={!paging.hasPrev}
                    href={
                        paging.hasPrev
                            ? buildQueryString(params, {
                                  sort,
                                  pageSize: String(paging.pageSize),
                                  page: String(paging.page - 1),
                              })
                            : buildQueryString(params, {
                                  sort,
                                  pageSize: String(paging.pageSize),
                                  page: String(paging.page),
                              })
                    }
                    style={
                        paging.hasPrev
                            ? undefined
                            : {
                                  pointerEvents: "none",
                                  opacity: 0.5,
                                  textDecoration: "none",
                              }
                    }
                >
                    Previous
                </a>
                <a
                    className="button secondary"
                    aria-disabled={!paging.hasNext}
                    href={
                        paging.hasNext
                            ? buildQueryString(params, {
                                  sort,
                                  pageSize: String(paging.pageSize),
                                  page: String(paging.page + 1),
                              })
                            : buildQueryString(params, {
                                  sort,
                                  pageSize: String(paging.pageSize),
                                  page: String(paging.page),
                              })
                    }
                    style={
                        paging.hasNext
                            ? undefined
                            : {
                                  pointerEvents: "none",
                                  opacity: 0.5,
                                  textDecoration: "none",
                              }
                    }
                >
                    Next
                </a>
                <span className="small muted">
                    Page {paging.page} of {paging.totalPages}
                </span>
            </div>
        </section>
    );
}
