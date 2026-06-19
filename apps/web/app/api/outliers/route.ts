import { loadAnalysisIndex } from "../../../lib/data";
import { applyIndexFilters } from "../../../lib/indexFilters";
import { outlierRunsToCsv } from "../../../lib/listExport";
import { buildOutlierRows } from "../../../lib/outlierRows";

function readFilterParams(url: URL) {
    return {
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
    };
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const filters = readFilterParams(url);
    const index = await loadAnalysisIndex();

    if (!index) {
        return Response.json(
            { error: "analysis-index not found" },
            { status: 404 },
        );
    }

    const filteredIndex = applyIndexFilters(index, filters);
    const rows = await buildOutlierRows(filteredIndex);

    if (format === "csv") {
        const csv = outlierRunsToCsv(rows);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="outlier-runs.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        totalRuns: filteredIndex.totals.runs,
        totalRunsUnfiltered: index.totals.runs,
        filters,
        outlierCount: rows.length,
        rows,
    });
}
