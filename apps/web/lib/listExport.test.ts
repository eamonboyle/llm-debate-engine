import { describe, expect, it } from "vitest";
import type { BenchmarkArtifact, RunArtifact } from "./data";
import {
    benchmarkArtifactsToCsv,
    modelLeaderboardToCsv,
    questionGroupsToCsv,
    runArtifactsToCsv,
    searchResultsToCsv,
} from "./listExport";
import type { QuestionGroup } from "./questionGroups";

const sampleRun: RunArtifact = {
    kind: "run",
    id: "run_1",
    question: 'Question with "quotes"',
    metadata: {
        createdAt: "2026-01-01T00:00:00.000Z",
        model: "gpt-test",
        pipelinePreset: "standard",
        fastMode: false,
    },
    run: { id: "run_1", finalAnswer: "Answer", steps: [], metrics: {} },
};

const sampleBenchmark: BenchmarkArtifact = {
    kind: "benchmark",
    id: "bench_1",
    question: "Benchmark Q",
    metadata: {
        createdAt: "2026-01-01T00:00:00.000Z",
        model: "gpt-test",
        pipelinePreset: "research_deep",
        fastMode: true,
    },
    payload: {
        runs: 5,
        modeCount: 2,
        modeSizes: [3, 2],
        divergenceEntropy: 0.42,
        summary: { stability: { pairwiseMean: 0.88 } },
    },
};

const sampleGroup: QuestionGroup = {
    question: "Topic A",
    runCount: 2,
    benchmarkCount: 1,
    latestCreatedAt: "2026-01-02T00:00:00.000Z",
    models: ["gpt-a", "gpt-b"],
    presets: ["standard"],
    sampleRunId: "run_a",
    sampleBenchmarkId: "bench_a",
};

describe("listExport", () => {
    it("escapes quoted fields in run CSV", () => {
        const csv = runArtifactsToCsv([sampleRun]);
        expect(csv).toContain('"Question with ""quotes"""');
        expect(csv.split("\n")).toHaveLength(2);
    });

    it("exports benchmark stability mean", () => {
        const csv = benchmarkArtifactsToCsv([sampleBenchmark]);
        expect(csv).toContain("bench_1");
        expect(csv).toContain("0.88");
    });

    it("joins question group models with semicolons", () => {
        const csv = questionGroupsToCsv([sampleGroup]);
        expect(csv).toContain("gpt-a; gpt-b");
        expect(csv).toContain("Topic A");
    });

    it("exports model leaderboard rows", () => {
        const csv = modelLeaderboardToCsv([
            {
                model: "gpt-test",
                runCount: 3,
                avgIssueCount: 2.5,
                avgMaxSeverity: 4.2,
                avgSolverToRevisionDelta: -0.05,
                avgEvidenceRisk: 2.1,
                avgSolverConfidence: 0.82,
                runsHref: "/runs?model=gpt-test",
            },
        ]);
        expect(csv).toContain("gpt-test");
        expect(csv).toContain("-0.05");
    });

    it("exports search results with section markers", () => {
        const csv = searchResultsToCsv({
            query: "climate",
            totals: { runs: 1, benchmarks: 0, questions: 1 },
            runs: [
                {
                    id: "run_1",
                    question: "Climate policy",
                    model: "gpt-test",
                    preset: "standard",
                    createdAt: "2026-01-01T00:00:00.000Z",
                    preview: "Answer preview",
                },
            ],
            benchmarks: [],
            questions: [sampleGroup],
        });
        expect(csv).toContain("section,question");
        expect(csv).toContain("run_1");
        expect(csv).toContain("Topic A");
    });
});
