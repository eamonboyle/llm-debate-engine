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
                    {
                        id: "s2",
                        agentName: "CounterfactualAgent",
                        role: "research",
                        request: {},
                        rawAttempts: [],
                        createdAt: new Date().toISOString(),
                        output: {
                            kind: "counterfactual",
                            data: {
                                failureModes: ["Domain shift invalidates assumptions"],
                                triggerConditions: ["New policy constraints"],
                                mitigations: ["Re-run with updated sources"],
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
                    research: {
                        evidenceRiskLevel: 4,
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
        expect(
            index.aggregates.confidenceCorrelation
                .severityVsSolverToRevisionDelta,
        ).toBe(0);
        expect(index.aggregates.outlierRuns).toHaveLength(0);
        expect(index.runs[0].research?.evidenceRiskLevel).toBe(4);
        expect(index.runs[0].research?.counterfactualFailureModeCount).toBe(1);
        expect(index.runs[0].research?.topCounterfactualFailureMode).toContain(
            "Domain shift",
        );
        expect(index.aggregates.evidencePlanning?.riskLevelMean).toBe(4);
        expect(index.aggregates.evidencePlanning?.riskLevelDistribution["4"]).toBe(1);
        expect(
            index.aggregates.counterfactualFailureModeCounts[
                "Domain shift invalidates assumptions"
            ],
        ).toBe(1);
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

    it("writes optional CSV, markdown, bundle, and chunk exports", async () => {
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
                        pairs: [{ i: 0, j: 0, similarity: 1 }],
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
            writeChunks: true,
            chunkFileName: "analysis-benchmark-pairs.json",
        });

        expect(result.csvPaths).toBeDefined();
        expect(result.markdownPath).toBeDefined();
        expect(result.bundlePath).toBeDefined();
        expect(result.chunkPath).toBeDefined();
        const runsCsv = await readFile(result.csvPaths!.runs, "utf-8");
        const benchmarksCsv = await readFile(result.csvPaths!.benchmarks, "utf-8");
        const markdown = await readFile(result.markdownPath!, "utf-8");
        const chunk = JSON.parse(
            await readFile(result.chunkPath!, "utf-8"),
        ) as { pairwise: Array<{ benchmarkId: string; pairs: unknown[] }> };
        const bundle = JSON.parse(
            await readFile(result.bundlePath!, "utf-8"),
        ) as { runs: unknown[]; benchmarks: unknown[]; index: { totals: { runs: number } } };
        expect(runsCsv).toContain("id,question,createdAt,model");
        expect(runsCsv).toContain("run_csv");
        expect(benchmarksCsv).toContain("benchmark_csv");
        expect(markdown).toContain("# Analysis Report");
        expect(markdown).toContain("## Totals");
        expect(chunk.pairwise).toHaveLength(1);
        expect(chunk.pairwise[0].benchmarkId).toBe("benchmark_csv");
        expect(bundle.runs).toHaveLength(1);
        expect(bundle.benchmarks).toHaveLength(1);
        expect(bundle.index.totals.runs).toBe(1);
    });

    it("computes severity-confidence correlation coefficients", async () => {
        const dir = await createTempRunsDir();

        const mkRun = (
            id: string,
            severity: number,
            solverToRevisionDelta: number,
            revisionToSynthesizerDelta: number,
        ) => ({
            kind: "run",
            id,
            question: "Correlation Q",
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
                id,
                createdAt: new Date().toISOString(),
                question: "Correlation Q",
                steps: [],
                finalAnswer: "A",
                metrics: {
                    confidence: {
                        solverToRevisionDelta,
                        revisionToSynthesizerDelta,
                    },
                    critique: {
                        maxSeverity: severity,
                    },
                },
            },
        });

        await writeFile(
            join(dir, "corr_a.json"),
            JSON.stringify(mkRun("corr_a", 1, -0.1, 0.1)),
            "utf-8",
        );
        await writeFile(
            join(dir, "corr_b.json"),
            JSON.stringify(mkRun("corr_b", 3, -0.3, 0.3)),
            "utf-8",
        );
        await writeFile(
            join(dir, "corr_c.json"),
            JSON.stringify(mkRun("corr_c", 5, -0.5, 0.5)),
            "utf-8",
        );

        const index = await buildAnalysisIndex(dir);
        expect(
            index.aggregates.confidenceCorrelation
                .severityVsSolverToRevisionDelta,
        ).toBeCloseTo(-1, 3);
        expect(
            index.aggregates.confidenceCorrelation
                .severityVsRevisionToSynthesizerDelta,
        ).toBeCloseTo(1, 3);
    });

    it("supports question substring filtering for analysis output", async () => {
        const dir = await createTempRunsDir();

        const makeRun = (id: string, question: string) => ({
            kind: "run",
            id,
            question,
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
                question,
                steps: [],
                finalAnswer: `answer-${id}`,
                metrics: {
                    confidence: {},
                    critique: {},
                },
            },
        });
        const makeBenchmark = (id: string, question: string) => ({
            kind: "benchmark",
            id,
            question,
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
                runIds: [id],
                modeCount: 1,
                modeSizes: [1],
                divergenceEntropy: 0,
                summary: {
                    question,
                    runs: 1,
                    runIds: [id],
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
        });

        await writeFile(
            join(dir, "run_alpha.json"),
            JSON.stringify(makeRun("run_alpha", "Alpha project analysis")),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_beta.json"),
            JSON.stringify(makeRun("run_beta", "Beta project analysis")),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_alpha.json"),
            JSON.stringify(
                makeBenchmark("benchmark_alpha", "Alpha project analysis"),
            ),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_beta.json"),
            JSON.stringify(makeBenchmark("benchmark_beta", "Beta project analysis")),
            "utf-8",
        );

        const index = await buildAnalysisIndex(dir, {
            questionContains: "alpha",
        });
        expect(index.filterContext?.questionContains).toBe("alpha");
        expect(index.totals.runs).toBe(1);
        expect(index.totals.benchmarks).toBe(1);
        expect(index.runs[0].id).toBe("run_alpha");
        expect(index.benchmarks[0].id).toBe("benchmark_alpha");
    });

    it("supports model/preset/fast-mode filtering", async () => {
        const dir = await createTempRunsDir();

        const makeRun = (
            id: string,
            model: string,
            pipelinePreset: "standard" | "research_deep" | "fast_research",
            fastMode: boolean,
        ) => ({
            kind: "run",
            id,
            question: "Filter test",
            metadata: {
                schemaVersion: 1,
                createdAt: new Date().toISOString(),
                model,
                fastMode,
                pipelinePreset,
                pipelineVersion: "1.0.0",
                source: "cli",
            },
            run: {
                id,
                createdAt: new Date().toISOString(),
                question: "Filter test",
                steps: [],
                finalAnswer: "answer",
                metrics: { confidence: {}, critique: {} },
            },
        });
        const makeBenchmark = (
            id: string,
            model: string,
            pipelinePreset: "standard" | "research_deep" | "fast_research",
            fastMode: boolean,
        ) => ({
            kind: "benchmark",
            id,
            question: "Filter test",
            metadata: {
                schemaVersion: 1,
                createdAt: new Date().toISOString(),
                model,
                fastMode,
                pipelinePreset,
                pipelineVersion: "1.0.0",
                source: "cli",
            },
            payload: {
                runs: 1,
                runIds: [id],
                modeCount: 1,
                modeSizes: [1],
                divergenceEntropy: 0,
                summary: {
                    question: "Filter test",
                    runs: 1,
                    runIds: [id],
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
        });

        await writeFile(
            join(dir, "run_match.json"),
            JSON.stringify(
                makeRun("run_match", "gpt-matched", "research_deep", false),
            ),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_non_match.json"),
            JSON.stringify(
                makeRun("run_non_match", "gpt-other", "standard", true),
            ),
            "utf-8",
        );

        await writeFile(
            join(dir, "benchmark_match.json"),
            JSON.stringify(
                makeBenchmark(
                    "benchmark_match",
                    "gpt-matched",
                    "research_deep",
                    false,
                ),
            ),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_non_match.json"),
            JSON.stringify(
                makeBenchmark(
                    "benchmark_non_match",
                    "gpt-other",
                    "standard",
                    true,
                ),
            ),
            "utf-8",
        );

        const index = await buildAnalysisIndex(dir, {
            modelContains: "matched",
            presetEquals: "research_deep",
            fastMode: false,
        });
        expect(index.totals.runs).toBe(1);
        expect(index.totals.benchmarks).toBe(1);
        expect(index.runs[0].id).toBe("run_match");
        expect(index.benchmarks[0].id).toBe("benchmark_match");
    });

    it("supports created-after and created-before filtering", async () => {
        const dir = await createTempRunsDir();
        const makeRun = (id: string, createdAt: string) => ({
            kind: "run",
            id,
            question: "Date filter",
            metadata: {
                schemaVersion: 1,
                createdAt,
                model: "gpt-test",
                fastMode: false,
                pipelinePreset: "standard",
                pipelineVersion: "1.0.0",
                source: "cli",
            },
            run: {
                id,
                createdAt,
                question: "Date filter",
                steps: [],
                finalAnswer: "A",
                metrics: { confidence: {}, critique: {} },
            },
        });
        const makeBenchmark = (id: string, createdAt: string) => ({
            kind: "benchmark",
            id,
            question: "Date filter",
            metadata: {
                schemaVersion: 1,
                createdAt,
                model: "gpt-test",
                fastMode: false,
                pipelinePreset: "standard",
                pipelineVersion: "1.0.0",
                source: "cli",
            },
            payload: {
                runs: 1,
                runIds: [id],
                modeCount: 1,
                modeSizes: [1],
                divergenceEntropy: 0,
                summary: {
                    question: "Date filter",
                    runs: 1,
                    runIds: [id],
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
        });

        await writeFile(
            join(dir, "run_old.json"),
            JSON.stringify(makeRun("run_old", "2025-01-01T00:00:00.000Z")),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_new.json"),
            JSON.stringify(makeRun("run_new", "2025-02-01T00:00:00.000Z")),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_old.json"),
            JSON.stringify(
                makeBenchmark("benchmark_old", "2025-01-01T00:00:00.000Z"),
            ),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_new.json"),
            JSON.stringify(
                makeBenchmark("benchmark_new", "2025-02-01T00:00:00.000Z"),
            ),
            "utf-8",
        );

        const index = await buildAnalysisIndex(dir, {
            createdAfter: "2025-01-15T00:00:00.000Z",
            createdBefore: "2025-03-01T00:00:00.000Z",
        });
        expect(index.totals.runs).toBe(1);
        expect(index.totals.benchmarks).toBe(1);
        expect(index.runs[0].id).toBe("run_new");
        expect(index.benchmarks[0].id).toBe("benchmark_new");
    });
});
