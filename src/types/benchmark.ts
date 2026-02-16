import type { BenchmarkResult } from "../bench/BenchmarkRunner";

export type BenchmarkArtifact = {
    id: string;
    createdAt: string;
    question: string;
    runs: number;
    runIds: string[];
    summary: BenchmarkResult;
};
