import {
    isAnalysisRebuildEnabled,
    parseAnalysisRebuildFilters,
    rebuildAnalysisArtifacts,
} from "../../../../lib/rebuildAnalysis";

export async function POST(request?: Request) {
    if (!isAnalysisRebuildEnabled()) {
        return Response.json(
            {
                error: "Analysis rebuild is disabled in this deployment. Run pnpm analyze locally or set ANALYSIS_REBUILD_ENABLED=true on a writable RUNS_DIR.",
            },
            { status: 403 },
        );
    }

    let filters = {};
    if (request) {
        try {
            const contentType = request.headers.get("content-type") ?? "";
            if (contentType.includes("application/json")) {
                const body = (await request.json()) as unknown;
                if (body != null && typeof body === "object") {
                    filters = parseAnalysisRebuildFilters(body);
                }
            }
        } catch {
            return Response.json(
                { error: "Invalid rebuild request body" },
                { status: 400 },
            );
        }
    }

    try {
        const result = await rebuildAnalysisArtifacts(filters);
        return Response.json({
            ok: true,
            ...result,
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to rebuild analysis index";
        return Response.json({ error: message }, { status: 500 });
    }
}
