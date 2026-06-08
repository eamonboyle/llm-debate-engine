import { loadBenchmarkPairsExport } from "../../../../lib/data";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const pairs = await loadBenchmarkPairsExport();

    if (!pairs) {
        return Response.json(
            { error: "analysis-benchmark-pairs.json not found" },
            { status: 404 },
        );
    }

    const body = JSON.stringify(pairs, null, 2);
    const headers: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60",
    };

    if (download) {
        headers["Content-Disposition"] =
            'attachment; filename="analysis-benchmark-pairs.json"';
    }

    return new Response(body, { headers });
}
