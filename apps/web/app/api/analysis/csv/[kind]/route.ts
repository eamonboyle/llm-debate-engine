import { loadAnalysisCsv, type AnalysisCsvKind } from "../../../../../lib/data";

const VALID_KINDS = new Set<AnalysisCsvKind>(["runs", "benchmarks"]);

export async function GET(
    _request: Request,
    context: { params: Promise<{ kind: string }> },
) {
    const { kind: rawKind } = await context.params;
    const kind = rawKind as AnalysisCsvKind;

    if (!VALID_KINDS.has(kind)) {
        return Response.json(
            { error: "kind must be runs or benchmarks" },
            { status: 400 },
        );
    }

    const csv = await loadAnalysisCsv(kind);
    if (!csv) {
        return Response.json(
            { error: `analysis-${kind}.csv not found` },
            { status: 404 },
        );
    }

    return new Response(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="analysis-${kind}.csv"`,
            "Cache-Control": "public, max-age=60",
        },
    });
}
