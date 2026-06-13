import type { Metadata } from "next";
import Link from "next/link";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { ExportFilteredLink } from "../../components/ExportFilteredLink";
import { PresetFilterSelect } from "../../components/PresetFilterSelect";
import { ModelFilterSelect } from "../../components/ModelFilterSelect";
import { buildActivityFeed, resolveActivitySortOrder } from "../../lib/activityFeed";
import { collectArtifactFacets } from "../../lib/artifactFacets";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../lib/data";
import { buildQueryString, paginateItems } from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Activity",
};

type ActivitySearchParams = {
    q?: string;
    kind?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
    sort?: string;
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
    const sort = resolveActivitySortOrder(params.sort);
    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const { models, presets } = collectArtifactFacets(runs, benchmarks);
    const feed = buildActivityFeed(runs, benchmarks, {
        kind,
        q: params.q,
        model: params.model,
        preset: params.preset,
        fast: params.fast,
        from: params.from,
        to: params.to,
        sort,
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
                    Chronological timeline of run traces and benchmarks —{" "}
                    {sort === "oldest" ? "oldest experiments first" : "newest experiments first"}.
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
                    <ModelFilterSelect
                        models={models}
                        defaultValue={params.model ?? ""}
                        listId="activity-model-filter-options"
                    />
                    <PresetFilterSelect
                        presets={presets}
                        defaultValue={params.preset ?? ""}
                    />
                    <select name="kind" defaultValue={kind} className="input">
                        <option value="all">All activity</option>
                        <option value="run">Runs only</option>
                        <option value="benchmark">Benchmarks only</option>
                    </select>
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
                    <select
                        name="pageSize"
                        defaultValue={String(paging.pageSize)}
                        className="input"
                    >
                        <option value="15">15 per page</option>
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                    </select>
                    <select
                        name="sort"
                        defaultValue={sort}
                        className="input"
                    >
                        <option value="newest">Sort: newest first</option>
                        <option value="oldest">Sort: oldest first</option>
                    </select>
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Apply
                    </button>
                    <Link href="/activity" className="button secondary">
                        Clear
                    </Link>
                    <ExportFilteredLink
                        apiPath="/api/activity"
                        params={{
                            q: params.q,
                            kind: kind === "all" ? undefined : kind,
                            model: params.model,
                            preset: params.preset,
                            fast: params.fast,
                            from: params.from,
                            to: params.to,
                            sort,
                        }}
                        label="Export filtered JSON"
                    />
                    <a
                        href={`/api/activity${buildQueryString(params, {
                            kind: kind === "all" ? undefined : kind,
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
                        download="activity-feed.csv"
                    >
                        Export CSV
                    </a>
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
                                  model: params.model,
                                  preset: params.preset,
                                  fast: params.fast,
                                  from: params.from,
                                  to: params.to,
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
                </Link>
                <Link
                    className="button secondary"
                    aria-disabled={!paging.hasNext}
                    href={
                        paging.hasNext
                            ? buildQueryString(params, {
                                  kind,
                                  model: params.model,
                                  preset: params.preset,
                                  fast: params.fast,
                                  from: params.from,
                                  to: params.to,
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
                </Link>
                <span className="small muted">
                    Page {paging.page} of {paging.totalPages}
                </span>
            </div>
        </section>
    );
}
