import { loadBenchmarkById } from "../../../../lib/data";

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    const benchmark = await loadBenchmarkById(id);
    if (!benchmark) {
        return Response.json({ error: "benchmark not found" }, { status: 404 });
    }
    return Response.json(benchmark);
}
