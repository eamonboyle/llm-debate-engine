import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../../lib/data";
import { questionGroupsToCsv } from "../../../lib/listExport";
import { groupArtifactsByQuestion } from "../../../lib/questionGroups";
import {
    resolveQuestionSortOrder,
    sortQuestionGroups,
} from "../../../lib/questionSort";
import { parseListPagination } from "../_shared/pagination";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);

    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const groups = groupArtifactsByQuestion(runs, benchmarks);
    const filtered = q
        ? groups.filter((group) => group.question.toLowerCase().includes(q))
        : groups;
    const sort = resolveQuestionSortOrder(
        url.searchParams.get("sort") ?? undefined,
    );
    const sorted = sortQuestionGroups(filtered, sort);
    const { offset, limit } = parseListPagination(url.searchParams);
    const items = sorted.slice(offset, offset + limit);

    if (format === "csv") {
        const csv = questionGroupsToCsv(items);
        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": 'attachment; filename="questions.csv"',
                "Cache-Control": "public, max-age=60",
            },
        });
    }

    return Response.json({
        total: groups.length,
        filtered: filtered.length,
        offset,
        limit,
        hasMore: offset + items.length < sorted.length,
        items,
    });
}
