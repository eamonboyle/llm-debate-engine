import { loadAnalysisIndex } from "../../../lib/data";
import { applyIndexFilters } from "../../../lib/indexFilters";
import { reviewQueueToCsv } from "../../../lib/listExport";
import { buildOutlierExplorerRows } from "../../../lib/outlierExplorer";
import { buildReviewQueue } from "../../../lib/reviewQueue";

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
    const outlierRows = await buildOutlierExplorerRows(filteredIndex);
    const outlierPeerCompare = new Map(
        outlierRows.map((row) => [row.runId, row.peerRunId]),
    );
    const items = buildReviewQueue(filteredIndex, { outlierPeerCompare });

    if (format === "csv") {
        const csv = reviewQueueToCsv(items);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="review-queue.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        totalRuns: filteredIndex.totals.runs,
        totalRunsUnfiltered: index.totals.runs,
        filters,
        flaggedCount: items.length,
        items,
    });
}
