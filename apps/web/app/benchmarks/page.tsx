import {
    filterBenchmarkArtifacts,
    loadBenchmarkArtifacts,
} from "../../lib/data";
import { sortArtifactsByCreatedAt } from "../../lib/artifactSort";
import {
    buildQueryString,
    paginateItems,
    resolveSortOrder,
} from "../../lib/listPagination";

type BenchmarkSearchParams = {
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

export default async function BenchmarksPage({
    searchParams,
}: {
    searchParams: Promise<BenchmarkSearchParams>;
}) {
    const benchmarks = await loadBenchmarkArtifacts();
    const params = await searchParams;
    const filtered = filterBenchmarkArtifacts(benchmarks, {
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
                <h1 className="title">Benchmark artifacts</h1>
                <p className="subtitle">
                    Inspect benchmark-level divergence, mode structure, and stability.
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
                        placeholder="Search benchmark question"
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
                    <a href="/benchmarks" className="button secondary">
                        Clear
                    </a>
                    <span className="small muted" style={{ alignSelf: "center" }}>
                        Showing {paging.startDisplay}-{paging.endDisplay} of{" "}
                        {filtered.length} filtered
                        benchmarks ({benchmarks.length} total)
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
                                <th>Runs</th>
                                <th>Modes</th>
                                <th>Entropy</th>
                                <th>Open</th>
                                <th>Compare</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paging.paged.map((benchmark) => (
                                <tr key={benchmark.id}>
                                    <td>{benchmark.id}</td>
                                    <td>
                                        {new Date(
                                            benchmark.metadata.createdAt,
                                        ).toLocaleString()}
                                    </td>
                                    <td>{benchmark.question}</td>
                                    <td>{benchmark.payload.runs}</td>
                                    <td>{benchmark.payload.modeCount}</td>
                                    <td>{benchmark.payload.divergenceEntropy}</td>
                                    <td>
                                        <a href={`/benchmarks/${benchmark.id}`}>Details</a>
                                    </td>
                                    <td>
                                        <a
                                            href={`/benchmarks/compare?left=${benchmark.id}`}
                                        >
                                            Set left
                                        </a>
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
