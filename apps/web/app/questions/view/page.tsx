import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ResponsiveTable,
    TruncateText,
} from "../../../components/ResponsiveTable";
import { CopyPageLink } from "../../../components/CopyPageLink";
import { MetricCard } from "../../../components/MetricCard";
import {
    loadAnalysisIndex,
    loadBenchmarksByQuestion,
    loadRunsByQuestion,
} from "../../../lib/data";
import { questionHubHref } from "../../../lib/questionGroups";
import { summarizeQuestionHubMetrics } from "../../../lib/questionHubMetrics";

export const metadata: Metadata = {
    title: "Question hub",
};

type QuestionViewSearchParams = {
    question?: string;
};

export default async function QuestionHubPage({
    searchParams,
}: {
    searchParams: Promise<QuestionViewSearchParams>;
}) {
    const params = await searchParams;
    const question = (params.question ?? "").trim();
    if (!question) {
        return (
            <section className="stack">
                <h1 className="title">Question hub</h1>
                <p className="subtitle">
                    Pick a question from the{" "}
                    <Link href="/questions">questions explorer</Link> to see all
                    runs and benchmarks for that topic.
                </p>
            </section>
        );
    }

    const [runs, benchmarks, index] = await Promise.all([
        loadRunsByQuestion(question),
        loadBenchmarksByQuestion(question),
        loadAnalysisIndex(),
    ]);
    const indexMetrics = index
        ? summarizeQuestionHubMetrics(index, question)
        : null;

    if (runs.length === 0 && benchmarks.length === 0) {
        notFound();
    }

    const models = [
        ...new Set([
            ...runs.map((r) => r.metadata.model),
            ...benchmarks.map((b) => b.metadata.model),
        ]),
    ].sort();
    const presets = [
        ...new Set([
            ...runs.map((r) => r.metadata.pipelinePreset),
            ...benchmarks.map((b) => b.metadata.pipelinePreset),
        ]),
    ].sort();
    const latestActivity = [
        runs[0]?.metadata.createdAt,
        benchmarks[0]?.metadata.createdAt,
    ]
        .filter(Boolean)
        .sort()
        .reverse()[0];

    const compareLeft = runs[0]?.id;
    const compareRight = runs[1]?.id;
    const benchmarkCompareLeft = benchmarks[0]?.id;
    const benchmarkCompareRight = benchmarks[1]?.id;

    return (
        <section className="stack">
            <div>
                <h1 className="title">Question hub</h1>
                <p className="subtitle">
                    All experiments for one research question — {runs.length}{" "}
                    run{runs.length === 1 ? "" : "s"}, {benchmarks.length}{" "}
                    benchmark{benchmarks.length === 1 ? "" : "s"}.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/questions" className="button secondary">
                        All questions
                    </Link>
                    <Link
                        href={`/runs?q=${encodeURIComponent(question)}`}
                        className="button secondary"
                    >
                        Filter runs list
                    </Link>
                    <Link
                        href={`/benchmarks?q=${encodeURIComponent(question)}`}
                        className="button secondary"
                    >
                        Filter benchmarks list
                    </Link>
                    {compareLeft && compareRight ? (
                        <Link
                            href={`/runs/compare?left=${compareLeft}&right=${compareRight}&question=${encodeURIComponent(question)}`}
                            className="button secondary"
                        >
                            Compare latest two runs
                        </Link>
                    ) : null}
                    {runs.length >= 2 ? (
                        <Link
                            href={`/runs/compare?question=${encodeURIComponent(question)}`}
                            className="button secondary"
                        >
                            Compare runs (picker)
                        </Link>
                    ) : null}
                    {benchmarkCompareLeft && benchmarkCompareRight ? (
                        <Link
                            href={`/benchmarks/compare?left=${benchmarkCompareLeft}&right=${benchmarkCompareRight}&question=${encodeURIComponent(question)}`}
                            className="button secondary"
                        >
                            Compare latest two benchmarks
                        </Link>
                    ) : null}
                    {benchmarks.length >= 2 ? (
                        <Link
                            href={`/benchmarks/compare?question=${encodeURIComponent(question)}`}
                            className="button secondary"
                        >
                            Compare benchmarks (picker)
                        </Link>
                    ) : null}
                </div>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>{question}</h2>
                <div className="grid-4" style={{ marginTop: "1rem" }}>
                    <div>
                        <div className="small muted">Models</div>
                        <div style={{ marginTop: 6 }}>
                            {models.length > 0 ? models.join(", ") : "—"}
                        </div>
                    </div>
                    <div>
                        <div className="small muted">Presets</div>
                        <div style={{ marginTop: 6 }}>
                            {presets.length > 0 ? presets.join(", ") : "—"}
                        </div>
                    </div>
                    <div>
                        <div className="small muted">Last activity</div>
                        <div style={{ marginTop: 6 }}>
                            {latestActivity
                                ? new Date(latestActivity).toLocaleString()
                                : "—"}
                        </div>
                    </div>
                    <div>
                        <div className="small muted">Share</div>
                        <div style={{ marginTop: 6 }}>
                            <CopyPageLink
                                path={questionHubHref(question)}
                                label="Copy URL"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {indexMetrics ? (
                <>
                    <div className="grid-4">
                        <MetricCard
                            label="Indexed runs"
                            value={indexMetrics.indexedRunCount}
                            helpKey="runArtifacts"
                        />
                        <MetricCard
                            label="Avg critique issues"
                            value={
                                indexMetrics.avgIssueCount == null
                                    ? "—"
                                    : indexMetrics.avgIssueCount.toFixed(1)
                            }
                            helpKey="issueCount"
                        />
                        <MetricCard
                            label="Avg solver confidence"
                            value={
                                indexMetrics.avgSolverConfidence == null
                                    ? "—"
                                    : indexMetrics.avgSolverConfidence.toFixed(
                                          2,
                                      )
                            }
                            helpKey="solverConfidence"
                        />
                        <MetricCard
                            label="Avg evidence risk"
                            value={
                                indexMetrics.avgEvidenceRisk == null
                                    ? "—"
                                    : indexMetrics.avgEvidenceRisk.toFixed(1)
                            }
                            helpKey="evidenceRiskLevel"
                        />
                    </div>
                    <div className="grid-4">
                        <MetricCard
                            label="Avg confidence drift"
                            value={
                                indexMetrics.avgSolverToRevisionDelta == null
                                    ? "—"
                                    : indexMetrics.avgSolverToRevisionDelta.toFixed(
                                          3,
                                      )
                            }
                            helpKey="solverToRevisionDelta"
                        />
                        <MetricCard
                            label="Avg judge coherence"
                            value={
                                indexMetrics.avgCoherence == null
                                    ? "—"
                                    : indexMetrics.avgCoherence.toFixed(2)
                            }
                            helpKey="coherence"
                        />
                        <MetricCard
                            label="Avg factual risk"
                            value={
                                indexMetrics.avgFactualRisk == null
                                    ? "—"
                                    : indexMetrics.avgFactualRisk.toFixed(2)
                            }
                            helpKey="factualRisk"
                        />
                        <MetricCard
                            label="Runs with quality scores"
                            value={indexMetrics.runsWithQualityScores}
                            helpKey="judgement"
                        />
                    </div>
                    <div
                        className="page-actions"
                        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                    >
                        <Link
                            href={`/drift?q=${encodeURIComponent(question)}`}
                            className="button secondary"
                        >
                            Drift for this question
                        </Link>
                        <Link
                            href={`/quality?q=${encodeURIComponent(question)}`}
                            className="button secondary"
                        >
                            Quality for this question
                        </Link>
                    </div>
                </>
            ) : null}

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Runs</h2>
                {runs.length === 0 ? (
                    <p className="muted">No runs for this question yet.</p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "id", label: "ID" },
                            {
                                key: "createdAt",
                                label: "Created",
                                render: (row) =>
                                    new Date(
                                        (row as { createdAt: string })
                                            .createdAt,
                                    ).toLocaleString(),
                            },
                            { key: "model", label: "Model" },
                            { key: "preset", label: "Preset" },
                            {
                                key: "preview",
                                label: "Final answer",
                                hideOnMobile: true,
                                render: (row) => (
                                    <TruncateText
                                        text={
                                            (row as { preview: string }).preview
                                        }
                                        maxLength={100}
                                        className="muted"
                                    />
                                ),
                            },
                            {
                                key: "open",
                                label: "Open",
                                render: (row) => (
                                    <Link
                                        href={`/runs/${(row as { id: string }).id}`}
                                    >
                                        Trace
                                    </Link>
                                ),
                            },
                        ]}
                        data={runs.map((run) => ({
                            id: run.id,
                            createdAt: run.metadata.createdAt,
                            model: run.metadata.model,
                            preset: run.metadata.pipelinePreset,
                            preview: run.run.finalAnswer,
                        }))}
                        getRowId={(row) => (row as { id: string }).id}
                        renderCardActions={(row) => (
                            <Link
                                href={`/runs/${(row as { id: string }).id}`}
                                className="button"
                            >
                                View trace
                            </Link>
                        )}
                    />
                )}
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Benchmarks</h2>
                {benchmarks.length === 0 ? (
                    <p className="muted">
                        No benchmarks for this question yet.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "id", label: "ID" },
                            {
                                key: "createdAt",
                                label: "Created",
                                render: (row) =>
                                    new Date(
                                        (row as { createdAt: string })
                                            .createdAt,
                                    ).toLocaleString(),
                            },
                            { key: "runs", label: "Runs" },
                            { key: "modeCount", label: "Modes" },
                            {
                                key: "entropy",
                                label: "Entropy",
                                render: (row) =>
                                    (
                                        row as { entropy: number }
                                    ).entropy.toFixed(3),
                            },
                            {
                                key: "open",
                                label: "Open",
                                render: (row) => (
                                    <Link
                                        href={`/benchmarks/${(row as { id: string }).id}`}
                                    >
                                        Details
                                    </Link>
                                ),
                            },
                        ]}
                        data={benchmarks.map((benchmark) => ({
                            id: benchmark.id,
                            createdAt: benchmark.metadata.createdAt,
                            runs: benchmark.payload.runs,
                            modeCount: benchmark.payload.modeCount,
                            entropy: benchmark.payload.divergenceEntropy,
                        }))}
                        getRowId={(row) => (row as { id: string }).id}
                        renderCardActions={(row) => (
                            <Link
                                href={`/benchmarks/${(row as { id: string }).id}`}
                                className="button"
                            >
                                View benchmark
                            </Link>
                        )}
                    />
                )}
            </div>
        </section>
    );
}
