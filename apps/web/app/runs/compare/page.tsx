import { RunCompareDeltaChart } from "../../../components/charts/RunCompareDeltaChart";
import { RunArtifact, loadRunArtifacts } from "../../../lib/data";

type CompareSearchParams = {
    left?: string;
    right?: string;
};

function toNumberOrNull(value: unknown): number | null {
    return typeof value === "number" ? value : null;
}

function toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};
}

function getIssueCount(run: RunArtifact): number {
    const critique = toRecord(run.run.metrics.critique);
    const byType = toRecord(critique.byType);
    let total = 0;
    for (const value of Object.values(byType)) {
        if (typeof value === "number" && Number.isFinite(value)) {
            total += value;
        }
    }
    return total;
}

function getRunSnapshot(run: RunArtifact) {
    const confidence = toRecord(run.run.metrics.confidence);
    const critique = toRecord(run.run.metrics.critique);
    const quality = toRecord(run.run.metrics.quality);
    return {
        id: run.id,
        question: run.question,
        model: run.metadata.model,
        pipelinePreset: run.metadata.pipelinePreset,
        createdAt: run.metadata.createdAt,
        stepCount: run.run.steps.length,
        issueCount: getIssueCount(run),
        confidence: {
            solver: toNumberOrNull(confidence.solver),
            revision: toNumberOrNull(confidence.revision),
            synthesizer: toNumberOrNull(confidence.synthesizer),
        },
        critique: {
            maxSeverity: toNumberOrNull(critique.maxSeverity),
            avgSeverity: toNumberOrNull(critique.avgSeverity),
        },
        quality: {
            coherence: toNumberOrNull(quality.coherence),
            completeness: toNumberOrNull(quality.completeness),
            factualRisk: toNumberOrNull(quality.factualRisk),
            uncertaintyHandling: toNumberOrNull(quality.uncertaintyHandling),
        },
    };
}

function subtractOrNull(right: number | null, left: number | null) {
    if (typeof left !== "number" || typeof right !== "number") return null;
    return right - left;
}

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
    const leftSnapshot = left ? getRunSnapshot(left) : null;
    const rightSnapshot = right ? getRunSnapshot(right) : null;

    const chartRows =
        leftSnapshot && rightSnapshot
            ? [
                  {
                      metric: "stepCount",
                      delta: rightSnapshot.stepCount - leftSnapshot.stepCount,
                  },
                  {
                      metric: "issueCount",
                      delta: rightSnapshot.issueCount - leftSnapshot.issueCount,
                  },
                  {
                      metric: "solverConf",
                      delta:
                          subtractOrNull(
                              rightSnapshot.confidence.solver,
                              leftSnapshot.confidence.solver,
                          ) ?? 0,
                  },
                  {
                      metric: "synthConf",
                      delta:
                          subtractOrNull(
                              rightSnapshot.confidence.synthesizer,
                              leftSnapshot.confidence.synthesizer,
                          ) ?? 0,
                  },
                  {
                      metric: "factualRisk",
                      delta:
                          subtractOrNull(
                              rightSnapshot.quality.factualRisk,
                              leftSnapshot.quality.factualRisk,
                          ) ?? 0,
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
                                    <td>
                                        {rightSnapshot.stepCount - leftSnapshot.stepCount}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Critique issue count</td>
                                    <td>{leftSnapshot.issueCount}</td>
                                    <td>{rightSnapshot.issueCount}</td>
                                    <td>
                                        {rightSnapshot.issueCount - leftSnapshot.issueCount}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Solver confidence</td>
                                    <td>{formatMetric(leftSnapshot.confidence.solver)}</td>
                                    <td>{formatMetric(rightSnapshot.confidence.solver)}</td>
                                    <td>
                                        {formatMetric(
                                            subtractOrNull(
                                                rightSnapshot.confidence.solver,
                                                leftSnapshot.confidence.solver,
                                            ),
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Synthesizer confidence</td>
                                    <td>
                                        {formatMetric(
                                            leftSnapshot.confidence.synthesizer,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            rightSnapshot.confidence.synthesizer,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            subtractOrNull(
                                                rightSnapshot.confidence.synthesizer,
                                                leftSnapshot.confidence.synthesizer,
                                            ),
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Critique max severity</td>
                                    <td>{formatMetric(leftSnapshot.critique.maxSeverity)}</td>
                                    <td>{formatMetric(rightSnapshot.critique.maxSeverity)}</td>
                                    <td>
                                        {formatMetric(
                                            subtractOrNull(
                                                rightSnapshot.critique.maxSeverity,
                                                leftSnapshot.critique.maxSeverity,
                                            ),
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Coherence</td>
                                    <td>{formatMetric(leftSnapshot.quality.coherence)}</td>
                                    <td>{formatMetric(rightSnapshot.quality.coherence)}</td>
                                    <td>
                                        {formatMetric(
                                            subtractOrNull(
                                                rightSnapshot.quality.coherence,
                                                leftSnapshot.quality.coherence,
                                            ),
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Completeness</td>
                                    <td>{formatMetric(leftSnapshot.quality.completeness)}</td>
                                    <td>{formatMetric(rightSnapshot.quality.completeness)}</td>
                                    <td>
                                        {formatMetric(
                                            subtractOrNull(
                                                rightSnapshot.quality.completeness,
                                                leftSnapshot.quality.completeness,
                                            ),
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Factual risk</td>
                                    <td>{formatMetric(leftSnapshot.quality.factualRisk)}</td>
                                    <td>{formatMetric(rightSnapshot.quality.factualRisk)}</td>
                                    <td>
                                        {formatMetric(
                                            subtractOrNull(
                                                rightSnapshot.quality.factualRisk,
                                                leftSnapshot.quality.factualRisk,
                                            ),
                                        )}
                                    </td>
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
