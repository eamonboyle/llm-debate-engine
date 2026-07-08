import {
    filterBenchmarkArtifacts,
    filterRunArtifacts,
    type ArtifactFilterParams,
    type BenchmarkArtifact,
    type RunArtifact,
} from "./data";

export type CatalogFilterParams = ArtifactFilterParams;

export type CatalogModelRow = {
    model: string;
    runCount: number;
    benchmarkCount: number;
    total: number;
};

export type CatalogPresetRow = {
    preset: string;
    runCount: number;
    benchmarkCount: number;
    total: number;
};

export type CatalogComboRow = {
    model: string;
    preset: string;
    runCount: number;
    benchmarkCount: number;
    total: number;
};

export type CatalogStats = {
    models: CatalogModelRow[];
    presets: CatalogPresetRow[];
    combos: CatalogComboRow[];
    totals: {
        runs: number;
        benchmarks: number;
        uniqueModels: number;
        uniquePresets: number;
    };
};

function bump(
    map: Map<string, { runs: number; benchmarks: number }>,
    key: string,
    kind: "runs" | "benchmarks",
) {
    const entry = map.get(key) ?? { runs: 0, benchmarks: 0 };
    entry[kind] += 1;
    map.set(key, entry);
}

function matchesCatalogQuery(
    haystack: string,
    query: string | undefined,
): boolean {
    const q = (query ?? "").trim().toLowerCase();
    if (!q) return true;
    return haystack.toLowerCase().includes(q);
}

export function hasActiveCatalogFilters(filters: CatalogFilterParams): boolean {
    return Boolean(
        (filters.q ?? "").trim() ||
        (filters.model ?? "").trim() ||
        (filters.preset ?? "").trim() ||
        filters.fast === "true" ||
        filters.fast === "false" ||
        (filters.from ?? "").trim() ||
        (filters.to ?? "").trim(),
    );
}

export function filterCatalogArtifacts(
    runs: RunArtifact[],
    benchmarks: BenchmarkArtifact[],
    filters: CatalogFilterParams,
): { runs: RunArtifact[]; benchmarks: BenchmarkArtifact[] } {
    const facetFilters = {
        model: filters.model,
        preset: filters.preset,
        fast: filters.fast,
        from: filters.from,
        to: filters.to,
    };

    return {
        runs: filterRunArtifacts(runs, facetFilters),
        benchmarks: filterBenchmarkArtifacts(benchmarks, facetFilters),
    };
}

export function buildFilteredCatalogStats(
    runs: RunArtifact[],
    benchmarks: BenchmarkArtifact[],
    filters: CatalogFilterParams,
): CatalogStats {
    const { runs: facetRuns, benchmarks: facetBenchmarks } =
        filterCatalogArtifacts(runs, benchmarks, filters);
    const stats = buildCatalogStats(facetRuns, facetBenchmarks);
    return filterCatalogStats(stats, filters.q);
}

export function filterCatalogStats(
    stats: CatalogStats,
    query: string | undefined,
): CatalogStats {
    const models = stats.models.filter((row) =>
        matchesCatalogQuery(row.model, query),
    );
    const presets = stats.presets.filter((row) =>
        matchesCatalogQuery(row.preset, query),
    );
    const combos = stats.combos.filter(
        (row) =>
            matchesCatalogQuery(row.model, query) ||
            matchesCatalogQuery(row.preset, query) ||
            matchesCatalogQuery(`${row.model} ${row.preset}`, query),
    );

    return {
        models,
        presets,
        combos,
        totals: stats.totals,
    };
}

export function buildCatalogStats(
    runs: RunArtifact[],
    benchmarks: BenchmarkArtifact[],
): CatalogStats {
    const byModel = new Map<string, { runs: number; benchmarks: number }>();
    const byPreset = new Map<string, { runs: number; benchmarks: number }>();
    const byCombo = new Map<
        string,
        { runs: number; benchmarks: number; model: string; preset: string }
    >();

    for (const run of runs) {
        bump(byModel, run.metadata.model, "runs");
        bump(byPreset, run.metadata.pipelinePreset, "runs");
        const comboKey = `${run.metadata.model}\0${run.metadata.pipelinePreset}`;
        const entry = byCombo.get(comboKey) ?? {
            runs: 0,
            benchmarks: 0,
            model: run.metadata.model,
            preset: run.metadata.pipelinePreset,
        };
        entry.runs += 1;
        byCombo.set(comboKey, entry);
    }

    for (const benchmark of benchmarks) {
        bump(byModel, benchmark.metadata.model, "benchmarks");
        bump(byPreset, benchmark.metadata.pipelinePreset, "benchmarks");
        const comboKey = `${benchmark.metadata.model}\0${benchmark.metadata.pipelinePreset}`;
        const entry = byCombo.get(comboKey) ?? {
            runs: 0,
            benchmarks: 0,
            model: benchmark.metadata.model,
            preset: benchmark.metadata.pipelinePreset,
        };
        entry.benchmarks += 1;
        byCombo.set(comboKey, entry);
    }

    const models: CatalogModelRow[] = [...byModel.entries()]
        .map(([model, counts]) => ({
            model,
            runCount: counts.runs,
            benchmarkCount: counts.benchmarks,
            total: counts.runs + counts.benchmarks,
        }))
        .sort((a, b) => b.total - a.total || a.model.localeCompare(b.model));

    const presets: CatalogPresetRow[] = [...byPreset.entries()]
        .map(([preset, counts]) => ({
            preset,
            runCount: counts.runs,
            benchmarkCount: counts.benchmarks,
            total: counts.runs + counts.benchmarks,
        }))
        .sort((a, b) => b.total - a.total || a.preset.localeCompare(b.preset));

    const combos: CatalogComboRow[] = [...byCombo.values()]
        .map((entry) => ({
            model: entry.model,
            preset: entry.preset,
            runCount: entry.runs,
            benchmarkCount: entry.benchmarks,
            total: entry.runs + entry.benchmarks,
        }))
        .sort(
            (a, b) =>
                b.total - a.total ||
                a.model.localeCompare(b.model) ||
                a.preset.localeCompare(b.preset),
        );

    return {
        models,
        presets,
        combos,
        totals: {
            runs: runs.length,
            benchmarks: benchmarks.length,
            uniqueModels: models.length,
            uniquePresets: presets.length,
        },
    };
}
