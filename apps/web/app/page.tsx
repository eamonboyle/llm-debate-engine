import type { Metadata } from "next";
import { MetricCard } from "../components/MetricCard";
import { ResponsiveTable } from "../components/ResponsiveTable";
import { OverviewCharts } from "../components/charts/OverviewCharts";
import { ResearchTrendCharts } from "../components/charts/ResearchTrendCharts";
import { MetricGlossary } from "../components/MetricGlossary";
import { loadAnalysisIndex } from "../lib/data";

export const metadata: Metadata = {
    title: "Overview",
};

export default async function OverviewPage() {
    const index = await loadAnalysisIndex();

    if (!index) {
        return (
            <section className="stack">
                <h1 className="title">LLM Research Dashboard</h1>
                <p className="subtitle">
                    No data available yet. Run <code>pnpm analyze</code> locally
                    to generate the analysis index, or ensure run artifacts are
                    present.
                </p>
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

    return (
        <section className="stack">
            <div>
                <h1 className="title">LLM Research Dashboard</h1>
                <p className="subtitle">
                    Generated at {new Date(index.generatedAt).toLocaleString()} from
                    local run artifacts.
                </p>
            </div>

            <div className="grid-4">
                <MetricCard label="Run artifacts" value={index.totals.runs} />
                <MetricCard
                    label="Benchmark artifacts"
                    value={index.totals.benchmarks}
                />
                <MetricCard
                    label="Skipped files"
                    value={index.totals.skippedFiles}
                />
                <MetricCard
                    label="Avg solver->revision Δ"
                    value={index.aggregates.confidenceDrift.solverToRevisionMean}
                />
            </div>

            <div className="grid-4">
                <MetricCard
                    label="corr(severity, solver->revision Δ)"
                    value={confidenceCorrelation.severityVsSolverToRevisionDelta}
                />
                <MetricCard
                    label="corr(severity, revision->synth Δ)"
                    value={confidenceCorrelation.severityVsRevisionToSynthesizerDelta}
                />
                <MetricCard
                    label="Avg evidence-plan risk"
                    value={evidencePlanning.riskLevelMean}
                />
                <MetricCard
                    label="Unique counterfactual modes"
                    value={Object.keys(counterfactualFailureModeCounts).length}
                />
            </div>

            {filterEntries.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Analysis filter context</h2>
                    <p className="small muted">
                        This index was generated from a filtered artifact subset.
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
                <h2 style={{ marginTop: 0 }}>Outlier runs (lowest avg similarity)</h2>
                {outliers.length === 0 ? (
                    <p className="muted">No outlier data available yet.</p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "benchmarkId", label: "Benchmark" },
                            { key: "runId", label: "Run ID" },
                            { key: "avgSimilarity", label: "Avg similarity" },
                            { key: "zScore", label: "Z-score" },
                            {
                                key: "open",
                                label: "Open",
                                hideOnMobile: true,
                                render: (row) => (
                                    <a href={`/runs/${(row as { runId: string }).runId}`}>
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
                            <a href={`/runs/${(row as { runId: string }).runId}`} className="button">
                                View trace
                            </a>
                        )}
                    />
                )}
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Top counterfactual failure modes</h2>
                {topCounterfactualFailureModes.length === 0 ? (
                    <p className="muted">
                        No counterfactual failure modes recorded yet.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "failureMode", label: "Failure mode" },
                            { key: "count", label: "Count" },
                        ]}
                        data={topCounterfactualFailureModes.map(([failureMode, count]) => ({
                            failureMode,
                            count,
                        }))}
                        getRowId={(row) => (row as { failureMode: string }).failureMode}
                    />
                )}
            </div>

            <OverviewCharts
                issueTypeCounts={index.aggregates.issueTypeCounts}
                critiqueVsConfidence={index.aggregates.critiqueVsConfidence}
            />

            <ResearchTrendCharts
                presets={index.aggregates.presets}
                evidenceRiskDistribution={
                    evidencePlanning.riskLevelDistribution ?? {}
                }
                runs={index.runs.map((run) => ({
                    id: run.id,
                    createdAt: run.createdAt,
                    evidenceRiskLevel: run.research?.evidenceRiskLevel,
                }))}
                benchmarks={index.benchmarks.map((benchmark) => ({
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
                        { key: "pipelinePreset", label: "Preset" },
                        { key: "model", label: "Model" },
                        { key: "issueCount", label: "Issues" },
                        {
                            key: "finalAnswerPreview",
                            label: "Preview",
                            hideOnMobile: true,
                            render: (row) => (
                                <span className="muted">
                                    {(row as { finalAnswerPreview: string }).finalAnswerPreview}
                                </span>
                            ),
                        },
                        {
                            key: "trace",
                            label: "Open",
                            render: (row) => (
                                <a href={`/runs/${(row as { id: string }).id}`}>Trace</a>
                            ),
                        },
                        {
                            key: "compare",
                            label: "Compare",
                            render: (row) => (
                                <a href={(row as { compareHref: string }).compareHref}>
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
                                href={(row as { compareHref: string }).compareHref}
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
                        { key: "runs", label: "Runs" },
                        { key: "modeCount", label: "Mode count" },
                        { key: "divergenceEntropy", label: "Entropy" },
                        {
                            key: "details",
                            label: "Open",
                            render: (row) => (
                                <a href={`/benchmarks/${(row as { id: string }).id}`}>
                                    Details
                                </a>
                            ),
                        },
                        {
                            key: "compare",
                            label: "Compare",
                            render: (row) => (
                                <a href={(row as { compareHref: string }).compareHref}>
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
                                href={(row as { compareHref: string }).compareHref}
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
