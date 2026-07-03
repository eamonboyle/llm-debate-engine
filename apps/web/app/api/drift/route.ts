import {
    buildConfidenceDriftRows,
    summarizeConfidenceDrift,
} from "../../../lib/confidenceDrift";
import { loadAnalysisIndex, loadRunArtifacts } from "../../../lib/data";
import { applyIndexFilters } from "../../../lib/indexFilters";
import { confidenceDriftToCsv } from "../../../lib/listExport";

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
    const allRuns = await loadRunArtifacts();
    const rows = buildConfidenceDriftRows(filteredIndex, { runs: allRuns });
    const summary = summarizeConfidenceDrift(filteredIndex);

    if (format === "csv") {
        const csv = confidenceDriftToCsv(rows);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="confidence-drift.csv"',
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
    });
}
