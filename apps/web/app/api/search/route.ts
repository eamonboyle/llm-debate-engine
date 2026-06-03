import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../../lib/data";
import { searchArtifacts } from "../../../lib/globalSearch";
import { parsePositiveInt } from "../../../lib/listPagination";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const limit = parsePositiveInt(url.searchParams.get("limit") ?? undefined, {
        fallback: 12,
        max: 50,
    });

    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);

    const result = searchArtifacts(runs, benchmarks, query, {
        limitPerSection: limit,
    });

    return Response.json({
        ...result,
        storeTotals: {
            runs: runs.length,
            benchmarks: benchmarks.length,
        },
    });
}
