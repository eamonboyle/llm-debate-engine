import type { Metadata } from "next";
import { CollapsibleFilterCard } from "../../components/CollapsibleFilterCard";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { filterRunArtifacts, loadRunArtifacts } from "../../lib/data";
import { sortArtifactsByCreatedAt } from "../../lib/artifactSort";
import {
    buildQueryString,
    paginateItems,
    resolveSortOrder,
} from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Runs",
};

type RunsSearchParams = {
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

export default async function RunsPage({
    searchParams,
}: {
    searchParams: Promise<RunsSearchParams>;
}) {
    const runs = await loadRunArtifacts();
    const params = await searchParams;
    const filtered = filterRunArtifacts(runs, {
        q: params.q,
        model: params.model,
        preset: params.preset,
        fast: params.fast,
        from: params.from,
        to: params.to,
    });
    const sort = resolveSortOrder(params.sort);
    const sorted = sortArtifactsByCreatedAt(filtered, sort);
    const paging = paginateItems(sorted, params, {
        defaultPageSize: 25,
        maxPageSize: 200,
    });

    return (
        <section className="stack">
            <div>
                <h1 className="title">Run artifacts</h1>
                <p className="subtitle">
                    Deep dive each run with model, preset, and metric snapshots.
                </p>
            </div>

            <CollapsibleFilterCard
                resultsSummary={
                    <>
                        {paging.startDisplay}-{paging.endDisplay} of {filtered.length} runs
                    </>
                }
            >
            <form method="get">
                <div className="filter-grid">
                    <input
                        name="q"
                        placeholder="Search question / answer"
                        defaultValue={params.q ?? ""}
                        className="input"
                    />
                    <input
                        name="model"
                        placeholder="Model contains..."
                        defaultValue={params.model ?? ""}
                        className="input"
                    />
                    <input
                        name="preset"
                        placeholder="Preset (standard, research_deep...)"
                        defaultValue={params.preset ?? ""}
                        className="input"
                    />
                    <select name="fast" defaultValue={params.fast ?? ""} className="input">
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
                <div className="filter-sort-row">
                    <select name="sort" defaultValue={sort} className="input">
                        <option value="newest">Sort: newest first</option>
                        <option value="oldest">Sort: oldest first</option>
                    </select>
                    <select
                        name="pageSize"
                        defaultValue={String(paging.pageSize)}
                        className="input"
                    >
                        <option value="10">10 per page</option>
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                    </select>
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Apply filters
                    </button>
                    <a href="/runs" className="button secondary">
                        Clear
                    </a>
                    <span className="small muted">
                        Showing {paging.startDisplay}-{paging.endDisplay} of{" "}
                        {filtered.length} filtered
                        runs ({runs.length} total)
                    </span>
                </div>
            </form>
            </CollapsibleFilterCard>

            <div className="card">
                <ResponsiveTable
                    columns={[
                        {
                            key: "trace",
                            label: "Actions",
                            cellClass: "cell-actions",
                            hideOnMobile: true,
                            render: (row) => (
                                <a
                                    href={`/runs/${(row as { id: string }).id}`}
                                    className="button"
                                    style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                                >
                                    Trace
                                </a>
                            ),
                        },
                        { key: "id", label: "ID" },
                        {
                            key: "createdAt",
                            label: "Created",
                            render: (row) =>
                                new Date((row as { createdAt: string }).createdAt).toLocaleString(),
                        },
                        {
                            key: "question",
                            label: "Question",
                            cellClass: "cell-question",
                            render: (row) => (
                                <TruncateText
                                    text={(row as { question: string }).question}
                                    maxLength={80}
                                    className="muted"
                                />
                            ),
                        },
                        { key: "model", label: "Model" },
                        { key: "preset", label: "Preset" },
                        {
                            key: "fast",
                            label: "Fast",
                            render: (row) =>
                                (row as { fast: boolean }).fast ? "yes" : "no",
                        },
                        {
                            key: "finalAnswer",
                            label: "Final answer",
                            cellClass: "cell-answer-preview",
                            hideOnMobile: true,
                            render: (row) => (
                                <TruncateText
                                    text={(row as { finalAnswer: string }).finalAnswer}
                                    maxLength={120}
                                    lines={2}
                                    className="muted"
                                />
                            ),
                        },
                        {
                            key: "answerPreview",
                            label: "Answer preview",
                            showOnlyOnMobile: true,
                            render: (row) => (
                                <TruncateText
                                    text={(row as { finalAnswer: string }).finalAnswer}
                                    maxLength={80}
                                    className="muted"
                                />
                            ),
                        },
                        {
                            key: "compare",
                            label: "Compare",
                            cellClass: "cell-actions",
                            hideOnMobile: true,
                            render: (row) => (
                                <span className="cell-compare-links">
                                    <a href={`/runs/compare?left=${(row as { id: string }).id}`}>
                                        L
                                    </a>
                                    <a href={`/runs/compare?right=${(row as { id: string }).id}`}>
                                        R
                                    </a>
                                </span>
                            ),
                        },
                    ]}
                    data={paging.paged.map((run) => ({
                        id: run.id,
                        createdAt: run.metadata.createdAt,
                        question: run.question,
                        model: run.metadata.model,
                        preset: run.metadata.pipelinePreset,
                        fast: run.metadata.fastMode,
                        finalAnswer: run.run.finalAnswer,
                    }))}
                    getRowId={(row) => (row as { id: string }).id}
                    renderCardActions={(row) => (
                        <>
                            <a
                                href={`/runs/${(row as { id: string }).id}`}
                                className="button"
                            >
                                Trace
                            </a>
                            <a
                                href={`/runs/compare?left=${(row as { id: string }).id}`}
                                className="button secondary"
                            >
                                Set left
                            </a>
                            <a
                                href={`/runs/compare?right=${(row as { id: string }).id}`}
                                className="button secondary"
                            >
                                Set right
                            </a>
                        </>
                    )}
                />
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
                            : buildQueryString(params, {
                                  sort,
                                  pageSize: String(paging.pageSize),
                                  page: String(paging.page),
                              })
                    }
                    style={
                        paging.hasPrev
                            ? undefined
                            : { pointerEvents: "none", opacity: 0.5, textDecoration: "none" }
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
                            : buildQueryString(params, {
                                  sort,
                                  pageSize: String(paging.pageSize),
                                  page: String(paging.page),
                              })
                    }
                    style={
                        paging.hasNext
                            ? undefined
                            : { pointerEvents: "none", opacity: 0.5, textDecoration: "none" }
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
