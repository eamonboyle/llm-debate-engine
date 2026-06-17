import { filterRunArtifacts, loadRunArtifacts } from "../../../lib/data";
import { agentTimingToCsv } from "../../../lib/listExport";
import {
    buildAgentTimingStats,
    summarizeStepTiming,
} from "../../../lib/stepTiming";

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
    const allRuns = await loadRunArtifacts();
    const runs = filterRunArtifacts(allRuns, filters);
    const summary = summarizeStepTiming(runs);
    const rows = buildAgentTimingStats(runs);

    if (format === "csv") {
        const csv = agentTimingToCsv(rows);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="pipeline-timing.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        totalRuns: allRuns.length,
        filteredRuns: runs.length,
        filters,
        summary,
        rows,
    });
}
