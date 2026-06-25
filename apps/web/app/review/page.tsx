import type { Metadata } from "next";
import Link from "next/link";
import { InsightFilterCard } from "../../components/InsightFilterCard";
import { MetricCard } from "../../components/MetricCard";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { loadAnalysisIndex } from "../../lib/data";
import { applyIndexFilters, collectIndexFacets } from "../../lib/indexFilters";
import { buildQueryString } from "../../lib/listPagination";
import { buildOutlierExplorerRows } from "../../lib/outlierExplorer";
import {
    buildReviewQueue,
    reviewReasonLabel,
    summarizeReviewQueue,
} from "../../lib/reviewQueue";

export const metadata: Metadata = {
    title: "Review queue",
};

type ReviewSearchParams = {
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};

export default async function ReviewQueuePage({
    searchParams,
}: {
    searchParams: Promise<ReviewSearchParams>;
}) {
    const params = await searchParams;
    const rawIndex = await loadAnalysisIndex();

    if (!rawIndex) {
        return (
            <section className="stack">
                <h1 className="title">Review queue</h1>
                <p className="subtitle">
                    Flagged runs require an analysis index. Run{" "}
                    <code>pnpm analyze</code> after adding run and benchmark
                    artifacts.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const { models, presets } = collectIndexFacets(rawIndex);
    const index = applyIndexFilters(rawIndex, params);
    const outlierRows = await buildOutlierExplorerRows(index);
    const outlierPeerCompare = new Map(
        outlierRows.map((row) => [row.runId, row.peerRunId]),
    );
    const items = buildReviewQueue(index, { outlierPeerCompare });
    const summary = summarizeReviewQueue(items);

    return (
        <section className="stack">
            <div>
                <h1 className="title">Review queue</h1>
                <p className="subtitle">
                    Runs that may need a closer look — benchmark outliers, high
                    critique pressure, and weak judge rubric scores.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/outliers" className="button secondary">
                        Outlier explorer
                    </Link>
                    <Link href="/quality" className="button secondary">
                        Quality insights
                    </Link>
                    <Link href="/issues" className="button secondary">
                        Critique issues
                    </Link>
                </div>
            </div>

            <InsightFilterCard
                action="/review"
                models={models}
                presets={presets}
                params={params}
                totalRuns={rawIndex.runs.length}
                filteredRuns={index.runs.length}
            />

            {items.length > 0 ? (
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <a
                        href={`/api/review${buildQueryString(params, {})}`}
                        className="button secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                    >
                        Export JSON
                    </a>
                    <a
                        href={`/api/review${buildQueryString(params, {})}&format=csv`}
                        className="button secondary"
                        download="review-queue.csv"
                    >
                        Export CSV
                    </a>
                </div>
            ) : null}

            <div className="grid-4">
                <MetricCard
                    label="Flagged runs"
                    value={summary.totalFlagged}
                    helper={`of ${index.runs.length} indexed`}
                />
                <MetricCard
                    label="Benchmark outliers"
                    value={summary.outlierCount}
                />
                <MetricCard
                    label="High critique pressure"
                    value={summary.highIssueCount}
                    helpKey="issueCount"
                />
                <MetricCard
                    label="Quality concerns"
                    value={summary.factualRiskCount + summary.lowCoherenceCount}
                    helper="factual risk or low coherence"
                />
            </div>

            <div className="card">
                {items.length === 0 ? (
                    <p className="muted">
                        No runs matched review heuristics for the current
                        filters. Try broadening filters or adding more indexed
                        experiments.
                    </p>
                ) : (
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
                            {
                                key: "model",
                                label: "Model",
                                helpKey: "model",
                            },
                            {
                                key: "preset",
                                label: "Preset",
                                helpKey: "preset",
                            },
                            {
                                key: "reasons",
                                label: "Reasons",
                                render: (row) => (
                                    <span className="review-reason-list">
                                        {(
                                            row as {
                                                reasonLabels: string[];
                                            }
                                        ).reasonLabels.join(" · ")}
                                    </span>
                                ),
                            },
                            {
                                key: "priority",
                                label: "Priority",
                                hideOnMobile: true,
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
                                render: (row) => {
                                    const href = (
                                        row as {
                                            peerCompareHref: string | null;
                                        }
                                    ).peerCompareHref;
                                    return href ? (
                                        <Link href={href}>To peer</Link>
                                    ) : (
                                        <span className="muted">—</span>
                                    );
                                },
                            },
                        ]}
                        data={items.map((item) => ({
                            runId: item.runId,
                            question: item.question,
                            model: item.model,
                            preset: item.preset,
                            priority: item.priority,
                            reasonLabels: item.reasons.map(reviewReasonLabel),
                            traceHref: item.traceHref,
                            peerCompareHref: item.peerCompareHref,
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
                                    View trace
                                </Link>
                                {(row as { peerCompareHref: string | null })
                                    .peerCompareHref ? (
                                    <Link
                                        href={
                                            (
                                                row as {
                                                    peerCompareHref: string;
                                                }
                                            ).peerCompareHref
                                        }
                                        className="button secondary"
                                    >
                                        Compare to peer
                                    </Link>
                                ) : null}
                            </>
                        )}
                    />
                )}
            </div>
        </section>
    );
}
