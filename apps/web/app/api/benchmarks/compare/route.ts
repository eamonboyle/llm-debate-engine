import { loadBenchmarksByIds } from "../../../../lib/data";
import { buildBenchmarkComparePayload } from "../../../../lib/benchmarkCompare";

export async function GET(request: Request) {
    const url = new URL(request.url);
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
    const rightBenchmark = benchmarks.find((benchmark) => benchmark.id === right);
    if (!leftBenchmark || !rightBenchmark) {
        return Response.json(
            { error: "one or both benchmark ids not found" },
            { status: 404 },
        );
    }

    return Response.json(buildBenchmarkComparePayload(leftBenchmark, rightBenchmark));
}
