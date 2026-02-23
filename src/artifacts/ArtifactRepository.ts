import type { RunArtifactV1, BenchmarkArtifactV1 } from "../types/artifact";

/**
 * Abstraction for artifact storage. Enables swapping file-based storage
 * for SQLite or other backends without changing consumers.
 */
export interface ArtifactRepository {
    listRuns(): Promise<RunArtifactV1[]>;
    listBenchmarks(): Promise<BenchmarkArtifactV1[]>;
    getRunById(id: string): Promise<RunArtifactV1 | null>;
    getBenchmarkById(id: string): Promise<BenchmarkArtifactV1 | null>;
    saveRun(artifact: RunArtifactV1): Promise<void>;
    saveBenchmark(artifact: BenchmarkArtifactV1): Promise<void>;
}
