import type { BenchmarkArtifact, RunArtifact } from "./data";
import {
    filterBenchmarkArtifacts,
    filterRunArtifacts,
    type ArtifactFilterParams,
} from "./data";
import {
    sortArtifactsByCreatedAt,
    sortBenchmarkArtifacts,
    sortRunArtifacts,
    type SearchSortOrder,
} from "./artifactSort";
import {
    groupArtifactsByQuestion,
    questionHubHref,
    type QuestionGroup,
} from "./questionGroups";

export type { SearchSortOrder };

export type GlobalSearchResult = {
    query: string;
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

    const matchedRuns = filterRunArtifacts(runs, filters);
    const matchedBenchmarks = filterBenchmarkArtifacts(benchmarks, filters);
    const matchedQuestions = trimmed
        ? groupArtifactsByQuestion(matchedRuns, matchedBenchmarks).filter(
              (group) =>
                  group.question.toLowerCase().includes(trimmed.toLowerCase()),
          )
        : groupArtifactsByQuestion(matchedRuns, matchedBenchmarks);

    const sortedRuns =
        sort === "relevance" || sort === "entropy_desc"
            ? matchedRuns
            : sortRunArtifacts(matchedRuns, sort);
    const sortedBenchmarks =
        sort === "relevance" || sort === "issues_desc"
            ? matchedBenchmarks
            : sort === "entropy_desc"
              ? sortBenchmarkArtifacts(matchedBenchmarks, "entropy_desc")
              : sortArtifactsByCreatedAt(
                    matchedBenchmarks,
                    sort === "oldest" ? "oldest" : "newest",
                );
    const sortedQuestions =
        sort === "relevance"
            ? matchedQuestions
            : [...matchedQuestions].sort((a, b) => {
                  const totalA = a.runCount + a.benchmarkCount;
                  const totalB = b.runCount + b.benchmarkCount;
                  if (totalA !== totalB) {
                      return sort === "oldest"
                          ? totalA - totalB
                          : totalB - totalA;
                  }
                  return a.question.localeCompare(b.question);
              });

    return {
        query: trimmed,
        totals: {
            runs: matchedRuns.length,
            benchmarks: matchedBenchmarks.length,
            questions: matchedQuestions.length,
        },
        runs: sortedRuns.slice(0, limit).map((run) => ({
            id: run.id,
            question: run.question,
            model: run.metadata.model,
            preset: run.metadata.pipelinePreset,
            createdAt: run.metadata.createdAt,
            preview: run.run.finalAnswer.slice(0, 160),
        })),
        benchmarks: sortedBenchmarks.slice(0, limit).map((benchmark) => ({
            id: benchmark.id,
            question: benchmark.question,
            model: benchmark.metadata.model,
            preset: benchmark.metadata.pipelinePreset,
            createdAt: benchmark.metadata.createdAt,
            runs: benchmark.payload.runs,
            modeCount: benchmark.payload.modeCount,
            entropy: benchmark.payload.divergenceEntropy,
        })),
        questions: sortedQuestions.slice(0, limit),
    };
}

export { questionHubHref };
