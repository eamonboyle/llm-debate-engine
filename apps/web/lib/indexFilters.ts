import type { AnalysisIndex, ArtifactFilterParams } from "./data";

type IndexRun = AnalysisIndex["runs"][number];
type IndexBenchmark = AnalysisIndex["benchmarks"][number];

const KNOWN_PRESET_ORDER = ["standard", "research_deep", "fast_research"];

function normalize(v: string | undefined) {
    return (v ?? "").trim().toLowerCase();
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

export function hasActiveIndexFilters(filters: ArtifactFilterParams): boolean {
    return Boolean(
        normalize(filters.q) ||
        normalize(filters.model) ||
        normalize(filters.preset) ||
        parseFastFilter(filters.fast) !== undefined ||
        parseDateInput(filters.from) ||
        parseDateInput(filters.to),
    );
}

export function filterIndexRuns(
    runs: IndexRun[],
    filters: ArtifactFilterParams,
): IndexRun[] {
    const q = normalize(filters.q);
    const model = normalize(filters.model);
    const preset = normalize(filters.preset);
    const fast = parseFastFilter(filters.fast);
    const fromDate = parseDateInput(filters.from);
    const toDate = parseDateInput(filters.to);

    return runs.filter((run) => {
        if (q) {
            const haystack =
                `${run.id} ${run.question} ${run.finalAnswerPreview}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        if (model && !run.model.toLowerCase().includes(model)) {
            return false;
        }
        if (preset && run.pipelinePreset.toLowerCase() !== preset) {
            return false;
        }
        if (typeof fast === "boolean" && run.fastMode !== fast) {
            return false;
        }
        const createdAt = new Date(run.createdAt);
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
}

export function filterIndexBenchmarks(
    benchmarks: IndexBenchmark[],
    filters: ArtifactFilterParams,
): IndexBenchmark[] {
    const q = normalize(filters.q);
    const model = normalize(filters.model);
    const preset = normalize(filters.preset);
    const fast = parseFastFilter(filters.fast);
    const fromDate = parseDateInput(filters.from);
    const toDate = parseDateInput(filters.to);

    return benchmarks.filter((benchmark) => {
        if (q) {
            const haystack =
                `${benchmark.id} ${benchmark.question}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        if (model && !benchmark.model.toLowerCase().includes(model)) {
            return false;
        }
        if (preset && benchmark.pipelinePreset.toLowerCase() !== preset) {
            return false;
        }
        if (typeof fast === "boolean" && benchmark.fastMode !== fast) {
            return false;
        }
        const createdAt = new Date(benchmark.createdAt);
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
}

export function collectIndexFacets(index: AnalysisIndex): {
    models: string[];
    presets: string[];
} {
    const models = [...new Set(index.runs.map((run) => run.model))].sort(
        (a, b) => a.localeCompare(b),
    );

    const fromIndex = [
        ...new Set([
            ...index.runs.map((run) => run.pipelinePreset),
            ...index.benchmarks.map((benchmark) => benchmark.pipelinePreset),
        ]),
    ];

    const presets = [
        ...KNOWN_PRESET_ORDER.filter((preset) => fromIndex.includes(preset)),
        ...fromIndex.filter((preset) => !KNOWN_PRESET_ORDER.includes(preset)),
    ];

    return { models, presets };
}

export function applyIndexFilters(
    index: AnalysisIndex,
    filters: ArtifactFilterParams,
): AnalysisIndex {
    const filteredRuns = filterIndexRuns(index.runs, filters);
    const filteredBenchmarks = filterIndexBenchmarks(index.benchmarks, filters);
    const runIds = new Set(filteredRuns.map((run) => run.id));
    const outlierRuns = index.aggregates.outlierRuns?.filter((row) =>
        runIds.has(row.runId),
    );

    return {
        ...index,
        runs: filteredRuns,
        benchmarks: filteredBenchmarks,
        totals: {
            ...index.totals,
            runs: filteredRuns.length,
            benchmarks: filteredBenchmarks.length,
        },
        aggregates: {
            ...index.aggregates,
            outlierRuns,
        },
    };
}

export function buildPresetCountsFromRuns(
    runs: IndexRun[],
): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const run of runs) {
        counts[run.pipelinePreset] = (counts[run.pipelinePreset] ?? 0) + 1;
    }
    return counts;
}

export function buildEvidenceRiskDistribution(
    runs: IndexRun[],
): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const run of runs) {
        const level = run.research?.evidenceRiskLevel;
        if (typeof level !== "number" || !Number.isFinite(level)) continue;
        const key = String(level);
        distribution[key] = (distribution[key] ?? 0) + 1;
    }
    return distribution;
}
