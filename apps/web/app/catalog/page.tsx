import type { Metadata } from "next";
import Link from "next/link";
import { CollapsibleFilterCard } from "../../components/CollapsibleFilterCard";
import { MetricCard } from "../../components/MetricCard";
import { ModelFilterSelect } from "../../components/ModelFilterSelect";
import { PresetFilterSelect } from "../../components/PresetFilterSelect";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { collectArtifactFacets } from "../../lib/artifactFacets";
import {
    buildCatalogStats,
    buildFilteredCatalogStats,
    hasActiveCatalogFilters,
} from "../../lib/catalogStats";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../lib/data";
import { buildQueryString } from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Experiment catalog",
};

type CatalogSearchParams = {
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};

function filterHref(
    base: "/runs" | "/benchmarks",
    filters: Record<string, string>,
): string {
    const params = new URLSearchParams(filters);
    return `${base}?${params.toString()}`;
}

export default async function CatalogPage({
    searchParams,
}: {
    searchParams: Promise<CatalogSearchParams>;
}) {
    const params = await searchParams;
    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const { models, presets } = collectArtifactFacets(runs, benchmarks);
    const rawStats = buildCatalogStats(runs, benchmarks);
    const stats = buildFilteredCatalogStats(runs, benchmarks, params);
    const query = (params.q ?? "").trim();
    const filtersActive = hasActiveCatalogFilters(params);
    const empty = runs.length === 0 && benchmarks.length === 0;
    const filteredCount =
        stats.models.length + stats.presets.length + stats.combos.length;
    const totalCount =
        rawStats.models.length +
        rawStats.presets.length +
        rawStats.combos.length;

    if (empty) {
        return (
            <section className="stack">
                <h1 className="title">Experiment catalog</h1>
                <p className="subtitle">
                    No artifacts yet. Run debate experiments locally, then
                    refresh this page to see model and preset coverage.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    return (
        <section className="stack">
            <div>
                <h1 className="title">Experiment catalog</h1>
                <p className="subtitle">
                    Inventory of models and pipeline presets used across run and
                    benchmark artifacts. Jump to filtered lists to explore each
                    combination.
                </p>
            </div>

            <CollapsibleFilterCard
                resultsSummary={
                    filtersActive ? (
                        <>
                            {filteredCount} of {totalCount} catalog rows match
                            {query ? <> &ldquo;{query}&rdquo;</> : null}
                        </>
                    ) : (
                        <>
                            {totalCount} catalog rows across models, presets,
                            and combinations
                        </>
                    )
                }
            >
                <form method="get" action="/catalog">
                    <div className="filter-grid">
                        <input
                            name="q"
                            placeholder="Search models, presets, or combinations"
                            defaultValue={params.q ?? ""}
                            className="input"
                        />
                        <ModelFilterSelect
                            models={models}
                            defaultValue={params.model ?? ""}
                            listId="catalog-model-filter-options"
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
                    <div className="filter-actions">
                        <button type="submit" className="button">
                            Search catalog
                        </button>
                        <Link href="/catalog" className="button secondary">
                            Clear
                        </Link>
                    </div>
                </form>
            </CollapsibleFilterCard>

            <div
                className="page-actions"
                style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
            >
                <a
                    href={`/api/catalog${buildQueryString(params, {})}`}
                    className="button secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                >
                    Export JSON
                </a>
                <a
                    href={`/api/catalog${buildQueryString({ ...params, format: "csv" }, {})}`}
                    className="button secondary"
                    download="experiment-catalog.csv"
                >
                    Export CSV
                </a>
            </div>

            <div className="grid-4">
                <MetricCard
                    label="Run artifacts"
                    value={stats.totals.runs}
                    helpKey="runArtifacts"
                />
                <MetricCard
                    label="Benchmark artifacts"
                    value={stats.totals.benchmarks}
                    helpKey="benchmarkArtifacts"
                />
                <MetricCard
                    label="Unique models"
                    value={stats.totals.uniqueModels}
                />
                <MetricCard
                    label="Unique presets"
                    value={stats.totals.uniquePresets}
                    helpKey="preset"
                />
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>By model</h2>
                {stats.models.length === 0 ? (
                    <p className="muted">
                        {query
                            ? "No models match your search."
                            : "No models recorded."}
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "model", label: "Model", helpKey: "model" },
                            { key: "runCount", label: "Runs" },
                            { key: "benchmarkCount", label: "Benchmarks" },
                            { key: "total", label: "Total" },
                            {
                                key: "explore",
                                label: "Explore",
                                cellClass: "cell-actions",
                                render: (row) => {
                                    const model = (row as { model: string })
                                        .model;
                                    return (
                                        <span className="cell-compare-links">
                                            <Link
                                                href={filterHref("/runs", {
                                                    model,
                                                })}
                                            >
                                                Runs
                                            </Link>
                                            {" · "}
                                            <Link
                                                href={filterHref(
                                                    "/benchmarks",
                                                    { model },
                                                )}
                                            >
                                                Benchmarks
                                            </Link>
                                        </span>
                                    );
                                },
                            },
                        ]}
                        data={stats.models}
                        getRowId={(row) => (row as { model: string }).model}
                        renderCardActions={(row) => {
                            const model = (row as { model: string }).model;
                            return (
                                <>
                                    <Link
                                        href={filterHref("/runs", { model })}
                                        className="button"
                                    >
                                        View runs
                                    </Link>
                                    <Link
                                        href={filterHref("/benchmarks", {
                                            model,
                                        })}
                                        className="button secondary"
                                    >
                                        Benchmarks
                                    </Link>
                                </>
                            );
                        }}
                    />
                )}
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>By preset</h2>
                {stats.presets.length === 0 ? (
                    <p className="muted">
                        {query
                            ? "No presets match your search."
                            : "No presets recorded."}
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            {
                                key: "preset",
                                label: "Preset",
                                helpKey: "preset",
                            },
                            { key: "runCount", label: "Runs" },
                            { key: "benchmarkCount", label: "Benchmarks" },
                            { key: "total", label: "Total" },
                            {
                                key: "explore",
                                label: "Explore",
                                cellClass: "cell-actions",
                                render: (row) => {
                                    const preset = (row as { preset: string })
                                        .preset;
                                    return (
                                        <span className="cell-compare-links">
                                            <Link
                                                href={filterHref("/runs", {
                                                    preset,
                                                })}
                                            >
                                                Runs
                                            </Link>
                                            {" · "}
                                            <Link
                                                href={filterHref(
                                                    "/benchmarks",
                                                    { preset },
                                                )}
                                            >
                                                Benchmarks
                                            </Link>
                                        </span>
                                    );
                                },
                            },
                        ]}
                        data={stats.presets}
                        getRowId={(row) => (row as { preset: string }).preset}
                        renderCardActions={(row) => {
                            const preset = (row as { preset: string }).preset;
                            return (
                                <>
                                    <Link
                                        href={filterHref("/runs", { preset })}
                                        className="button"
                                    >
                                        View runs
                                    </Link>
                                    <Link
                                        href={filterHref("/benchmarks", {
                                            preset,
                                        })}
                                        className="button secondary"
                                    >
                                        Benchmarks
                                    </Link>
                                </>
                            );
                        }}
                    />
                )}
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Model × preset combinations</h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Each row is a distinct model and pipeline preset pair seen
                    in your artifact store.
                </p>
                {stats.combos.length === 0 ? (
                    <p className="muted">
                        {query
                            ? "No model × preset combinations match your search."
                            : "No combinations yet."}
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "model", label: "Model", helpKey: "model" },
                            {
                                key: "preset",
                                label: "Preset",
                                helpKey: "preset",
                            },
                            { key: "runCount", label: "Runs" },
                            { key: "benchmarkCount", label: "Benchmarks" },
                            { key: "total", label: "Total" },
                            {
                                key: "explore",
                                label: "Explore",
                                cellClass: "cell-actions",
                                render: (row) => {
                                    const r = row as {
                                        model: string;
                                        preset: string;
                                    };
                                    return (
                                        <Link
                                            href={filterHref("/runs", {
                                                model: r.model,
                                                preset: r.preset,
                                            })}
                                        >
                                            Filter runs
                                        </Link>
                                    );
                                },
                            },
                        ]}
                        data={stats.combos}
                        getRowId={(row) => {
                            const r = row as {
                                model: string;
                                preset: string;
                            };
                            return `${r.model}:${r.preset}`;
                        }}
                        renderCardActions={(row) => {
                            const r = row as {
                                model: string;
                                preset: string;
                            };
                            return (
                                <Link
                                    href={filterHref("/runs", {
                                        model: r.model,
                                        preset: r.preset,
                                    })}
                                    className="button"
                                >
                                    View runs
                                </Link>
                            );
                        }}
                    />
                )}
            </div>
        </section>
    );
}
