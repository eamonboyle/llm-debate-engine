import { loadAnalysisIndex, loadDataStatus } from "../../../lib/data";

export async function GET() {
    const [status, index] = await Promise.all([
        loadDataStatus(),
        loadAnalysisIndex(),
    ]);

    const artifactsReady =
        status.artifactCounts.runs > 0 || status.artifactCounts.benchmarks > 0;
    const indexReady = status.hasAnalysisIndex || status.hasAnalysisBundle;

    return Response.json({
        ...status,
        readiness: {
            artifacts: artifactsReady,
            analysisIndex: indexReady,
            markdownReport: status.hasAnalysisReport,
            benchmarkPairs: status.hasBenchmarkPairs,
        },
        indexGeneratedAt: index?.generatedAt ?? null,
        indexTotals: index?.totals ?? null,
    });
}
