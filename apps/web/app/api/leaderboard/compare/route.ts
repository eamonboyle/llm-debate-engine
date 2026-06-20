import {
    csvCompareResponse,
    modelCompareToCsv,
} from "../../../../lib/compareExport";
import { loadAnalysisIndex } from "../../../../lib/data";
import { buildModelComparePayload } from "../../../../lib/modelCompare";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const left = url.searchParams.get("left");
    const right = url.searchParams.get("right");

    if (!left || !right) {
        return Response.json(
            { error: "left and right model names are required" },
            { status: 400 },
        );
    }

    const index = await loadAnalysisIndex();
    if (!index) {
        return Response.json(
            { error: "analysis-index not found" },
            { status: 404 },
        );
    }

    const compare = buildModelComparePayload(index, left, right);
    if (!compare) {
        return Response.json(
            { error: "one or both models not found in analysis index" },
            { status: 404 },
        );
    }

    if (format === "csv") {
        return csvCompareResponse(
            modelCompareToCsv(compare),
            `model-compare-${left}-vs-${right}.csv`,
        );
    }

    return Response.json(compare);
}
