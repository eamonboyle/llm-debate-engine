import { MetricCard } from "../components/MetricCard";
import { OverviewCharts } from "../components/charts/OverviewCharts";
import { ResearchTrendCharts } from "../components/charts/ResearchTrendCharts";
import { MetricGlossary } from "../components/MetricGlossary";
import { loadAnalysisIndex } from "../lib/data";

export default async function OverviewPage() {
    const index = await loadAnalysisIndex();

    if (!index) {
        return (
            <section className="stack">
                <h1 className="title">LLM Research Dashboard</h1>
                <p className="subtitle">
                    No analysis index found. Generate it with{" "}
                    <code>pnpm analyze</code> from the repository root.
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
            </div>

            {filterEntries.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Analysis filter context</h2>
                    <p className="small muted">
                        This index was generated from a filtered artifact subset.
                    </p>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Filter</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filterEntries.map(([key, value]) => (
                                    <tr key={key}>
                                        <td>{key}</td>
                                        <td>{String(value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Outlier runs (lowest avg similarity)</h2>
                {outliers.length === 0 ? (
                    <p className="muted">No outlier data available yet.</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Benchmark</th>
                                    <th>Run ID</th>
                                    <th>Avg similarity</th>
                                    <th>Z-score</th>
                                    <th>Open</th>
                                </tr>
                            </thead>
                            <tbody>
                                {outliers.map((row) => (
                                    <tr key={`${row.benchmarkId}-${row.runId}`}>
                                        <td>{row.benchmarkId}</td>
                                        <td>{row.runId}</td>
                                        <td>{row.avgSimilarity}</td>
                                        <td>{row.zScore}</td>
                                        <td>
                                            <a href={`/runs/${row.runId}`}>Trace</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Question</th>
                                <th>Preset</th>
                                <th>Model</th>
                                <th>Issues</th>
                                <th>Preview</th>
                                <th>Open</th>
                                <th>Compare</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentRuns.map((run, idx) => (
                                <tr key={run.id}>
                                    <td>{run.id}</td>
                                    <td>{run.question}</td>
                                    <td>{run.pipelinePreset}</td>
                                    <td>{run.model}</td>
                                    <td>{run.critique.issueCount}</td>
                                    <td className="muted">{run.finalAnswerPreview}</td>
                                    <td>
                                        <a href={`/runs/${run.id}`}>Trace</a>
                                    </td>
                                    <td>
                                        <a
                                            href={`/runs/compare?left=${run.id}${recentRuns[idx + 1] ? `&right=${recentRuns[idx + 1].id}` : ""}`}
                                        >
                                            Compare
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Recent benchmarks</h2>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Question</th>
                                <th>Runs</th>
                                <th>Mode count</th>
                                <th>Entropy</th>
                                <th>Open</th>
                                <th>Compare</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentBenchmarks.map((bench, idx) => (
                                <tr key={bench.id}>
                                    <td>{bench.id}</td>
                                    <td>{bench.question}</td>
                                    <td>{bench.runs}</td>
                                    <td>{bench.modeCount}</td>
                                    <td>{bench.divergenceEntropy}</td>
                                    <td>
                                        <a href={`/benchmarks/${bench.id}`}>Details</a>
                                    </td>
                                    <td>
                                        <a
                                            href={`/benchmarks/compare?left=${bench.id}${recentBenchmarks[idx + 1] ? `&right=${recentBenchmarks[idx + 1].id}` : ""}`}
                                        >
                                            Compare
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
