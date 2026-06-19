import {
    buildFailureModeSummaries,
    listRunsForFailureMode,
} from "../../../lib/counterfactualExplorer";
import { loadAnalysisIndex } from "../../../lib/data";
import { applyIndexFilters } from "../../../lib/indexFilters";
import { counterfactualExplorerToCsv } from "../../../lib/listExport";

function readFilterParams(url: URL) {
    return {
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        mode: url.searchParams.get("mode") ?? undefined,
    };
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const filters = readFilterParams(url);
    const { mode, ...indexFilters } = filters;
    const index = await loadAnalysisIndex();

    if (!index) {
        return Response.json(
            { error: "analysis-index not found" },
            { status: 404 },
        );
    }

    const filteredIndex = applyIndexFilters(index, indexFilters);
    const summaries = buildFailureModeSummaries(filteredIndex);
    const selectedMode = (mode ?? "").trim();
    const selectedRuns = selectedMode
        ? listRunsForFailureMode(filteredIndex, selectedMode)
        : [];

    if (format === "csv") {
        const csv = counterfactualExplorerToCsv(
            summaries,
            selectedMode || undefined,
            selectedRuns,
        );
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="counterfactual-modes.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        totalRuns: filteredIndex.totals.runs,
        totalRunsUnfiltered: index.totals.runs,
        filters: indexFilters,
        selectedMode: selectedMode || null,
        summaries,
        selectedRuns,
    });
}
