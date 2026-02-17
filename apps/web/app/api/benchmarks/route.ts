import {
    filterBenchmarkArtifacts,
    loadBenchmarkArtifacts,
} from "../../../lib/data";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const benchmarks = await loadBenchmarkArtifacts();
    const filtered = filterBenchmarkArtifacts(benchmarks, {
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
    });
    return Response.json({
        total: benchmarks.length,
        filtered: filtered.length,
        items: filtered,
    });
}
