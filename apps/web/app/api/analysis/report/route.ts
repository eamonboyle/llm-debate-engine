import { loadAnalysisReport } from "../../../../lib/data";

export async function GET(request: Request) {
    const report = await loadAnalysisReport();
    if (!report) {
        return Response.json(
            { error: "analysis-report.md not found" },
            { status: 404 },
        );
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format")?.toLowerCase();

    if (format === "json") {
        return Response.json({ markdown: report });
    }

    return new Response(report, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": "public, max-age=60",
        },
    });
}
