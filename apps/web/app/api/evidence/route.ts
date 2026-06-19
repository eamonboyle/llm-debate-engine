import {
    buildEvidenceRiskSummaries,
    listRunsForEvidenceRisk,
    summarizeEvidencePlanning,
} from "../../../lib/evidenceExplorer";
import { loadAnalysisIndex } from "../../../lib/data";
import { applyIndexFilters } from "../../../lib/indexFilters";
import { evidenceExplorerToCsv } from "../../../lib/listExport";

function readFilterParams(url: URL) {
    return {
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        level: url.searchParams.get("level") ?? undefined,
    };
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const filters = readFilterParams(url);
    const { level, ...indexFilters } = filters;
    const index = await loadAnalysisIndex();

    if (!index) {
        return Response.json(
            { error: "analysis-index not found" },
            { status: 404 },
        );
    }

    const filteredIndex = applyIndexFilters(index, indexFilters);
    const summary = summarizeEvidencePlanning(filteredIndex);
    const riskSummaries = buildEvidenceRiskSummaries(filteredIndex);
    const selectedLevel = Number((level ?? "").trim());
    const selectedRuns = Number.isFinite(selectedLevel)
        ? listRunsForEvidenceRisk(filteredIndex, selectedLevel)
        : [];

    if (format === "csv") {
        const csv = evidenceExplorerToCsv(
            riskSummaries,
            Number.isFinite(selectedLevel) ? selectedLevel : undefined,
            selectedRuns,
        );
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="evidence-planning.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        totalRuns: filteredIndex.totals.runs,
        totalRunsUnfiltered: index.totals.runs,
        filters: indexFilters,
        selectedLevel: Number.isFinite(selectedLevel) ? selectedLevel : null,
        summary,
        riskSummaries,
        selectedRuns,
    });
}
