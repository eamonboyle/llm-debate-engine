import type { Metadata } from "next";
import Link from "next/link";
import { CollapsibleFilterCard } from "../../../components/CollapsibleFilterCard";
import { MetricCard } from "../../../components/MetricCard";
import { ResponsiveTable } from "../../../components/ResponsiveTable";
import { buildCatalogStats } from "../../../lib/catalogStats";
import { buildCatalogGaps, filterCatalogGaps } from "../../../lib/catalogGaps";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../../lib/data";
import { buildQueryString } from "../../../lib/listPagination";

export const metadata: Metadata = {
    title: "Coverage gaps",
};

type GapsSearchParams = {
    q?: string;
};

function filterHref(model: string, preset: string): string {
    const params = new URLSearchParams({ model, preset });
    return `/runs?${params.toString()}`;
}

export default async function CatalogGapsPage({
    searchParams,
}: {
    searchParams: Promise<GapsSearchParams>;
}) {
    const params = await searchParams;
    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const stats = buildCatalogStats(runs, benchmarks);
    const summary = buildCatalogGaps(stats);
    const gaps = filterCatalogGaps(summary, params.q);
    const query = (params.q ?? "").trim();
    const empty = runs.length === 0 && benchmarks.length === 0;

    if (empty) {
        return (
            <section className="stack">
                <h1 className="title">Coverage gaps</h1>
                <p className="subtitle">
                    No artifacts yet. Run debate experiments locally, then
                    return here to see which model × preset combinations remain
                    untested.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    if (summary.uniqueModels < 2 || summary.uniquePresets < 2) {
        return (
            <section className="stack">
                <div>
                    <h1 className="title">Coverage gaps</h1>
                    <p className="subtitle">
                        Coverage gaps appear when at least two models and two
                        presets exist in your artifact store.
                    </p>
                    <Link href="/catalog" className="button secondary">
                        Back to catalog
                    </Link>
                </div>
                <div className="card">
                    <p className="muted" style={{ margin: 0 }}>
                        You currently have {summary.uniqueModels} model
                        {summary.uniqueModels === 1 ? "" : "s"} and{" "}
                        {summary.uniquePresets} preset
                        {summary.uniquePresets === 1 ? "" : "s"}. Add more
                        experiments to compare coverage across combinations.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="stack">
            <div>
                <h1 className="title">Coverage gaps</h1>
                <p className="subtitle">
                    Untested model × preset combinations — use this to plan the
                    next benchmark or single-run experiment.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/catalog" className="button secondary">
                        Experiment catalog
                    </Link>
                    <Link href="/questions" className="button secondary">
                        Browse questions
                    </Link>
                </div>
            </div>

            <CollapsibleFilterCard
                resultsSummary={
                    query ? (
                        <>
                            {gaps.length} of {summary.gaps.length} gaps match
                            &ldquo;{query}&rdquo;
                        </>
                    ) : (
                        <>{summary.gaps.length} untested combinations</>
                    )
                }
            >
                <form method="get" action="/catalog/gaps">
                    <div className="filter-grid">
                        <input
                            name="q"
                            placeholder="Filter by model or preset..."
                            defaultValue={params.q ?? ""}
                            className="input"
                        />
                    </div>
                    <div className="filter-actions">
                        <button type="submit" className="button">
                            Apply
                        </button>
                        <Link href="/catalog/gaps" className="button secondary">
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
                    href={`/api/catalog/gaps${buildQueryString({ q: params.q }, {})}`}
                    className="button secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                >
                    Export JSON
                </a>
                <a
                    href={`/api/catalog/gaps${buildQueryString({ q: params.q }, {})}&format=csv`}
                    className="button secondary"
                    download="coverage-gaps.csv"
                >
                    Export CSV
                </a>
            </div>

            <div className="grid-4">
                <MetricCard
                    label="Tested combinations"
                    value={summary.coveredCount}
                    helper={`of ${summary.possibleCount} possible`}
                />
                <MetricCard
                    label="Coverage"
                    value={
                        summary.coveragePercent == null
                            ? "—"
                            : `${summary.coveragePercent}%`
                    }
                />
                <MetricCard
                    label="Unique models"
                    value={summary.uniqueModels}
                />
                <MetricCard
                    label="Unique presets"
                    value={summary.uniquePresets}
                    helpKey="preset"
                />
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Missing combinations</h2>
                {gaps.length === 0 ? (
                    <p className="muted">
                        {query
                            ? "No gaps match your filter."
                            : "Full coverage — every model × preset pair in your catalog has at least one artifact."}
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
                                            href={filterHref(r.model, r.preset)}
                                        >
                                            Filter runs
                                        </Link>
                                    );
                                },
                            },
                        ]}
                        data={gaps}
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
                                    href={filterHref(r.model, r.preset)}
                                    className="button"
                                >
                                    View related runs
                                </Link>
                            );
                        }}
                    />
                )}
            </div>

            {gaps.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Suggested CLI</h2>
                    <p className="small muted">
                        Pick a gap row and run a new experiment locally. Example
                        for the first missing combination:
                    </p>
                    <pre className="code-block">
                        <code>
                            {`pnpm ask "Your research question" --model "${gaps[0].model}" --preset ${gaps[0].preset}`}
                        </code>
                    </pre>
                </div>
            ) : null}
        </section>
    );
}
