import type { Metadata } from "next";
import { CollapsibleFilterCard } from "../components/CollapsibleFilterCard";
import { MetricCard } from "../components/MetricCard";
import { PresetFilterSelect } from "../components/PresetFilterSelect";
import { ResponsiveTable } from "../components/ResponsiveTable";
import { OverviewCharts } from "../components/charts/OverviewCharts";
import { ResearchTrendCharts } from "../components/charts/ResearchTrendCharts";
import { MetricGlossary } from "../components/MetricGlossary";
import Link from "next/link";
import { buildActivityFeed } from "../lib/activityFeed";
import { buildCatalogStats } from "../lib/catalogStats";
import {
    loadAnalysisIndex,
    loadBenchmarkArtifacts,
    loadDataStatus,
    loadRunArtifacts,
} from "../lib/data";
import {
    buildEvidenceRiskDistribution,
    buildPresetCountsFromRuns,
    collectIndexFacets,
    filterIndexBenchmarks,
    filterIndexRuns,
    hasActiveIndexFilters,
} from "../lib/indexFilters";
import { computeIndexFreshness } from "../lib/indexFreshness";

export const metadata: Metadata = {
    title: "Overview",
};

type OverviewSearchParams = {
    preset?: string;
    from?: string;
    to?: string;
};

export default async function OverviewPage({
    searchParams,
}: {
    searchParams: Promise<OverviewSearchParams>;
}) {
    const params = await searchParams;
    const [index, runs, benchmarks, status] = await Promise.all([
        loadAnalysisIndex(),
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
        loadDataStatus(),
    ]);
    const indexFreshness = computeIndexFreshness(status, index);
    const recentActivity = buildActivityFeed(runs, benchmarks).slice(0, 6);

    if (!index) {
        const hasArtifacts = runs.length > 0 || benchmarks.length > 0;
        const catalog = hasArtifacts
            ? buildCatalogStats(runs, benchmarks)
            : null;

        return (
            <section className="stack">
                <h1 className="title">LLM Research Dashboard</h1>
                <p className="subtitle">
                    {hasArtifacts
                        ? "Artifacts are loaded but no analysis index is available yet. Browse raw runs and benchmarks, or generate an index for charts and KPIs."
                        : "No data available yet. Run debate experiments locally, then run pnpm analyze to build the analysis index."}
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <a href="/status" className="button">
                        Check data status
                    </a>
                    <a href="/runs" className="button secondary">
                        Browse runs
                    </a>
                    {hasArtifacts ? (
                        <>
                            <a href="/catalog" className="button secondary">
                                Experiment catalog
                            </a>
                            <a href="/questions" className="button secondary">
                                Browse questions
                            </a>
                        </>
                    ) : null}
                </div>
                {catalog ? (
                    <div className="grid-4">
                        <MetricCard
                            label="Run artifacts"
                            value={catalog.totals.runs}
                            helpKey="runArtifacts"
                        />
                        <MetricCard
                            label="Benchmark artifacts"
                            value={catalog.totals.benchmarks}
                            helpKey="benchmarkArtifacts"
                        />
                        <MetricCard
                            label="Unique models"
                            value={catalog.totals.uniqueModels}
                        />
                        <MetricCard
                            label="Unique presets"
                            value={catalog.totals.uniquePresets}
                            helpKey="preset"
                        />
                    </div>
                ) : null}
                {recentActivity.length > 0 ? (
                    <div className="card">
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 10,
                                alignItems: "baseline",
                                justifyContent: "space-between",
                            }}
                        >
                            <h2 style={{ margin: 0 }}>Recent activity</h2>
                            <Link href="/activity" className="button secondary">
                                Full timeline
                            </Link>
                        </div>
                        <ResponsiveTable
                            columns={[
                                {
                                    key: "kind",
                                    label: "Type",
                                    render: (row) => {
                                        const k = (row as { kind: string })
                                            .kind;
                                        return k === "run"
                                            ? "Run"
                                            : "Benchmark";
                                    },
                                },
                                {
                                    key: "createdAt",
                                    label: "When",
                                    render: (row) =>
                                        new Date(
                                            (row as { createdAt: string })
                                                .createdAt,
                                        ).toLocaleString(),
                                },
                                {
                                    key: "question",
                                    label: "Question",
                                    render: (row) => {
                                        const q = (row as { question: string })
                                            .question;
                                        return q.length > 72
                                            ? `${q.slice(0, 72)}…`
                                            : q;
                                    },
                                },
                                {
                                    key: "open",
                                    label: "Open",
                                    render: (row) => (
                                        <Link
                                            href={
                                                (row as { href: string }).href
                                            }
                                        >
                                            View
                                        </Link>
                                    ),
                                },
                            ]}
                            data={recentActivity}
                            getRowId={(row) =>
                                `${(row as { kind: string }).kind}-${(row as { id: string }).id}`
                            }
                        />
                    </div>
                ) : null}
                {hasArtifacts ? (
                    <div className="card">
                        <p className="muted" style={{ margin: 0 }}>
                            Run <code>pnpm analyze</code> to unlock overview
                            charts, leaderboards, and insight pages — or use{" "}
                            <Link href="/status">Rebuild analysis index</Link>{" "}
                            on the data status page when running locally. See
                            the checklist there for the full readiness list.
                        </p>
                    </div>
                ) : null}
            </section>
        );
    }

    const recentRuns = index.runs.slice(0, 8);
    const recentBenchmarks = index.benchmarks.slice(0, 6);
    const outliers = index.aggregates.outlierRuns?.slice(0, 8) ?? [];
    const confidenceCorrelation = index.aggregates.confidenceCorrelation ?? {
        severityVsSolverToRevisionDelta: 0,
        severityVsRevisionToSynthesizerDelta: 0,
    };
    const evidencePlanning = index.aggregates.evidencePlanning ?? {
        riskLevelMean: 0,
        riskLevelDistribution: {},
    };
    const counterfactualFailureModeCounts =
        index.aggregates.counterfactualFailureModeCounts ?? {};
    const topCounterfactualFailureModes = Object.entries(
        counterfactualFailureModeCounts,
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    const filterEntries = Object.entries(index.filterContext ?? {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
    );
    const { presets } = collectIndexFacets(index);
    const trendFilters = {
        preset: params.preset,
        from: params.from,
        to: params.to,
    };
    const filteredTrendRuns = filterIndexRuns(index.runs, trendFilters);
    const filteredTrendBenchmarks = filterIndexBenchmarks(
        index.benchmarks,
        trendFilters,
    );
    const trendFiltersActive = hasActiveIndexFilters(trendFilters);

    return (
        <section className="stack">
            {indexFreshness.stale ? (
                <div
                    className="card"
                    style={{ borderColor: "var(--color-warning)" }}
                >
                    <h2 style={{ marginTop: 0 }}>
                        Analysis index may be stale
                    </h2>
                    <p className="muted" style={{ marginBottom: 12 }}>
                        {indexFreshness.missingIndex
                            ? "Artifacts are loaded but the analysis index is missing."
                            : `The index covers ${indexFreshness.indexedRuns} runs and ${indexFreshness.indexedBenchmarks} benchmarks, but ${indexFreshness.artifactRuns} runs and ${indexFreshness.artifactBenchmarks} benchmarks exist on disk.`}{" "}
                        Charts and insight pages may omit recent experiments
                        until you rebuild.
                    </p>
                    <Link href="/status" className="button secondary">
                        Rebuild from data status
                    </Link>
                </div>
            ) : null}
            <div>
                <h1 className="title">LLM Research Dashboard</h1>
                <p className="subtitle">
                    Generated at {new Date(index.generatedAt).toLocaleString()}{" "}
                    from local run artifacts.
                </p>
                <div
                    className="page-actions"
                    style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 12,
                    }}
                >
                    <a href="/search" className="button secondary">
                        Search artifacts
                    </a>
                    <a href="/questions" className="button secondary">
                        Browse questions
                    </a>
                    <a href="/catalog" className="button secondary">
                        Experiment catalog
                    </a>
                    <a href="/activity" className="button secondary">
                        Activity feed
                    </a>
                    <a href="/pipeline" className="button secondary">
                        Pipeline reference
                    </a>
                    <a href="/agents" className="button secondary">
                        Agent stats
                    </a>
                    <a href="/glossary" className="button secondary">
                        Glossary
                    </a>
                    <a href="/leaderboard" className="button secondary">
                        Model leaderboard
                    </a>
                    <a href="/presets" className="button secondary">
                        Preset leaderboard
                    </a>
                    <a href="/quality" className="button secondary">
                        Quality insights
                    </a>
                    <a href="/issues" className="button secondary">
                        Critique issues
                    </a>
                    <a href="/counterfactual" className="button secondary">
                        Counterfactual modes
                    </a>
                    <a href="/evidence" className="button secondary">
                        Evidence planning
                    </a>
                    <a href="/drift" className="button secondary">
                        Confidence drift
                    </a>
                    <a href="/timing" className="button secondary">
                        Pipeline timing
                    </a>
                    <a href="/leaderboard/compare" className="button secondary">
                        Compare models
                    </a>
                    <a href="/outliers" className="button secondary">
                        Outlier runs
                    </a>
                    <a href="/report" className="button secondary">
                        Analysis report
                    </a>
                    <a href="/status" className="button secondary">
                        Data status
                    </a>
                </div>
            </div>

            <div className="grid-4">
                <MetricCard
                    label="Run artifacts"
                    value={index.totals.runs}
                    helpKey="runArtifacts"
                />
                <MetricCard
                    label="Benchmark artifacts"
                    value={index.totals.benchmarks}
                    helpKey="benchmarkArtifacts"
                />
                <MetricCard
                    label="Skipped files"
                    value={index.totals.skippedFiles}
                    helpKey="skippedFiles"
                />
                <MetricCard
                    label="Unique counterfactual modes"
                    value={Object.keys(counterfactualFailureModeCounts).length}
                    helpKey="uniqueCounterfactualModes"
                />
            </div>

            <div className="grid-4">
                <MetricCard
                    label="Avg solver->revision Δ"
                    value={
                        index.aggregates.confidenceDrift.solverToRevisionMean
                    }
                    helpKey="solverToRevisionDelta"
                />
                <MetricCard
                    label="Avg revision->synth Δ"
                    value={
                        index.aggregates.confidenceDrift
                            .revisionToSynthesizerMean
                    }
                    helpKey="revisionToSynthesizerDelta"
                />
                <MetricCard
                    label="Avg calibrated−synth Δ"
                    value={
                        index.aggregates.confidenceDrift
                            .calibratedMinusSynthMean
                    }
                    helpKey="calibratedMinusSynthDelta"
                />
                <MetricCard
                    label="Avg evidence-plan risk"
                    value={evidencePlanning.riskLevelMean}
                    helpKey="evidenceRiskLevel"
                />
            </div>

            {recentActivity.length > 0 ? (
                <div className="card">
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 10,
                            alignItems: "baseline",
                            justifyContent: "space-between",
                        }}
                    >
                        <h2 style={{ margin: 0 }}>Recent activity</h2>
                        <Link href="/activity" className="button secondary">
                            Full timeline
                        </Link>
                    </div>
                    <ResponsiveTable
                        columns={[
                            {
                                key: "kind",
                                label: "Type",
                                render: (row) => {
                                    const k = (row as { kind: string }).kind;
                                    return k === "run" ? "Run" : "Benchmark";
                                },
                            },
                            {
                                key: "createdAt",
                                label: "When",
                                render: (row) =>
                                    new Date(
                                        (row as { createdAt: string })
                                            .createdAt,
                                    ).toLocaleString(),
                            },
                            {
                                key: "question",
                                label: "Question",
                                render: (row) => {
                                    const q = (row as { question: string })
                                        .question;
                                    return q.length > 72
                                        ? `${q.slice(0, 72)}…`
                                        : q;
                                },
                            },
                            {
                                key: "open",
                                label: "Open",
                                render: (row) => (
                                    <Link href={(row as { href: string }).href}>
                                        View
                                    </Link>
                                ),
                            },
                        ]}
                        data={recentActivity}
                        getRowId={(row) =>
                            `${(row as { kind: string }).kind}-${(row as { id: string }).id}`
                        }
                    />
                </div>
            ) : null}

            <div className="grid-4">
                <MetricCard
                    label="corr(severity, solver->revision Δ)"
                    value={
                        confidenceCorrelation.severityVsSolverToRevisionDelta
                    }
                    helpKey="severityVsSolverToRevisionDelta"
                />
                <MetricCard
                    label="corr(severity, revision->synth Δ)"
                    value={
                        confidenceCorrelation.severityVsRevisionToSynthesizerDelta
                    }
                    helpKey="severityVsRevisionToSynthesizerDelta"
                />
            </div>

            {filterEntries.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Analysis filter context</h2>
                    <p className="small muted">
                        This index was generated from a filtered artifact
                        subset.
                    </p>
                    <ResponsiveTable
                        columns={[
                            { key: "key", label: "Filter" },
                            { key: "value", label: "Value" },
                        ]}
                        data={filterEntries.map(([key, value]) => ({
                            key,
                            value: String(value),
                        }))}
                        getRowId={(row) => row.key as string}
                    />
                </div>
            ) : null}

            <div className="card">
                <h2 style={{ marginTop: 0 }}>
                    Outlier runs (lowest avg similarity)
                </h2>
                {outliers.length === 0 ? (
                    <p className="muted">No outlier data available yet.</p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "benchmarkId", label: "Benchmark" },
                            {
                                key: "benchmarkOpen",
                                label: "Benchmark",
                                hideOnMobile: true,
                                render: (row) => (
                                    <a
                                        href={`/benchmarks/${(row as { benchmarkId: string }).benchmarkId}`}
                                    >
                                        Open
                                    </a>
                                ),
                            },
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
                                key: "open",
                                label: "Open",
                                hideOnMobile: true,
                                render: (row) => (
                                    <a
                                        href={`/runs/${(row as { runId: string }).runId}`}
                                    >
                                        Trace
                                    </a>
                                ),
                            },
                        ]}
                        data={outliers as unknown as Record<string, unknown>[]}
                        getRowId={(row) =>
                            `${(row as { benchmarkId: string }).benchmarkId}-${(row as { runId: string }).runId}`
                        }
                        renderCardActions={(row) => (
                            <a
                                href={`/runs/${(row as { runId: string }).runId}`}
                                className="button"
                            >
                                View trace
                            </a>
                        )}
                    />
                )}
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>
                    Top counterfactual failure modes
                </h2>
                {topCounterfactualFailureModes.length === 0 ? (
                    <p className="muted">
                        No counterfactual failure modes recorded yet.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            {
                                key: "failureMode",
                                label: "Failure mode",
                                helpKey: "counterfactualFailureModeCount",
                            },
                            { key: "count", label: "Count" },
                        ]}
                        data={topCounterfactualFailureModes.map(
                            ([failureMode, count]) => ({
                                failureMode,
                                count,
                            }),
                        )}
                        getRowId={(row) =>
                            (row as { failureMode: string }).failureMode
                        }
                    />
                )}
            </div>

            <OverviewCharts
                issueTypeCounts={index.aggregates.issueTypeCounts}
                critiqueVsConfidence={index.aggregates.critiqueVsConfidence}
            />

            <CollapsibleFilterCard
                summaryLabel="Trend filters"
                resultsSummary={
                    trendFiltersActive ? (
                        <>
                            {filteredTrendRuns.length} runs ·{" "}
                            {filteredTrendBenchmarks.length} benchmarks
                        </>
                    ) : (
                        <>All indexed artifacts</>
                    )
                }
            >
                <form method="get">
                    <div className="filter-grid">
                        <PresetFilterSelect
                            presets={presets}
                            defaultValue={params.preset ?? ""}
                        />
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
                            Apply trend filters
                        </button>
                        <a href="/" className="button secondary">
                            Clear
                        </a>
                    </div>
                </form>
            </CollapsibleFilterCard>

            <ResearchTrendCharts
                presets={
                    trendFiltersActive
                        ? buildPresetCountsFromRuns(filteredTrendRuns)
                        : index.aggregates.presets
                }
                evidenceRiskDistribution={
                    trendFiltersActive
                        ? buildEvidenceRiskDistribution(filteredTrendRuns)
                        : (evidencePlanning.riskLevelDistribution ?? {})
                }
                runs={filteredTrendRuns.map((run) => ({
                    id: run.id,
                    createdAt: run.createdAt,
                    evidenceRiskLevel: run.research?.evidenceRiskLevel,
                }))}
                benchmarks={filteredTrendBenchmarks.map((benchmark) => ({
                    id: benchmark.id,
                    createdAt: benchmark.createdAt,
                    divergenceEntropy: benchmark.divergenceEntropy,
                    stabilityPairwiseMean: benchmark.stabilityPairwiseMean,
                }))}
            />

            <MetricGlossary />

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Recent runs</h2>
                <ResponsiveTable
                    columns={[
                        { key: "id", label: "ID" },
                        { key: "question", label: "Question" },
                        {
                            key: "pipelinePreset",
                            label: "Preset",
                            helpKey: "preset",
                        },
                        { key: "model", label: "Model", helpKey: "model" },
                        {
                            key: "issueCount",
                            label: "Issues",
                            helpKey: "issueCount",
                        },
                        {
                            key: "finalAnswerPreview",
                            label: "Preview",
                            hideOnMobile: true,
                            render: (row) => (
                                <span className="muted">
                                    {
                                        (row as { finalAnswerPreview: string })
                                            .finalAnswerPreview
                                    }
                                </span>
                            ),
                        },
                        {
                            key: "trace",
                            label: "Open",
                            render: (row) => (
                                <a href={`/runs/${(row as { id: string }).id}`}>
                                    Trace
                                </a>
                            ),
                        },
                        {
                            key: "compare",
                            label: "Compare",
                            render: (row) => (
                                <a
                                    href={
                                        (row as { compareHref: string })
                                            .compareHref
                                    }
                                >
                                    Compare
                                </a>
                            ),
                        },
                    ]}
                    data={recentRuns.map((run, idx) => ({
                        id: run.id,
                        question: run.question,
                        pipelinePreset: run.pipelinePreset,
                        model: run.model,
                        issueCount: run.critique.issueCount,
                        finalAnswerPreview: run.finalAnswerPreview,
                        compareHref: `/runs/compare?left=${run.id}${recentRuns[idx + 1] ? `&right=${recentRuns[idx + 1].id}` : ""}`,
                    }))}
                    getRowId={(row) => (row as { id: string }).id}
                    renderCardActions={(row) => (
                        <>
                            <a
                                href={`/runs/${(row as { id: string }).id}`}
                                className="button"
                            >
                                Trace
                            </a>
                            <a
                                href={
                                    (row as { compareHref: string }).compareHref
                                }
                                className="button secondary"
                            >
                                Compare
                            </a>
                        </>
                    )}
                />
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Recent benchmarks</h2>
                <ResponsiveTable
                    columns={[
                        { key: "id", label: "ID" },
                        { key: "question", label: "Question" },
                        { key: "runs", label: "Runs", helpKey: "runs" },
                        {
                            key: "modeCount",
                            label: "Mode count",
                            helpKey: "modeCount",
                        },
                        {
                            key: "divergenceEntropy",
                            label: "Entropy",
                            helpKey: "divergenceEntropy",
                        },
                        {
                            key: "details",
                            label: "Open",
                            render: (row) => (
                                <a
                                    href={`/benchmarks/${(row as { id: string }).id}`}
                                >
                                    Details
                                </a>
                            ),
                        },
                        {
                            key: "compare",
                            label: "Compare",
                            render: (row) => (
                                <a
                                    href={
                                        (row as { compareHref: string })
                                            .compareHref
                                    }
                                >
                                    Compare
                                </a>
                            ),
                        },
                    ]}
                    data={recentBenchmarks.map((bench, idx) => ({
                        id: bench.id,
                        question: bench.question,
                        runs: bench.runs,
                        modeCount: bench.modeCount,
                        divergenceEntropy: bench.divergenceEntropy,
                        compareHref: `/benchmarks/compare?left=${bench.id}${recentBenchmarks[idx + 1] ? `&right=${recentBenchmarks[idx + 1].id}` : ""}`,
                    }))}
                    getRowId={(row) => (row as { id: string }).id}
                    renderCardActions={(row) => (
                        <>
                            <a
                                href={`/benchmarks/${(row as { id: string }).id}`}
                                className="button"
                            >
                                Details
                            </a>
                            <a
                                href={
                                    (row as { compareHref: string }).compareHref
                                }
                                className="button secondary"
                            >
                                Compare
                            </a>
                        </>
                    )}
                />
            </div>
        </section>
    );
}
