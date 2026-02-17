import { loadAnalysisIndex } from "../../../lib/data";

export async function GET() {
    const index = await loadAnalysisIndex();
    if (!index) {
        return Response.json(
            { error: "analysis-index not found" },
            { status: 404 },
        );
    }
    return Response.json(index);
}
