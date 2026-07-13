import { filterRunArtifacts, loadAnalysisIndex, loadRunArtifacts } from "../../../lib/data";
import {
    resolveRunSortOrder,
    sortRunArtifacts,
} from "../../../lib/artifactSort";
import { runArtifactsToCsv } from "../../../lib/listExport";
import { buildOutlierRunIdSet } from "../../../lib/outlierLookup";
import {
    applyRunListExtraFilters,
    buildPipelineErrorRunIdSet,
    parseRunListExtraFilters,
} from "../../../lib/runListFilters";
import { parseListPagination } from "../_shared/pagination";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const [runs, index] = await Promise.all([
        loadRunArtifacts(),
        loadAnalysisIndex(),
    ]);
    const extraFilters = parseRunListExtraFilters({
        outlier: url.searchParams.get("outlier") ?? undefined,
        errors: url.searchParams.get("errors") ?? undefined,
    });
    const filtered = applyRunListExtraFilters(
        filterRunArtifacts(runs, {
            q: url.searchParams.get("q") ?? undefined,
            model: url.searchParams.get("model") ?? undefined,
            preset: url.searchParams.get("preset") ?? undefined,
            fast: url.searchParams.get("fast") ?? undefined,
            from: url.searchParams.get("from") ?? undefined,
            to: url.searchParams.get("to") ?? undefined,
        }),
        extraFilters,
        {
            outlierRunIds: buildOutlierRunIdSet(index),
            errorRunIds: buildPipelineErrorRunIdSet(runs),
        },
    );
    const sort = resolveRunSortOrder(url.searchParams.get("sort") ?? undefined);
    const { offset, limit, page } = parseListPagination(url.searchParams);
    const sorted = sortRunArtifacts(filtered, sort);
    const items = sorted.slice(offset, offset + limit);
    const totalPages = Math.max(1, Math.ceil(sorted.length / limit));
    const prevPage = page > 1 ? page - 1 : null;
    const nextPage = page < totalPages ? page + 1 : null;

    if (format === "csv") {
        const csv = runArtifactsToCsv(items);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": 'attachment; filename="runs.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

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
