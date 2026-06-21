import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../../lib/data";
import { questionGroupsToCsv } from "../../../lib/listExport";
import {
    filterArtifactsForQuestionGroups,
    groupArtifactsByQuestion,
} from "../../../lib/questionGroups";
import {
    resolveQuestionSortOrder,
    sortQuestionGroups,
} from "../../../lib/questionSort";
import { parseListPagination } from "../_shared/pagination";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";
    const [allRuns, allBenchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);

    const filters = {
        q: url.searchParams.get("q") ?? undefined,
        model: url.searchParams.get("model") ?? undefined,
        preset: url.searchParams.get("preset") ?? undefined,
        fast: url.searchParams.get("fast") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
    };

    const { runs, benchmarks } = filterArtifactsForQuestionGroups(
        allRuns,
        allBenchmarks,
        filters,
    );
    const groups = groupArtifactsByQuestion(runs, benchmarks);

    const q = (filters.q ?? "").trim().toLowerCase();
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
