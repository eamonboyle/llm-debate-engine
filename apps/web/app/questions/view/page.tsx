import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollapsibleFilterCard } from "../../../components/CollapsibleFilterCard";
import { ModelFilterSelect } from "../../../components/ModelFilterSelect";
import { PresetFilterSelect } from "../../../components/PresetFilterSelect";
import {
    ResponsiveTable,
    TruncateText,
} from "../../../components/ResponsiveTable";
import { CopyPageLink } from "../../../components/CopyPageLink";
import { MetricCard } from "../../../components/MetricCard";
import {
    filterBenchmarkArtifacts,
    filterRunArtifacts,
    loadAnalysisIndex,
    loadBenchmarksByQuestion,
    loadRunsByQuestion,
} from "../../../lib/data";
import { buildIndexRunLookup } from "../../../lib/indexRunLookup";
import { buildQueryString } from "../../../lib/listPagination";
import { questionHubHref } from "../../../lib/questionGroups";
import { summarizeQuestionHubMetrics } from "../../../lib/questionHubMetrics";

export const metadata: Metadata = {
    title: "Question hub",
};

type QuestionViewSearchParams = {
    question?: string;
    model?: string;
    preset?: string;
    fast?: string;
};

function formatMetric(value: number | null | undefined, digits = 1) {
    return typeof value === "number" ? value.toFixed(digits) : "—";
}

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

    const [allRuns, allBenchmarks, index] = await Promise.all([
        loadRunsByQuestion(question),
        loadBenchmarksByQuestion(question),
        loadAnalysisIndex(),
    ]);

    if (allRuns.length === 0 && allBenchmarks.length === 0) {
        notFound();
    }

    const artifactFilters = {
        model: params.model,
        preset: params.preset,
        fast: params.fast,
    };
    const runs = filterRunArtifacts(allRuns, artifactFilters);
    const benchmarks = filterBenchmarkArtifacts(allBenchmarks, artifactFilters);
    const indexLookup = index ? buildIndexRunLookup(index) : null;
    const indexMetrics = index
        ? summarizeQuestionHubMetrics(index, question)
        : null;
    const filtersActive = Boolean(params.model || params.preset || params.fast);
    const insightHref = (path: string) =>
        `${path}${buildQueryString({ q: question, ...artifactFilters }, {})}`;

    const models = [
        ...new Set([
            ...allRuns.map((r) => r.metadata.model),
            ...allBenchmarks.map((b) => b.metadata.model),
        ]),
    ].sort();
    const presets = [
        ...new Set([
            ...allRuns.map((r) => r.metadata.pipelinePreset),
            ...allBenchmarks.map((b) => b.metadata.pipelinePreset),
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
    const sharePath = `/questions/view${buildQueryString(
        { question, ...artifactFilters },
        {},
    )}`;

    return (
        <section className="stack">
            <div>
                <h1 className="title">Question hub</h1>
                <p className="subtitle">
                    All experiments for one research question — {runs.length}{" "}
                    run{runs.length === 1 ? "" : "s"}, {benchmarks.length}{" "}
                    benchmark{benchmarks.length === 1 ? "" : "s"}
                    {filtersActive
                        ? ` (filtered from ${allRuns.length} runs · ${allBenchmarks.length} benchmarks)`
                        : ""}
                    .
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

            <CollapsibleFilterCard
                summaryLabel="Hub filters"
                resultsSummary={
                    <>
                        {runs.length} runs · {benchmarks.length} benchmarks
                    </>
                }
            >
                <form method="get">
                    <input type="hidden" name="question" value={question} />
                    <div className="filter-grid">
                        <ModelFilterSelect
                            models={models}
                            defaultValue={params.model ?? ""}
                            listId="question-hub-model-filter"
                        />
                        <PresetFilterSelect
                            presets={presets}
                            defaultValue={params.preset ?? ""}
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
                            Apply filters
                        </button>
                        <Link
                            href={questionHubHref(question)}
                            className="button secondary"
                        >
                            Clear
                        </Link>
                    </div>
                </form>
            </CollapsibleFilterCard>

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
                            <CopyPageLink path={sharePath} label="Copy URL" />
                        </div>
                    </div>
                </div>
            </div>

            {index ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Insight shortcuts</h2>
                    <p className="small muted" style={{ marginBottom: 12 }}>
                        Open filtered insight pages scoped to this question.
                    </p>
                    <div
                        className="page-actions"
                        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                    >
                        <Link
                            href={insightHref("/quality")}
                            className="button secondary"
                        >
                            Quality
                        </Link>
                        <Link
                            href={insightHref("/drift")}
                            className="button secondary"
                        >
                            Confidence drift
                        </Link>
                        <Link
                            href={insightHref("/issues")}
                            className="button secondary"
                        >
                            Critique issues
                        </Link>
                        <Link
                            href={insightHref("/evidence")}
                            className="button secondary"
                        >
                            Evidence planning
                        </Link>
                        <Link
                            href={insightHref("/counterfactual")}
                            className="button secondary"
                        >
                            Counterfactual
                        </Link>
                        <Link
                            href={insightHref("/outliers")}
                            className="button secondary"
                        >
                            Outliers
                        </Link>
                    </div>
                </div>
            ) : null}

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
                            value={formatMetric(indexMetrics.avgIssueCount)}
                            helpKey="issueCount"
                        />
                        <MetricCard
                            label="Avg max severity"
                            value={formatMetric(indexMetrics.avgMaxSeverity)}
                            helpKey="maxSeverity"
                        />
                        <MetricCard
                            label="Avg solver confidence"
                            value={formatMetric(
                                indexMetrics.avgSolverConfidence,
                                2,
                            )}
                            helpKey="solverConfidence"
                        />
                    </div>
                    <div className="grid-4">
                        <MetricCard
                            label="Avg evidence risk"
                            value={formatMetric(indexMetrics.avgEvidenceRisk)}
                            helpKey="evidenceRiskLevel"
                        />
                        <MetricCard
                            label="Avg solver→revision Δ"
                            value={formatMetric(
                                indexMetrics.avgSolverToRevisionDelta,
                                2,
                            )}
                            helpKey="solverToRevisionDelta"
                        />
                        <MetricCard
                            label="Avg coherence"
                            value={formatMetric(indexMetrics.avgCoherence)}
                            helpKey="coherence"
                        />
                        <MetricCard
                            label="Avg factual risk"
                            value={formatMetric(indexMetrics.avgFactualRisk)}
                            helpKey="factualRisk"
                        />
                    </div>
                </>
            ) : null}

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Runs</h2>
                {runs.length === 0 ? (
                    <p className="muted">
                        No runs match the current hub filters.
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
                            { key: "model", label: "Model" },
                            { key: "preset", label: "Preset" },
                            {
                                key: "fast",
                                label: "Fast",
                                hideOnMobile: true,
                                render: (row) =>
                                    (row as { fast: boolean }).fast
                                        ? "yes"
                                        : "no",
                            },
                            ...(indexLookup
                                ? [
                                      {
                                          key: "issues",
                                          label: "Issues",
                                          hideOnMobile: true,
                                          render: (
                                              row: Record<string, unknown>,
                                          ) => {
                                              const value = (
                                                  row as { issues?: number }
                                              ).issues;
                                              return value == null
                                                  ? "—"
                                                  : value;
                                          },
                                      },
                                      {
                                          key: "severity",
                                          label: "Severity",
                                          hideOnMobile: true,
                                          render: (
                                              row: Record<string, unknown>,
                                          ) => {
                                              const value = (
                                                  row as { severity?: number }
                                              ).severity;
                                              return value == null
                                                  ? "—"
                                                  : value.toFixed(1);
                                          },
                                      },
                                      {
                                          key: "coherence",
                                          label: "Coherence",
                                          hideOnMobile: true,
                                          render: (
                                              row: Record<string, unknown>,
                                          ) => {
                                              const value = (
                                                  row as { coherence?: number }
                                              ).coherence;
                                              return value == null
                                                  ? "—"
                                                  : value.toFixed(1);
                                          },
                                      },
                                  ]
                                : []),
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
                        data={runs.map((run) => {
                            const indexed = indexLookup?.get(run.id);
                            return {
                                id: run.id,
                                createdAt: run.metadata.createdAt,
                                model: run.metadata.model,
                                preset: run.metadata.pipelinePreset,
                                fast: run.metadata.fastMode,
                                preview: run.run.finalAnswer,
                                issues: indexed?.issueCount,
                                severity: indexed?.maxSeverity,
                                coherence: indexed?.qualityCoherence,
                            };
                        })}
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
                        No benchmarks match the current hub filters.
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
                            {
                                key: "model",
                                label: "Model",
                                hideOnMobile: true,
                            },
                            {
                                key: "preset",
                                label: "Preset",
                                hideOnMobile: true,
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
                            model: benchmark.metadata.model,
                            preset: benchmark.metadata.pipelinePreset,
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
