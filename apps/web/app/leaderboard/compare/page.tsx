import type { Metadata } from "next";
import Link from "next/link";
import { CompareSwapLink } from "../../../components/CompareSwapLink";
import { MetricCard } from "../../../components/MetricCard";
import { ModelFilterSelect } from "../../../components/ModelFilterSelect";
import { loadAnalysisIndex } from "../../../lib/data";
import { buildModelLeaderboard } from "../../../lib/modelLeaderboard";
import { buildModelComparePayload } from "../../../lib/modelCompare";

export const metadata: Metadata = {
    title: "Compare models",
};

type ModelCompareSearchParams = {
    left?: string;
    right?: string;
};

function formatMetric(value: number | null, digits = 2) {
    return typeof value === "number" ? value.toFixed(digits) : "—";
}

function formatDelta(value: number | null, digits = 2) {
    if (typeof value !== "number") return "—";
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toFixed(digits)}`;
}

export default async function ModelComparePage({
    searchParams,
}: {
    searchParams: Promise<ModelCompareSearchParams>;
}) {
    const params = await searchParams;
    const index = await loadAnalysisIndex();

    if (!index) {
        return (
            <section className="stack">
                <h1 className="title">Compare models</h1>
                <p className="subtitle">
                    Model comparison requires an analysis index. Run{" "}
                    <code>pnpm analyze</code> after adding run artifacts.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const models = buildModelLeaderboard(index).map((row) => row.model);
    const leftModel = (params.left ?? "").trim();
    const rightModel = (params.right ?? "").trim();
    const compare =
        leftModel && rightModel
            ? buildModelComparePayload(index, leftModel, rightModel)
            : null;

    return (
        <section className="stack">
            <div>
                <h1 className="title">Compare models</h1>
                <p className="subtitle">
                    Side-by-side averages from the model leaderboard — useful
                    when evaluating multiple models on the same question set.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/leaderboard" className="button secondary">
                        Model leaderboard
                    </Link>
                    <Link href="/catalog" className="button secondary">
                        Experiment catalog
                    </Link>
                </div>
            </div>

            <form className="card" method="get">
                <div className="filter-grid">
                    <ModelFilterSelect
                        name="left"
                        models={models}
                        defaultValue={leftModel}
                        listId="model-compare-left-options"
                    />
                    <ModelFilterSelect
                        name="right"
                        models={models}
                        defaultValue={rightModel}
                        listId="model-compare-right-options"
                    />
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Compare
                    </button>
                    {leftModel && rightModel ? (
                        <CompareSwapLink
                            basePath="/leaderboard/compare"
                            left={leftModel}
                            right={rightModel}
                        />
                    ) : null}
                </div>
            </form>

            {!leftModel || !rightModel ? (
                <div className="card">
                    <p className="muted">
                        Pick two models above to compare average critique
                        pressure, confidence drift, and evidence risk.
                    </p>
                </div>
            ) : !compare ? (
                <div className="card">
                    <p className="muted">
                        Could not find both models in the analysis index. Check
                        spelling or browse the{" "}
                        <Link href="/leaderboard">leaderboard</Link>.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid-4">
                        <div className="card">
                            <div className="small muted">Left model</div>
                            <div style={{ marginTop: 6, fontWeight: 600 }}>
                                {compare.left.model}
                            </div>
                            <p className="small muted" style={{ marginTop: 8 }}>
                                {compare.left.runCount} indexed run
                                {compare.left.runCount === 1 ? "" : "s"}
                            </p>
                            <Link
                                href={compare.left.runsHref}
                                className="button secondary"
                                style={{ marginTop: 12 }}
                            >
                                Filter runs
                            </Link>
                        </div>
                        <div className="card">
                            <div className="small muted">Right model</div>
                            <div style={{ marginTop: 6, fontWeight: 600 }}>
                                {compare.right.model}
                            </div>
                            <p className="small muted" style={{ marginTop: 8 }}>
                                {compare.right.runCount} indexed run
                                {compare.right.runCount === 1 ? "" : "s"}
                            </p>
                            <Link
                                href={compare.right.runsHref}
                                className="button secondary"
                                style={{ marginTop: 12 }}
                            >
                                Filter runs
                            </Link>
                        </div>
                    </div>

                    <div className="card">
                        <h2 style={{ marginTop: 0 }}>Metric comparison</h2>
                        <p className="small muted">
                            Delta = right minus left. Positive avg issues or
                            evidence risk means the right model scores higher on
                            that pressure metric.
                        </p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>{compare.left.model}</th>
                                    <th>{compare.right.model}</th>
                                    <th>Δ (right − left)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Runs</td>
                                    <td>{compare.left.runCount}</td>
                                    <td>{compare.right.runCount}</td>
                                    <td>{compare.delta.runCount}</td>
                                </tr>
                                <tr>
                                    <td>Avg critique issues</td>
                                    <td>
                                        {formatMetric(
                                            compare.left.avgIssueCount,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare.right.avgIssueCount,
                                        )}
                                    </td>
                                    <td>
                                        {formatDelta(
                                            compare.delta.avgIssueCount,
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Avg max severity</td>
                                    <td>
                                        {formatMetric(
                                            compare.left.avgMaxSeverity,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare.right.avgMaxSeverity,
                                        )}
                                    </td>
                                    <td>
                                        {formatDelta(
                                            compare.delta.avgMaxSeverity,
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Avg solver→revision Δ</td>
                                    <td>
                                        {formatMetric(
                                            compare.left
                                                .avgSolverToRevisionDelta,
                                            3,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare.right
                                                .avgSolverToRevisionDelta,
                                            3,
                                        )}
                                    </td>
                                    <td>
                                        {formatDelta(
                                            compare.delta
                                                .avgSolverToRevisionDelta,
                                            3,
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Avg evidence risk</td>
                                    <td>
                                        {formatMetric(
                                            compare.left.avgEvidenceRisk,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare.right.avgEvidenceRisk,
                                        )}
                                    </td>
                                    <td>
                                        {formatDelta(
                                            compare.delta.avgEvidenceRisk,
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Avg solver confidence</td>
                                    <td>
                                        {formatMetric(
                                            compare.left.avgSolverConfidence,
                                            3,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare.right.avgSolverConfidence,
                                            3,
                                        )}
                                    </td>
                                    <td>
                                        {formatDelta(
                                            compare.delta.avgSolverConfidence,
                                            3,
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="grid-4">
                        <MetricCard
                            label="Left avg issues"
                            value={formatMetric(compare.left.avgIssueCount)}
                            helpKey="issueCount"
                        />
                        <MetricCard
                            label="Right avg issues"
                            value={formatMetric(compare.right.avgIssueCount)}
                            helpKey="issueCount"
                        />
                        <MetricCard
                            label="Left evidence risk"
                            value={formatMetric(compare.left.avgEvidenceRisk)}
                            helpKey="evidenceRiskLevel"
                        />
                        <MetricCard
                            label="Right evidence risk"
                            value={formatMetric(compare.right.avgEvidenceRisk)}
                            helpKey="evidenceRiskLevel"
                        />
                    </div>
                </>
            )}
        </section>
    );
}
