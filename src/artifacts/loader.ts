import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";
import type { DebateRun } from "../types/agent";
import {
    ARTIFACT_SCHEMA_VERSION,
    PIPELINE_VERSION,
    type ArtifactMetadata,
    type BenchmarkArtifactV1,
    type LegacyBenchmarkArtifact,
    type LegacyRunArtifact,
    type PipelinePreset,
    type RunArtifactV1,
} from "../types/artifact";
import type { BenchmarkArtifactPayload } from "../types/benchmark";

type ParsedArtifacts = {
    runs: RunArtifactV1[];
    benchmarks: BenchmarkArtifactV1[];
    skipped: Array<{ file: string; error: string }>;
};

type ParseContext = {
    filePath: string;
    mtimeIso: string;
    defaultPreset?: PipelinePreset;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isAnalysisBundle(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return (
        typeof value.generatedAt === "string" &&
        Array.isArray(value.runs) &&
        Array.isArray(value.benchmarks) &&
        isRecord(value.index)
    );
}

function isAnalysisPairwiseChunk(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return (
        typeof value.generatedAt === "string" && Array.isArray(value.pairwise)
    );
}

function defaultMetadata(
    createdAt: string,
    preset: PipelinePreset = "standard",
): ArtifactMetadata {
    return {
        schemaVersion: ARTIFACT_SCHEMA_VERSION,
        createdAt,
        model: "unknown",
        fastMode: false,
        pipelinePreset: preset,
        pipelineVersion: PIPELINE_VERSION,
        source: "cli",
    };
}

function isV1RunArtifact(value: unknown): value is RunArtifactV1 {
    if (!isRecord(value)) return false;
    return (
        value.kind === "run" &&
        typeof value.id === "string" &&
        typeof value.question === "string" &&
        isRecord(value.metadata) &&
        (value.metadata as ArtifactMetadata).schemaVersion ===
            ARTIFACT_SCHEMA_VERSION &&
        isRecord(value.run)
    );
}

function isV1BenchmarkArtifact(value: unknown): value is BenchmarkArtifactV1 {
    if (!isRecord(value)) return false;
    return (
        value.kind === "benchmark" &&
        typeof value.id === "string" &&
        typeof value.question === "string" &&
        isRecord(value.metadata) &&
        (value.metadata as ArtifactMetadata).schemaVersion ===
            ARTIFACT_SCHEMA_VERSION &&
        isRecord(value.payload)
    );
}

function isLegacyRunArtifact(value: unknown): value is LegacyRunArtifact {
    if (!isRecord(value)) return false;
    return (
        typeof value.id === "string" &&
        typeof value.question === "string" &&
        Array.isArray(value.steps) &&
        typeof value.finalAnswer === "string" &&
        isRecord(value.metrics)
    );
}

function isLegacyBenchmarkArtifact(
    value: unknown,
): value is LegacyBenchmarkArtifact {
    if (!isRecord(value)) return false;
    return (
        typeof value.id === "string" &&
        typeof value.question === "string" &&
        typeof value.runs === "number" &&
        Array.isArray(value.runIds) &&
        isRecord(value.summary)
    );
}

function toV1RunArtifact(
    legacy: LegacyRunArtifact,
    context: ParseContext,
): RunArtifactV1 {
    const run: DebateRun = {
        id: legacy.id,
        createdAt: context.mtimeIso,
        question: legacy.question,
        steps: legacy.steps,
        finalAnswer: legacy.finalAnswer,
        metrics: legacy.metrics,
    };

    return {
        kind: "run",
        id: legacy.id,
        question: legacy.question,
        run,
        metadata: defaultMetadata(context.mtimeIso, context.defaultPreset),
    };
}

function toV1BenchmarkArtifact(
    legacy: Record<string, unknown>,
    context: ParseContext,
): BenchmarkArtifactV1 {
    const payload: BenchmarkArtifactPayload = {
        runs: Number(legacy.runs ?? 0),
        runIds: Array.isArray(legacy.runIds)
            ? legacy.runIds.filter((v): v is string => typeof v === "string")
            : [],
        modeCount: Number(legacy.modeCount ?? 0),
        modeSizes: Array.isArray(legacy.modeSizes)
            ? legacy.modeSizes.filter((v): v is number => typeof v === "number")
            : [],
        divergenceEntropy: Number(legacy.divergenceEntropy ?? 0),
        threshold:
            typeof legacy.threshold === "number" ? legacy.threshold : undefined,
        modeCountAt0_8:
            typeof legacy.modeCountAt0_8 === "number"
                ? legacy.modeCountAt0_8
                : undefined,
        modeCountAt0_9:
            typeof legacy.modeCountAt0_9 === "number"
                ? legacy.modeCountAt0_9
                : undefined,
        modeCountAt0_95:
            typeof legacy.modeCountAt0_95 === "number"
                ? legacy.modeCountAt0_95
                : undefined,
        modes: Array.isArray(legacy.modes)
            ? (legacy.modes as BenchmarkArtifactPayload["modes"])
            : undefined,
        modeCountClaimCentroid:
            typeof legacy.modeCountClaimCentroid === "number"
                ? legacy.modeCountClaimCentroid
                : undefined,
        modeSizesClaimCentroid: Array.isArray(legacy.modeSizesClaimCentroid)
            ? (legacy.modeSizesClaimCentroid as number[])
            : undefined,
        divergenceEntropyClaimCentroid:
            typeof legacy.divergenceEntropyClaimCentroid === "number"
                ? legacy.divergenceEntropyClaimCentroid
                : undefined,
        modeCountClaimCentroidAt0_8:
            typeof legacy.modeCountClaimCentroidAt0_8 === "number"
                ? legacy.modeCountClaimCentroidAt0_8
                : undefined,
        modeCountClaimCentroidAt0_9:
            typeof legacy.modeCountClaimCentroidAt0_9 === "number"
                ? legacy.modeCountClaimCentroidAt0_9
                : undefined,
        modeCountClaimCentroidAt0_95:
            typeof legacy.modeCountClaimCentroidAt0_95 === "number"
                ? legacy.modeCountClaimCentroidAt0_95
                : undefined,
        stabilityClaimCentroid: isRecord(legacy.stabilityClaimCentroid)
            ? (legacy.stabilityClaimCentroid as BenchmarkArtifactPayload["stabilityClaimCentroid"])
            : undefined,
        summary: legacy.summary as BenchmarkArtifactPayload["summary"],
    };

    return {
        kind: "benchmark",
        id: String(legacy.id),
        question: String(legacy.question),
        metadata: defaultMetadata(
            typeof legacy.createdAt === "string"
                ? legacy.createdAt
                : context.mtimeIso,
            context.defaultPreset,
        ),
        payload,
    };
}

function parseArtifact(
    parsed: unknown,
    context: ParseContext,
): RunArtifactV1 | BenchmarkArtifactV1 {
    if (isV1RunArtifact(parsed)) return parsed;
    if (isV1BenchmarkArtifact(parsed)) return parsed;
    if (isLegacyRunArtifact(parsed)) return toV1RunArtifact(parsed, context);
    if (isLegacyBenchmarkArtifact(parsed)) {
        return toV1BenchmarkArtifact(parsed, context);
    }

    throw new Error("Unsupported artifact format");
}

export async function loadRunArtifacts(
    runsDir = "runs",
    defaultPreset: PipelinePreset = "standard",
): Promise<ParsedArtifacts> {
    const parsed: ParsedArtifacts = {
        runs: [],
        benchmarks: [],
        skipped: [],
    };

    let files: string[] = [];
    try {
        files = await readdir(runsDir);
    } catch {
        return parsed;
    }

    const excludedFiles = new Set([
        "analysis-index.json",
        "analysis-bundle.json",
        "analysis-benchmark-pairs.json",
    ]);
    const jsonFiles = files
        .filter((f) => f.endsWith(".json") && !excludedFiles.has(f))
        .sort();
    for (const file of jsonFiles) {
        const filePath = join(runsDir, file);
        try {
            const [raw, fileStat] = await Promise.all([
                readFile(filePath, "utf-8"),
                stat(filePath),
            ]);
            const body = JSON.parse(raw) as unknown;
            if (isAnalysisBundle(body) || isAnalysisPairwiseChunk(body)) {
                continue;
            }
            const artifact = parseArtifact(body, {
                filePath,
                mtimeIso: fileStat.mtime.toISOString(),
                defaultPreset,
            });

            if (artifact.kind === "run") parsed.runs.push(artifact);
            else parsed.benchmarks.push(artifact);
        } catch (error) {
            parsed.skipped.push({
                file,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return parsed;
}
