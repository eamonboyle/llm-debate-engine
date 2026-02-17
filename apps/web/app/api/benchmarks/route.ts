import {
    filterBenchmarkArtifacts,
    loadBenchmarkArtifacts,
} from "../../../lib/data";
import { parseListPagination } from "../_shared/pagination";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const benchmarks = await loadBenchmarkArtifacts();
    const filtered = filterBenchmarkArtifacts(benchmarks, {
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
    });
    const sort = url.searchParams.get("sort");
    const { offset, limit, page } = parseListPagination(url.searchParams);
    const sorted = sort === "oldest" ? filtered.slice().reverse() : filtered;
    const items = sorted.slice(offset, offset + limit);

    return Response.json({
        total: benchmarks.length,
        filtered: filtered.length,
        page,
        offset,
        limit,
        hasMore: offset + items.length < sorted.length,
        items,
    });
}
