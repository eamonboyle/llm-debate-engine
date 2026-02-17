import type { Metadata } from "next";
import Link from "next/link";
import { loadBenchmarkArtifacts, loadBenchmarksByIds } from "../../../lib/data";
import { CompareDeltaChart } from "../../../components/charts/CompareDeltaChart";
import { ModeSizeBar } from "../../../components/benchmark/ModeSizeBar";
import { buildBenchmarkComparePayload } from "../../../lib/benchmarkCompare";
import { TruncateText } from "../../../components/ResponsiveTable";

export const metadata: Metadata = {
    title: "Benchmark compare",
};

type CompareSearchParams = {
    left?: string;
    right?: string;
};

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
    const artifacts = await loadBenchmarkArtifacts();
    const selectedIds = [params.left, params.right].filter(
        (v): v is string => typeof v === "string" && v.length > 0,
    );
    const selected = await loadBenchmarksByIds(selectedIds);
    const left = selected.find((b) => b.id === params.left) ?? null;
    const right = selected.find((b) => b.id === params.right) ?? null;
    const compare =
        left && right ? buildBenchmarkComparePayload(left, right) : null;
    const leftLabel = left ? left.id.slice(-12) : "left";
    const rightLabel = right ? right.id.slice(-12) : "right";

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
                                    {artifact.id} · {artifact.question.slice(0, 60)}
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
                                    {artifact.id} · {artifact.question.slice(0, 60)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Compare
                    </button>
                    <Link href="/benchmarks/compare" className="button secondary">
                        Clear
                    </Link>
                </div>
            </form>

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
                        <p className="small muted" style={{ marginBottom: "1rem" }}>
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
                                    <tr>
                                        <td>Mode count</td>
                                        <td>{left.payload.modeCount}</td>
                                        <td>{right.payload.modeCount}</td>
                                        <td
                                            className={`compare-delta-cell ${compare.delta.modeCount > 0 ? "compare-delta-pos" : compare.delta.modeCount < 0 ? "compare-delta-neg" : ""}`}
                                        >
                                            {formatDelta(
                                                compare.delta.modeCount,
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Divergence entropy</td>
                                        <td>
                                            {left.payload.divergenceEntropy.toFixed(
                                                3,
                                            )}
                                        </td>
                                        <td>
                                            {right.payload.divergenceEntropy.toFixed(
                                                3,
                                            )}
                                        </td>
                                        <td
                                            className={`compare-delta-cell ${compare.delta.divergenceEntropy > 0 ? "compare-delta-pos" : compare.delta.divergenceEntropy < 0 ? "compare-delta-neg" : ""}`}
                                        >
                                            {formatDelta(
                                                compare.delta.divergenceEntropy,
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Stability mean</td>
                                        <td>
                                            {compare.left.stabilityPairwiseMean !=
                                            null
                                                ? compare.left.stabilityPairwiseMean.toFixed(
                                                      3,
                                                  )
                                                : "—"}
                                        </td>
                                        <td>
                                            {compare.right.stabilityPairwiseMean !=
                                            null
                                                ? compare.right.stabilityPairwiseMean.toFixed(
                                                      3,
                                                  )
                                                : "—"}
                                        </td>
                                        <td
                                            className={`compare-delta-cell ${typeof compare.delta.stabilityPairwiseMean === "number" ? (compare.delta.stabilityPairwiseMean > 0 ? "compare-delta-pos" : compare.delta.stabilityPairwiseMean < 0 ? "compare-delta-neg" : "") : ""}`}
                                        >
                                            {formatDelta(
                                                compare.delta.stabilityPairwiseMean,
                                            )}
                                        </td>
                                    </tr>
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
                        ]}
                    />
                </div>
            ) : null}
        </section>
    );
}
