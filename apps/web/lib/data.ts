import { readdir, readFile } from "fs/promises";
import { join, resolve } from "path";

type AnalysisIndex = {
    generatedAt: string;
    totals: {
        runs: number;
        benchmarks: number;
        skippedFiles: number;
    };
    runs: Array<{
        id: string;
        question: string;
        createdAt: string;
        model: string;
        pipelinePreset: string;
        fastMode: boolean;
        finalAnswerPreview: string;
        confidence: {
            solver?: number;
            revision?: number;
            synthesizer?: number;
            calibratedAdjusted?: number;
        };
        critique: {
            issueCount: number;
            maxSeverity?: number;
        };
    }>;
    benchmarks: Array<{
        id: string;
        question: string;
        createdAt: string;
        model: string;
        pipelinePreset: string;
        fastMode: boolean;
        runs: number;
        modeCount: number;
        modeSizes: number[];
        divergenceEntropy: number;
        stabilityPairwiseMean?: number;
        modeLabels: Array<{
            modeIndex: number;
            size: number;
            label: string;
            exemplarPreview: string;
        }>;
    }>;
    aggregates: {
        issueTypeCounts: Record<string, number>;
        confidenceDrift: {
            solverToRevisionMean: number;
            revisionToSynthesizerMean: number;
            calibratedMinusSynthMean: number;
        };
        presets: Record<string, number>;
        critiqueVsConfidence: Array<{
            runId: string;
            maxSeverity?: number;
            solverToRevisionDelta?: number;
            revisionToSynthesizerDelta?: number;
        }>;
    };
    skipped: Array<{ file: string; error: string }>;
};

type RunArtifact = {
    kind: "run";
    id: string;
    question: string;
    metadata: {
        createdAt: string;
        model: string;
        pipelinePreset: string;
        fastMode: boolean;
    };
    run: {
        id: string;
        finalAnswer: string;
        steps: unknown[];
        metrics: Record<string, unknown>;
    };
};

type BenchmarkArtifact = {
    kind: "benchmark";
    id: string;
    question: string;
    metadata: {
        createdAt: string;
        model: string;
        pipelinePreset: string;
        fastMode: boolean;
    };
    payload: {
        runs: number;
        modeCount: number;
        modeSizes: number[];
        divergenceEntropy: number;
        summary?: {
            stability?: {
                pairwiseMean?: number;
                pairs?: Array<{ i: number; j: number; similarity: number }>;
            };
        };
    };
};

function getRunsDir() {
    if (process.env.RUNS_DIR) {
        return resolve(process.env.RUNS_DIR);
    }
    return resolve(process.cwd(), "../../runs");
}

async function readJsonIfExists<T>(path: string): Promise<T | null> {
    try {
        const content = await readFile(path, "utf-8");
        return JSON.parse(content) as T;
    } catch {
        return null;
    }
}

export async function loadAnalysisIndex(): Promise<AnalysisIndex | null> {
    const path = join(getRunsDir(), "analysis-index.json");
    return readJsonIfExists<AnalysisIndex>(path);
}

export async function loadRunArtifacts(): Promise<RunArtifact[]> {
    const runsDir = getRunsDir();
    let files: string[] = [];
    try {
        files = await readdir(runsDir);
    } catch {
        return [];
    }

    const runArtifacts: RunArtifact[] = [];
    for (const file of files) {
        if (!file.endsWith(".json") || file === "analysis-index.json") continue;
        const parsed = await readJsonIfExists<unknown>(join(runsDir, file));
        if (
            parsed &&
            typeof parsed === "object" &&
            (parsed as Record<string, unknown>).kind === "run"
        ) {
            runArtifacts.push(parsed as RunArtifact);
        }
    }

    return runArtifacts.sort((a, b) =>
        b.metadata.createdAt.localeCompare(a.metadata.createdAt),
    );
}

export async function loadBenchmarkArtifacts(): Promise<BenchmarkArtifact[]> {
    const runsDir = getRunsDir();
    let files: string[] = [];
    try {
        files = await readdir(runsDir);
    } catch {
        return [];
    }

    const artifacts: BenchmarkArtifact[] = [];
    for (const file of files) {
        if (!file.endsWith(".json") || file === "analysis-index.json") continue;
        const parsed = await readJsonIfExists<unknown>(join(runsDir, file));
        if (
            parsed &&
            typeof parsed === "object" &&
            (parsed as Record<string, unknown>).kind === "benchmark"
        ) {
            artifacts.push(parsed as BenchmarkArtifact);
        }
    }

    return artifacts.sort((a, b) =>
        b.metadata.createdAt.localeCompare(a.metadata.createdAt),
    );
}

export async function loadBenchmarkById(id: string) {
    const benchmarks = await loadBenchmarkArtifacts();
    return benchmarks.find((b) => b.id === id) ?? null;
}
