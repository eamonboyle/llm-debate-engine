import { filterRunArtifacts, loadRunArtifacts } from "../../../lib/data";
import {
    agentTimingToCsv,
    slowestRunTimingToCsv,
} from "../../../lib/listExport";
import {
    buildAgentTimingStats,
    buildSlowestRunRows,
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
    const slowestRuns = buildSlowestRunRows(runs);

    if (format === "csv") {
        const scope = url.searchParams.get("scope") ?? "agents";
        const csv =
            scope === "runs"
                ? slowestRunTimingToCsv(slowestRuns)
                : agentTimingToCsv(rows);
        const filename =
            scope === "runs"
                ? "pipeline-timing-slowest-runs.csv"
                : "pipeline-timing.csv";
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
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
        slowestRuns,
    });
}
