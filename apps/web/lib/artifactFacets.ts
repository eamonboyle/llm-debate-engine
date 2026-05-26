import type { BenchmarkArtifact, RunArtifact } from "./data";

const KNOWN_PRESET_ORDER = ["standard", "research_deep", "fast_research"];

function uniqueSorted(values: string[]): string[] {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function collectArtifactFacets(
    runs: RunArtifact[],
    benchmarks: BenchmarkArtifact[],
): { models: string[]; presets: string[] } {
    const models = uniqueSorted([
        ...runs.map((r) => r.metadata.model),
        ...benchmarks.map((b) => b.metadata.model),
    ]);

    const fromArtifacts = uniqueSorted([
        ...runs.map((r) => r.metadata.pipelinePreset),
        ...benchmarks.map((b) => b.metadata.pipelinePreset),
    ]);

    const presets = [
        ...KNOWN_PRESET_ORDER.filter((p) => fromArtifacts.includes(p)),
        ...fromArtifacts.filter((p) => !KNOWN_PRESET_ORDER.includes(p)),
    ];

    return { models, presets };
}
