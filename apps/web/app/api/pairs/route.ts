import { loadBenchmarkArtifacts } from "../../../lib/data";
import { pairsExplorerToCsv } from "../../../lib/listExport";
import {
    buildBenchmarkPairDetails,
    buildBenchmarkPairSummaries,
} from "../../../lib/pairsExplorer";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const benchmark = url.searchParams.get("benchmark") ?? undefined;
    const benchmarks = await loadBenchmarkArtifacts();
    const summaries = await buildBenchmarkPairSummaries(benchmarks);

    if (benchmark) {
        const details = await buildBenchmarkPairDetails(benchmark, benchmarks);
        if (format === "csv") {
            const csv = pairsExplorerToCsv(
                details.summary ? [details.summary] : [],
                details.pairs,
            );
            return new Response(csv, {
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="benchmark-pairs-${benchmark}.csv"`,
                    "Cache-Control": "public, max-age=60",
                },
            });
        }

        return Response.json({
            benchmark,
            summary: details.summary,
            pairCount: details.pairs.length,
            pairs: details.pairs,
        });
    }

    if (format === "csv") {
        const csv = pairsExplorerToCsv(summaries, []);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="benchmark-pairs.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        benchmarkCount: summaries.length,
        totalPairs: summaries.reduce((sum, row) => sum + row.pairCount, 0),
        summaries,
    });
}
