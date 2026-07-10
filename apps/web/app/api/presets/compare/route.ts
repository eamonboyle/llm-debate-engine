import {
    csvCompareResponse,
    presetCompareToCsv,
} from "../../../../lib/compareExport";
import { pickIndexFilterParams } from "../../../../lib/compareFilterParams";
import { loadAnalysisIndex } from "../../../../lib/data";
import { applyIndexFilters } from "../../../../lib/indexFilters";
import { buildPresetComparePayload } from "../../../../lib/presetCompare";

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
            { error: "left and right preset names are required" },
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
    const compare = buildPresetComparePayload(index, left, right, {
        linkFilters: filterParams,
    });
    if (!compare) {
        return Response.json(
            { error: "one or both presets not found in analysis index" },
            { status: 404 },
        );
    }

    if (format === "csv") {
        return csvCompareResponse(
            presetCompareToCsv(compare),
            `preset-compare-${left}-vs-${right}.csv`,
        );
    }

    return Response.json(compare);
}
