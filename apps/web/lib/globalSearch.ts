import type { BenchmarkArtifact, RunArtifact } from "./data";
import {
    filterBenchmarkArtifacts,
    filterRunArtifacts,
    type ArtifactFilterParams,
} from "./data";
import { sortBenchmarkArtifacts, sortRunArtifacts } from "./artifactSort";
import {
    groupArtifactsByQuestion,
    questionHubHref,
    type QuestionGroup,
} from "./questionGroups";
import { sortQuestionGroups } from "./questionSort";

export type SearchSortOrder =
    | "relevance"
    | "newest"
    | "oldest"
    | "issues_desc"
    | "entropy_desc";

const SEARCH_SORT_ORDERS = new Set<SearchSortOrder>([
    "relevance",
    "newest",
    "oldest",
    "issues_desc",
    "entropy_desc",
]);

export function resolveSearchSortOrder(
    value: string | undefined,
): SearchSortOrder {
    if (value && SEARCH_SORT_ORDERS.has(value as SearchSortOrder)) {
        return value as SearchSortOrder;
    }
    return "relevance";
}

function applySearchSort<
    T extends RunArtifact | BenchmarkArtifact | QuestionGroup,
>(
    items: T[],
    sort: SearchSortOrder,
    kind: "runs" | "benchmarks" | "questions",
): T[] {
    if (sort === "relevance") return items;

    if (kind === "runs") {
        if (sort === "entropy_desc") return items;
        return sortRunArtifacts(items as RunArtifact[], sort) as T[];
    }

    if (kind === "benchmarks") {
        if (sort === "issues_desc") return items;
        return sortBenchmarkArtifacts(
            items as BenchmarkArtifact[],
            sort === "entropy_desc" ? "entropy_desc" : sort,
        ) as T[];
    }

    if (sort === "issues_desc" || sort === "entropy_desc") return items;
    return sortQuestionGroups(items as QuestionGroup[], sort) as T[];
}

export type GlobalSearchResult = {
    query: string;
    sort: SearchSortOrder;
    totals: {
        runs: number;
        benchmarks: number;
        questions: number;
    };
    runs: Array<{
        id: string;
        question: string;
        model: string;
        preset: string;
        createdAt: string;
        preview: string;
        issueCount: number;
    }>;
    benchmarks: Array<{
        id: string;
        question: string;
        model: string;
        preset: string;
        createdAt: string;
        runs: number;
        modeCount: number;
        entropy: number;
    }>;
    questions: QuestionGroup[];
};

function runIssueCount(run: RunArtifact): number {
    const byType = run.run.metrics.critique?.byType;
    if (!byType || typeof byType !== "object") return 0;
    let sum = 0;
    for (const value of Object.values(byType as Record<string, unknown>)) {
        if (typeof value === "number" && Number.isFinite(value)) {
            sum += value;
        }
    }
    return sum;
}

export function searchArtifacts(
    runs: RunArtifact[],
    benchmarks: BenchmarkArtifact[],
    query: string,
    opts: {
        limitPerSection?: number;
        filters?: Omit<ArtifactFilterParams, "q">;
        sort?: SearchSortOrder;
    } = {},
): GlobalSearchResult {
    const limit = opts.limitPerSection ?? 12;
    const sort = opts.sort ?? "relevance";
    const trimmed = query.trim();
    const filters: ArtifactFilterParams = {
        q: trimmed || undefined,
        ...opts.filters,
    };

    const matchedRuns = applySearchSort(
        filterRunArtifacts(runs, filters),
        sort,
        "runs",
    );
    const matchedBenchmarks = applySearchSort(
        filterBenchmarkArtifacts(benchmarks, filters),
        sort,
        "benchmarks",
    );
    const matchedQuestions = applySearchSort(
        trimmed
            ? groupArtifactsByQuestion(matchedRuns, matchedBenchmarks).filter(
                  (group) =>
                      group.question
                          .toLowerCase()
                          .includes(trimmed.toLowerCase()),
              )
            : groupArtifactsByQuestion(matchedRuns, matchedBenchmarks),
        sort,
        "questions",
    );

    return {
        query: trimmed,
        sort,
        totals: {
            runs: matchedRuns.length,
            benchmarks: matchedBenchmarks.length,
            questions: matchedQuestions.length,
        },
        runs: matchedRuns.slice(0, limit).map((run) => ({
            id: run.id,
            question: run.question,
            model: run.metadata.model,
            preset: run.metadata.pipelinePreset,
            createdAt: run.metadata.createdAt,
            preview: run.run.finalAnswer.slice(0, 160),
            issueCount: runIssueCount(run),
        })),
        benchmarks: matchedBenchmarks.slice(0, limit).map((benchmark) => ({
            id: benchmark.id,
            question: benchmark.question,
            model: benchmark.metadata.model,
            preset: benchmark.metadata.pipelinePreset,
            createdAt: benchmark.metadata.createdAt,
            runs: benchmark.payload.runs,
            modeCount: benchmark.payload.modeCount,
            entropy: benchmark.payload.divergenceEntropy,
        })),
        questions: matchedQuestions.slice(0, limit),
    };
}

export { questionHubHref };
