import { readdir, readFile } from "fs/promises";
import { join, resolve } from "path";
import type {
    AnalysisIndex,
    ArtifactFilterParams,
    BenchmarkArtifact,
    RunArtifact,
} from "@llm-research/types";

export type { AnalysisIndex, ArtifactFilterParams, BenchmarkArtifact, RunArtifact };

const ANALYSIS_INDEX_CACHE_MS = 60_000;
let analysisIndexCache: {
    runsDir: string;
    value: AnalysisIndex | null;
    expires: number;
} | null = null;

async function loadAnalysisIndexUncached(runsDir: string): Promise<AnalysisIndex | null> {
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

const EXCLUDED_ARTIFACT_FILES = new Set([
    "analysis-index.json",
    "analysis-bundle.json",
    "analysis-benchmark-pairs.json",
]);

function getRunsDir(): string {
    if (process.env.RUNS_DIR) {
        return resolve(process.env.RUNS_DIR);
    }
    return resolve(process.cwd(), "../../runs");
}

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

export function filterRunArtifacts(
    runs: RunArtifact[],
    filters: ArtifactFilterParams,
): RunArtifact[] {
    const q = normalize(filters.q);
    const model = normalize(filters.model);
    const preset = normalize(filters.preset);
    const fast = parseFastFilter(filters.fast);
    const fromDate = parseDateInput(filters.from);
    const toDate = parseDateInput(filters.to);

    return runs.filter((run) => {
        if (q) {
            const haystack =
                `${run.id} ${run.question} ${run.run.finalAnswer}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        if (model && !run.metadata.model.toLowerCase().includes(model)) {
            return false;
        }
        if (preset && run.metadata.pipelinePreset.toLowerCase() !== preset) {
            return false;
        }
        if (typeof fast === "boolean" && run.metadata.fastMode !== fast) {
            return false;
        }
        const createdAt = new Date(run.metadata.createdAt);
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

export function filterBenchmarkArtifacts(
    benchmarks: BenchmarkArtifact[],
    filters: ArtifactFilterParams,
): BenchmarkArtifact[] {
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
        if (model && !benchmark.metadata.model.toLowerCase().includes(model)) {
            return false;
        }
        if (
            preset &&
            benchmark.metadata.pipelinePreset.toLowerCase() !== preset
        ) {
            return false;
        }
        if (typeof fast === "boolean" && benchmark.metadata.fastMode !== fast) {
            return false;
        }
        const createdAt = new Date(benchmark.metadata.createdAt);
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
    const now = Date.now();
    if (
        analysisIndexCache &&
        analysisIndexCache.runsDir === runsDir &&
        analysisIndexCache.expires > now
    ) {
        return analysisIndexCache.value;
    }
    const value = await loadAnalysisIndexUncached(runsDir);
    analysisIndexCache = {
        runsDir,
        value,
        expires: now + ANALYSIS_INDEX_CACHE_MS,
    };
    return value;
}

export async function loadRunArtifacts(): Promise<RunArtifact[]> {
    const runsDir = getRunsDir();
    let files: string[] = [];
    try {
        files = await readdir(runsDir);
    } catch {
        return [];
    }

    const runFiles = files.filter(
        (f) =>
            f.endsWith(".json") &&
            !EXCLUDED_ARTIFACT_FILES.has(f),
    );
    const parsed = await Promise.all(
        runFiles.map((file) =>
            readJsonIfExists<unknown>(join(runsDir, file)).then((p) => ({
                file,
                parsed: p,
            })),
        ),
    );

    const runArtifacts = parsed
        .filter(
            (p) =>
                p.parsed &&
                typeof p.parsed === "object" &&
                (p.parsed as Record<string, unknown>).kind === "run",
        )
        .map((p) => p.parsed as RunArtifact);

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

    const benchmarkFiles = files.filter(
        (f) =>
            f.endsWith(".json") &&
            !EXCLUDED_ARTIFACT_FILES.has(f),
    );
    const parsed = await Promise.all(
        benchmarkFiles.map((file) =>
            readJsonIfExists<unknown>(join(runsDir, file)).then((p) => ({
                file,
                parsed: p,
            })),
        ),
    );

    const artifacts = parsed
        .filter(
            (p) =>
                p.parsed &&
                typeof p.parsed === "object" &&
                (p.parsed as Record<string, unknown>).kind === "benchmark",
        )
        .map((p) => p.parsed as BenchmarkArtifact);

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

export async function loadRunsByQuestion(
    question: string,
    excludeRunId?: string,
): Promise<RunArtifact[]> {
    const runs = await loadRunArtifacts();
    return runs
        .filter(
            (r) =>
                r.question === question &&
                (excludeRunId == null || r.id !== excludeRunId),
        )
        .sort((a, b) =>
            b.metadata.createdAt.localeCompare(a.metadata.createdAt),
        );
}

export async function loadBenchmarkPairsById(id: string): Promise<{
    benchmarkId: string;
    source: "chunk" | "artifact";
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
    const fromChunk = chunk?.pairwise?.find(
        (entry) => entry.benchmarkId === id,
    );
    if (fromChunk) {
        return {
            benchmarkId: id,
            source: "chunk",
            runIds: fromChunk.runIds ?? [],
            pairs: fromChunk.pairs ?? [],
        };
    }

    const benchmark = await loadBenchmarkById(id);
    return {
        benchmarkId: id,
        source: "artifact",
        runIds: benchmark?.payload.runIds ?? [],
        pairs: benchmark?.payload.summary?.stability?.pairs ?? [],
    };
}
