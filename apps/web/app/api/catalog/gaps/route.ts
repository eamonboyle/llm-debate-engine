import {
    buildCatalogGaps,
    filterCatalogGaps,
} from "../../../../lib/catalogGaps";
import { buildCatalogStats } from "../../../../lib/catalogStats";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../../../lib/data";
import { catalogGapsToCsv } from "../../../../lib/listExport";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const q = url.searchParams.get("q") ?? undefined;

    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const stats = buildCatalogStats(runs, benchmarks);
    const summary = buildCatalogGaps(stats);
    const gaps = filterCatalogGaps(summary, q);

    if (format === "csv") {
        const csv = catalogGapsToCsv(gaps);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="coverage-gaps.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        query: q ?? null,
        summary: {
            coveredCount: summary.coveredCount,
            possibleCount: summary.possibleCount,
            coveragePercent: summary.coveragePercent,
            uniqueModels: summary.uniqueModels,
            uniquePresets: summary.uniquePresets,
            gapCount: summary.gaps.length,
        },
        gaps,
    });
}
