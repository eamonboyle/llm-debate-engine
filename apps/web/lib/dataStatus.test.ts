import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { loadBenchmarksByQuestion, loadDataStatus } from "./data";

const tempDirs: string[] = [];
const originalRunsDir = process.env.RUNS_DIR;

async function makeTempDir() {
    const dir = await mkdtemp(join(tmpdir(), "data-status-test-"));
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

describe("loadDataStatus", () => {
    it("reports artifact counts and missing index files", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "Shared Q",
                metadata: {
                    createdAt: "2026-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );

        const status = await loadDataStatus();
        expect(status.artifactCounts.runs).toBe(1);
        expect(status.artifactCounts.benchmarks).toBe(0);
        expect(status.hasAnalysisIndex).toBe(false);
        expect(status.indexTotals).toBeNull();
    });

    it("detects analysis index and report files", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: "2026-02-01T12:00:00.000Z",
                totals: { runs: 0, benchmarks: 0, skippedFiles: 1 },
                runs: [],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [{ file: "bad.json", error: "parse error" }],
            }),
            "utf-8",
        );
        await writeFile(join(dir, "analysis-report.md"), "# Report\n", "utf-8");

        const status = await loadDataStatus();
        expect(status.hasAnalysisIndex).toBe(true);
        expect(status.hasAnalysisReport).toBe(true);
        expect(status.analysisGeneratedAt).toBe("2026-02-01T12:00:00.000Z");
        expect(status.skippedCount).toBe(1);
        expect(status.indexTotals?.skippedFiles).toBe(1);
    });
});

describe("loadBenchmarksByQuestion", () => {
    it("returns benchmarks matching the question", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        const question = "Is AI safe?";
        await writeFile(
            join(dir, "benchmark_1.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_1",
                question,
                metadata: {
                    createdAt: "2026-01-02T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 2,
                    modeCount: 1,
                    modeSizes: [2],
                    divergenceEntropy: 0.5,
                },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_2.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_2",
                question: "Other",
                metadata: {
                    createdAt: "2026-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 1,
                    modeCount: 1,
                    modeSizes: [1],
                    divergenceEntropy: 0.1,
                },
            }),
            "utf-8",
        );

        const matches = await loadBenchmarksByQuestion(question);
        expect(matches).toHaveLength(1);
        expect(matches[0]?.id).toBe("benchmark_1");
    });
});
