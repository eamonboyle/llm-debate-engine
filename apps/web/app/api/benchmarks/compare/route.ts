import { loadBenchmarksByIds } from "../../../../lib/data";

function toNumberOrNull(value: unknown): number | null {
    return typeof value === "number" ? value : null;
}

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

    const leftStability = toNumberOrNull(
        leftBenchmark.payload.summary?.stability?.pairwiseMean,
    );
    const rightStability = toNumberOrNull(
        rightBenchmark.payload.summary?.stability?.pairwiseMean,
    );

    return Response.json({
        left: {
            id: leftBenchmark.id,
            runs: leftBenchmark.payload.runs,
            modeCount: leftBenchmark.payload.modeCount,
            divergenceEntropy: leftBenchmark.payload.divergenceEntropy,
            stabilityPairwiseMean: leftStability,
        },
        right: {
            id: rightBenchmark.id,
            runs: rightBenchmark.payload.runs,
            modeCount: rightBenchmark.payload.modeCount,
            divergenceEntropy: rightBenchmark.payload.divergenceEntropy,
            stabilityPairwiseMean: rightStability,
        },
        delta: {
            runs: rightBenchmark.payload.runs - leftBenchmark.payload.runs,
            modeCount:
                rightBenchmark.payload.modeCount - leftBenchmark.payload.modeCount,
            divergenceEntropy:
                rightBenchmark.payload.divergenceEntropy -
                leftBenchmark.payload.divergenceEntropy,
            stabilityPairwiseMean:
                typeof leftStability === "number" &&
                typeof rightStability === "number"
                    ? rightStability - leftStability
                    : null,
        },
    });
}
