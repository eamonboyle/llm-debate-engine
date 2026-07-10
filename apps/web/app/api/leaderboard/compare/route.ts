import {
    csvCompareResponse,
    modelCompareToCsv,
} from "../../../../lib/compareExport";
import { pickIndexFilterParams } from "../../../../lib/compareFilterParams";
import { loadAnalysisIndex } from "../../../../lib/data";
import { applyIndexFilters } from "../../../../lib/indexFilters";
import { buildModelComparePayload } from "../../../../lib/modelCompare";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const left = url.searchParams.get("left");
    const right = url.searchParams.get("right");
    const filterParams = pickIndexFilterParams({
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
    });

    if (!left || !right) {
        return Response.json(
            { error: "left and right model names are required" },
            { status: 400 },
        );
    }

    const rawIndex = await loadAnalysisIndex();
    if (!rawIndex) {
        return Response.json(
            { error: "analysis-index not found" },
            { status: 404 },
        );
    }

    const index = applyIndexFilters(rawIndex, filterParams);
    const compare = buildModelComparePayload(index, left, right, {
        linkFilters: filterParams,
    });
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
