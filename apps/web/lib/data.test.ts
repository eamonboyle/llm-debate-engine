import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    loadAnalysisIndex,
    loadBenchmarkArtifacts,
    loadBenchmarkById,
    loadBenchmarksByIds,
    loadRunArtifacts,
    loadRunById,
} from "./data";

const tempDirs: string[] = [];
const originalRunsDir = process.env.RUNS_DIR;

async function makeTempDir() {
    const dir = await mkdtemp(join(tmpdir(), "web-data-test-"));
    tempDirs.push(dir);
    return dir;
}

function makeRunArtifact(id: string, createdAt: string) {
    return {
        kind: "run",
        id,
        question: `Question ${id}`,
        metadata: {
            createdAt,
            model: "gpt-test",
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: {
            id,
            finalAnswer: `Final answer ${id}`,
            steps: [],
            metrics: {},
        },
    };
}

function makeBenchmarkArtifact(id: string, createdAt: string) {
    return {
        kind: "benchmark",
        id,
        question: `Benchmark ${id}`,
        metadata: {
            createdAt,
            model: "gpt-test",
            pipelinePreset: "standard",
            fastMode: false,
        },
        payload: {
            runs: 2,
            modeCount: 1,
            modeSizes: [2],
            divergenceEntropy: 0,
            summary: {
                stability: {
                    pairwiseMean: 1,
                    pairs: [],
                },
            },
        },
    };
}

beforeEach(() => {
    delete process.env.RUNS_DIR;
});

afterEach(async () => {
    process.env.RUNS_DIR = originalRunsDir;
    await Promise.all(
        tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
});

describe("web data loader", () => {
    it("loads analysis index from RUNS_DIR", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 0, benchmarks: 0, skippedFiles: 0 },
                runs: [],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    confidenceCorrelation: {
                        severityVsSolverToRevisionDelta: 0,
                        severityVsRevisionToSynthesizerDelta: 0,
                    },
                    outlierRuns: [],
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const index = await loadAnalysisIndex();
        expect(index).not.toBeNull();
        expect(index?.totals.runs).toBe(0);
    });

    it("loads and sorts run artifacts, and finds run by id", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_old.json"),
            JSON.stringify(makeRunArtifact("run_old", "2025-01-01T00:00:00.000Z")),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_new.json"),
            JSON.stringify(makeRunArtifact("run_new", "2025-01-02T00:00:00.000Z")),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark.json"),
            JSON.stringify(makeBenchmarkArtifact("benchmark_1", "2025-01-03T00:00:00.000Z")),
            "utf-8",
        );

        const runs = await loadRunArtifacts();
        expect(runs.map((r) => r.id)).toEqual(["run_new", "run_old"]);

        const run = await loadRunById("run_old");
        expect(run?.id).toBe("run_old");
    });

    it("loads benchmarks and id filters", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "bench_a.json"),
            JSON.stringify(
                makeBenchmarkArtifact("bench_a", "2025-01-01T00:00:00.000Z"),
            ),
            "utf-8",
        );
        await writeFile(
            join(dir, "bench_b.json"),
            JSON.stringify(
                makeBenchmarkArtifact("bench_b", "2025-01-02T00:00:00.000Z"),
            ),
            "utf-8",
        );

        const all = await loadBenchmarkArtifacts();
        expect(all).toHaveLength(2);
        expect(all[0].id).toBe("bench_b");

        const one = await loadBenchmarkById("bench_a");
        expect(one?.id).toBe("bench_a");

        const selected = await loadBenchmarksByIds(["bench_a", "bench_b"]);
        expect(selected).toHaveLength(2);
    });
});
