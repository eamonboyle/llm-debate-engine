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
        confidenceCorrelation?: {
            severityVsSolverToRevisionDelta: number;
            severityVsRevisionToSynthesizerDelta: number;
        };
        outlierRuns?: Array<{
            benchmarkId: string;
            runId: string;
            avgSimilarity: number;
            zScore: number;
        }>;
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
        createdAt?: string;
        question?: string;
        finalAnswer: string;
        steps: Array<{
            id: string;
            agentName: string;
            role: string;
            output?: {
                kind: string;
                data: unknown;
            };
            error?: string;
            createdAt?: string;
            completedAt?: string;
        }>;
        metrics: {
            confidence?: Record<string, number | undefined>;
            critique?: Record<string, unknown>;
            quality?: Record<string, number | undefined>;
            consensus?: Record<string, unknown>;
        };
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
        runIds?: string[];
        modeCount: number;
        modeSizes: number[];
        divergenceEntropy: number;
        threshold?: number;
        modeCountAt0_8?: number;
        modeCountAt0_9?: number;
        modeCountAt0_95?: number;
        modes?: Array<{
            size: number;
            members: number[];
            exemplarIndex: number;
            exemplarPreview: string;
        }>;
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
    const runsDir = getRunsDir();
    const indexPath = join(runsDir, "analysis-index.json");
    const index = await readJsonIfExists<AnalysisIndex>(indexPath);
    if (index) return index;

    const bundlePath = join(runsDir, "analysis-bundle.json");
    const bundle = await readJsonIfExists<{
        index?: AnalysisIndex;
    }>(bundlePath);
    if (bundle?.index) return bundle.index;

    return null;
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

export async function loadBenchmarksByIds(ids: string[]) {
    const idSet = new Set(ids);
    const benchmarks = await loadBenchmarkArtifacts();
    return benchmarks.filter((benchmark) => idSet.has(benchmark.id));
}

export async function loadRunById(id: string) {
    const runs = await loadRunArtifacts();
    return runs.find((run) => run.id === id) ?? null;
}

export async function loadBenchmarkPairsById(id: string): Promise<{
    benchmarkId: string;
    runIds: string[];
    pairs: Array<{ i: number; j: number; similarity: number }>;
}> {
    const runsDir = getRunsDir();
    const pairwisePath = join(runsDir, "analysis-benchmark-pairs.json");
    const chunk = await readJsonIfExists<{
        pairwise?: Array<{
            benchmarkId: string;
            runIds?: string[];
            pairs?: Array<{ i: number; j: number; similarity: number }>;
        }>;
    }>(pairwisePath);
    const fromChunk = chunk?.pairwise?.find((entry) => entry.benchmarkId === id);
    if (fromChunk) {
        return {
            benchmarkId: id,
            runIds: fromChunk.runIds ?? [],
            pairs: fromChunk.pairs ?? [],
        };
    }

    const benchmark = await loadBenchmarkById(id);
    return {
        benchmarkId: id,
        runIds: benchmark?.payload.runIds ?? [],
        pairs: benchmark?.payload.summary?.stability?.pairs ?? [],
    };
}
