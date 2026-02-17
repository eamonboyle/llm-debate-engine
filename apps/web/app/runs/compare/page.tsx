import type { Metadata } from "next";
import { RunCompareDeltaChart } from "../../../components/charts/RunCompareDeltaChart";
import { loadRunArtifacts } from "../../../lib/data";
import { buildRunComparePayload } from "../../../lib/runCompare";

export const metadata: Metadata = {
    title: "Run compare",
};

type CompareSearchParams = {
    left?: string;
    right?: string;
};

function formatMetric(value: number | null) {
    return typeof value === "number" ? value.toFixed(3) : "-";
}

export default async function RunsComparePage({
    searchParams,
}: {
    searchParams: Promise<CompareSearchParams>;
}) {
    const params = await searchParams;
    const runs = await loadRunArtifacts();
    const left = runs.find((run) => run.id === params.left) ?? null;
    const right = runs.find((run) => run.id === params.right) ?? null;
    const compare = left && right ? buildRunComparePayload(left, right) : null;
    const leftSnapshot = compare?.left ?? null;
    const rightSnapshot = compare?.right ?? null;

    const chartRows =
        compare
            ? [
                  {
                      metric: "stepCount",
                      delta: compare.delta.stepCount,
                  },
                  {
                      metric: "issueCount",
                      delta: compare.delta.critique.issueCount,
                  },
                  {
                      metric: "solverConf",
                      delta: compare.delta.confidence.solver,
                  },
                  {
                      metric: "synthConf",
                      delta: compare.delta.confidence.synthesizer,
                  },
                  {
                      metric: "factualRisk",
                      delta: compare.delta.quality.factualRisk,
                  },
                  {
                      metric: "evidenceRisk",
                      delta: compare.delta.research.evidenceRiskLevel,
                  },
                  {
                      metric: "cfModeCount",
                      delta: compare.delta.research.counterfactualFailureModeCount,
                  },
              ]
            : [];

    return (
        <section className="stack">
            <div>
                <h1 className="title">Run compare</h1>
                <p className="subtitle">
                    Select two runs to compare confidence shifts, critique pressure,
                    and rubric quality metrics.
                </p>
            </div>

            <form className="card" method="get">
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                    }}
                >
                    <div>
                        <label className="small muted" htmlFor="left">
                            Left run
                        </label>
                        <select
                            id="left"
                            name="left"
                            className="input"
                            defaultValue={params.left ?? ""}
                        >
                            <option value="">Select left run</option>
                            {runs.map((run) => (
                                <option key={`left-${run.id}`} value={run.id}>
                                    {run.id} · {run.question.slice(0, 100)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="small muted" htmlFor="right">
                            Right run
                        </label>
                        <select
                            id="right"
                            name="right"
                            className="input"
                            defaultValue={params.right ?? ""}
                        >
                            <option value="">Select right run</option>
                            {runs.map((run) => (
                                <option key={`right-${run.id}`} value={run.id}>
                                    {run.id} · {run.question.slice(0, 100)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                    <button type="submit" className="button">
                        Compare
                    </button>
                    <a href="/runs/compare" className="button secondary">
                        Clear
                    </a>
                </div>
            </form>

            <div className="two-col">
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Left</h2>
                    {!leftSnapshot ? (
                        <p className="muted">No left run selected.</p>
                    ) : (
                        <ul>
                            <li>
                                <strong>ID:</strong> {leftSnapshot.id}
                            </li>
                            <li>
                                <strong>Question:</strong> {leftSnapshot.question}
                            </li>
                            <li>
                                <strong>Created:</strong>{" "}
                                {new Date(leftSnapshot.createdAt).toLocaleString()}
                            </li>
                            <li>
                                <strong>Model:</strong> {leftSnapshot.model}
                            </li>
                            <li>
                                <strong>Preset:</strong> {leftSnapshot.pipelinePreset}
                            </li>
                        </ul>
                    )}
                </div>
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Right</h2>
                    {!rightSnapshot ? (
                        <p className="muted">No right run selected.</p>
                    ) : (
                        <ul>
                            <li>
                                <strong>ID:</strong> {rightSnapshot.id}
                            </li>
                            <li>
                                <strong>Question:</strong> {rightSnapshot.question}
                            </li>
                            <li>
                                <strong>Created:</strong>{" "}
                                {new Date(rightSnapshot.createdAt).toLocaleString()}
                            </li>
                            <li>
                                <strong>Model:</strong> {rightSnapshot.model}
                            </li>
                            <li>
                                <strong>Preset:</strong> {rightSnapshot.pipelinePreset}
                            </li>
                        </ul>
                    )}
                </div>
            </div>

            {leftSnapshot && rightSnapshot ? (
                <div className="stack">
                    <div className="card">
                        <h2 style={{ marginTop: 0 }}>Delta summary</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>Left</th>
                                    <th>Right</th>
                                    <th>Delta (right - left)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Step count</td>
                                    <td>{leftSnapshot.stepCount}</td>
                                    <td>{rightSnapshot.stepCount}</td>
                                    <td>{compare?.delta.stepCount}</td>
                                </tr>
                                <tr>
                                    <td>Critique issue count</td>
                                    <td>{leftSnapshot.metrics.critique.issueCount}</td>
                                    <td>{rightSnapshot.metrics.critique.issueCount}</td>
                                    <td>{compare?.delta.critique.issueCount}</td>
                                </tr>
                                <tr>
                                    <td>Solver confidence</td>
                                    <td>
                                        {formatMetric(leftSnapshot.metrics.confidence.solver)}
                                    </td>
                                    <td>
                                        {formatMetric(rightSnapshot.metrics.confidence.solver)}
                                    </td>
                                    <td>
                                        {formatMetric(compare?.delta.confidence.solver ?? null)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Synthesizer confidence</td>
                                    <td>
                                        {formatMetric(
                                            leftSnapshot.metrics.confidence.synthesizer,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            rightSnapshot.metrics.confidence.synthesizer,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare?.delta.confidence.synthesizer ?? null,
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Critique max severity</td>
                                    <td>
                                        {formatMetric(leftSnapshot.metrics.critique.maxSeverity)}
                                    </td>
                                    <td>
                                        {formatMetric(rightSnapshot.metrics.critique.maxSeverity)}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare?.delta.critique.maxSeverity ?? null,
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Coherence</td>
                                    <td>{formatMetric(leftSnapshot.metrics.quality.coherence)}</td>
                                    <td>{formatMetric(rightSnapshot.metrics.quality.coherence)}</td>
                                    <td>
                                        {formatMetric(
                                            compare?.delta.quality.coherence ?? null,
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Completeness</td>
                                    <td>
                                        {formatMetric(
                                            leftSnapshot.metrics.quality.completeness,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            rightSnapshot.metrics.quality.completeness,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare?.delta.quality.completeness ?? null,
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Factual risk</td>
                                    <td>
                                        {formatMetric(
                                            leftSnapshot.metrics.quality.factualRisk,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            rightSnapshot.metrics.quality.factualRisk,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare?.delta.quality.factualRisk ?? null,
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Evidence risk level</td>
                                    <td>
                                        {formatMetric(
                                            leftSnapshot.metrics.research
                                                .evidenceRiskLevel,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            rightSnapshot.metrics.research
                                                .evidenceRiskLevel,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare?.delta.research
                                                .evidenceRiskLevel ?? null,
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Counterfactual mode count</td>
                                    <td>
                                        {formatMetric(
                                            leftSnapshot.metrics.research
                                                .counterfactualFailureModeCount,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            rightSnapshot.metrics.research
                                                .counterfactualFailureModeCount,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare?.delta.research
                                                .counterfactualFailureModeCount ?? null,
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Top counterfactual mode</td>
                                    <td>
                                        {leftSnapshot.metrics.research
                                            .topCounterfactualFailureMode ?? "-"}
                                    </td>
                                    <td>
                                        {rightSnapshot.metrics.research
                                            .topCounterfactualFailureMode ?? "-"}
                                    </td>
                                    <td className="muted">n/a</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <RunCompareDeltaChart rows={chartRows} />
                </div>
            ) : null}
        </section>
    );
}
