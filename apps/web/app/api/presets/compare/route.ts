import {
    csvCompareResponse,
    presetCompareToCsv,
} from "../../../../lib/compareExport";
import { loadAnalysisIndex } from "../../../../lib/data";
import { buildPresetComparePayload } from "../../../../lib/presetCompare";

function resolveFastMode(value: string | null): boolean | undefined {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const left = url.searchParams.get("left");
    const right = url.searchParams.get("right");
    const fastMode = resolveFastMode(url.searchParams.get("fast"));

    if (!left || !right) {
        return Response.json(
            { error: "left and right preset names are required" },
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

    const compare = buildPresetComparePayload(index, left, right, { fastMode });
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
