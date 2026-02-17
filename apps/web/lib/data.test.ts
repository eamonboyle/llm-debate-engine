import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    loadAnalysisIndex,
    loadBenchmarkArtifacts,
    loadBenchmarkById,
    loadBenchmarkPairsById,
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
        tempDirs
            .splice(0)
            .map((dir) => rm(dir, { recursive: true, force: true })),
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
                filterContext: {
                    modelContains: "gpt-test",
                    fastMode: false,
                },
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
        expect(index?.filterContext?.modelContains).toBe("gpt-test");
        expect(index?.filterContext?.fastMode).toBe(false);
    });

    it("falls back to analysis-bundle index when analysis-index is missing", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-bundle.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                index: {
                    generatedAt: new Date().toISOString(),
                    totals: { runs: 2, benchmarks: 1, skippedFiles: 0 },
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
                },
                runs: [],
                benchmarks: [],
            }),
            "utf-8",
        );

        const index = await loadAnalysisIndex();
        expect(index).not.toBeNull();
        expect(index?.totals.runs).toBe(2);
        expect(index?.totals.benchmarks).toBe(1);
    });

    it("loads and sorts run artifacts, and finds run by id", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_old.json"),
            JSON.stringify(
                makeRunArtifact("run_old", "2025-01-01T00:00:00.000Z"),
            ),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_new.json"),
            JSON.stringify(
                makeRunArtifact("run_new", "2025-01-02T00:00:00.000Z"),
            ),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark.json"),
            JSON.stringify(
                makeBenchmarkArtifact(
                    "benchmark_1",
                    "2025-01-03T00:00:00.000Z",
                ),
            ),
            "utf-8",
        );

        const runs = await loadRunArtifacts();
        expect(runs.map((r) => r.id)).toEqual(["run_new", "run_old"]);

        const run = await loadRunById("run_old");
        expect(run?.id).toBe("run_old");
    });

    it("ignores derived analysis files when loading run/benchmark artifacts", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-bundle.json"),
            JSON.stringify({
                kind: "run",
                id: "should_not_load_run",
                question: "bad",
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "analysis-benchmark-pairs.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "should_not_load_benchmark",
                question: "bad",
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_real.json"),
            JSON.stringify(
                makeRunArtifact("run_real", "2025-01-03T00:00:00.000Z"),
            ),
            "utf-8",
        );
        await writeFile(
            join(dir, "bench_real.json"),
            JSON.stringify(
                makeBenchmarkArtifact("bench_real", "2025-01-03T00:00:00.000Z"),
            ),
            "utf-8",
        );

        const runs = await loadRunArtifacts();
        const benchmarks = await loadBenchmarkArtifacts();
        expect(runs.map((run) => run.id)).toEqual(["run_real"]);
        expect(benchmarks.map((benchmark) => benchmark.id)).toEqual([
            "bench_real",
        ]);
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

    it("loads benchmark pairwise data from chunk then fallback", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-benchmark-pairs.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                pairwise: [
                    {
                        benchmarkId: "bench_chunk",
                        runIds: ["r1", "r2"],
                        pairs: [{ i: 0, j: 1, similarity: 0.91 }],
                    },
                ],
            }),
            "utf-8",
        );

        const fromChunk = await loadBenchmarkPairsById("bench_chunk");
        expect(fromChunk.source).toBe("chunk");
        expect(fromChunk.runIds).toEqual(["r1", "r2"]);
        expect(fromChunk.pairs).toHaveLength(1);

        await writeFile(
            join(dir, "bench_fallback.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "bench_fallback",
                question: "Q",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
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
                            pairwiseMean: 0.95,
                            pairs: [{ i: 0, j: 1, similarity: 0.95 }],
                        },
                    },
                },
            }),
            "utf-8",
        );

        const fallback = await loadBenchmarkPairsById("bench_fallback");
        expect(fallback.source).toBe("artifact");
        expect(fallback.pairs).toHaveLength(1);
        expect(fallback.pairs[0].similarity).toBe(0.95);
    });
});
