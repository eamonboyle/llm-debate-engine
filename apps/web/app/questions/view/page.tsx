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
    loadBenchmarkArtifacts,
    loadBenchmarksByQuestion,
    loadRunArtifacts,
    loadRunsByQuestion,
} from "../../../lib/data";
import { buildQueryString } from "../../../lib/listPagination";
import {
    groupArtifactsByQuestion,
    questionHubHref,
    listQuestionInsightLinks,
} from "../../../lib/questionGroups";
import { buildTopQuestions } from "../../../lib/topQuestions";
import {
    buildQuestionExperimentMatrix,
    buildMatrixCellRunCompareHref,
    lookupMatrixCell,
} from "../../../lib/questionExperimentMatrix";
import {
    buildQuestionHubBenchmarkRows,
    buildQuestionHubRunRows,
    summarizeQuestionHubBenchmarkMetrics,
    summarizeQuestionHubMetrics,
} from "../../../lib/questionHubMetrics";
import { RecentViewsTracker } from "../../../components/RecentViewsTracker";

export const metadata: Metadata = {
    title: "Question hub",
};

type QuestionViewSearchParams = {
    question?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};

export default async function QuestionHubPage({
    searchParams,
}: {
    searchParams: Promise<QuestionViewSearchParams>;
}) {
    const params = await searchParams;
    const question = (params.question ?? "").trim();
    if (!question) {
        const [runs, benchmarks] = await Promise.all([
            loadRunArtifacts(),
            loadBenchmarkArtifacts(),
        ]);
        const topQuestions = buildTopQuestions(
            groupArtifactsByQuestion(runs, benchmarks),
            12,
        );

        return (
            <section className="stack">
                <div>
                    <h1 className="title">Question hub</h1>
                    <p className="subtitle">
                        Open a research question to compare every run and
                        benchmark on that topic — or browse the full{" "}
                        <Link href="/questions">questions explorer</Link>.
                    </p>
                    <div
                        className="page-actions"
                        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                    >
                        <Link href="/questions" className="button secondary">
                            All questions
                        </Link>
                        <Link href="/search" className="button secondary">
                            Search artifacts
                        </Link>
                    </div>
                </div>

                {topQuestions.length === 0 ? (
                    <div className="card">
                        <p className="muted" style={{ margin: 0 }}>
                            No questions yet. Run debate experiments locally,
                            then open the questions explorer once artifacts are
                            available.
                        </p>
                    </div>
                ) : (
                    <div className="card">
                        <h2 style={{ marginTop: 0 }}>
                            Popular research topics
                        </h2>
                        <p className="small muted" style={{ marginBottom: 12 }}>
                            Questions with the most runs and benchmarks in the
                            artifact store.
                        </p>
                        <ResponsiveTable
                            columns={[
                                {
                                    key: "question",
                                    label: "Question",
                                    cellClass: "cell-question",
                                    render: (row) => (
                                        <Link
                                            href={
                                                (row as { hubHref: string })
                                                    .hubHref
                                            }
                                        >
                                            <TruncateText
                                                text={
                                                    (
                                                        row as {
                                                            question: string;
                                                        }
                                                    ).question
                                                }
                                                maxLength={96}
                                            />
                                        </Link>
                                    ),
                                },
                                { key: "runCount", label: "Runs" },
                                { key: "benchmarkCount", label: "Benchmarks" },
                                {
                                    key: "totalExperiments",
                                    label: "Total",
                                },
                                {
                                    key: "latestCreatedAt",
                                    label: "Latest",
                                    hideOnMobile: true,
                                    render: (row) =>
                                        new Date(
                                            (
                                                row as {
                                                    latestCreatedAt: string;
                                                }
                                            ).latestCreatedAt,
                                        ).toLocaleString(),
                                },
                            ]}
                            data={topQuestions}
                            getRowId={(row) =>
                                (row as { question: string }).question
                            }
                            renderCardActions={(row) => (
                                <Link
                                    href={(row as { hubHref: string }).hubHref}
                                    className="button"
                                >
                                    Open hub
                                </Link>
                            )}
                        />
                    </div>
                )}
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

    const filterParams = {
        model: params.model,
        preset: params.preset,
        fast: params.fast,
        from: params.from,
        to: params.to,
    };
    const runs = filterRunArtifacts(allRuns, filterParams);
    const benchmarks = filterBenchmarkArtifacts(allBenchmarks, filterParams);
    const indexMetrics = index
        ? summarizeQuestionHubMetrics(index, question)
        : null;
    const benchmarkIndexMetrics = index
        ? summarizeQuestionHubBenchmarkMetrics(index, question)
        : null;
    const indexedRunRows = index
        ? buildQuestionHubRunRows(
              index,
              question,
              runs.map((run) => run.id),
          )
        : null;
    const indexedBenchmarkRows = index
        ? buildQuestionHubBenchmarkRows(
              index,
              question,
              benchmarks.map((benchmark) => benchmark.id),
          )
        : null;
    const experimentMatrix = buildQuestionExperimentMatrix(runs, benchmarks);

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
    const questionQuery: QuestionViewSearchParams = { question };

    const questionTitle = `${question.slice(0, 80)}${question.length > 80 ? "…" : ""}`;

    return (
        <section className="stack">
            <RecentViewsTracker
                id={question}
                kind="question"
                href={questionHubHref(question)}
                title={questionTitle}
            />
            <div>
                <h1 className="title">Question hub</h1>
                <p className="subtitle">
                    All experiments for one research question — {runs.length} of{" "}
                    {allRuns.length} run{allRuns.length === 1 ? "" : "s"},{" "}
                    {benchmarks.length} of {allBenchmarks.length} benchmark
                    {allBenchmarks.length === 1 ? "" : "s"}.
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
                summaryLabel="Experiment filters"
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
                        <input
                            type="datetime-local"
                            name="from"
                            defaultValue={params.from ?? ""}
                            className="input"
                            title="Created at or after"
                        />
                        <input
                            type="datetime-local"
                            name="to"
                            defaultValue={params.to ?? ""}
                            className="input"
                            title="Created at or before"
                        />
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
                            <CopyPageLink
                                path={`/questions/view${buildQueryString(
                                    questionQuery,
                                    {
                                        model: params.model,
                                        preset: params.preset,
                                        fast: params.fast,
                                        from: params.from,
                                        to: params.to,
                                    },
                                )}`}
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
                            label="Avg severity"
                            value={
                                indexMetrics.avgSeverity == null
                                    ? "—"
                                    : indexMetrics.avgSeverity.toFixed(2)
                            }
                            helpKey="avgSeverity"
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
                    {indexMetrics.runsWithQualityScores > 0 ? (
                        <div className="grid-4">
                            <MetricCard
                                label="Runs with judge scores"
                                value={indexMetrics.runsWithQualityScores}
                                helpKey="coherence"
                            />
                            <MetricCard
                                label="Avg coherence"
                                value={
                                    indexMetrics.avgCoherence == null
                                        ? "—"
                                        : indexMetrics.avgCoherence.toFixed(1)
                                }
                                helpKey="coherence"
                            />
                            <MetricCard
                                label="Avg factual risk"
                                value={
                                    indexMetrics.avgFactualRisk == null
                                        ? "—"
                                        : indexMetrics.avgFactualRisk.toFixed(1)
                                }
                                helpKey="factualRisk"
                            />
                        </div>
                    ) : null}
                    <div className="grid-4">
                        <MetricCard
                            label="Avg confidence drift"
                            value={
                                indexMetrics.avgSolverToRevisionDelta == null
                                    ? "—"
                                    : indexMetrics.avgSolverToRevisionDelta.toFixed(
                                          2,
                                      )
                            }
                            helpKey="solverToRevisionDelta"
                        />
                    </div>
                </>
            ) : null}
            {benchmarkIndexMetrics ? (
                <div className="grid-4">
                    <MetricCard
                        label="Indexed benchmarks"
                        value={benchmarkIndexMetrics.indexedBenchmarkCount}
                        helpKey="benchmarkArtifacts"
                    />
                    <MetricCard
                        label="Avg divergence entropy"
                        value={
                            benchmarkIndexMetrics.avgDivergenceEntropy == null
                                ? "—"
                                : benchmarkIndexMetrics.avgDivergenceEntropy.toFixed(
                                      3,
                                  )
                        }
                        helpKey="divergenceEntropy"
                    />
                    <MetricCard
                        label="Avg pairwise stability"
                        value={
                            benchmarkIndexMetrics.avgStability == null
                                ? "—"
                                : benchmarkIndexMetrics.avgStability.toFixed(3)
                        }
                        helpKey="stabilityPairwiseMean"
                    />
                    <MetricCard
                        label="Avg mode count"
                        value={
                            benchmarkIndexMetrics.avgModeCount == null
                                ? "—"
                                : benchmarkIndexMetrics.avgModeCount.toFixed(1)
                        }
                        helpKey="modeCount"
                    />
                </div>
            ) : null}
            {!indexMetrics && !benchmarkIndexMetrics ? (
                <div className="card">
                    <p className="muted">
                        Run <code>pnpm analyze</code> to see indexed quality and
                        critique rollups for this question.
                    </p>
                </div>
            ) : (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Research insights</h2>
                    <p className="small muted" style={{ marginBottom: 12 }}>
                        Open filtered insight explorers scoped to this question.
                    </p>
                    <div
                        className="page-actions"
                        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                    >
                        {listQuestionInsightLinks(question).map((link) => (
                            <Link
                                key={link.page}
                                href={link.href}
                                className="button secondary"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {experimentMatrix.models.length > 0 &&
            experimentMatrix.presets.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Experiment matrix</h2>
                    <p className="small muted">
                        Model × preset coverage for this question — cell counts
                        show runs and benchmarks. Click a cell to open the
                        latest trace, or compare when two or more runs exist in
                        a cell.
                    </p>
                    <div className="experiment-matrix-wrap">
                        <table className="experiment-matrix">
                            <thead>
                                <tr>
                                    <th scope="col">Model</th>
                                    {experimentMatrix.presets.map((preset) => (
                                        <th key={preset} scope="col">
                                            {preset}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {experimentMatrix.models.map((model) => (
                                    <tr key={model}>
                                        <th scope="row">{model}</th>
                                        {experimentMatrix.presets.map(
                                            (preset) => {
                                                const cell = lookupMatrixCell(
                                                    experimentMatrix,
                                                    model,
                                                    preset,
                                                );
                                                if (!cell) {
                                                    return (
                                                        <td
                                                            key={preset}
                                                            className="experiment-matrix-empty"
                                                        >
                                                            —
                                                        </td>
                                                    );
                                                }
                                                const label = [
                                                    cell.runCount > 0
                                                        ? `${cell.runCount} run${cell.runCount === 1 ? "" : "s"}`
                                                        : null,
                                                    cell.benchmarkCount > 0
                                                        ? `${cell.benchmarkCount} bench`
                                                        : null,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" · ");
                                                const compareHref =
                                                    buildMatrixCellRunCompareHref(
                                                        cell,
                                                        question,
                                                    );
                                                const href =
                                                    cell.latestRunId != null
                                                        ? `/runs/${cell.latestRunId}`
                                                        : cell.latestBenchmarkId !=
                                                            null
                                                          ? `/benchmarks/${cell.latestBenchmarkId}`
                                                          : null;
                                                return (
                                                    <td key={preset}>
                                                        {href ? (
                                                            <div className="experiment-matrix-cell-wrap">
                                                                <Link
                                                                    href={href}
                                                                    className="experiment-matrix-cell"
                                                                    title={`${model} · ${preset}`}
                                                                >
                                                                    {label}
                                                                </Link>
                                                                {compareHref ? (
                                                                    <Link
                                                                        href={
                                                                            compareHref
                                                                        }
                                                                        className="experiment-matrix-compare small"
                                                                        title="Compare latest two runs in this cell"
                                                                    >
                                                                        Compare
                                                                    </Link>
                                                                ) : null}
                                                            </div>
                                                        ) : (
                                                            <span className="muted">
                                                                {label}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            },
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Runs</h2>
                {runs.length === 0 ? (
                    <p className="muted">
                        No runs match the current filters for this question.
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
                            ...(indexedRunRows
                                ? [
                                      {
                                          key: "issues",
                                          label: "Issues",
                                          helpKey: "issueCount",
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
                                          key: "avgSeverity",
                                          label: "Avg severity",
                                          helpKey: "avgSeverity",
                                          hideOnMobile: true,
                                          render: (
                                              row: Record<string, unknown>,
                                          ) => {
                                              const value = (
                                                  row as {
                                                      avgSeverity?: number;
                                                  }
                                              ).avgSeverity;
                                              return value == null
                                                  ? "—"
                                                  : value.toFixed(2);
                                          },
                                      },
                                      {
                                          key: "coherence",
                                          label: "Coherence",
                                          helpKey: "coherence",
                                          hideOnMobile: true,
                                          render: (
                                              row: Record<string, unknown>,
                                          ) => {
                                              const value = (
                                                  row as { coherence?: number }
                                              ).coherence;
                                              return value == null
                                                  ? "—"
                                                  : value.toFixed(2);
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
                            const indexed = indexedRunRows?.get(run.id);
                            return {
                                id: run.id,
                                createdAt: run.metadata.createdAt,
                                model: run.metadata.model,
                                preset: run.metadata.pipelinePreset,
                                preview: run.run.finalAnswer,
                                issues: indexed?.issueCount,
                                avgSeverity: indexed?.avgSeverity,
                                coherence: indexed?.coherence,
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
                        No benchmarks match the current filters for this
                        question.
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
                            ...(indexedBenchmarkRows
                                ? [
                                      {
                                          key: "stability",
                                          label: "Stability",
                                          helpKey: "stabilityPairwiseMean",
                                          hideOnMobile: true,
                                          render: (
                                              row: Record<string, unknown>,
                                          ) => {
                                              const value = (
                                                  row as {
                                                      stability?: number;
                                                  }
                                              ).stability;
                                              return value == null
                                                  ? "—"
                                                  : value.toFixed(3);
                                          },
                                      },
                                      {
                                          key: "topMode",
                                          label: "Top mode",
                                          helpKey: "modeExplorer",
                                          hideOnMobile: true,
                                          render: (
                                              row: Record<string, unknown>,
                                          ) => {
                                              const value = (
                                                  row as {
                                                      topMode?: string | null;
                                                  }
                                              ).topMode;
                                              return value ?? "—";
                                          },
                                      },
                                  ]
                                : []),
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
                        data={benchmarks.map((benchmark) => {
                            const indexed = indexedBenchmarkRows?.get(
                                benchmark.id,
                            );
                            return {
                                id: benchmark.id,
                                createdAt: benchmark.metadata.createdAt,
                                runs: benchmark.payload.runs,
                                modeCount: benchmark.payload.modeCount,
                                entropy: benchmark.payload.divergenceEntropy,
                                stability: indexed?.stability,
                                topMode: indexed?.topMode,
                            };
                        })}
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
