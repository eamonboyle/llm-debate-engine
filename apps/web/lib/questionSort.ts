import type { QuestionGroup } from "./questionGroups";

export type QuestionSortOrder =
    | "newest"
    | "oldest"
    | "most-runs"
    | "most-experiments";

export function resolveQuestionSortOrder(
    value: string | undefined,
): QuestionSortOrder {
    if (
        value === "oldest" ||
        value === "most-runs" ||
        value === "most-experiments"
    ) {
        return value;
    }
    return "newest";
}

export function sortQuestionGroups(
    groups: QuestionGroup[],
    sort: QuestionSortOrder,
): QuestionGroup[] {
    const copy = [...groups];

    if (sort === "most-runs") {
        return copy.sort(
            (a, b) =>
                b.runCount - a.runCount ||
                b.latestCreatedAt.localeCompare(a.latestCreatedAt),
        );
    }

    if (sort === "most-experiments") {
        return copy.sort((a, b) => {
            const totalA = a.runCount + a.benchmarkCount;
            const totalB = b.runCount + b.benchmarkCount;
            return (
                totalB - totalA ||
                b.latestCreatedAt.localeCompare(a.latestCreatedAt)
            );
        });
    }

    return copy.sort((a, b) => {
        const cmp = a.latestCreatedAt.localeCompare(b.latestCreatedAt);
        return sort === "oldest" ? cmp : -cmp;
    });
}
