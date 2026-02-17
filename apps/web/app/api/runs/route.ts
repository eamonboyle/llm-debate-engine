import { filterRunArtifacts, loadRunArtifacts } from "../../../lib/data";

function parseNumberParam(
    value: string | null,
    opts: { fallback: number; min: number; max: number },
) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return opts.fallback;
    return Math.max(opts.min, Math.min(opts.max, Math.floor(parsed)));
}

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
    const sort = url.searchParams.get("sort");
    const offset = parseNumberParam(url.searchParams.get("offset"), {
        fallback: 0,
        min: 0,
        max: Number.MAX_SAFE_INTEGER,
    });
    const limit = parseNumberParam(url.searchParams.get("limit"), {
        fallback: 100,
        min: 1,
        max: 500,
    });
    const sorted = sort === "oldest" ? filtered.slice().reverse() : filtered;
    const items = sorted.slice(offset, offset + limit);

    return Response.json({
        total: runs.length,
        filtered: filtered.length,
        offset,
        limit,
        hasMore: offset + items.length < sorted.length,
        items,
    });
}
