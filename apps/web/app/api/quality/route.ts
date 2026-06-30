import { loadAnalysisIndex, loadRunArtifacts } from "../../../lib/data";
import { applyIndexFilters } from "../../../lib/indexFilters";
import { aggregateJudgeNarratives } from "../../../lib/judgeNarrativeInsights";
import { qualityRunsToCsv } from "../../../lib/listExport";
import {
    buildQualityRunRows,
    summarizeQuality,
} from "../../../lib/qualityInsights";

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
    const rows = buildQualityRunRows(filteredIndex);
    const summary = summarizeQuality(filteredIndex);
    const qualityRunIds = new Set(
        rows
            .filter(
                (row) =>
                    row.coherence != null ||
                    row.completeness != null ||
                    row.factualRisk != null ||
                    row.uncertaintyHandling != null,
            )
            .map((row) => row.id),
    );
    const includeNarratives =
        url.searchParams.get("includeNarratives") !== "false";
    const narratives =
        includeNarratives && qualityRunIds.size > 0
            ? aggregateJudgeNarratives(await loadRunArtifacts(), qualityRunIds)
            : { strengths: [], weaknesses: [] };

    if (format === "csv") {
        const csv = qualityRunsToCsv(rows);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="quality-insights.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        totalRuns: filteredIndex.totals.runs,
        totalRunsUnfiltered: index.totals.runs,
        filters,
        summary,
        rows,
        narratives,
    });
}
