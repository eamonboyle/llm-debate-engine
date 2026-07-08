import {
    buildFilteredCatalogStats,
    type CatalogFilterParams,
} from "../../../lib/catalogStats";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../../lib/data";
import { catalogStatsToCsv } from "../../../lib/listExport";

function readCatalogFilters(url: URL): CatalogFilterParams {
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
    const filters = readCatalogFilters(url);

    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const stats = buildFilteredCatalogStats(runs, benchmarks, filters);

    if (format === "csv") {
        const csv = catalogStatsToCsv(stats);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="experiment-catalog.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        filters,
        totals: stats.totals,
        models: stats.models,
        presets: stats.presets,
        combos: stats.combos,
    });
}
