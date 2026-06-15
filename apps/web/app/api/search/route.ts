import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../../lib/data";
import { searchArtifacts } from "../../../lib/globalSearch";
import { searchResultsToCsv } from "../../../lib/listExport";
import { parsePositiveInt } from "../../../lib/listPagination";

function readFilterParams(url: URL) {
    return {
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
    const query = url.searchParams.get("q") ?? "";
    const limit = parsePositiveInt(url.searchParams.get("limit") ?? undefined, {
        fallback: 12,
        max: 500,
    });
    const filters = readFilterParams(url);

    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);

    const result = searchArtifacts(runs, benchmarks, query, {
        limitPerSection: format === "csv" ? 500 : limit,
        filters,
    });

    if (format === "csv") {
        const csv = searchResultsToCsv(result);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="search-results.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        ...result,
        filters,
        storeTotals: {
            runs: runs.length,
            benchmarks: benchmarks.length,
        },
    });
}
