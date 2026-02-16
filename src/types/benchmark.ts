import type { BenchmarkResult } from "../bench/BenchmarkRunner";

export type BenchmarkArtifact = {
    id: string;
    createdAt: string;
    question: string;
    runs: number;
    runIds: string[];
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
    summary: BenchmarkResult;
};
