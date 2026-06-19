import { buildCatalogStats, filterCatalogStats } from "../../../lib/catalogStats";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../../lib/data";
import { catalogStatsToCsv } from "../../../lib/listExport";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const q = url.searchParams.get("q") ?? undefined;

    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const rawStats = buildCatalogStats(runs, benchmarks);
    const stats = filterCatalogStats(rawStats, q);

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
        query: q ?? null,
        totals: stats.totals,
        rawTotals: rawStats.totals,
        models: stats.models,
        presets: stats.presets,
        combos: stats.combos,
    });
}
