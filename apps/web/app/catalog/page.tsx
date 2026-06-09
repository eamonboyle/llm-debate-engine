import type { Metadata } from "next";
import Link from "next/link";
import { CollapsibleFilterCard } from "../../components/CollapsibleFilterCard";
import { MetricCard } from "../../components/MetricCard";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import {
    buildCatalogStats,
    filterCatalogStats,
} from "../../lib/catalogStats";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../lib/data";

export const metadata: Metadata = {
    title: "Experiment catalog",
};

type CatalogSearchParams = {
    q?: string;
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
    const rawStats = buildCatalogStats(runs, benchmarks);
    const stats = filterCatalogStats(rawStats, params.q);
    const query = (params.q ?? "").trim();
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
                    query ? (
                        <>
                            {filteredCount} of {totalCount} catalog rows match
                            &ldquo;{query}&rdquo;
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
