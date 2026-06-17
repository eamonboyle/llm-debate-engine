import { loadAnalysisIndex } from "../../../lib/data";
import {
    applyIndexFilters,
    hasActiveIndexFilters,
} from "../../../lib/indexFilters";
import {
    buildIssueTypeSummaries,
    listRunsForIssueType,
} from "../../../lib/issueExplorer";
import { issueExplorerToCsv } from "../../../lib/listExport";

function readFilterParams(url: URL) {
    return {
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        type: url.searchParams.get("type") ?? undefined,
    };
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const filters = readFilterParams(url);
    const { type, ...indexFilters } = filters;
    const index = await loadAnalysisIndex();

    if (!index) {
        return Response.json(
            { error: "analysis-index not found" },
            { status: 404 },
        );
    }

    const filteredIndex = applyIndexFilters(index, indexFilters);
    const summaries = buildIssueTypeSummaries(filteredIndex, {
        useIndexedSeverity:
            !hasActiveIndexFilters(indexFilters) &&
            Boolean(index.aggregates.issueSeverityByType?.length),
    });
    const selectedType = (type ?? "").trim();
    const selectedRuns = selectedType
        ? listRunsForIssueType(filteredIndex, selectedType)
        : [];

    if (format === "csv") {
        const csv = issueExplorerToCsv(
            summaries,
            selectedType || undefined,
            selectedRuns,
        );
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="critique-issues.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        totalRuns: filteredIndex.totals.runs,
        totalRunsUnfiltered: index.totals.runs,
        filters: indexFilters,
        selectedType: selectedType || null,
        summaries,
        selectedRuns,
    });
}
