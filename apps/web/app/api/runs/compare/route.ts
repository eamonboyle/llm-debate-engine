import {
    csvCompareResponse,
    runCompareToCsv,
} from "../../../../lib/compareExport";
import { loadRunArtifacts } from "../../../../lib/data";
import { buildRunComparePayload } from "../../../../lib/runCompare";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const left = url.searchParams.get("left");
    const right = url.searchParams.get("right");

    if (!left || !right) {
        return Response.json(
            { error: "left and right run ids are required" },
            { status: 400 },
        );
    }

    const runs = await loadRunArtifacts();
    const leftRun = runs.find((run) => run.id === left);
    const rightRun = runs.find((run) => run.id === right);

    if (!leftRun || !rightRun) {
        return Response.json(
            { error: "one or both run ids not found" },
            { status: 404 },
        );
    }

    const payload = buildRunComparePayload(leftRun, rightRun);

    if (format === "csv") {
        return csvCompareResponse(
            runCompareToCsv(payload),
            `run-compare-${left}-vs-${right}.csv`,
        );
    }

    return Response.json(payload);
}
