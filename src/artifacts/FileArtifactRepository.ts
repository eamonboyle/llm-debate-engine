import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { loadRunArtifacts } from "./loader";
import type { ArtifactRepository } from "./ArtifactRepository";
import type { RunArtifactV1, BenchmarkArtifactV1 } from "../types/artifact";

export class FileArtifactRepository implements ArtifactRepository {
    constructor(private readonly runsDir: string = "runs") {}

    async listRuns(): Promise<RunArtifactV1[]> {
        const { runs } = await loadRunArtifacts(this.runsDir);
        return runs.sort((a, b) =>
            b.metadata.createdAt.localeCompare(a.metadata.createdAt),
        );
    }

    async listBenchmarks(): Promise<BenchmarkArtifactV1[]> {
        const { benchmarks } = await loadRunArtifacts(this.runsDir);
        return benchmarks.sort((a, b) =>
            b.metadata.createdAt.localeCompare(a.metadata.createdAt),
        );
    }

    async getRunById(id: string): Promise<RunArtifactV1 | null> {
        const runs = await this.listRuns();
        return runs.find((r) => r.id === id) ?? null;
    }

    async getBenchmarkById(id: string): Promise<BenchmarkArtifactV1 | null> {
        const benchmarks = await this.listBenchmarks();
        return benchmarks.find((b) => b.id === id) ?? null;
    }

    async saveRun(artifact: RunArtifactV1): Promise<void> {
        await mkdir(this.runsDir, { recursive: true });
        const path = join(this.runsDir, `${artifact.id}.json`);
        await writeFile(path, JSON.stringify(artifact, null, 2), "utf-8");
    }

    async saveBenchmark(artifact: BenchmarkArtifactV1): Promise<void> {
        await mkdir(this.runsDir, { recursive: true });
        const path = join(this.runsDir, `${artifact.id}.json`);
        await writeFile(path, JSON.stringify(artifact, null, 2), "utf-8");
    }
}
