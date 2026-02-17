import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { GET as getAnalysis } from "./analysis/route";
import { GET as getBenchmarks } from "./benchmarks/route";
import { GET as getBenchmarksCompare } from "./benchmarks/compare/route";
import { GET as getRunById } from "./runs/[id]/route";
import { GET as getRunsCompare } from "./runs/compare/route";
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
        tempDirs
            .splice(0)
            .map((dir) => rm(dir, { recursive: true, force: true })),
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
        const benchmarkJson = (await benchmarkResponse.json()) as {
            id: string;
        };
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

        const response = await getBenchmarkPairsById(
            new Request("http://localhost"),
            {
                params: Promise.resolve({ id: "benchmark_2" }),
            },
        );
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            benchmarkId: string;
            source: string;
            runIds: string[];
            pairs: Array<{ similarity: number }>;
        };
        expect(json.benchmarkId).toBe("benchmark_2");
        expect(json.source).toBe("chunk");
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
        await writeFile(
            join(dir, "benchmark_b.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_b",
                question: "Beta benchmark",
                metadata: {
                    createdAt: "2025-02-01T00:00:00.000Z",
                    model: "gpt-beta",
                    pipelinePreset: "research_deep",
                    fastMode: true,
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
        const runJson = (await runResponse.json()) as {
            filtered: number;
            items: Array<{ id: string }>;
        };
        expect(runJson.filtered).toBe(1);
        expect(runJson.items[0].id).toBe("run_b");

        const benchmarkResponse = await getBenchmarks(
            new Request(
                "http://localhost/api/benchmarks?q=alpha&preset=standard",
            ),
        );
        expect(benchmarkResponse.status).toBe(200);
        const benchmarkJson = (await benchmarkResponse.json()) as {
            filtered: number;
            items: Array<{ id: string }>;
        };
        expect(benchmarkJson.filtered).toBe(1);
        expect(benchmarkJson.items[0].id).toBe("benchmark_a");
    });

    it("supports runs and benchmarks pagination and oldest sort", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "A question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
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
                question: "B question",
                metadata: {
                    createdAt: "2025-02-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
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
                question: "A benchmark",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
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
        await writeFile(
            join(dir, "benchmark_b.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_b",
                question: "B benchmark",
                metadata: {
                    createdAt: "2025-02-01T00:00:00.000Z",
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

        const runsResponse = await getRuns(
            new Request(
                "http://localhost/api/runs?sort=oldest&offset=0&limit=1",
            ),
        );
        expect(runsResponse.status).toBe(200);
        const runsJson = (await runsResponse.json()) as {
            offset: number;
            limit: number;
            totalPages: number;
            prevPage: number | null;
            nextPage: number | null;
            hasMore: boolean;
            items: Array<{ id: string }>;
        };
        expect(runsJson.offset).toBe(0);
        expect(runsJson.limit).toBe(1);
        expect(runsJson.totalPages).toBe(2);
        expect(runsJson.prevPage).toBeNull();
        expect(runsJson.nextPage).toBe(2);
        expect(runsJson.hasMore).toBe(true);
        expect(runsJson.items[0].id).toBe("run_a");

        const benchmarksResponse = await getBenchmarks(
            new Request(
                "http://localhost/api/benchmarks?sort=oldest&offset=1&limit=1",
            ),
        );
        expect(benchmarksResponse.status).toBe(200);
        const benchmarksJson = (await benchmarksResponse.json()) as {
            offset: number;
            limit: number;
            totalPages: number;
            prevPage: number | null;
            nextPage: number | null;
            hasMore: boolean;
            items: Array<{ id: string }>;
        };
        expect(benchmarksJson.offset).toBe(1);
        expect(benchmarksJson.limit).toBe(1);
        expect(benchmarksJson.totalPages).toBe(2);
        expect(benchmarksJson.prevPage).toBe(1);
        expect(benchmarksJson.nextPage).toBeNull();
        expect(benchmarksJson.hasMore).toBe(false);
        expect(benchmarksJson.items[0].id).toBe("benchmark_b");
    });

    it("uses fallback pagination defaults when params are missing or blank", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "A question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_a.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_a",
                question: "A benchmark",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
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

        const runsResponse = await getRuns(
            new Request("http://localhost/api/runs"),
        );
        const runsJson = (await runsResponse.json()) as {
            page: number;
            totalPages: number;
            prevPage: number | null;
            nextPage: number | null;
            limit: number;
            offset: number;
        };
        expect(runsJson.page).toBe(1);
        expect(runsJson.totalPages).toBe(1);
        expect(runsJson.prevPage).toBeNull();
        expect(runsJson.nextPage).toBeNull();
        expect(runsJson.offset).toBe(0);
        expect(runsJson.limit).toBe(100);

        const benchmarksResponse = await getBenchmarks(
            new Request("http://localhost/api/benchmarks?limit=&offset="),
        );
        const benchmarksJson = (await benchmarksResponse.json()) as {
            page: number;
            totalPages: number;
            prevPage: number | null;
            nextPage: number | null;
            limit: number;
            offset: number;
        };
        expect(benchmarksJson.page).toBe(1);
        expect(benchmarksJson.totalPages).toBe(1);
        expect(benchmarksJson.prevPage).toBeNull();
        expect(benchmarksJson.nextPage).toBeNull();
        expect(benchmarksJson.offset).toBe(0);
        expect(benchmarksJson.limit).toBe(100);
    });

    it("supports page/pageSize aliases for list pagination", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "A question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
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
                question: "B question",
                metadata: {
                    createdAt: "2025-02-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_b", finalAnswer: "B", steps: [], metrics: {} },
            }),
            "utf-8",
        );

        const runsResponse = await getRuns(
            new Request(
                "http://localhost/api/runs?sort=oldest&page=2&pageSize=1",
            ),
        );
        expect(runsResponse.status).toBe(200);
        const runsJson = (await runsResponse.json()) as {
            page: number;
            totalPages: number;
            prevPage: number | null;
            nextPage: number | null;
            offset: number;
            limit: number;
            items: Array<{ id: string }>;
        };
        expect(runsJson.page).toBe(2);
        expect(runsJson.totalPages).toBe(2);
        expect(runsJson.prevPage).toBe(1);
        expect(runsJson.nextPage).toBeNull();
        expect(runsJson.offset).toBe(1);
        expect(runsJson.limit).toBe(1);
        expect(runsJson.items[0].id).toBe("run_b");
    });

    it("uses deterministic id tie-break for same createdAt sorting", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_b.json"),
            JSON.stringify({
                kind: "run",
                id: "run_b",
                question: "B question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_b", finalAnswer: "B", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "A question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );

        const newest = await getRuns(
            new Request("http://localhost/api/runs?sort=newest&limit=2"),
        );
        const newestJson = (await newest.json()) as {
            items: Array<{ id: string }>;
        };
        expect(newestJson.items.map((item) => item.id)).toEqual([
            "run_a",
            "run_b",
        ]);

        const oldest = await getRuns(
            new Request("http://localhost/api/runs?sort=oldest&limit=2"),
        );
        const oldestJson = (await oldest.json()) as {
            items: Array<{ id: string }>;
        };
        expect(oldestJson.items.map((item) => item.id)).toEqual([
            "run_a",
            "run_b",
        ]);
    });

    it("returns benchmark compare deltas", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "benchmark_left.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_left",
                question: "Q left",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 2,
                    modeCount: 1,
                    modeSizes: [2],
                    divergenceEntropy: 0.1,
                    summary: { stability: { pairwiseMean: 0.9, pairs: [] } },
                },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_right.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_right",
                question: "Q right",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 4,
                    modeCount: 3,
                    modeSizes: [2, 1, 1],
                    divergenceEntropy: 0.8,
                    summary: { stability: { pairwiseMean: 0.6, pairs: [] } },
                },
            }),
            "utf-8",
        );

        const response = await getBenchmarksCompare(
            new Request(
                "http://localhost/api/benchmarks/compare?left=benchmark_left&right=benchmark_right",
            ),
        );
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            delta: {
                runs: number;
                modeCount: number;
                divergenceEntropy: number;
                stabilityPairwiseMean: number | null;
            };
        };
        expect(json.delta.runs).toBe(2);
        expect(json.delta.modeCount).toBe(2);
        expect(json.delta.divergenceEntropy).toBeCloseTo(0.7, 3);
        expect(json.delta.stabilityPairwiseMean).toBeCloseTo(-0.3, 3);
    });

    it("returns 400/404 for invalid benchmark compare requests", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        const missingParams = await getBenchmarksCompare(
            new Request("http://localhost/api/benchmarks/compare"),
        );
        expect(missingParams.status).toBe(400);

        const notFound = await getBenchmarksCompare(
            new Request(
                "http://localhost/api/benchmarks/compare?left=a&right=b",
            ),
        );
        expect(notFound.status).toBe(404);
    });

    it("returns run compare deltas", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_left.json"),
            JSON.stringify({
                kind: "run",
                id: "run_left",
                question: "Q left",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: {
                    id: "run_left",
                    finalAnswer: "A",
                    steps: [{ id: "s1", agentName: "Solver", role: "solver" }],
                    metrics: {
                        confidence: {
                            solver: 0.3,
                            revision: 0.5,
                            synthesizer: 0.6,
                            solverToRevisionDelta: 0.2,
                            revisionToSynthesizerDelta: 0.1,
                        },
                        critique: {
                            byType: { factual_error: 1, omission: 1 },
                            maxSeverity: 3,
                            avgSeverity: 2.5,
                        },
                        quality: {
                            coherence: 0.7,
                            completeness: 0.6,
                            factualRisk: 0.4,
                            uncertaintyHandling: 0.5,
                        },
                        research: {
                            evidenceRiskLevel: 2,
                            counterfactualFailureModeCount: 1,
                            topCounterfactualFailureMode: "Mode A",
                        },
                    },
                },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_right.json"),
            JSON.stringify({
                kind: "run",
                id: "run_right",
                question: "Q right",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "research_deep",
                    fastMode: false,
                },
                run: {
                    id: "run_right",
                    finalAnswer: "B",
                    steps: [
                        { id: "s1", agentName: "Solver", role: "solver" },
                        { id: "s2", agentName: "Skeptic", role: "skeptic" },
                    ],
                    metrics: {
                        confidence: {
                            solver: 0.6,
                            revision: 0.7,
                            synthesizer: 0.8,
                            calibratedAdjusted: 0.75,
                            solverToRevisionDelta: 0.1,
                            revisionToSynthesizerDelta: 0.1,
                        },
                        critique: {
                            byType: { factual_error: 3 },
                            maxSeverity: 4,
                            avgSeverity: 3.2,
                        },
                        quality: {
                            coherence: 0.8,
                            completeness: 0.9,
                            factualRisk: 0.3,
                            uncertaintyHandling: 0.8,
                        },
                        research: {
                            evidenceRiskLevel: 5,
                            counterfactualFailureModeCount: 3,
                            topCounterfactualFailureMode: "Mode B",
                        },
                    },
                },
            }),
            "utf-8",
        );

        const response = await getRunsCompare(
            new Request(
                "http://localhost/api/runs/compare?left=run_left&right=run_right",
            ),
        );
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            left: { id: string };
            right: { id: string };
            delta: {
                stepCount: number;
                confidence: {
                    solver: number | null;
                    calibratedAdjusted: number | null;
                };
                critique: {
                    issueCount: number;
                    maxSeverity: number | null;
                };
                quality: {
                    completeness: number | null;
                    factualRisk: number | null;
                };
                research: {
                    evidenceRiskLevel: number | null;
                    counterfactualFailureModeCount: number | null;
                };
            };
        };
        expect(json.left.id).toBe("run_left");
        expect(json.right.id).toBe("run_right");
        expect(json.delta.stepCount).toBe(1);
        expect(json.delta.confidence.solver).toBeCloseTo(0.3, 3);
        expect(json.delta.confidence.calibratedAdjusted).toBeNull();
        expect(json.delta.critique.issueCount).toBe(1);
        expect(json.delta.critique.maxSeverity).toBe(1);
        expect(json.delta.quality.completeness).toBeCloseTo(0.3, 3);
        expect(json.delta.quality.factualRisk).toBeCloseTo(-0.1, 3);
        expect(json.delta.research.evidenceRiskLevel).toBe(3);
        expect(json.delta.research.counterfactualFailureModeCount).toBe(2);
    });

    it("returns 400/404 for invalid run compare requests", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        const missingParams = await getRunsCompare(
            new Request("http://localhost/api/runs/compare"),
        );
        expect(missingParams.status).toBe(400);

        const notFound = await getRunsCompare(
            new Request("http://localhost/api/runs/compare?left=a&right=b"),
        );
        expect(notFound.status).toBe(404);
    });
});
