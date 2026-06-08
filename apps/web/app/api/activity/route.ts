import {
    buildActivityFeed,
    type ActivityFeedFilters,
} from "../../../lib/activityFeed";
import { activityEntriesToCsv } from "../../../lib/activityExport";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../../lib/data";
import { parseListPagination } from "../_shared/pagination";

function resolveKind(value: string | null): ActivityFeedFilters["kind"] {
    if (value === "run" || value === "benchmark") return value;
    return "all";
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);

    const filters: ActivityFeedFilters = {
        kind: resolveKind(url.searchParams.get("kind")),
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
    };

    const feed = buildActivityFeed(runs, benchmarks, filters);
    const { offset, limit } = parseListPagination(url.searchParams);
    const items = feed.slice(offset, offset + limit);

    if (format === "csv") {
        const csv = activityEntriesToCsv(items);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="activity-feed.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        total: feed.length,
        offset,
        limit,
        hasMore: offset + items.length < feed.length,
        items,
    });
}
