import { loadRunById } from "../../../../lib/data";

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    const run = await loadRunById(id);
    if (!run) {
        return Response.json({ error: "run not found" }, { status: 404 });
    }
    const download = new URL(request.url).searchParams.get("download") === "1";
    const headers = download
        ? {
              "Content-Disposition": `attachment; filename="${id}.json"`,
          }
        : undefined;
    return Response.json(run, { headers });
}
