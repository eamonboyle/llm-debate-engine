import { filterRunArtifacts, loadRunArtifacts } from "../../lib/data";
import { sortArtifactsByCreatedAt } from "../../lib/artifactSort";
import {
    buildQueryString,
    paginateItems,
    resolveSortOrder,
} from "../../lib/listPagination";

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

            <form className="card" method="get">
                <div
                    style={{
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                    }}
                >
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
                <div
                    style={{
                        marginTop: 10,
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                        maxWidth: 360,
                    }}
                >
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
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                    <button type="submit" className="button">
                        Apply filters
                    </button>
                    <a href="/runs" className="button secondary">
                        Clear
                    </a>
                    <span className="small muted" style={{ alignSelf: "center" }}>
                        Showing {paging.startDisplay}-{paging.endDisplay} of{" "}
                        {filtered.length} filtered
                        runs ({runs.length} total)
                    </span>
                </div>
            </form>

            <div className="card">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Created</th>
                                <th>Question</th>
                                <th>Model</th>
                                <th>Preset</th>
                                <th>Fast</th>
                                <th>Final answer</th>
                                <th>Open</th>
                                <th>Compare</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paging.paged.map((run) => (
                                <tr key={run.id}>
                                    <td>{run.id}</td>
                                    <td>
                                        {new Date(run.metadata.createdAt).toLocaleString()}
                                    </td>
                                    <td>{run.question}</td>
                                    <td>{run.metadata.model}</td>
                                    <td>{run.metadata.pipelinePreset}</td>
                                    <td>{run.metadata.fastMode ? "yes" : "no"}</td>
                                    <td className="muted">{run.run.finalAnswer}</td>
                                    <td>
                                        <a href={`/runs/${run.id}`}>Trace</a>
                                    </td>
                                    <td>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: 8,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <a href={`/runs/compare?left=${run.id}`}>
                                                Set left
                                            </a>
                                            <a href={`/runs/compare?right=${run.id}`}>
                                                Set right
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                <span className="small muted" style={{ alignSelf: "center" }}>
                    Page {paging.page} of {paging.totalPages}
                </span>
            </div>
        </section>
    );
}
