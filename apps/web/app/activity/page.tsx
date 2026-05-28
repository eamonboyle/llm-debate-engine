import type { Metadata } from "next";
import Link from "next/link";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { buildActivityFeed } from "../../lib/activityFeed";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../lib/data";
import { buildQueryString, paginateItems } from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Activity",
};

type ActivitySearchParams = {
    q?: string;
    kind?: string;
    page?: string;
    pageSize?: string;
};

function resolveKind(value: string | undefined): "all" | "run" | "benchmark" {
    if (value === "run" || value === "benchmark") return value;
    return "all";
}

export default async function ActivityPage({
    searchParams,
}: {
    searchParams: Promise<ActivitySearchParams>;
}) {
    const params = await searchParams;
    const kind = resolveKind(params.kind);
    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const feed = buildActivityFeed(runs, benchmarks, {
        kind,
        q: params.q,
    });
    const paging = paginateItems(feed, params, {
        defaultPageSize: 25,
        maxPageSize: 100,
    });

    const empty = runs.length === 0 && benchmarks.length === 0;

    if (empty) {
        return (
            <section className="stack">
                <h1 className="title">Activity feed</h1>
                <p className="subtitle">
                    No artifacts yet. Run debate experiments locally, then
                    return here for a chronological timeline.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    return (
        <section className="stack">
            <div>
                <h1 className="title">Activity feed</h1>
                <p className="subtitle">
                    Chronological timeline of run traces and benchmarks — newest
                    experiments first.
                </p>
            </div>

            <form className="card" method="get">
                <div className="filter-grid">
                    <input
                        name="q"
                        placeholder="Filter by question, ID, model..."
                        defaultValue={params.q ?? ""}
                        className="input"
                    />
                    <select name="kind" defaultValue={kind} className="input">
                        <option value="all">All activity</option>
                        <option value="run">Runs only</option>
                        <option value="benchmark">Benchmarks only</option>
                    </select>
                    <select
                        name="pageSize"
                        defaultValue={String(paging.pageSize)}
                        className="input"
                    >
                        <option value="15">15 per page</option>
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                    </select>
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Apply
                    </button>
                    <Link href="/activity" className="button secondary">
                        Clear
                    </Link>
                    <span className="small muted">
                        {feed.length} event{feed.length === 1 ? "" : "s"}
                    </span>
                </div>
            </form>

            <div className="card">
                {paging.paged.length === 0 ? (
                    <p className="muted">No activity matches your filters.</p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            {
                                key: "kind",
                                label: "Type",
                                render: (row) => {
                                    const k = (row as { kind: string }).kind;
                                    return (
                                        <span
                                            className={`activity-kind activity-kind-${k}`}
                                        >
                                            {k === "run" ? "Run" : "Benchmark"}
                                        </span>
                                    );
                                },
                            },
                            {
                                key: "createdAt",
                                label: "When",
                                render: (row) =>
                                    new Date(
                                        (row as { createdAt: string })
                                            .createdAt,
                                    ).toLocaleString(),
                            },
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
                                        maxLength={90}
                                    />
                                ),
                            },
                            {
                                key: "model",
                                label: "Model",
                                hideOnMobile: true,
                            },
                            {
                                key: "pipelinePreset",
                                label: "Preset",
                                hideOnMobile: true,
                                helpKey: "preset",
                            },
                            {
                                key: "detail",
                                label: "Summary",
                                hideOnMobile: true,
                                render: (row) => (
                                    <span className="muted">
                                        {(row as { detail: string }).detail}
                                    </span>
                                ),
                            },
                            {
                                key: "open",
                                label: "Open",
                                render: (row) => (
                                    <Link href={(row as { href: string }).href}>
                                        View
                                    </Link>
                                ),
                            },
                        ]}
                        data={paging.paged.map((entry) => ({
                            ...entry,
                            fastLabel: entry.fastMode ? "fast" : "full",
                        }))}
                        getRowId={(row) =>
                            `${(row as { kind: string }).kind}-${(row as { id: string }).id}`
                        }
                        renderCardActions={(row) => (
                            <Link
                                href={(row as { href: string }).href}
                                className="button"
                            >
                                Open{" "}
                                {(row as { kind: string }).kind === "run"
                                    ? "trace"
                                    : "benchmark"}
                            </Link>
                        )}
                    />
                )}
            </div>

            <div className="card pagination">
                <Link
                    className="button secondary"
                    aria-disabled={!paging.hasPrev}
                    href={
                        paging.hasPrev
                            ? buildQueryString(params, {
                                  kind,
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
                </Link>
                <Link
                    className="button secondary"
                    aria-disabled={!paging.hasNext}
                    href={
                        paging.hasNext
                            ? buildQueryString(params, {
                                  kind,
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
                </Link>
                <span className="small muted">
                    Page {paging.page} of {paging.totalPages}
                </span>
            </div>
        </section>
    );
}
