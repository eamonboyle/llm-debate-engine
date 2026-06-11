import type { BenchmarkArtifact, RunArtifact } from "./data";
import type { QuestionGroup } from "./questionGroups";

function escapeCsv(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function row(values: Array<string | number | boolean>): string {
    return values.map((value) => escapeCsv(String(value))).join(",");
}

export function runArtifactsToCsv(runs: RunArtifact[]): string {
    const header = [
        "id",
        "createdAt",
        "question",
        "model",
        "pipelinePreset",
        "fastMode",
        "finalAnswer",
    ];
    const rows = runs.map((run) =>
        row([
            run.id,
            run.metadata.createdAt,
            run.question,
            run.metadata.model,
            run.metadata.pipelinePreset,
            run.metadata.fastMode,
            run.run.finalAnswer,
        ]),
    );
    return [header.join(","), ...rows].join("\n");
}

export function benchmarkArtifactsToCsv(
    benchmarks: BenchmarkArtifact[],
): string {
    const header = [
        "id",
        "createdAt",
        "question",
        "model",
        "pipelinePreset",
        "fastMode",
        "runs",
        "modeCount",
        "divergenceEntropy",
        "stabilityPairwiseMean",
    ];
    const rows = benchmarks.map((benchmark) =>
        row([
            benchmark.id,
            benchmark.metadata.createdAt,
            benchmark.question,
            benchmark.metadata.model,
            benchmark.metadata.pipelinePreset,
            benchmark.metadata.fastMode,
            benchmark.payload.runs,
            benchmark.payload.modeCount,
            benchmark.payload.divergenceEntropy,
            benchmark.payload.summary?.stability?.pairwiseMean ?? "",
        ]),
    );
    return [header.join(","), ...rows].join("\n");
}

export function questionGroupsToCsv(groups: QuestionGroup[]): string {
    const header = [
        "question",
        "runCount",
        "benchmarkCount",
        "latestCreatedAt",
        "models",
        "presets",
        "sampleRunId",
        "sampleBenchmarkId",
    ];
    const rows = groups.map((group) =>
        row([
            group.question,
            group.runCount,
            group.benchmarkCount,
            group.latestCreatedAt,
            group.models.join("; "),
            group.presets.join("; "),
            group.sampleRunId ?? "",
            group.sampleBenchmarkId ?? "",
        ]),
    );
    return [header.join(","), ...rows].join("\n");
}
