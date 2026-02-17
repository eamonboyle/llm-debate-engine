import type { DebateRun } from "./agent";
import type { BenchmarkArtifactPayload } from "./benchmark";

export const ARTIFACT_SCHEMA_VERSION = 1 as const;
export const PIPELINE_VERSION = "1.0.0" as const;

export type PipelinePreset = "standard" | "research_deep" | "fast_research";

export type ArtifactMetadata = {
    schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
    createdAt: string;
    model: string;
    fastMode: boolean;
    pipelinePreset: PipelinePreset;
    pipelineVersion: string;
    source: "cli";
};

export type RunArtifactV1 = {
    kind: "run";
    id: string;
    question: string;
    run: DebateRun;
    metadata: ArtifactMetadata;
};

export type BenchmarkArtifactV1 = {
    kind: "benchmark";
    id: string;
    question: string;
    metadata: ArtifactMetadata;
    payload: BenchmarkArtifactPayload;
};

export type LegacyRunArtifact = {
    id: string;
    question: string;
    steps: DebateRun["steps"];
    finalAnswer: string;
    metrics: DebateRun["metrics"];
};

export type LegacyBenchmarkArtifact = {
    id: string;
    createdAt: string;
    question: string;
    runs: number;
    runIds: string[];
    summary: BenchmarkArtifactPayload["summary"];
};
