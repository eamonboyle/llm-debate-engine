import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { GET as getAnalysis } from "./analysis/route";
import { GET as getBenchmarks } from "./benchmarks/route";
import { GET as getRunById } from "./runs/[id]/route";
import { GET as getRuns } from "./runs/route";
import { GET as getBenchmarkById } from "./benchmarks/[id]/route";
import { GET as getBenchmarkPairsById } from "./benchmarks/[id]/pairs/route";

const tempDirs: string[] = [];
const originalRunsDir = process.env.RUNS_DIR;

async function makeTempDir() {
    const dir = await mkdtemp(join(tmpdir(), "api-route-test-"));
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    process.env.RUNS_DIR = originalRunsDir;
    await Promise.all(
        tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
});

describe("web api routes", () => {
    it("returns 404 when analysis index is missing", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        const response = await getAnalysis();
        expect(response.status).toBe(404);
    });

    it("returns analysis index payload", async () => {
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

        const response = await getAnalysis();
        expect(response.status).toBe(200);
        const json = (await response.json()) as { totals: { runs: number } };
        expect(json.totals.runs).toBe(0);
    });

    it("returns run and benchmark resources by id", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_1.json"),
            JSON.stringify({
                kind: "run",
                id: "run_1",
                question: "Q",
                metadata: {
                    createdAt: new Date().toISOString(),
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_1", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_1.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_1",
                question: "Q",
                metadata: {
                    createdAt: new Date().toISOString(),
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 1,
                    modeCount: 1,
                    modeSizes: [1],
                    divergenceEntropy: 0,
                    summary: { stability: { pairwiseMean: 1, pairs: [] } },
                },
            }),
            "utf-8",
        );

        const runResponse = await getRunById(new Request("http://localhost"), {
            params: Promise.resolve({ id: "run_1" }),
        });
        expect(runResponse.status).toBe(200);
        const runJson = (await runResponse.json()) as { id: string };
        expect(runJson.id).toBe("run_1");

        const benchmarkResponse = await getBenchmarkById(
            new Request("http://localhost"),
            {
                params: Promise.resolve({ id: "benchmark_1" }),
            },
        );
        expect(benchmarkResponse.status).toBe(200);
        const benchmarkJson = (await benchmarkResponse.json()) as { id: string };
        expect(benchmarkJson.id).toBe("benchmark_1");
    });

    it("returns benchmark pairwise data from chunk file", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-benchmark-pairs.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                pairwise: [
                    {
                        benchmarkId: "benchmark_2",
                        runIds: ["r1", "r2"],
                        pairs: [{ i: 0, j: 1, similarity: 0.88 }],
                    },
                ],
            }),
            "utf-8",
        );

        const response = await getBenchmarkPairsById(new Request("http://localhost"), {
            params: Promise.resolve({ id: "benchmark_2" }),
        });
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            benchmarkId: string;
            runIds: string[];
            pairs: Array<{ similarity: number }>;
        };
        expect(json.benchmarkId).toBe("benchmark_2");
        expect(json.runIds).toEqual(["r1", "r2"]);
        expect(json.pairs[0].similarity).toBe(0.88);
    });

    it("filters run and benchmark list endpoints by query params", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "Alpha question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt-alpha",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_b.json"),
            JSON.stringify({
                kind: "run",
                id: "run_b",
                question: "Beta question",
                metadata: {
                    createdAt: "2025-02-01T00:00:00.000Z",
                    model: "gpt-beta",
                    pipelinePreset: "research_deep",
                    fastMode: true,
                },
                run: { id: "run_b", finalAnswer: "B", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_a.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_a",
                question: "Alpha question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt-alpha",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 1,
                    modeCount: 1,
                    modeSizes: [1],
                    divergenceEntropy: 0,
                    summary: { stability: { pairwiseMean: 1, pairs: [] } },
                },
            }),
            "utf-8",
        );

        const runResponse = await getRuns(
            new Request("http://localhost/api/runs?model=beta&fast=true"),
        );
        expect(runResponse.status).toBe(200);
        const runJson = (await runResponse.json()) as { filtered: number; items: Array<{ id: string }> };
        expect(runJson.filtered).toBe(1);
        expect(runJson.items[0].id).toBe("run_b");

        const benchmarkResponse = await getBenchmarks(
            new Request("http://localhost/api/benchmarks?q=alpha&preset=standard"),
        );
        expect(benchmarkResponse.status).toBe(200);
        const benchmarkJson = (await benchmarkResponse.json()) as {
            filtered: number;
            items: Array<{ id: string }>;
        };
        expect(benchmarkJson.filtered).toBe(1);
        expect(benchmarkJson.items[0].id).toBe("benchmark_a");
    });
});
