import { loadRunById } from "../../../../lib/data";

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    const run = await loadRunById(id);
    if (!run) {
        return Response.json({ error: "run not found" }, { status: 404 });
    }
    return Response.json(run);
}
