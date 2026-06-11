import type { Metadata } from "next";
import Link from "next/link";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../lib/data";
import {
    groupArtifactsByQuestion,
    questionHubHref,
} from "../../lib/questionGroups";
import { ExportFilteredLink } from "../../components/ExportFilteredLink";
import { buildQueryString, paginateItems } from "../../lib/listPagination";
import {
    resolveQuestionSortOrder,
    sortQuestionGroups,
} from "../../lib/questionSort";

export const metadata: Metadata = {
    title: "Questions",
};

type QuestionsSearchParams = {
    q?: string;
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
    const runs = await loadRunArtifacts();
    const benchmarks = await loadBenchmarkArtifacts();
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

    return (
        <section className="stack">
            <div>
                <h1 className="title">Research questions</h1>
                <p className="subtitle">
                    Grouped view of debate questions across runs and benchmarks.
                    Use this to find all experiments on the same topic.
                </p>
            </div>

            <form className="card" method="get">
                <div className="filter-grid">
                    <input
                        name="q"
                        placeholder="Filter questions..."
                        defaultValue={params.q ?? ""}
                        className="input"
                    />
                    <select name="sort" defaultValue={sort} className="input">
                        <option value="newest">Sort: recently updated</option>
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
                        Apply
                    </button>
                    <a href="/questions" className="button secondary">
                        Clear
                    </a>
                    <ExportFilteredLink
                        apiPath="/api/questions"
                        params={{
                            q: params.q,
                            sort,
                        }}
                    />
                    <a
                        href={`/api/questions${buildQueryString(params, {
                            q: params.q,
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
                        {filtered.length === 1 ? "" : "s"} · {runs.length} runs
                        · {benchmarks.length} benchmarks
                    </span>
                </div>
            </form>

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
                            return {
                                question: group.question,
                                hubHref: questionHubHref(group.question),
                                runCount: group.runCount,
                                benchmarkCount: group.benchmarkCount,
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
