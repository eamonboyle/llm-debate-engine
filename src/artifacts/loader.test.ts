import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { loadRunArtifacts } from "./loader";

const tempDirs: string[] = [];

async function makeTempRunsDir() {
    const dir = await mkdtemp(join(tmpdir(), "runs-loader-test-"));
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
});

describe("loadRunArtifacts", () => {
    it("loads v1 run artifacts", async () => {
        const dir = await makeTempRunsDir();
        const payload = {
            kind: "run",
            id: "run_1",
            question: "Q",
            run: {
                id: "run_1",
                createdAt: new Date().toISOString(),
                question: "Q",
                steps: [],
                finalAnswer: "A",
                metrics: { confidence: {}, critique: {} },
            },
            metadata: {
                schemaVersion: 1,
                createdAt: new Date().toISOString(),
                model: "gpt",
                fastMode: false,
                pipelinePreset: "standard",
                pipelineVersion: "1.0.0",
                source: "cli",
            },
        };
        await writeFile(join(dir, "run_1.json"), JSON.stringify(payload), "utf-8");

        const loaded = await loadRunArtifacts(dir);
        expect(loaded.runs).toHaveLength(1);
        expect(loaded.benchmarks).toHaveLength(0);
        expect(loaded.skipped).toHaveLength(0);
        expect(loaded.runs[0].id).toBe("run_1");
    });

    it("migrates legacy benchmark artifacts", async () => {
        const dir = await makeTempRunsDir();
        const legacy = {
            id: "benchmark_1",
            createdAt: new Date().toISOString(),
            question: "Q",
            runs: 3,
            runIds: ["r1", "r2", "r3"],
            modeCount: 1,
            modeSizes: [3],
            divergenceEntropy: 0,
            summary: {
                question: "Q",
                runs: 3,
                runIds: ["r1", "r2", "r3"],
                consensus: { mean: 0.8, stddev: 0.1 },
                critiqueMaxSeverity: { mean: 3, stddev: 0.2 },
                modeCount: 1,
                modeSizes: [3],
                divergenceEntropy: 0,
                stability: {
                    pairwiseMean: 0.9,
                    pairwiseStddev: 0.02,
                    minPairwiseSimilarity: 0.88,
                    maxPairwiseSimilarity: 0.92,
                    pairs: [],
                },
            },
        };
        await writeFile(
            join(dir, "benchmark_1.json"),
            JSON.stringify(legacy),
            "utf-8",
        );

        const loaded = await loadRunArtifacts(dir);
        expect(loaded.runs).toHaveLength(0);
        expect(loaded.benchmarks).toHaveLength(1);
        expect(loaded.benchmarks[0].kind).toBe("benchmark");
        expect(loaded.benchmarks[0].payload.summary.runs).toBe(3);
    });

    it("tracks invalid files as skipped", async () => {
        const dir = await makeTempRunsDir();
        await writeFile(join(dir, "bad.json"), "{invalid", "utf-8");

        const loaded = await loadRunArtifacts(dir);
        expect(loaded.runs).toHaveLength(0);
        expect(loaded.benchmarks).toHaveLength(0);
        expect(loaded.skipped).toHaveLength(1);
    });

    it("ignores analysis-index.json file", async () => {
        const dir = await makeTempRunsDir();
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({ generatedAt: new Date().toISOString() }),
            "utf-8",
        );

        const loaded = await loadRunArtifacts(dir);
        expect(loaded.runs).toHaveLength(0);
        expect(loaded.benchmarks).toHaveLength(0);
        expect(loaded.skipped).toHaveLength(0);
    });

    it("ignores analysis bundle artifacts", async () => {
        const dir = await makeTempRunsDir();
        await writeFile(
            join(dir, "analysis-bundle-custom.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                index: { totals: { runs: 0, benchmarks: 0 } },
                runs: [],
                benchmarks: [],
            }),
            "utf-8",
        );

        const loaded = await loadRunArtifacts(dir);
        expect(loaded.runs).toHaveLength(0);
        expect(loaded.benchmarks).toHaveLength(0);
        expect(loaded.skipped).toHaveLength(0);
    });
});
