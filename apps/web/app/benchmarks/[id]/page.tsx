import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    loadBenchmarkById,
    loadBenchmarkPairsById,
    loadAnalysisIndex,
} from "../../../lib/data";
import {
    buildBenchmarkRunRoster,
    sortBenchmarkRunRoster,
} from "../../../lib/benchmarkRunRoster";
import { MetricCard } from "../../../components/MetricCard";
import { InfoTooltip } from "../../../components/InfoTooltip";
import { ModeSizeBar } from "../../../components/benchmark/ModeSizeBar";
import { BenchmarkDetailCharts } from "../../../components/charts/BenchmarkDetailCharts";
import { ResponsiveTable } from "../../../components/ResponsiveTable";
import { TruncateText } from "../../../components/ResponsiveTable";
import { findMostSimilarPeerRunId } from "../../../lib/benchmarkPeers";
import { inferModeLabel } from "../../../lib/modeLabeler";
import {
    buildBenchmarkIndexLookup,
    resolveIndexedModeLabel,
} from "../../../lib/benchmarkIndexLookup";
import {
    buildBenchmarkOutlierLookup,
    outliersBenchmarkHref,
} from "../../../lib/outlierLookup";
import { questionHubHref } from "../../../lib/questionGroups";
import {
    extractBenchmarkSummaryDisplay,
    formatSummaryMetric,
} from "../../../lib/benchmarkSummaryMetrics";
import {
    extractClaimCentroidDisplay,
    formatClaimCentroidComparison,
} from "../../../lib/claimCentroidMetrics";
import { DownloadArtifactLink } from "../../../components/DownloadArtifactLink";
import { CopyPageLink } from "../../../components/CopyPageLink";
import { RecentViewsTracker } from "../../../components/RecentViewsTracker";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const benchmark = await loadBenchmarkById(id);
    const title = benchmark
        ? `${benchmark.question.slice(0, 50)}${benchmark.question.length > 50 ? "…" : ""}`
        : id;
    return { title: `Benchmark: ${title}` };
}

export default async function BenchmarkDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [benchmark, index] = await Promise.all([
        loadBenchmarkById(id),
        loadAnalysisIndex(),
    ]);

    if (!benchmark) {
        notFound();
    }

    const benchmarkIndex = index
        ? buildBenchmarkIndexLookup(index).get(benchmark.id)
        : null;
    const outlierLookup = buildBenchmarkOutlierLookup(index, benchmark.id);
    const outlierCount = outlierLookup.size;

    const runIds = benchmark.payload.runIds ?? [];
    const pairsData = await loadBenchmarkPairsById(id);
    const pairs =
        pairsData.pairs.length > 0
            ? pairsData.pairs
            : (benchmark.payload.summary?.stability?.pairs ?? []);
    const rosterRunIds =
        pairsData.runIds.length > 0 ? pairsData.runIds : runIds;
    const runRoster = sortBenchmarkRunRoster(
        buildBenchmarkRunRoster({
            runIds: rosterRunIds,
            pairs,
            modes: benchmark.payload.modes,
        }),
    ).map((row) => {
        const peerRunId = findMostSimilarPeerRunId(
            row.runId,
            rosterRunIds,
            pairs,
        );
        return {
            ...row,
            peerRunId,
            peerCompareHref: peerRunId
                ? `/runs/compare?left=${row.runId}&right=${peerRunId}`
                : null,
            outlier: outlierLookup.get(row.runId) ?? null,
        };
    });
    const thresholdCounts = [
        { threshold: "0.8", modeCount: benchmark.payload.modeCountAt0_8 ?? 0 },
        { threshold: "0.9", modeCount: benchmark.payload.modeCountAt0_9 ?? 0 },
        {
            threshold: "0.95",
            modeCount: benchmark.payload.modeCountAt0_95 ?? 0,
        },
    ];
    const modes = benchmark.payload.modes ?? [];
    const summaryDisplay = extractBenchmarkSummaryDisplay(benchmark);
    const claimCentroidDisplay = extractClaimCentroidDisplay(benchmark);
    const benchmarkTitle = `${benchmark.question.slice(0, 80)}${benchmark.question.length > 80 ? "…" : ""}`;

    return (
        <section className="stack">
            <RecentViewsTracker
                id={benchmark.id}
                kind="benchmark"
                href={`/benchmarks/${benchmark.id}`}
                title={benchmarkTitle}
            />
            <div>
                <h1 className="title">Benchmark detail</h1>
                <p className="subtitle">
                    {benchmark.id} ·{" "}
                    {new Date(benchmark.metadata.createdAt).toLocaleString()}
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <DownloadArtifactLink
                        href={`/api/benchmarks/${benchmark.id}?download=1`}
                        filename={`${benchmark.id}.json`}
                    />
                    <CopyPageLink />
                    <Link
                        href={questionHubHref(benchmark.question)}
                        className="button secondary"
                    >
                        Question hub
                    </Link>
                    <Link
                        href={`/benchmarks?q=${encodeURIComponent(benchmark.question)}`}
                        className="button secondary"
                    >
                        All benchmarks for question
                    </Link>
                    <Link
                        href={`/benchmarks/compare?left=${benchmark.id}`}
                        className="button secondary"
                    >
                        Compare as left
                    </Link>
                    <Link
                        href={`/benchmarks/compare?right=${benchmark.id}`}
                        className="button secondary"
                    >
                        Compare as right
                    </Link>
                    <Link
                        href={`/pairs?benchmark=${benchmark.id}`}
                        className="button secondary"
                    >
                        Pairwise explorer
                    </Link>
                    {outlierCount > 0 ? (
                        <Link
                            href={outliersBenchmarkHref(benchmark.id)}
                            className="button secondary"
                        >
                            Outlier runs ({outlierCount})
                        </Link>
                    ) : null}
                </div>
            </div>

            <div className="grid-4">
                <div className="card">
                    <div className="metric-label small muted">Question</div>
                    <div
                        style={{ marginTop: 6 }}
                        className="benchmark-question"
                    >
                        {benchmark.question}
                    </div>
                </div>
                <MetricCard
                    label="Runs"
                    value={benchmark.payload.runs}
                    helpKey="runs"
                />
                <MetricCard
                    label="Mode count"
                    value={benchmark.payload.modeCount}
                    helpKey="modeCount"
                />
                <MetricCard
                    label="Divergence entropy"
                    value={benchmark.payload.divergenceEntropy}
                    helpKey="divergenceEntropy"
                />
                {typeof benchmark.payload.threshold === "number" ? (
                    <MetricCard
                        label="Cluster threshold"
                        value={benchmark.payload.threshold.toFixed(2)}
                        helpKey="benchmarkThreshold"
                    />
                ) : null}
            </div>

            {summaryDisplay.hasAny ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>
                        Run-level aggregates
                        <InfoTooltip helpKey="benchmarkRunAggregates" />
                    </h2>
                    <p className="small muted" style={{ marginBottom: "1rem" }}>
                        Mean and spread of per-run metrics across all members of
                        this benchmark — consensus strength, critique severity,
                        and answer stability.
                    </p>
                    <div className="grid-4">
                        <MetricCard
                            label="Consensus mean"
                            value={formatSummaryMetric(
                                summaryDisplay.consensusMean,
                            )}
                            helper={
                                summaryDisplay.consensusStddev != null
                                    ? `σ ${formatSummaryMetric(summaryDisplay.consensusStddev)}`
                                    : undefined
                            }
                            helpKey="consensusStrength"
                        />
                        <MetricCard
                            label="Critique severity mean"
                            value={formatSummaryMetric(
                                summaryDisplay.critiqueMean,
                                1,
                            )}
                            helper={
                                summaryDisplay.critiqueStddev != null
                                    ? `σ ${formatSummaryMetric(summaryDisplay.critiqueStddev, 2)}`
                                    : undefined
                            }
                            helpKey="maxSeverity"
                        />
                        <MetricCard
                            label="Stability mean"
                            value={formatSummaryMetric(
                                summaryDisplay.stabilityMean,
                            )}
                            helper={
                                summaryDisplay.stabilityStddev != null
                                    ? `σ ${formatSummaryMetric(summaryDisplay.stabilityStddev)}`
                                    : undefined
                            }
                            helpKey="stabilityPairwiseMean"
                        />
                        <MetricCard
                            label="Stability range"
                            value={
                                summaryDisplay.stabilityMin != null &&
                                summaryDisplay.stabilityMax != null
                                    ? `${formatSummaryMetric(summaryDisplay.stabilityMin)} – ${formatSummaryMetric(summaryDisplay.stabilityMax)}`
                                    : "—"
                            }
                            helper="min–max pairwise similarity"
                            helpKey="stabilityPairwiseMean"
                        />
                    </div>
                </div>
            ) : null}

            <div className="card benchmark-mode-structure">
                <h2 style={{ marginTop: 0 }}>
                    Mode structure
                    <InfoTooltip helpKey="modeStructure" />
                </h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Distribution of runs across discovered answer modes
                    (answer-embedding clustering)
                </p>
                <ModeSizeBar modeSizes={benchmark.payload.modeSizes} />
            </div>

            {claimCentroidDisplay.hasClaimCentroid ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>
                        Claim-centroid clustering
                        <InfoTooltip helpKey="claimCentroidComparison" />
                    </h2>
                    <p className="small muted" style={{ marginBottom: "1rem" }}>
                        Compares answer-embedding modes (above) with
                        claim-centroid clustering — groups runs by underlying
                        claim structure rather than final-answer wording.
                    </p>
                    <div className="grid-4">
                        <MetricCard
                            label="Mode count"
                            value={formatClaimCentroidComparison(
                                claimCentroidDisplay.answerModeCount,
                                claimCentroidDisplay.modeCount,
                                0,
                            )}
                            helpKey="modeCountClaimCentroid"
                        />
                        <MetricCard
                            label="Divergence entropy"
                            value={formatClaimCentroidComparison(
                                claimCentroidDisplay.answerDivergenceEntropy,
                                claimCentroidDisplay.divergenceEntropy,
                            )}
                            helpKey="divergenceEntropyClaimCentroid"
                        />
                        <MetricCard
                            label="Stability mean"
                            value={formatSummaryMetric(
                                claimCentroidDisplay.stabilityPairwiseMean,
                            )}
                            helper={
                                claimCentroidDisplay.stabilityMin != null &&
                                claimCentroidDisplay.stabilityMax != null
                                    ? `${formatSummaryMetric(claimCentroidDisplay.stabilityMin)} – ${formatSummaryMetric(claimCentroidDisplay.stabilityMax)}`
                                    : undefined
                            }
                            helpKey="stabilityClaimCentroid"
                        />
                        <MetricCard
                            label="Mode count delta"
                            value={
                                claimCentroidDisplay.modeCountDelta == null
                                    ? "—"
                                    : claimCentroidDisplay.modeCountDelta > 0
                                      ? `+${claimCentroidDisplay.modeCountDelta}`
                                      : String(
                                            claimCentroidDisplay.modeCountDelta,
                                        )
                            }
                            helper="answer modes minus claim modes"
                            helpKey="claimCentroidComparison"
                        />
                    </div>
                    {claimCentroidDisplay.modeSizes ? (
                        <div style={{ marginTop: "1.25rem" }}>
                            <div
                                className="small muted"
                                style={{ marginBottom: 8 }}
                            >
                                Claim-centroid mode sizes
                            </div>
                            <ModeSizeBar
                                modeSizes={claimCentroidDisplay.modeSizes}
                            />
                        </div>
                    ) : null}
                    <div style={{ marginTop: "1.25rem" }}>
                        <div
                            className="small muted"
                            style={{ marginBottom: 8 }}
                        >
                            Threshold sensitivity (claim-centroid)
                            <InfoTooltip helpKey="thresholdSensitivity" />
                        </div>
                        <div className="grid-4">
                            {claimCentroidDisplay.thresholdCounts.map((row) => (
                                <MetricCard
                                    key={row.threshold}
                                    label={`Modes @ ${row.threshold}`}
                                    value={row.modeCount}
                                    helpKey="thresholdSensitivity"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            <BenchmarkDetailCharts
                benchmarkId={benchmark.id}
                modeSizes={benchmark.payload.modeSizes}
                thresholdCounts={thresholdCounts}
                similarityPairs={pairs}
                runs={benchmark.payload.runs}
                runIds={rosterRunIds}
            />

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Member runs</h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Each row is a run in this benchmark. Average similarity is
                    the mean pairwise score against other runs when stability
                    pairs are available. Sorted lowest similarity first to
                    highlight divergent members.
                </p>
                {runRoster.length === 0 ? (
                    <p className="muted">No member run IDs in this artifact.</p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "runIndex", label: "#" },
                            {
                                key: "runId",
                                label: "Run ID",
                                render: (row) => (
                                    <Link
                                        href={`/runs/${(row as { runId: string }).runId}`}
                                    >
                                        <code className="small">
                                            {(
                                                row as { runId: string }
                                            ).runId.slice(-20)}
                                        </code>
                                    </Link>
                                ),
                            },
                            {
                                key: "modeIndex",
                                label: "Mode",
                                render: (row) => {
                                    const mode = (
                                        row as { modeIndex: number | null }
                                    ).modeIndex;
                                    return mode == null ? "—" : String(mode);
                                },
                            },
                            {
                                key: "avgSimilarity",
                                label: "Avg similarity",
                                helpKey: "avgSimilarity",
                                render: (row) => {
                                    const value = (
                                        row as { avgSimilarity: number | null }
                                    ).avgSimilarity;
                                    return value == null
                                        ? "—"
                                        : value.toFixed(3);
                                },
                            },
                            {
                                key: "outlier",
                                label: "Outlier",
                                helpKey: "zScore",
                                hideOnMobile: true,
                                render: (row) => {
                                    const outlier = (
                                        row as {
                                            outlier: {
                                                zScore: number;
                                            } | null;
                                        }
                                    ).outlier;
                                    if (!outlier) return "—";
                                    return (
                                        <span
                                            title={`z-score ${outlier.zScore.toFixed(2)}`}
                                        >
                                            Yes
                                        </span>
                                    );
                                },
                            },
                            {
                                key: "open",
                                label: "Open",
                                render: (row) => (
                                    <Link
                                        href={`/runs/${(row as { runId: string }).runId}`}
                                    >
                                        Trace
                                    </Link>
                                ),
                            },
                            {
                                key: "peer",
                                label: "Peer",
                                hideOnMobile: true,
                                render: (row) => {
                                    const peerCompareHref = (
                                        row as {
                                            peerCompareHref: string | null;
                                        }
                                    ).peerCompareHref;
                                    if (!peerCompareHref) return "—";
                                    return (
                                        <Link href={peerCompareHref}>
                                            Compare
                                        </Link>
                                    );
                                },
                            },
                        ]}
                        data={runRoster}
                        getRowId={(row) => (row as { runId: string }).runId}
                        renderCardActions={(row) => {
                            const r = row as {
                                runId: string;
                                peerCompareHref: string | null;
                            };
                            return (
                                <>
                                    <Link
                                        href={`/runs/${r.runId}`}
                                        className="button"
                                    >
                                        View trace
                                    </Link>
                                    {r.peerCompareHref ? (
                                        <Link
                                            href={r.peerCompareHref}
                                            className="button secondary"
                                        >
                                            Compare peer
                                        </Link>
                                    ) : null}
                                </>
                            );
                        }}
                    />
                )}
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>
                    Mode explorer
                    <InfoTooltip helpKey="modeExplorer" />
                </h2>
                {modes.length === 0 ? (
                    <p className="muted">
                        No mode exemplars available in artifact.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "modeIndex", label: "Mode" },
                            { key: "label", label: "Label" },
                            { key: "size", label: "Size" },
                            {
                                key: "members",
                                label: "Members",
                                hideOnMobile: true,
                                render: (row) => (
                                    <span className="benchmark-members">
                                        {
                                            (
                                                row as {
                                                    memberLinks: React.ReactNode;
                                                }
                                            ).memberLinks
                                        }
                                    </span>
                                ),
                            },
                            {
                                key: "exemplarPreview",
                                label: "Exemplar preview",
                                cellClass: "cell-answer-preview",
                                hideOnMobile: true,
                                render: (row) => (
                                    <TruncateText
                                        text={
                                            (row as { exemplarPreview: string })
                                                .exemplarPreview
                                        }
                                        maxLength={120}
                                        lines={2}
                                        className="muted"
                                    />
                                ),
                            },
                            {
                                key: "previewMobile",
                                label: "Preview",
                                showOnlyOnMobile: true,
                                render: (row) => (
                                    <TruncateText
                                        text={
                                            (row as { exemplarPreview: string })
                                                .exemplarPreview
                                        }
                                        maxLength={80}
                                        className="muted"
                                    />
                                ),
                            },
                            {
                                key: "actions",
                                label: "",
                                cellClass: "cell-actions",
                                hideOnMobile: true,
                                render: (row) => {
                                    const r = row as {
                                        memberRunIds: string[];
                                    };
                                    return (
                                        <span className="benchmark-mode-actions">
                                            {r.memberRunIds
                                                .slice(0, 3)
                                                .map((runId) => (
                                                    <Link
                                                        key={runId}
                                                        href={`/runs/${runId}`}
                                                        className="button"
                                                        style={{
                                                            padding:
                                                                "0.3rem 0.5rem",
                                                            fontSize: "0.7rem",
                                                        }}
                                                    >
                                                        Trace
                                                    </Link>
                                                ))}
                                            {r.memberRunIds.length > 3 && (
                                                <span className="small muted">
                                                    +{r.memberRunIds.length - 3}
                                                </span>
                                            )}
                                        </span>
                                    );
                                },
                            },
                        ]}
                        data={modes.map((mode, idx) => ({
                            modeIndex: idx,
                            label: resolveIndexedModeLabel(
                                benchmarkIndex?.modeLabels ?? [],
                                idx,
                                inferModeLabel(mode.exemplarPreview),
                            ),
                            size: mode.size,
                            exemplarPreview: mode.exemplarPreview,
                            memberRunIds: mode.members
                                .map((i) => runIds[i])
                                .filter(Boolean),
                            memberLinks: (
                                <span className="benchmark-member-links">
                                    {mode.members
                                        .map((i) => runIds[i])
                                        .filter(Boolean)
                                        .slice(0, 5)
                                        .map((runId, i) => (
                                            <span key={runId}>
                                                {i > 0 && ", "}
                                                <Link href={`/runs/${runId}`}>
                                                    {runId.slice(-8)}
                                                </Link>
                                            </span>
                                        ))}
                                    {mode.members.length > 5 && (
                                        <span className="muted">
                                            {" "}
                                            +{mode.members.length - 5}
                                        </span>
                                    )}
                                </span>
                            ),
                        }))}
                        getRowId={(row) =>
                            `mode-${(row as { modeIndex: number }).modeIndex}`
                        }
                        renderCardActions={(row) => {
                            const r = row as { memberRunIds: string[] };
                            return (
                                <>
                                    {r.memberRunIds.slice(0, 3).map((runId) => (
                                        <Link
                                            key={runId}
                                            href={`/runs/${runId}`}
                                            className="button"
                                        >
                                            Trace {runId.slice(-8)}
                                        </Link>
                                    ))}
                                </>
                            );
                        }}
                    />
                )}
            </div>
        </section>
    );
}
