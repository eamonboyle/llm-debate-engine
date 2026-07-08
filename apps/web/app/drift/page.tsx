import type { Metadata } from "next";
import Link from "next/link";
import { CritiqueConfidenceScatter } from "../../components/charts/CritiqueConfidenceScatter";
import { InsightFilterCard } from "../../components/InsightFilterCard";
import { MetricCard } from "../../components/MetricCard";
import { StaleIndexBanner } from "../../components/StaleIndexBanner";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { loadAnalysisIndex, loadRunArtifacts } from "../../lib/data";
import {
    buildConfidenceDriftRows,
    summarizeConfidenceDrift,
} from "../../lib/confidenceDrift";
import { applyIndexFilters, collectIndexFacets } from "../../lib/indexFilters";
import { buildQueryString } from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Confidence drift",
};

type DriftSearchParams = {
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};

function formatDelta(value: number | undefined) {
    return typeof value === "number" ? value.toFixed(3) : "—";
}

export default async function ConfidenceDriftPage({
    searchParams,
}: {
    searchParams: Promise<DriftSearchParams>;
}) {
    const params = await searchParams;
    const [rawIndex, allRuns] = await Promise.all([
        loadAnalysisIndex(),
        loadRunArtifacts(),
    ]);

    if (!rawIndex) {
        return (
            <section className="stack">
                <h1 className="title">Confidence drift</h1>
                <p className="subtitle">
                    Per-run confidence deltas require an analysis index. Run{" "}
                    <code>pnpm analyze</code> after adding run artifacts.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const { models, presets } = collectIndexFacets(rawIndex);
    const index = applyIndexFilters(rawIndex, params);
    const summary = summarizeConfidenceDrift(index);
    const rows = buildConfidenceDriftRows(index, { runs: allRuns });
    const scatterPoints = rows
        .filter(
            (row) =>
                typeof row.maxSeverity === "number" &&
                typeof row.solverToRevisionDelta === "number",
        )
        .map((row) => ({
            runId: row.runId,
            maxSeverity: row.maxSeverity as number,
            solverToRevisionDelta: row.solverToRevisionDelta as number,
        }));

    return (
        <section className="stack">
            <StaleIndexBanner />
            <div>
                <h1 className="title">Confidence drift</h1>
                <p className="subtitle">
                    Stage-to-stage confidence movement across indexed runs —
                    sorted by combined drift magnitude.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/" className="button secondary">
                        Overview
                    </Link>
                    <Link href="/runs" className="button secondary">
                        All runs
                    </Link>
                    <Link href="/issues" className="button secondary">
                        Critique issues
                    </Link>
                </div>
            </div>

            <InsightFilterCard
                action="/drift"
                models={models}
                presets={presets}
                params={params}
                totalRuns={rawIndex.runs.length}
                filteredRuns={index.runs.length}
            />

            {rows.length > 0 ? (
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <a
                        href={`/api/drift${buildQueryString(params, {})}`}
                        className="button secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                    >
                        Export JSON
                    </a>
                    <a
                        href={`/api/drift${buildQueryString(params, {})}&format=csv`}
                        className="button secondary"
                        download="confidence-drift.csv"
                    >
                        Export CSV
                    </a>
                </div>
            ) : null}

            <div className="grid-4">
                <MetricCard label="Indexed runs" value={summary.runCount} />
                <MetricCard
                    label="Avg |Δ| (solver→revision)"
                    value={summary.solverToRevisionMean.toFixed(3)}
                    helpKey="solverToRevisionDelta"
                />
                <MetricCard
                    label="Avg revision→synth Δ"
                    value={summary.revisionToSynthesizerMean.toFixed(3)}
                    helpKey="revisionToSynthesizerDelta"
                />
                <MetricCard
                    label="Avg calibrated−synth Δ"
                    value={formatDelta(summary.calibratedMinusSynthMean)}
                    helpKey="calibratedMinusSynthDelta"
                />
                <MetricCard
                    label="corr(severity, solver→revision Δ)"
                    value={formatDelta(summary.severityVsSolverToRevision)}
                    helpKey="severityVsSolverToRevisionDelta"
                />
                <MetricCard
                    label="corr(severity, revision→synth Δ)"
                    value={formatDelta(summary.severityVsRevisionToSynthesizer)}
                    helpKey="severityVsRevisionToSynthesizerDelta"
                />
            </div>

            {scatterPoints.length > 0 ? (
                <CritiqueConfidenceScatter
                    points={scatterPoints}
                    hint="Filtered runs with both severity and solver→revision delta — click a point to open the trace."
                />
            ) : null}

            {rows.length === 0 ? (
                <div className="card">
                    <p className="muted">No runs in the analysis index.</p>
                </div>
            ) : (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Runs by drift magnitude</h2>
                    <ResponsiveTable
                        columns={[
                            { key: "runId", label: "Run ID" },
                            {
                                key: "question",
                                label: "Question",
                                cellClass: "cell-question",
                                render: (row) => (
                                    <TruncateText
                                        text={
                                            (row as { question: string })
                                                .question
                                        }
                                        maxLength={72}
                                        className="muted"
                                    />
                                ),
                            },
                            { key: "model", label: "Model", helpKey: "model" },
                            {
                                key: "maxSeverity",
                                label: "Max severity",
                                helpKey: "maxSeverity",
                            },
                            {
                                key: "solverToRevisionDelta",
                                label: "Solver→revision Δ",
                                helpKey: "solverToRevisionDelta",
                                render: (row) =>
                                    formatDelta(
                                        (
                                            row as {
                                                solverToRevisionDelta?: number;
                                            }
                                        ).solverToRevisionDelta,
                                    ),
                            },
                            {
                                key: "revisionToSynthesizerDelta",
                                label: "Revision→synth Δ",
                                helpKey: "revisionToSynthesizerDelta",
                                hideOnMobile: true,
                                render: (row) =>
                                    formatDelta(
                                        (
                                            row as {
                                                revisionToSynthesizerDelta?: number;
                                            }
                                        ).revisionToSynthesizerDelta,
                                    ),
                            },
                            {
                                key: "calibratedMinusSynthDelta",
                                label: "Calibrated−synth Δ",
                                helpKey: "calibratedMinusSynthDelta",
                                hideOnMobile: true,
                                render: (row) =>
                                    formatDelta(
                                        (
                                            row as {
                                                calibratedMinusSynthDelta?: number;
                                            }
                                        ).calibratedMinusSynthDelta,
                                    ),
                            },
                            {
                                key: "driftMagnitude",
                                label: "|Δ| sum",
                                hideOnMobile: true,
                                render: (row) => {
                                    const v = (
                                        row as { driftMagnitude: number | null }
                                    ).driftMagnitude;
                                    return v == null ? "—" : v.toFixed(3);
                                },
                            },
                            {
                                key: "trace",
                                label: "Open",
                                cellClass: "cell-actions",
                                render: (row) => (
                                    <Link
                                        href={
                                            (row as { traceHref: string })
                                                .traceHref
                                        }
                                    >
                                        Trace
                                    </Link>
                                ),
                            },
                            {
                                key: "compare",
                                label: "Compare",
                                hideOnMobile: true,
                                render: (row) => (
                                    <Link
                                        href={
                                            (row as { compareHref: string })
                                                .compareHref
                                        }
                                    >
                                        Compare
                                    </Link>
                                ),
                            },
                        ]}
                        data={rows.map((row) => ({
                            ...row,
                            maxSeverity:
                                row.maxSeverity != null
                                    ? String(row.maxSeverity)
                                    : "—",
                        }))}
                        getRowId={(row) => (row as { runId: string }).runId}
                        renderCardActions={(row) => (
                            <>
                                <Link
                                    href={
                                        (row as { traceHref: string }).traceHref
                                    }
                                    className="button"
                                >
                                    Trace
                                </Link>
                                <Link
                                    href={
                                        (row as { compareHref: string })
                                            .compareHref
                                    }
                                    className="button secondary"
                                >
                                    Compare
                                </Link>
                            </>
                        )}
                    />
                </div>
            )}
        </section>
    );
}
