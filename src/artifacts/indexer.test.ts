import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { buildAnalysisIndex, buildAndWriteAnalysisIndex } from "./indexer";

const tempDirs: string[] = [];

async function createTempRunsDir() {
    const dir = await mkdtemp(join(tmpdir(), "runs-indexer-test-"));
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
});

describe("buildAnalysisIndex", () => {
    it("builds aggregate metrics from artifacts", async () => {
        const dir = await createTempRunsDir();

        const run = {
            kind: "run",
            id: "run_1",
            question: "Is AI risky?",
            metadata: {
                schemaVersion: 1,
                createdAt: new Date().toISOString(),
                model: "gpt-test",
                fastMode: false,
                pipelinePreset: "research_deep",
                pipelineVersion: "1.0.0",
                source: "cli",
            },
            run: {
                id: "run_1",
                createdAt: new Date().toISOString(),
                question: "Is AI risky?",
                steps: [
                    {
                        id: "s1",
                        agentName: "SkepticAgent",
                        role: "skeptic",
                        request: {},
                        rawAttempts: [],
                        createdAt: new Date().toISOString(),
                        output: {
                            kind: "critique",
                            data: {
                                targetAgent: "SolverAgent",
                                issues: [
                                    {
                                        severity: 4,
                                        type: "factual",
                                        note: "Evidence is weak.",
                                    },
                                ],
                            },
                        },
                    },
                ],
                finalAnswer: "AI poses manageable but real risks.",
                metrics: {
                    confidence: {
                        solver: 0.8,
                        revision: 0.7,
                        synthesizer: 0.75,
                        calibratedAdjusted: 0.68,
                        solverToRevisionDelta: -0.1,
                        revisionToSynthesizerDelta: 0.05,
                    },
                    critique: {
                        maxSeverity: 4,
                        avgSeverity: 4,
                        byType: { factual: 1 },
                    },
                    quality: {
                        coherence: 4,
                        completeness: 3,
                        factualRisk: 2,
                        uncertaintyHandling: 4,
                    },
                },
            },
        };

        const benchmark = {
            kind: "benchmark",
            id: "benchmark_1",
            question: "Is AI risky?",
            metadata: {
                schemaVersion: 1,
                createdAt: new Date().toISOString(),
                model: "gpt-test",
                fastMode: false,
                pipelinePreset: "research_deep",
                pipelineVersion: "1.0.0",
                source: "cli",
            },
            payload: {
                runs: 1,
                runIds: ["run_1"],
                modeCount: 1,
                modeSizes: [1],
                divergenceEntropy: 0,
                modes: [
                    {
                        size: 1,
                        members: [0],
                        exemplarIndex: 0,
                        exemplarPreview: "This is a technical alignment discussion.",
                    },
                ],
                summary: {
                    question: "Is AI risky?",
                    runs: 1,
                    runIds: ["run_1"],
                    consensus: { mean: 0.9, stddev: 0 },
                    critiqueMaxSeverity: { mean: 4, stddev: 0 },
                    modeCount: 1,
                    modeSizes: [1],
                    divergenceEntropy: 0,
                    stability: {
                        pairwiseMean: 1,
                        pairwiseStddev: 0,
                        minPairwiseSimilarity: 1,
                        maxPairwiseSimilarity: 1,
                        pairs: [],
                    },
                },
            },
        };

        await writeFile(join(dir, "run_1.json"), JSON.stringify(run), "utf-8");
        await writeFile(
            join(dir, "benchmark_1.json"),
            JSON.stringify(benchmark),
            "utf-8",
        );

        const index = await buildAnalysisIndex(dir);
        expect(index.totals.runs).toBe(1);
        expect(index.totals.benchmarks).toBe(1);
        expect(index.aggregates.issueTypeCounts.factual).toBe(1);
        expect(index.aggregates.confidenceDrift.solverToRevisionMean).toBe(-0.1);
        expect(index.aggregates.outlierRuns).toHaveLength(0);
        expect(index.benchmarks[0].modeLabels[0].label).toContain("technical");
    });

    it("detects low-similarity outlier run from pairwise matrix", async () => {
        const dir = await createTempRunsDir();

        const makeRun = (id: string) => ({
            kind: "run",
            id,
            question: "Q",
            metadata: {
                schemaVersion: 1,
                createdAt: new Date().toISOString(),
                model: "gpt-test",
                fastMode: false,
                pipelinePreset: "standard",
                pipelineVersion: "1.0.0",
                source: "cli",
            },
            run: {
                id,
                createdAt: new Date().toISOString(),
                question: "Q",
                steps: [],
                finalAnswer: `answer-${id}`,
                metrics: {
                    confidence: {},
                    critique: {},
                },
            },
        });

        await writeFile(join(dir, "run_a.json"), JSON.stringify(makeRun("run_a")), "utf-8");
        await writeFile(join(dir, "run_b.json"), JSON.stringify(makeRun("run_b")), "utf-8");
        await writeFile(join(dir, "run_c.json"), JSON.stringify(makeRun("run_c")), "utf-8");

        const benchmark = {
            kind: "benchmark",
            id: "benchmark_outlier",
            question: "Q",
            metadata: {
                schemaVersion: 1,
                createdAt: new Date().toISOString(),
                model: "gpt-test",
                fastMode: false,
                pipelinePreset: "standard",
                pipelineVersion: "1.0.0",
                source: "cli",
            },
            payload: {
                runs: 3,
                runIds: ["run_a", "run_b", "run_c"],
                modeCount: 2,
                modeSizes: [2, 1],
                divergenceEntropy: 0.918,
                summary: {
                    question: "Q",
                    runs: 3,
                    runIds: ["run_a", "run_b", "run_c"],
                    consensus: { mean: 0.8, stddev: 0.1 },
                    critiqueMaxSeverity: { mean: 3, stddev: 0.5 },
                    modeCount: 2,
                    modeSizes: [2, 1],
                    divergenceEntropy: 0.918,
                    stability: {
                        pairwiseMean: 0.55,
                        pairwiseStddev: 0.2,
                        minPairwiseSimilarity: 0.2,
                        maxPairwiseSimilarity: 0.95,
                        pairs: [
                            { i: 0, j: 1, similarity: 0.95 },
                            { i: 0, j: 2, similarity: 0.25 },
                            { i: 1, j: 2, similarity: 0.2 },
                        ],
                    },
                },
            },
        };

        await writeFile(
            join(dir, "benchmark_outlier.json"),
            JSON.stringify(benchmark),
            "utf-8",
        );

        const index = await buildAnalysisIndex(dir);
        expect(index.aggregates.outlierRuns).toHaveLength(1);
        expect(index.aggregates.outlierRuns[0].benchmarkId).toBe("benchmark_outlier");
        expect(index.aggregates.outlierRuns[0].runId).toBe("run_c");
        expect(index.aggregates.outlierRuns[0].avgSimilarity).toBeCloseTo(0.225, 3);
    });

    it("writes optional CSV, markdown, and bundle exports", async () => {
        const dir = await createTempRunsDir();

        const run = {
            kind: "run",
            id: "run_csv",
            question: "CSV question",
            metadata: {
                schemaVersion: 1,
                createdAt: new Date().toISOString(),
                model: "gpt-test",
                fastMode: false,
                pipelinePreset: "standard",
                pipelineVersion: "1.0.0",
                source: "cli",
            },
            run: {
                id: "run_csv",
                createdAt: new Date().toISOString(),
                question: "CSV question",
                steps: [],
                finalAnswer: "CSV answer",
                metrics: { confidence: {}, critique: {} },
            },
        };
        const benchmark = {
            kind: "benchmark",
            id: "benchmark_csv",
            question: "CSV question",
            metadata: {
                schemaVersion: 1,
                createdAt: new Date().toISOString(),
                model: "gpt-test",
                fastMode: false,
                pipelinePreset: "standard",
                pipelineVersion: "1.0.0",
                source: "cli",
            },
            payload: {
                runs: 1,
                runIds: ["run_csv"],
                modeCount: 1,
                modeSizes: [1],
                divergenceEntropy: 0,
                summary: {
                    question: "CSV question",
                    runs: 1,
                    runIds: ["run_csv"],
                    consensus: { mean: 1, stddev: 0 },
                    critiqueMaxSeverity: { mean: 0, stddev: 0 },
                    modeCount: 1,
                    modeSizes: [1],
                    divergenceEntropy: 0,
                    stability: {
                        pairwiseMean: 1,
                        pairwiseStddev: 0,
                        minPairwiseSimilarity: 1,
                        maxPairwiseSimilarity: 1,
                        pairs: [],
                    },
                },
            },
        };

        await writeFile(join(dir, "run_csv.json"), JSON.stringify(run), "utf-8");
        await writeFile(
            join(dir, "benchmark_csv.json"),
            JSON.stringify(benchmark),
            "utf-8",
        );

        const result = await buildAndWriteAnalysisIndex({
            runsDir: dir,
            outputFileName: "analysis-index.json",
            writeCsv: true,
            writeMarkdown: true,
            markdownFileName: "analysis-report.md",
            writeBundle: true,
            bundleFileName: "analysis-bundle.json",
        });

        expect(result.csvPaths).toBeDefined();
        expect(result.markdownPath).toBeDefined();
        expect(result.bundlePath).toBeDefined();
        const runsCsv = await readFile(result.csvPaths!.runs, "utf-8");
        const benchmarksCsv = await readFile(result.csvPaths!.benchmarks, "utf-8");
        const markdown = await readFile(result.markdownPath!, "utf-8");
        const bundle = JSON.parse(
            await readFile(result.bundlePath!, "utf-8"),
        ) as { runs: unknown[]; benchmarks: unknown[]; index: { totals: { runs: number } } };
        expect(runsCsv).toContain("id,question,createdAt,model");
        expect(runsCsv).toContain("run_csv");
        expect(benchmarksCsv).toContain("benchmark_csv");
        expect(markdown).toContain("# Analysis Report");
        expect(markdown).toContain("## Totals");
        expect(bundle.runs).toHaveLength(1);
        expect(bundle.benchmarks).toHaveLength(1);
        expect(bundle.index.totals.runs).toBe(1);
    });
});
