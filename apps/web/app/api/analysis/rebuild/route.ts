import {
    isAnalysisRebuildEnabled,
    rebuildAnalysisArtifacts,
} from "../../../../lib/rebuildAnalysis";

export async function POST() {
    if (!isAnalysisRebuildEnabled()) {
        return Response.json(
            {
                error: "Analysis rebuild is disabled in this deployment. Run pnpm analyze locally or set ANALYSIS_REBUILD_ENABLED=true on a writable RUNS_DIR.",
            },
            { status: 403 },
        );
    }

    try {
        const result = await rebuildAnalysisArtifacts();
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
