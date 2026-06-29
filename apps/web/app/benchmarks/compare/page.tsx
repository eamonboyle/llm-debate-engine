import type { Metadata } from "next";
import Link from "next/link";
import { loadBenchmarkArtifacts, loadBenchmarksByIds } from "../../../lib/data";
import {
    compareScopeQuery,
    filterByQuestionScope,
} from "../../../lib/compareScope";
import { CompareDeltaChart } from "../../../components/charts/CompareDeltaChart";
import { ModeSizeBar } from "../../../components/benchmark/ModeSizeBar";
import { buildBenchmarkComparePayload } from "../../../lib/benchmarkCompare";
import { extractClaimCentroidDisplay } from "../../../lib/claimCentroidMetrics";
import { extractBenchmarkSummaryDisplay } from "../../../lib/benchmarkSummaryMetrics";
import { buildBenchmarkCompareSuggestions } from "../../../lib/benchmarkCompareSuggestions";
import { TruncateText } from "../../../components/ResponsiveTable";
import { CompareExportLink } from "../../../components/CompareExportLink";
import { CompareSwapLink } from "../../../components/CompareSwapLink";
import { CopyPageLink } from "../../../components/CopyPageLink";

export const metadata: Metadata = {
    title: "Benchmark compare",
};

type CompareSearchParams = {
    left?: string;
    right?: string;
    question?: string;
};

function formatMetric(value: number | null | undefined, digits = 3): string {
    if (value == null || typeof value !== "number") return "—";
    return value.toFixed(digits);
}

function CompareMetricRow({
    label,
    leftValue,
    rightValue,
    delta,
    digits = 3,
}: {
    label: string;
    leftValue: number | null | undefined;
    rightValue: number | null | undefined;
    delta: number | null | undefined;
    digits?: number;
}) {
    const deltaClass =
        typeof delta === "number"
            ? delta > 0
                ? "compare-delta-pos"
                : delta < 0
                  ? "compare-delta-neg"
                  : ""
            : "";

    return (
        <tr>
            <td>{label}</td>
            <td>{formatMetric(leftValue, digits)}</td>
            <td>{formatMetric(rightValue, digits)}</td>
            <td className={`compare-delta-cell ${deltaClass}`}>
                {formatDelta(delta)}
            </td>
        </tr>
    );
}

function formatDelta(value: number | null | undefined): string {
    if (value == null || typeof value !== "number") return "—";
    const num = Number.isInteger(value) ? String(value) : value.toFixed(3);
    return value >= 0 ? `+${num}` : num;
}

export default async function BenchmarkComparePage({
    searchParams,
}: {
    searchParams: Promise<CompareSearchParams>;
}) {
    const params = await searchParams;
    const allArtifacts = await loadBenchmarkArtifacts();
    const artifacts = filterByQuestionScope(allArtifacts, params.question);
    const scopeParams = compareScopeQuery(params.question);
    const selectedIds = [params.left, params.right].filter(
        (v): v is string => typeof v === "string" && v.length > 0,
    );
    const selected = await loadBenchmarksByIds(selectedIds);
    const left = selected.find((b) => b.id === params.left) ?? null;
    const right = selected.find((b) => b.id === params.right) ?? null;
    const compare =
        left && right ? buildBenchmarkComparePayload(left, right) : null;
    const suggestions = buildBenchmarkCompareSuggestions(allArtifacts, {
        left: params.left,
        right: params.right,
        question: params.question,
    });
    const leftLabel = left ? left.id.slice(-12) : "left";
    const rightLabel = right ? right.id.slice(-12) : "right";
    const leftClaim = left != null ? extractClaimCentroidDisplay(left) : null;
    const rightClaim =
        right != null ? extractClaimCentroidDisplay(right) : null;
    const showClaimCentroid = Boolean(
        leftClaim?.hasClaimCentroid || rightClaim?.hasClaimCentroid,
    );
    const leftSummary =
        left != null ? extractBenchmarkSummaryDisplay(left) : null;
    const rightSummary =
        right != null ? extractBenchmarkSummaryDisplay(right) : null;
    const showSummary = Boolean(leftSummary?.hasAny || rightSummary?.hasAny);

    return (
        <section className="stack">
            <div>
                <h1 className="title">Benchmark compare</h1>
                <p className="subtitle">
                    Select two benchmark artifacts and inspect divergence and
                    stability side-by-side.
                </p>
            </div>

            <form className="card" method="get">
                <div className="filter-grid" style={{ marginBottom: 12 }}>
                    <input
                        name="question"
                        className="input"
                        placeholder="Limit to question (optional)"
                        defaultValue={params.question ?? ""}
                    />
                </div>
                <div className="compare-select-grid">
                    <div>
                        <label
                            className="small muted"
                            htmlFor="left"
                            style={{ display: "block", marginBottom: 4 }}
                        >
                            Left benchmark
                        </label>
                        <select
                            id="left"
                            name="left"
                            className="input"
                            defaultValue={params.left ?? ""}
                        >
                            <option value="">Select left benchmark</option>
                            {artifacts.map((artifact) => (
                                <option
                                    key={`left-${artifact.id}`}
                                    value={artifact.id}
                                >
                                    {artifact.id} ·{" "}
                                    {artifact.question.slice(0, 60)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="compare-vs">vs</div>
                    <div>
                        <label
                            className="small muted"
                            htmlFor="right"
                            style={{ display: "block", marginBottom: 4 }}
                        >
                            Right benchmark
                        </label>
                        <select
                            id="right"
                            name="right"
                            className="input"
                            defaultValue={params.right ?? ""}
                        >
                            <option value="">Select right benchmark</option>
                            {artifacts.map((artifact) => (
                                <option
                                    key={`right-${artifact.id}`}
                                    value={artifact.id}
                                >
                                    {artifact.id} ·{" "}
                                    {artifact.question.slice(0, 60)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Compare
                    </button>
                    <CompareSwapLink
                        basePath="/benchmarks/compare"
                        left={params.left}
                        right={params.right}
                        extraParams={scopeParams}
                    />
                    <Link
                        href="/benchmarks/compare"
                        className="button secondary"
                    >
                        Clear
                    </Link>
                    <CopyPageLink />
                    <CompareExportLink
                        apiPath="/api/benchmarks/compare"
                        left={params.left}
                        right={params.right}
                        extraParams={scopeParams}
                    />
                </div>
            </form>

            {suggestions.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Suggested comparisons</h2>
                    <p className="small muted" style={{ marginBottom: "1rem" }}>
                        One-click pairings for the selected{" "}
                        {params.left && !params.right ? "left" : "right"}{" "}
                        benchmark.
                    </p>
                    <ul className="compare-suggestions-list">
                        {suggestions.map((suggestion) => (
                            <li key={suggestion.id}>
                                <Link
                                    href={suggestion.href}
                                    className="button secondary"
                                >
                                    Compare with {suggestion.id.slice(-16)}
                                </Link>
                                <span className="small muted">
                                    {suggestion.reason} · {suggestion.model} ·{" "}
                                    {suggestion.pipelinePreset} ·{" "}
                                    {new Date(
                                        suggestion.createdAt,
                                    ).toLocaleString()}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <div className="compare-panels">
                <div
                    className={`compare-panel compare-panel-left ${!left ? "compare-panel-empty" : ""}`}
                >
                    <h2 style={{ marginTop: 0 }}>Left</h2>
                    {!left ? (
                        <p className="muted">No left benchmark selected.</p>
                    ) : (
                        <>
                            <div className="compare-panel-header">
                                <Link
                                    href={`/benchmarks/${left.id}`}
                                    className="compare-panel-link"
                                >
                                    {left.id}
                                </Link>
                                <span className="small muted">
                                    {new Date(
                                        left.metadata.createdAt,
                                    ).toLocaleString()}
                                </span>
                            </div>
                            <div className="compare-panel-question">
                                <TruncateText
                                    text={left.question}
                                    maxLength={150}
                                    lines={3}
                                />
                            </div>
                            <div className="compare-panel-metrics">
                                <div className="compare-metric">
                                    <span className="compare-metric-label">
                                        Runs
                                    </span>
                                    <span className="compare-metric-value">
                                        {left.payload.runs}
                                    </span>
                                </div>
                                <div className="compare-metric">
                                    <span className="compare-metric-label">
                                        Modes
                                    </span>
                                    <span className="compare-metric-value">
                                        {left.payload.modeCount}
                                    </span>
                                </div>
                                <div className="compare-metric">
                                    <span className="compare-metric-label">
                                        Entropy
                                    </span>
                                    <span className="compare-metric-value">
                                        {left.payload.divergenceEntropy.toFixed(
                                            3,
                                        )}
                                    </span>
                                </div>
                                <div className="compare-metric">
                                    <span className="compare-metric-label">
                                        Stability
                                    </span>
                                    <span className="compare-metric-value">
                                        {compare?.left.stabilityPairwiseMean !=
                                        null
                                            ? compare.left.stabilityPairwiseMean.toFixed(
                                                  3,
                                              )
                                            : "—"}
                                    </span>
                                </div>
                            </div>
                            <ModeSizeBar modeSizes={left.payload.modeSizes} />
                            <Link
                                href={`/benchmarks/${left.id}`}
                                className="button secondary"
                                style={{ marginTop: "1rem" }}
                            >
                                View details
                            </Link>
                        </>
                    )}
                </div>

                <div
                    className={`compare-panel compare-panel-right ${!right ? "compare-panel-empty" : ""}`}
                >
                    <h2 style={{ marginTop: 0 }}>Right</h2>
                    {!right ? (
                        <p className="muted">No right benchmark selected.</p>
                    ) : (
                        <>
                            <div className="compare-panel-header">
                                <Link
                                    href={`/benchmarks/${right.id}`}
                                    className="compare-panel-link"
                                >
                                    {right.id}
                                </Link>
                                <span className="small muted">
                                    {new Date(
                                        right.metadata.createdAt,
                                    ).toLocaleString()}
                                </span>
                            </div>
                            <div className="compare-panel-question">
                                <TruncateText
                                    text={right.question}
                                    maxLength={150}
                                    lines={3}
                                />
                            </div>
                            <div className="compare-panel-metrics">
                                <div className="compare-metric">
                                    <span className="compare-metric-label">
                                        Runs
                                    </span>
                                    <span className="compare-metric-value">
                                        {right.payload.runs}
                                    </span>
                                </div>
                                <div className="compare-metric">
                                    <span className="compare-metric-label">
                                        Modes
                                    </span>
                                    <span className="compare-metric-value">
                                        {right.payload.modeCount}
                                    </span>
                                </div>
                                <div className="compare-metric">
                                    <span className="compare-metric-label">
                                        Entropy
                                    </span>
                                    <span className="compare-metric-value">
                                        {right.payload.divergenceEntropy.toFixed(
                                            3,
                                        )}
                                    </span>
                                </div>
                                <div className="compare-metric">
                                    <span className="compare-metric-label">
                                        Stability
                                    </span>
                                    <span className="compare-metric-value">
                                        {compare?.right.stabilityPairwiseMean !=
                                        null
                                            ? compare.right.stabilityPairwiseMean.toFixed(
                                                  3,
                                              )
                                            : "—"}
                                    </span>
                                </div>
                            </div>
                            <ModeSizeBar modeSizes={right.payload.modeSizes} />
                            <Link
                                href={`/benchmarks/${right.id}`}
                                className="button secondary"
                                style={{ marginTop: "1rem" }}
                            >
                                View details
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {left && right && compare ? (
                <div className="stack">
                    <div className="card compare-delta-card">
                        <h2 style={{ marginTop: 0 }}>Delta summary</h2>
                        <p
                            className="small muted"
                            style={{ marginBottom: "1rem" }}
                        >
                            right − left
                        </p>
                        <div className="compare-delta-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Metric</th>
                                        <th>Left</th>
                                        <th>Right</th>
                                        <th>Delta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Runs</td>
                                        <td>{left.payload.runs}</td>
                                        <td>{right.payload.runs}</td>
                                        <td
                                            className={`compare-delta-cell ${compare.delta.runs > 0 ? "compare-delta-pos" : compare.delta.runs < 0 ? "compare-delta-neg" : ""}`}
                                        >
                                            {formatDelta(compare.delta.runs)}
                                        </td>
                                    </tr>
                                    <CompareMetricRow
                                        label="Answer mode count"
                                        leftValue={compare.left.modeCount}
                                        rightValue={compare.right.modeCount}
                                        delta={compare.delta.modeCount}
                                        digits={0}
                                    />
                                    <CompareMetricRow
                                        label="Answer divergence entropy"
                                        leftValue={
                                            compare.left.divergenceEntropy
                                        }
                                        rightValue={
                                            compare.right.divergenceEntropy
                                        }
                                        delta={compare.delta.divergenceEntropy}
                                    />
                                    <CompareMetricRow
                                        label="Answer stability mean"
                                        leftValue={
                                            compare.left.stabilityPairwiseMean
                                        }
                                        rightValue={
                                            compare.right.stabilityPairwiseMean
                                        }
                                        delta={
                                            compare.delta.stabilityPairwiseMean
                                        }
                                    />
                                    {showClaimCentroid ? (
                                        <>
                                            <CompareMetricRow
                                                label="Claim-centroid mode count"
                                                leftValue={
                                                    compare.left.claimModeCount
                                                }
                                                rightValue={
                                                    compare.right.claimModeCount
                                                }
                                                delta={
                                                    compare.delta.claimModeCount
                                                }
                                                digits={0}
                                            />
                                            <CompareMetricRow
                                                label="Claim-centroid entropy"
                                                leftValue={
                                                    compare.left
                                                        .claimDivergenceEntropy
                                                }
                                                rightValue={
                                                    compare.right
                                                        .claimDivergenceEntropy
                                                }
                                                delta={
                                                    compare.delta
                                                        .claimDivergenceEntropy
                                                }
                                            />
                                            <CompareMetricRow
                                                label="Claim-centroid stability"
                                                leftValue={
                                                    compare.left
                                                        .claimStabilityPairwiseMean
                                                }
                                                rightValue={
                                                    compare.right
                                                        .claimStabilityPairwiseMean
                                                }
                                                delta={
                                                    compare.delta
                                                        .claimStabilityPairwiseMean
                                                }
                                            />
                                            <CompareMetricRow
                                                label="Answer − claim mode delta"
                                                leftValue={
                                                    compare.left.modeCountDelta
                                                }
                                                rightValue={
                                                    compare.right.modeCountDelta
                                                }
                                                delta={
                                                    compare.delta.modeCountDelta
                                                }
                                                digits={0}
                                            />
                                        </>
                                    ) : null}
                                    {showSummary ? (
                                        <>
                                            <CompareMetricRow
                                                label="Consensus mean"
                                                leftValue={
                                                    compare.left.consensusMean
                                                }
                                                rightValue={
                                                    compare.right.consensusMean
                                                }
                                                delta={
                                                    compare.delta.consensusMean
                                                }
                                            />
                                            <CompareMetricRow
                                                label="Critique severity mean"
                                                leftValue={
                                                    compare.left.critiqueMean
                                                }
                                                rightValue={
                                                    compare.right.critiqueMean
                                                }
                                                delta={
                                                    compare.delta.critiqueMean
                                                }
                                            />
                                        </>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <CompareDeltaChart
                        leftLabel={leftLabel}
                        rightLabel={rightLabel}
                        rows={[
                            {
                                metric: "modeCount",
                                left: compare.left.modeCount,
                                right: compare.right.modeCount,
                            },
                            {
                                metric: "entropy",
                                left: compare.left.divergenceEntropy,
                                right: compare.right.divergenceEntropy,
                            },
                            {
                                metric: "stability",
                                left: compare.left.stabilityPairwiseMean,
                                right: compare.right.stabilityPairwiseMean,
                            },
                            ...(showClaimCentroid
                                ? [
                                      {
                                          metric: "claimModes",
                                          left: compare.left.claimModeCount,
                                          right: compare.right.claimModeCount,
                                      },
                                      {
                                          metric: "claimEntropy",
                                          left: compare.left
                                              .claimDivergenceEntropy,
                                          right: compare.right
                                              .claimDivergenceEntropy,
                                      },
                                  ]
                                : []),
                        ]}
                    />
                </div>
            ) : null}
        </section>
    );
}
