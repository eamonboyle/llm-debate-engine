import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadBenchmarkById, loadBenchmarkPairsById } from "../../../lib/data";
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
import { questionHubHref } from "../../../lib/questionGroups";
import { DownloadArtifactLink } from "../../../components/DownloadArtifactLink";
import { CopyPageLink } from "../../../components/CopyPageLink";

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
    const benchmark = await loadBenchmarkById(id);

    if (!benchmark) {
        notFound();
    }

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

    return (
        <section className="stack">
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

            <div className="card benchmark-mode-structure">
                <h2 style={{ marginTop: 0 }}>
                    Mode structure
                    <InfoTooltip helpKey="modeStructure" />
                </h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Distribution of runs across discovered answer modes
                </p>
                <ModeSizeBar modeSizes={benchmark.payload.modeSizes} />
            </div>

            <BenchmarkDetailCharts
                benchmarkId={benchmark.id}
                modeSizes={benchmark.payload.modeSizes}
                thresholdCounts={thresholdCounts}
                similarityPairs={pairs}
                runs={benchmark.payload.runs}
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
                                        row as { peerCompareHref: string | null }
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
                            label: inferModeLabel(mode.exemplarPreview),
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
