import type { BenchmarkArtifact, RunArtifact } from "./data";

export type ExperimentMatrixCell = {
    model: string;
    preset: string;
    runCount: number;
    benchmarkCount: number;
    latestRunId: string | null;
    latestBenchmarkId: string | null;
};

export type QuestionExperimentMatrix = {
    models: string[];
    presets: string[];
    cells: ExperimentMatrixCell[];
};

function cellKey(model: string, preset: string): string {
    return `${model}\0${preset}`;
}

export function buildQuestionExperimentMatrix(
    runs: RunArtifact[],
    benchmarks: BenchmarkArtifact[],
): QuestionExperimentMatrix {
    const cellMap = new Map<
        string,
        {
            runCount: number;
            benchmarkCount: number;
            latestRunId: string | null;
            latestRunAt: string;
            latestBenchmarkId: string | null;
            latestBenchmarkAt: string;
        }
    >();

    const models = new Set<string>();
    const presets = new Set<string>();

    for (const run of runs) {
        const model = run.metadata.model;
        const preset = run.metadata.pipelinePreset;
        models.add(model);
        presets.add(preset);
        const key = cellKey(model, preset);
        const existing = cellMap.get(key) ?? {
            runCount: 0,
            benchmarkCount: 0,
            latestRunId: null,
            latestRunAt: "",
            latestBenchmarkId: null,
            latestBenchmarkAt: "",
        };
        existing.runCount += 1;
        if (run.metadata.createdAt >= existing.latestRunAt) {
            existing.latestRunAt = run.metadata.createdAt;
            existing.latestRunId = run.id;
        }
        cellMap.set(key, existing);
    }

    for (const benchmark of benchmarks) {
        const model = benchmark.metadata.model;
        const preset = benchmark.metadata.pipelinePreset;
        models.add(model);
        presets.add(preset);
        const key = cellKey(model, preset);
        const existing = cellMap.get(key) ?? {
            runCount: 0,
            benchmarkCount: 0,
            latestRunId: null,
            latestRunAt: "",
            latestBenchmarkId: null,
            latestBenchmarkAt: "",
        };
        existing.benchmarkCount += 1;
        if (benchmark.metadata.createdAt >= existing.latestBenchmarkAt) {
            existing.latestBenchmarkAt = benchmark.metadata.createdAt;
            existing.latestBenchmarkId = benchmark.id;
        }
        cellMap.set(key, existing);
    }

    const sortedModels = [...models].sort((a, b) => a.localeCompare(b));
    const sortedPresets = [...presets].sort((a, b) => a.localeCompare(b));
    const cells: ExperimentMatrixCell[] = [];

    for (const model of sortedModels) {
        for (const preset of sortedPresets) {
            const entry = cellMap.get(cellKey(model, preset));
            if (!entry) continue;
            cells.push({
                model,
                preset,
                runCount: entry.runCount,
                benchmarkCount: entry.benchmarkCount,
                latestRunId: entry.latestRunId,
                latestBenchmarkId: entry.latestBenchmarkId,
            });
        }
    }

    return {
        models: sortedModels,
        presets: sortedPresets,
        cells,
    };
}

export function lookupMatrixCell(
    matrix: QuestionExperimentMatrix,
    model: string,
    preset: string,
): ExperimentMatrixCell | null {
    return (
        matrix.cells.find(
            (cell) => cell.model === model && cell.preset === preset,
        ) ?? null
    );
}
