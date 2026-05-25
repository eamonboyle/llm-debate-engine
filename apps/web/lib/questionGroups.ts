import type { BenchmarkArtifact, RunArtifact } from "./data";

export type QuestionGroup = {
    question: string;
    runCount: number;
    benchmarkCount: number;
    latestCreatedAt: string;
    models: string[];
    presets: string[];
    sampleRunId: string | null;
    sampleBenchmarkId: string | null;
};

function uniqueSorted(values: string[]): string[] {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function questionHubHref(question: string): string {
    return `/questions/view?${new URLSearchParams({ question }).toString()}`;
}

export function groupArtifactsByQuestion(
    runs: RunArtifact[],
    benchmarks: BenchmarkArtifact[],
): QuestionGroup[] {
    const byQuestion = new Map<
        string,
        {
            runs: RunArtifact[];
            benchmarks: BenchmarkArtifact[];
        }
    >();

    for (const run of runs) {
        const entry = byQuestion.get(run.question) ?? {
            runs: [],
            benchmarks: [],
        };
        entry.runs.push(run);
        byQuestion.set(run.question, entry);
    }

    for (const benchmark of benchmarks) {
        const entry = byQuestion.get(benchmark.question) ?? {
            runs: [],
            benchmarks: [],
        };
        entry.benchmarks.push(benchmark);
        byQuestion.set(benchmark.question, entry);
    }

    const groups: QuestionGroup[] = [];
    for (const [
        question,
        { runs: qRuns, benchmarks: qBenchmarks },
    ] of byQuestion) {
        const latestRun = qRuns[0]?.metadata.createdAt ?? "";
        const latestBench = qBenchmarks[0]?.metadata.createdAt ?? "";
        const latestCreatedAt =
            [latestRun, latestBench].sort().reverse()[0] ?? "";

        groups.push({
            question,
            runCount: qRuns.length,
            benchmarkCount: qBenchmarks.length,
            latestCreatedAt,
            models: uniqueSorted([
                ...qRuns.map((r) => r.metadata.model),
                ...qBenchmarks.map((b) => b.metadata.model),
            ]),
            presets: uniqueSorted([
                ...qRuns.map((r) => r.metadata.pipelinePreset),
                ...qBenchmarks.map((b) => b.metadata.pipelinePreset),
            ]),
            sampleRunId: qRuns[0]?.id ?? null,
            sampleBenchmarkId: qBenchmarks[0]?.id ?? null,
        });
    }

    return groups.sort((a, b) =>
        b.latestCreatedAt.localeCompare(a.latestCreatedAt),
    );
}
