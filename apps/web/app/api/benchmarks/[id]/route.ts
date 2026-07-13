import {
    loadAnalysisIndex,
    loadBenchmarkById,
    loadBenchmarkPairsById,
} from "../../../../lib/data";
import {
    buildBenchmarkRunRoster,
    sortBenchmarkRunRoster,
} from "../../../../lib/benchmarkRunRoster";
import { findMostSimilarPeerRunId } from "../../../../lib/benchmarkPeers";
import { benchmarkRunRosterToCsv } from "../../../../lib/listExport";
import { buildBenchmarkOutlierLookup } from "../../../../lib/outlierLookup";

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const benchmark = await loadBenchmarkById(id);
    if (!benchmark) {
        return Response.json({ error: "benchmark not found" }, { status: 404 });
    }

    if (format === "roster-csv") {
        const [pairsData, index] = await Promise.all([
            loadBenchmarkPairsById(id),
            loadAnalysisIndex(),
        ]);
        const pairs =
            pairsData.pairs.length > 0
                ? pairsData.pairs
                : (benchmark.payload.summary?.stability?.pairs ?? []);
        const rosterRunIds =
            pairsData.runIds.length > 0
                ? pairsData.runIds
                : (benchmark.payload.runIds ?? []);
        const outlierLookup = buildBenchmarkOutlierLookup(index, benchmark.id);
        const roster = sortBenchmarkRunRoster(
            buildBenchmarkRunRoster({
                runIds: rosterRunIds,
                pairs,
                modes: benchmark.payload.modes,
            }),
        ).map((row) => {
            const peerRunId = findMostSimilarPeerRunId(
                row.runId,
                rosterRunIds,
                pairs,
            );
            return {
                ...row,
                peerRunId,
                peerCompareHref: peerRunId
                    ? `/runs/compare?left=${row.runId}&right=${peerRunId}`
                    : null,
                isOutlier: outlierLookup.has(row.runId),
            };
        });
        const csv = benchmarkRunRosterToCsv(roster);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${id}-roster.csv"`,
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    const download = url.searchParams.get("download") === "1";
    const headers = download
        ? {
              "Content-Disposition": `attachment; filename="${id}.json"`,
          }
        : undefined;
    return Response.json(benchmark, { headers });
}
