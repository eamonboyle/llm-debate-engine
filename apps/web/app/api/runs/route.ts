import { filterRunArtifacts, loadRunArtifacts } from "../../../lib/data";
import { sortArtifactsByCreatedAt } from "../../../lib/artifactSort";
import { resolveSortOrder } from "../../../lib/listPagination";
import { parseListPagination } from "../_shared/pagination";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const runs = await loadRunArtifacts();
    const filtered = filterRunArtifacts(runs, {
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
    });
    const sort = resolveSortOrder(url.searchParams.get("sort") ?? undefined);
    const { offset, limit, page } = parseListPagination(url.searchParams);
    const sorted = sortArtifactsByCreatedAt(filtered, sort);
    const items = sorted.slice(offset, offset + limit);
    const totalPages = Math.max(1, Math.ceil(sorted.length / limit));
    const prevPage = page > 1 ? page - 1 : null;
    const nextPage = page < totalPages ? page + 1 : null;

    return Response.json({
        total: runs.length,
        filtered: filtered.length,
        page,
        totalPages,
        prevPage,
        nextPage,
        offset,
        limit,
        hasMore: offset + items.length < sorted.length,
        items,
    });
}
