import {
    filterBenchmarkArtifacts,
    filterRunArtifacts,
    loadBenchmarkArtifacts,
    loadRunArtifacts,
} from "../../../../lib/data";
import { questionHubArtifactsToCsv } from "../../../../lib/listExport";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const question = (url.searchParams.get("question") ?? "").trim();
    if (!question) {
        return Response.json(
            { error: "question query parameter is required" },
            { status: 400 },
        );
    }

    const format = url.searchParams.get("format") ?? "json";
    const filters = {
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
    };

    const [allRuns, allBenchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const runs = filterRunArtifacts(allRuns, filters).filter(
        (run) => run.question === question,
    );
    const benchmarks = filterBenchmarkArtifacts(allBenchmarks, filters).filter(
        (benchmark) => benchmark.question === question,
    );

    if (format === "csv") {
        const csv = questionHubArtifactsToCsv(question, runs, benchmarks);
        const slug = question.slice(0, 48).replace(/[^\w.-]+/g, "_");
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="question-hub-${slug || "export"}.csv"`,
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        question,
        totals: {
            runs: runs.length,
            benchmarks: benchmarks.length,
        },
        runs,
        benchmarks,
    });
}
