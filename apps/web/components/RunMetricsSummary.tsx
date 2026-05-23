import { MetricCard } from "./MetricCard";
import type { RunCompareSummary } from "../lib/runCompare";

function formatMetric(value: number | null) {
    return typeof value === "number" ? value.toFixed(3) : "—";
}

type RunMetricsSummaryProps = {
    summary: RunCompareSummary;
};

export function RunMetricsSummary({ summary }: RunMetricsSummaryProps) {
    const { metrics } = summary;

    return (
        <div className="stack">
            <div className="grid-4">
                <MetricCard
                    label="Solver confidence"
                    value={formatMetric(metrics.confidence.solver)}
                    helpKey="solverConfidence"
                />
                <MetricCard
                    label="Revision confidence"
                    value={formatMetric(metrics.confidence.revision)}
                    helpKey="revisionConfidence"
                />
                <MetricCard
                    label="Synthesizer confidence"
                    value={formatMetric(metrics.confidence.synthesizer)}
                    helpKey="synthConfidence"
                />
                <MetricCard
                    label="Calibrated confidence"
                    value={formatMetric(metrics.confidence.calibratedAdjusted)}
                    helpKey="calibratedConfidence"
                />
            </div>
            <div className="grid-4">
                <MetricCard
                    label="Critique issues"
                    value={metrics.critique.issueCount}
                    helpKey="issueCount"
                />
                <MetricCard
                    label="Max severity"
                    value={formatMetric(metrics.critique.maxSeverity)}
                    helpKey="maxSeverity"
                />
                <MetricCard
                    label="Evidence risk"
                    value={formatMetric(metrics.research.evidenceRiskLevel)}
                    helpKey="evidenceRiskLevel"
                />
                <MetricCard
                    label="CF failure modes"
                    value={formatMetric(
                        metrics.research.counterfactualFailureModeCount,
                    )}
                    helpKey="cfModeCount"
                />
            </div>
            {metrics.research.topCounterfactualFailureMode ? (
                <div className="card">
                    <div className="small muted">
                        Top counterfactual failure mode
                    </div>
                    <p style={{ marginTop: 6, marginBottom: 0 }}>
                        {metrics.research.topCounterfactualFailureMode}
                    </p>
                </div>
            ) : null}
        </div>
    );
}
