import { MetricCard } from "../components/MetricCard";
import { OverviewCharts } from "../components/charts/OverviewCharts";
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

            <OverviewCharts
                issueTypeCounts={index.aggregates.issueTypeCounts}
                critiqueVsConfidence={index.aggregates.critiqueVsConfidence}
            />

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
                            </tr>
                        </thead>
                        <tbody>
                            {recentRuns.map((run) => (
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
