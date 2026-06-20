import { buildBenchmarkComparePayload } from "../../../../lib/benchmarkCompare";
import {
    benchmarkCompareToCsv,
    csvCompareResponse,
} from "../../../../lib/compareExport";
import { loadBenchmarksByIds } from "../../../../lib/data";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const left = url.searchParams.get("left");
    const right = url.searchParams.get("right");
    if (!left || !right) {
        return Response.json(
            { error: "left and right benchmark ids are required" },
            { status: 400 },
        );
    }

    const benchmarks = await loadBenchmarksByIds([left, right]);
    const leftBenchmark = benchmarks.find((benchmark) => benchmark.id === left);
    const rightBenchmark = benchmarks.find(
        (benchmark) => benchmark.id === right,
    );
    if (!leftBenchmark || !rightBenchmark) {
        return Response.json(
            { error: "one or both benchmark ids not found" },
            { status: 404 },
        );
    }

    const payload = buildBenchmarkComparePayload(leftBenchmark, rightBenchmark);

    if (format === "csv") {
        return csvCompareResponse(
            benchmarkCompareToCsv(payload),
            `benchmark-compare-${left}-vs-${right}.csv`,
        );
    }

    return Response.json(payload);
}
