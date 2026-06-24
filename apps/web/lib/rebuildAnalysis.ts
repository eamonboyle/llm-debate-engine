import { resolve } from "path";
import { buildAndWriteAnalysisIndex } from "../../../src/artifacts/indexer";
import type { PipelinePreset } from "../../../src/types/artifact";

function getRunsDir(): string {
    if (process.env.RUNS_DIR) {
        return resolve(process.env.RUNS_DIR);
    }
    return resolve(process.cwd(), "../../runs");
}

export function isAnalysisRebuildEnabled(): boolean {
    if (process.env.ANALYSIS_REBUILD_ENABLED === "false") {
        return false;
    }
    if (process.env.ANALYSIS_REBUILD_ENABLED === "true") {
        return true;
    }
    return process.env.VERCEL !== "1";
}

export type AnalysisRebuildFilters = {
    questionContains?: string;
    modelContains?: string;
    presetEquals?: PipelinePreset;
    fastMode?: boolean;
    createdAfter?: string;
    createdBefore?: string;
};

const PIPELINE_PRESETS: PipelinePreset[] = [
    "standard",
    "research_deep",
    "fast_research",
];

function parseFastMode(value: unknown): boolean | undefined {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return undefined;
}

function parsePreset(value: unknown): PipelinePreset | undefined {
    if (typeof value !== "string" || value.length === 0) return undefined;
    return PIPELINE_PRESETS.includes(value as PipelinePreset)
        ? (value as PipelinePreset)
        : undefined;
}

function normalizeDateTime(value: unknown): string | undefined {
    if (typeof value !== "string" || value.trim().length === 0) {
        return undefined;
    }
    const trimmed = value.trim();
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return trimmed.includes("T") && !trimmed.endsWith("Z")
        ? parsed.toISOString()
        : trimmed;
}

export function parseAnalysisRebuildFilters(
    input: unknown,
): AnalysisRebuildFilters {
    if (!input || typeof input !== "object") return {};
    const record = input as Record<string, unknown>;
    return {
        questionContains:
            typeof record.questionContains === "string"
                ? record.questionContains
                : undefined,
        modelContains:
            typeof record.modelContains === "string"
                ? record.modelContains
                : undefined,
        presetEquals: parsePreset(record.presetEquals),
        fastMode: parseFastMode(record.fastMode),
        createdAfter: normalizeDateTime(record.createdAfter),
        createdBefore: normalizeDateTime(record.createdBefore),
    };
}

export type AnalysisRebuildResult = {
    path: string;
    generatedAt: string;
    totals: {
        runs: number;
        benchmarks: number;
        skippedFiles: number;
    };
    csvPaths?: { runs: string; benchmarks: string };
    markdownPath?: string;
    bundlePath?: string;
    chunkPath?: string;
    filters?: AnalysisRebuildFilters;
};

export async function rebuildAnalysisArtifacts(
    filters: AnalysisRebuildFilters = {},
): Promise<AnalysisRebuildResult> {
    const result = await buildAndWriteAnalysisIndex({
        runsDir: getRunsDir(),
        writeCsv: true,
        writeMarkdown: true,
        writeBundle: true,
        writeChunks: true,
        questionContains: filters.questionContains,
        modelContains: filters.modelContains,
        presetEquals: filters.presetEquals,
        fastMode: filters.fastMode,
        createdAfter: filters.createdAfter,
        createdBefore: filters.createdBefore,
    });

    return {
        path: result.path,
        generatedAt: result.index.generatedAt,
        totals: result.index.totals,
        csvPaths: result.csvPaths,
        markdownPath: result.markdownPath,
        bundlePath: result.bundlePath,
        chunkPath: result.chunkPath,
        filters,
    };
}
