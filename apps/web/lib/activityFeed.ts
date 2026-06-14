import type { BenchmarkArtifact, RunArtifact } from "./data";

export type ActivityKind = "run" | "benchmark";

export type ActivitySortOrder = "newest" | "oldest";

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
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
    sort?: ActivitySortOrder;
};

function normalize(value: string | undefined): string {
    return (value ?? "").trim().toLowerCase();
}

function parseDateInput(v: string | undefined): Date | undefined {
    if (!v) return undefined;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return undefined;
    return d;
}

function parseFastFilter(v: string | undefined): boolean | undefined {
    const n = normalize(v);
    if (n === "true") return true;
    if (n === "false") return false;
    return undefined;
}

export function resolveActivitySortOrder(
    value: string | undefined,
): ActivitySortOrder {
    return value === "oldest" ? "oldest" : "newest";
}

export function buildActivityFeed(
    runs: RunArtifact[],
    benchmarks: BenchmarkArtifact[],
    filters: ActivityFeedFilters = {},
): ActivityEntry[] {
    const kind = filters.kind ?? "all";
    const q = normalize(filters.q);
    const model = normalize(filters.model);
    const preset = normalize(filters.preset);
    const fast = parseFastFilter(filters.fast);
    const fromDate = parseDateInput(filters.from);
    const toDate = parseDateInput(filters.to);
    const sort = filters.sort ?? "newest";

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

    entries = entries.filter((entry) => {
        if (q) {
            const haystack =
                `${entry.id} ${entry.question} ${entry.model} ${entry.pipelinePreset} ${entry.detail}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        if (model && !entry.model.toLowerCase().includes(model)) {
            return false;
        }
        if (preset && entry.pipelinePreset.toLowerCase() !== preset) {
            return false;
        }
        if (typeof fast === "boolean" && entry.fastMode !== fast) {
            return false;
        }
        const createdAt = new Date(entry.createdAt);
        if (
            fromDate &&
            !Number.isNaN(createdAt.getTime()) &&
            createdAt < fromDate
        ) {
            return false;
        }
        if (
            toDate &&
            !Number.isNaN(createdAt.getTime()) &&
            createdAt > toDate
        ) {
            return false;
        }
        return true;
    });

    return entries.sort((a, b) =>
        sort === "newest"
            ? b.createdAt.localeCompare(a.createdAt)
            : a.createdAt.localeCompare(b.createdAt),
    );
}
