import { collectArtifactFacets } from "../../../lib/artifactFacets";
import {
    filterRunArtifacts,
    loadBenchmarkArtifacts,
    loadRunArtifacts,
} from "../../../lib/data";
import { pipelineErrorsToCsv } from "../../../lib/listExport";
import { buildPipelineErrorRows } from "../../../lib/pipelineErrors";

function readFilterParams(url: URL) {
    return {
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        agent: url.searchParams.get("agent") ?? undefined,
    };
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const filters = readFilterParams(url);
    const [allRuns, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const filteredRuns = filterRunArtifacts(allRuns, filters);
    const rows = buildPipelineErrorRows(filteredRuns, {
        agent: filters.agent,
    });

    if (format === "csv") {
        const csv = pipelineErrorsToCsv(rows);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="pipeline-errors.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    const { models, presets } = collectArtifactFacets(allRuns, benchmarks);

    return Response.json({
        totalRuns: filteredRuns.length,
        totalRunsUnfiltered: allRuns.length,
        filters,
        errorCount: rows.length,
        models,
        presets,
        rows,
    });
}
