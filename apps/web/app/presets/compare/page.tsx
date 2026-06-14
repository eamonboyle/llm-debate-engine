import type { Metadata } from "next";
import Link from "next/link";
import { CompareSwapLink } from "../../../components/CompareSwapLink";
import { MetricCard } from "../../../components/MetricCard";
import { PresetFilterSelect } from "../../../components/PresetFilterSelect";
import { loadAnalysisIndex } from "../../../lib/data";
import { collectIndexFacets } from "../../../lib/indexFilters";
import { buildPresetComparePayload } from "../../../lib/presetCompare";

export const metadata: Metadata = {
    title: "Compare presets",
};

type PresetCompareSearchParams = {
    left?: string;
    right?: string;
    fast?: string;
};

function resolveFastMode(value: string | undefined): boolean | undefined {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
}

function formatMetric(value: number | null, digits = 2) {
    return typeof value === "number" ? value.toFixed(digits) : "—";
}

function formatDelta(value: number | null, digits = 2) {
    if (typeof value !== "number") return "—";
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toFixed(digits)}`;
}

export default async function PresetComparePage({
    searchParams,
}: {
    searchParams: Promise<PresetCompareSearchParams>;
}) {
    const params = await searchParams;
    const fastMode = resolveFastMode(params.fast);
    const index = await loadAnalysisIndex();

    if (!index) {
        return (
            <section className="stack">
                <h1 className="title">Compare presets</h1>
                <p className="subtitle">
                    Preset comparison requires an analysis index. Run{" "}
                    <code>pnpm analyze</code> after adding run artifacts.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const { presets } = collectIndexFacets(index);
    const leftPreset = (params.left ?? "").trim();
    const rightPreset = (params.right ?? "").trim();
    const compare =
        leftPreset && rightPreset
            ? buildPresetComparePayload(index, leftPreset, rightPreset, {
                  fastMode,
              })
            : null;

    return (
        <section className="stack">
            <div>
                <h1 className="title">Compare presets</h1>
                <p className="subtitle">
                    Side-by-side averages from the preset leaderboard — useful
                    when evaluating pipeline depth vs. speed tradeoffs.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/presets" className="button secondary">
                        Preset leaderboard
                    </Link>
                    <Link href="/pipeline" className="button secondary">
                        Pipeline reference
                    </Link>
                    <Link
                        href="/leaderboard/compare"
                        className="button secondary"
                    >
                        Compare models
                    </Link>
                </div>
            </div>

            <form className="card" method="get">
                <div className="filter-grid">
                    <PresetFilterSelect
                        name="left"
                        presets={presets}
                        defaultValue={leftPreset}
                    />
                    <PresetFilterSelect
                        name="right"
                        presets={presets}
                        defaultValue={rightPreset}
                    />
                    <select
                        name="fast"
                        defaultValue={params.fast ?? ""}
                        className="input"
                    >
                        <option value="">Fast mode: any</option>
                        <option value="true">Fast only</option>
                        <option value="false">Non-fast only</option>
                    </select>
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Compare
                    </button>
                    {leftPreset && rightPreset ? (
                        <CompareSwapLink
                            basePath="/presets/compare"
                            left={leftPreset}
                            right={rightPreset}
                            extraParams={
                                fastMode !== undefined
                                    ? { fast: String(fastMode) }
                                    : undefined
                            }
                        />
                    ) : null}
                </div>
            </form>

            {!leftPreset || !rightPreset ? (
                <div className="card">
                    <p className="muted">
                        Pick two pipeline presets above to compare average
                        critique pressure, confidence drift, and judge rubric
                        scores.
                    </p>
                </div>
            ) : !compare ? (
                <div className="card">
                    <p className="muted">
                        Could not find both presets in the analysis index. Check
                        spelling or browse the{" "}
                        <Link href="/presets">preset leaderboard</Link>.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid-4">
                        <div className="card">
                            <div className="small muted">Left preset</div>
                            <div style={{ marginTop: 6, fontWeight: 600 }}>
                                {compare.left.preset}
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
                            <div className="small muted">Right preset</div>
                            <div style={{ marginTop: 6, fontWeight: 600 }}>
                                {compare.right.preset}
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
                            Delta = right minus left. Positive avg issues means
                            the right preset scores higher on critique pressure.
                        </p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>{compare.left.preset}</th>
                                    <th>{compare.right.preset}</th>
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
                                    <td>Avg coherence</td>
                                    <td>
                                        {formatMetric(
                                            compare.left.avgCoherence,
                                        )}
                                    </td>
                                    <td>
                                        {formatMetric(
                                            compare.right.avgCoherence,
                                        )}
                                    </td>
                                    <td>
                                        {formatDelta(
                                            compare.delta.avgCoherence,
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
                            label="Left coherence"
                            value={formatMetric(compare.left.avgCoherence)}
                            helpKey="coherence"
                        />
                        <MetricCard
                            label="Right coherence"
                            value={formatMetric(compare.right.avgCoherence)}
                            helpKey="coherence"
                        />
                    </div>
                </>
            )}
        </section>
    );
}
