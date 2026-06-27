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
import { buildQueryString } from "../../../lib/listPagination";
import { questionHubHref } from "../../../lib/questionGroups";
import {
    buildQuestionHubRunRows,
    summarizeQuestionHubMetrics,
} from "../../../lib/questionHubMetrics";

export const metadata: Metadata = {
    title: "Question hub",
};

type QuestionViewSearchParams = {
    question?: string;
    model?: string;
    preset?: string;
    fast?: string;
};

function insightHref(
    path: "/drift" | "/quality" | "/issues" | "/outliers",
    question: string,
): string {
    return `${path}?q=${encodeURIComponent(question)}`;
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

    const filterParams = {
        model: params.model,
        preset: params.preset,
        fast: params.fast,
    };
    const runs = filterRunArtifacts(allRuns, filterParams);
    const benchmarks = filterBenchmarkArtifacts(allBenchmarks, filterParams);
    const indexMetrics = index
        ? summarizeQuestionHubMetrics(index, question)
        : null;
    const indexedRunRows = index
        ? buildQuestionHubRunRows(
              index,
              question,
              runs.map((run) => run.id),
          )
        : null;

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

    return (
        <section className="stack">
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
                    {index ? (
                        <>
                            <Link
                                href={insightHref("/drift", question)}
                                className="button secondary"
                            >
                                Confidence drift
                            </Link>
                            <Link
                                href={insightHref("/quality", question)}
                                className="button secondary"
                            >
                                Quality rubric
                            </Link>
                            <Link
                                href={insightHref("/issues", question)}
                                className="button secondary"
                            >
                                Critique issues
                            </Link>
                            <Link
                                href={insightHref("/outliers", question)}
                                className="button secondary"
                            >
                                Outlier runs
                            </Link>
                        </>
                    ) : null}
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
                resultsSummary={
                    <>
                        {runs.length} runs · {benchmarks.length} benchmarks for
                        this question
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
                        <a
                            href={questionHubHref(question)}
                            className="button secondary"
                        >
                            Clear
                        </a>
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
                                path={`/questions/view${buildQueryString(questionQuery, {
                                    model: params.model,
                                    preset: params.preset,
                                    fast: params.fast,
                                })}`}
                                label="Copy URL"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {indexMetrics ? (
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
                                : indexMetrics.avgSolverConfidence.toFixed(2)
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
                    <MetricCard
                        label="Avg coherence"
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
            ) : (
                <div className="card">
                    <p className="muted">
                        Run <code>pnpm analyze</code> to see indexed quality
                        and critique rollups for this question.
                    </p>
                </div>
            )}

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
