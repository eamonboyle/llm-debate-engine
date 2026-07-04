import type { Metadata } from "next";
import Link from "next/link";
import { CollapsibleFilterCard } from "../../components/CollapsibleFilterCard";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { ModelFilterSelect } from "../../components/ModelFilterSelect";
import { PresetFilterSelect } from "../../components/PresetFilterSelect";
import { collectArtifactFacets } from "../../lib/artifactFacets";
import {
    loadAnalysisIndex,
    loadBenchmarkArtifacts,
    loadRunArtifacts,
} from "../../lib/data";
import {
    filterArtifactsForQuestionGroups,
    groupArtifactsByQuestion,
    questionHubHref,
} from "../../lib/questionGroups";
import { ExportFilteredLink } from "../../components/ExportFilteredLink";
import { buildQueryString, paginateItems } from "../../lib/listPagination";
import {
    resolveQuestionSortOrder,
    sortQuestionGroups,
} from "../../lib/questionSort";
import { buildQuestionMetricsLookup } from "../../lib/questionHubMetrics";

export const metadata: Metadata = {
    title: "Questions",
};

type QuestionsSearchParams = {
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
};

export default async function QuestionsPage({
    searchParams,
}: {
    searchParams: Promise<QuestionsSearchParams>;
}) {
    const params = await searchParams;
    const [allRuns, allBenchmarks, index] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
        loadAnalysisIndex(),
    ]);
    const questionMetrics = index ? buildQuestionMetricsLookup(index) : null;
    const { models, presets } = collectArtifactFacets(allRuns, allBenchmarks);
    const { runs, benchmarks } = filterArtifactsForQuestionGroups(
        allRuns,
        allBenchmarks,
        params,
    );
    const groups = groupArtifactsByQuestion(runs, benchmarks);

    const q = (params.q ?? "").trim().toLowerCase();
    const filtered = q
        ? groups.filter((group) => group.question.toLowerCase().includes(q))
        : groups;

    const sort = resolveQuestionSortOrder(params.sort);
    const sorted = sortQuestionGroups(filtered, sort);

    const paging = paginateItems(sorted, params, {
        defaultPageSize: 20,
        maxPageSize: 100,
    });

    const hasArtifactFilters = Boolean(
        params.model ||
        params.preset ||
        params.fast ||
        params.from ||
        params.to,
    );

    return (
        <section className="stack">
            <div>
                <h1 className="title">Research questions</h1>
                <p className="subtitle">
                    Grouped view of debate questions across runs and benchmarks.
                    Use this to find all experiments on the same topic.
                </p>
            </div>

            <CollapsibleFilterCard
                resultsSummary={
                    <>
                        {paging.startDisplay}-{paging.endDisplay} of{" "}
                        {filtered.length} questions
                    </>
                }
            >
                <form method="get">
                    <div className="filter-grid">
                        <input
                            name="q"
                            placeholder="Filter questions..."
                            defaultValue={params.q ?? ""}
                            className="input"
                        />
                        <ModelFilterSelect
                            models={models}
                            defaultValue={params.model ?? ""}
                            listId="question-model-filter-options"
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
                            title="Last activity on or after"
                        />
                        <input
                            type="datetime-local"
                            name="to"
                            defaultValue={params.to ?? ""}
                            className="input"
                            title="Last activity on or before"
                        />
                    </div>
                    <div className="filter-sort-row">
                        <select
                            name="sort"
                            defaultValue={sort}
                            className="input"
                        >
                            <option value="newest">
                                Sort: recently updated
                            </option>
                            <option value="oldest">Sort: oldest first</option>
                            <option value="most-runs">Sort: most runs</option>
                            <option value="most-experiments">
                                Sort: most experiments
                            </option>
                        </select>
                        <select
                            name="pageSize"
                            defaultValue={String(paging.pageSize)}
                            className="input"
                        >
                            <option value="10">10 per page</option>
                            <option value="20">20 per page</option>
                            <option value="50">50 per page</option>
                        </select>
                    </div>
                    <div className="filter-actions">
                        <button type="submit" className="button">
                            Apply filters
                        </button>
                        <Link href="/questions" className="button secondary">
                            Clear
                        </Link>
                        <ExportFilteredLink
                            apiPath="/api/questions"
                            params={{
                                q: params.q,
                                model: params.model,
                                preset: params.preset,
                                fast: params.fast,
                                from: params.from,
                                to: params.to,
                                sort,
                            }}
                        />
                        <a
                            href={`/api/questions${buildQueryString(params, {
                                q: params.q,
                                model: params.model,
                                preset: params.preset,
                                fast: params.fast,
                                from: params.from,
                                to: params.to,
                                sort,
                                pageSize: "500",
                                page: "1",
                            })}&format=csv`}
                            className="button secondary"
                            download="questions.csv"
                        >
                            Export CSV
                        </a>
                        <span className="small muted">
                            {filtered.length} question
                            {filtered.length === 1 ? "" : "s"}
                            {hasArtifactFilters
                                ? ` (from ${runs.length} runs · ${benchmarks.length} benchmarks)`
                                : ` · ${allRuns.length} runs · ${allBenchmarks.length} benchmarks`}
                        </span>
                    </div>
                </form>
            </CollapsibleFilterCard>

            <div className="card">
                {paging.paged.length === 0 ? (
                    <p className="muted">No questions match your filter.</p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            {
                                key: "question",
                                label: "Question",
                                cellClass: "cell-question",
                                render: (row) => {
                                    const q = (row as { question: string })
                                        .question;
                                    return (
                                        <Link href={questionHubHref(q)}>
                                            <TruncateText
                                                text={q}
                                                maxLength={100}
                                            />
                                        </Link>
                                    );
                                },
                            },
                            { key: "runCount", label: "Runs" },
                            { key: "benchmarkCount", label: "Benchmarks" },
                            ...(questionMetrics
                                ? [
                                      {
                                          key: "avgIssues",
                                          label: "Avg issues",
                                          helpKey: "issueCount",
                                          hideOnMobile: true,
                                          render: (
                                              row: Record<string, unknown>,
                                          ) => {
                                              const value = (
                                                  row as {
                                                      avgIssues?: string;
                                                  }
                                              ).avgIssues;
                                              return value ?? "—";
                                          },
                                      },
                                      {
                                          key: "avgCoherence",
                                          label: "Avg coherence",
                                          helpKey: "coherence",
                                          hideOnMobile: true,
                                          render: (
                                              row: Record<string, unknown>,
                                          ) => {
                                              const value = (
                                                  row as {
                                                      avgCoherence?: string;
                                                  }
                                              ).avgCoherence;
                                              return value ?? "—";
                                          },
                                      },
                                  ]
                                : []),
                            {
                                key: "latestCreatedAt",
                                label: "Last activity",
                                render: (row) =>
                                    new Date(
                                        (row as { latestCreatedAt: string })
                                            .latestCreatedAt,
                                    ).toLocaleString(),
                            },
                            {
                                key: "models",
                                label: "Models",
                                hideOnMobile: true,
                                render: (row) =>
                                    (row as { models: string[] }).models.join(
                                        ", ",
                                    ) || "—",
                            },
                            {
                                key: "actions",
                                label: "Explore",
                                cellClass: "cell-actions",
                                render: (row) => {
                                    const r = row as {
                                        runsHref: string;
                                        benchmarksHref: string;
                                    };
                                    return (
                                        <span className="cell-compare-links">
                                            <Link href={r.runsHref}>Runs</Link>
                                            {" · "}
                                            <Link href={r.benchmarksHref}>
                                                Benchmarks
                                            </Link>
                                        </span>
                                    );
                                },
                            },
                        ]}
                        data={paging.paged.map((group) => {
                            const encodedQ = encodeURIComponent(group.question);
                            const metrics = questionMetrics?.get(
                                group.question,
                            );
                            return {
                                question: group.question,
                                hubHref: questionHubHref(group.question),
                                runCount: group.runCount,
                                benchmarkCount: group.benchmarkCount,
                                avgIssues:
                                    metrics?.avgIssueCount == null
                                        ? undefined
                                        : metrics.avgIssueCount.toFixed(1),
                                avgCoherence:
                                    metrics?.avgCoherence == null
                                        ? undefined
                                        : metrics.avgCoherence.toFixed(1),
                                latestCreatedAt: group.latestCreatedAt,
                                models: group.models,
                                runsHref: `/runs?q=${encodedQ}`,
                                benchmarksHref: `/benchmarks?q=${encodedQ}`,
                            };
                        })}
                        getRowId={(row) =>
                            (row as { question: string }).question
                        }
                        renderCardActions={(row) => {
                            const r = row as {
                                hubHref: string;
                                runsHref: string;
                                benchmarksHref: string;
                            };
                            return (
                                <>
                                    <Link href={r.hubHref} className="button">
                                        Question hub
                                    </Link>
                                    <Link
                                        href={r.runsHref}
                                        className="button secondary"
                                    >
                                        View runs
                                    </Link>
                                    <Link
                                        href={r.benchmarksHref}
                                        className="button secondary"
                                    >
                                        Benchmarks
                                    </Link>
                                </>
                            );
                        }}
                    />
                )}
            </div>

            <div className="card pagination">
                <a
                    className="button secondary"
                    aria-disabled={!paging.hasPrev}
                    href={
                        paging.hasPrev
                            ? buildQueryString(params, {
                                  sort,
                                  pageSize: String(paging.pageSize),
                                  page: String(paging.page - 1),
                              })
                            : "#"
                    }
                    style={
                        paging.hasPrev
                            ? undefined
                            : {
                                  pointerEvents: "none",
                                  opacity: 0.5,
                                  textDecoration: "none",
                              }
                    }
                >
                    Previous
                </a>
                <a
                    className="button secondary"
                    aria-disabled={!paging.hasNext}
                    href={
                        paging.hasNext
                            ? buildQueryString(params, {
                                  sort,
                                  pageSize: String(paging.pageSize),
                                  page: String(paging.page + 1),
                              })
                            : "#"
                    }
                    style={
                        paging.hasNext
                            ? undefined
                            : {
                                  pointerEvents: "none",
                                  opacity: 0.5,
                                  textDecoration: "none",
                              }
                    }
                >
                    Next
                </a>
                <span className="small muted">
                    Page {paging.page} of {paging.totalPages}
                </span>
            </div>
        </section>
    );
}
