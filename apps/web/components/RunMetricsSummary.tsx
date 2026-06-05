import { MetricCard } from "./MetricCard";
import type { RunCompareSummary } from "../lib/runCompare";

function formatMetric(value: number | null) {
    return typeof value === "number" ? value.toFixed(3) : "—";
}

function formatQualityScore(value: number | null) {
    return typeof value === "number" ? value.toFixed(1) : "—";
}

type RunMetricsSummaryProps = {
    summary: RunCompareSummary;
};

function hasQualityScores(
    quality: RunCompareSummary["metrics"]["quality"],
): boolean {
    return Object.values(quality).some((value) => typeof value === "number");
}

export function RunMetricsSummary({ summary }: RunMetricsSummaryProps) {
    const { metrics } = summary;
    const showQuality = hasQualityScores(metrics.quality);

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
            {showQuality ? (
                <div>
                    <div className="small muted" style={{ marginBottom: 8 }}>
                        Judge rubric scores (1–5)
                    </div>
                    <div className="grid-4">
                        <MetricCard
                            label="Coherence"
                            value={formatQualityScore(
                                metrics.quality.coherence,
                            )}
                            helpKey="coherence"
                        />
                        <MetricCard
                            label="Completeness"
                            value={formatQualityScore(
                                metrics.quality.completeness,
                            )}
                            helpKey="completeness"
                        />
                        <MetricCard
                            label="Factual risk"
                            value={formatQualityScore(
                                metrics.quality.factualRisk,
                            )}
                            helpKey="factualRisk"
                        />
                        <MetricCard
                            label="Uncertainty handling"
                            value={formatQualityScore(
                                metrics.quality.uncertaintyHandling,
                            )}
                            helpKey="uncertaintyHandling"
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
