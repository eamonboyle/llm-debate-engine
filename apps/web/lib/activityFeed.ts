import type { BenchmarkArtifact, RunArtifact } from "./data";

export type ActivityKind = "run" | "benchmark";

export type ActivityEntry = {
    id: string;
    kind: ActivityKind;
    createdAt: string;
    question: string;
    model: string;
    pipelinePreset: string;
    fastMode: boolean;
    href: string;
    detail: string;
};

export type ActivityFeedFilters = {
    kind?: ActivityKind | "all";
    q?: string;
};

function normalize(value: string | undefined): string {
    return (value ?? "").trim().toLowerCase();
}

export function buildActivityFeed(
    runs: RunArtifact[],
    benchmarks: BenchmarkArtifact[],
    filters: ActivityFeedFilters = {},
): ActivityEntry[] {
    const kind = filters.kind ?? "all";
    const q = normalize(filters.q);

    const runEntries: ActivityEntry[] = runs.map((run) => {
        const issueCount = run.run.metrics.critique?.issueCount;
        const detail =
            typeof issueCount === "number"
                ? `${issueCount} critique issue${issueCount === 1 ? "" : "s"}`
                : "Run trace";
        return {
            id: run.id,
            kind: "run",
            createdAt: run.metadata.createdAt,
            question: run.question,
            model: run.metadata.model,
            pipelinePreset: run.metadata.pipelinePreset,
            fastMode: run.metadata.fastMode,
            href: `/runs/${run.id}`,
            detail,
        };
    });

    const benchmarkEntries: ActivityEntry[] = benchmarks.map((benchmark) => ({
        id: benchmark.id,
        kind: "benchmark",
        createdAt: benchmark.metadata.createdAt,
        question: benchmark.question,
        model: benchmark.metadata.model,
        pipelinePreset: benchmark.metadata.pipelinePreset,
        fastMode: benchmark.metadata.fastMode,
        href: `/benchmarks/${benchmark.id}`,
        detail: `${benchmark.payload.runs} runs · ${benchmark.payload.modeCount} modes · entropy ${benchmark.payload.divergenceEntropy.toFixed(2)}`,
    }));

    let entries: ActivityEntry[] = [];
    if (kind === "run") entries = runEntries;
    else if (kind === "benchmark") entries = benchmarkEntries;
    else entries = [...runEntries, ...benchmarkEntries];

    if (q) {
        entries = entries.filter((entry) => {
            const haystack =
                `${entry.id} ${entry.question} ${entry.model} ${entry.pipelinePreset} ${entry.detail}`.toLowerCase();
            return haystack.includes(q);
        });
    }

    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
