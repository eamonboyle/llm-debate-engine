import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { buildAnalysisIndex } from "./indexer";

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
});
