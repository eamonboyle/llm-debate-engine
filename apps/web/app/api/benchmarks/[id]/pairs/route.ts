import { loadBenchmarkPairsById } from "../../../../../lib/data";

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    const pairwise = await loadBenchmarkPairsById(id);
    return Response.json(pairwise);
}
