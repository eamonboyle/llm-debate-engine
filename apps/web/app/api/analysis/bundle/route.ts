import { loadAnalysisBundle } from "../../../../lib/data";

export async function GET(request?: Request) {
    const bundle = await loadAnalysisBundle();
    if (!bundle) {
        return Response.json(
            { error: "analysis-bundle.json not found" },
            { status: 404 },
        );
    }

    const download =
        request != null &&
        new URL(request.url).searchParams.get("download") === "1";

    if (download) {
        return new Response(JSON.stringify(bundle, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition":
                    'attachment; filename="analysis-bundle.json"',
            },
        });
    }

    return Response.json(bundle);
}
