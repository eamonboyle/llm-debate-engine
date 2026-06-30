import type { QuestionGroup } from "./questionGroups";
import { sortQuestionGroups } from "./questionSort";

export type TopQuestionRow = {
    question: string;
    runCount: number;
    benchmarkCount: number;
    totalExperiments: number;
    latestCreatedAt: string;
    hubHref: string;
};

export function buildTopQuestions(
    groups: QuestionGroup[],
    limit = 8,
): TopQuestionRow[] {
    const sorted = sortQuestionGroups(groups, "most-experiments");
    return sorted.slice(0, limit).map((group) => ({
        question: group.question,
        runCount: group.runCount,
        benchmarkCount: group.benchmarkCount,
        totalExperiments: group.runCount + group.benchmarkCount,
        latestCreatedAt: group.latestCreatedAt,
        hubHref: `/questions/view?${new URLSearchParams({ question: group.question }).toString()}`,
    }));
}
