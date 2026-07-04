import { describe, expect, it } from "vitest";
import type { BenchmarkArtifact, RunArtifact } from "./data";
import {
    agentStatsToCsv,
    agentTimingToCsv,
    benchmarkArtifactsToCsv,
    confidenceDriftToCsv,
    counterfactualExplorerToCsv,
    evidenceExplorerToCsv,
    issueExplorerToCsv,
    modelLeaderboardToCsv,
    outliersToCsv,
    presetLeaderboardToCsv,
    qualityRunsToCsv,
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
                avgCoherence: 4.2,
                avgFactualRisk: 2.5,
                runsHref: "/runs?model=gpt-test",
            },
        ]);
        expect(csv).toContain("gpt-test");
        expect(csv).toContain("-0.05");
        expect(csv).toContain("4.2");
    });

    it("exports preset leaderboard rows", () => {
        const csv = presetLeaderboardToCsv([
            {
                preset: "research_deep",
                runCount: 2,
                avgIssueCount: 3.5,
                avgMaxSeverity: 4.0,
                avgSolverToRevisionDelta: -0.02,
                avgEvidenceRisk: 2.5,
                avgCoherence: 4.2,
                runsHref: "/runs?preset=research_deep",
            },
        ]);
        expect(csv).toContain("research_deep");
        expect(csv).toContain("4.2");
    });

    it("exports quality run rows", () => {
        const csv = qualityRunsToCsv([
            {
                id: "run_1",
                question: "Topic",
                model: "gpt-test",
                preset: "research_deep",
                createdAt: "2026-01-01T00:00:00.000Z",
                coherence: 4.5,
                completeness: 4.0,
                factualRisk: 2.0,
                uncertaintyHandling: 3.5,
                issueCount: 2,
                traceHref: "/runs/run_1",
            },
        ]);
        expect(csv).toContain("run_1");
        expect(csv).toContain("4.5");
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

    it("exports agent stats rows", () => {
        const csv = agentStatsToCsv([
            {
                agentName: "SolverAgent",
                stepCount: 12,
                runCount: 4,
                errorCount: 0,
                avgDurationMs: 1500,
            },
        ]);
        expect(csv).toContain("SolverAgent");
        expect(csv).toContain("1500");
    });

    it("exports agent timing rows", () => {
        const csv = agentTimingToCsv([
            {
                agentName: "SolverAgent",
                role: "solver",
                sampleCount: 5,
                avgDurationMs: 1200,
                medianDurationMs: 1100,
                totalDurationMs: 6000,
            },
        ]);
        expect(csv).toContain("solver");
        expect(csv).toContain("6000");
    });

    it("exports confidence drift rows", () => {
        const csv = confidenceDriftToCsv([
            {
                runId: "run_1",
                question: "Topic",
                model: "gpt-test",
                pipelinePreset: "standard",
                maxSeverity: 4,
                solverToRevisionDelta: -0.1,
                revisionToSynthesizerDelta: 0.05,
                calibratedMinusSynthDelta: -0.02,
                driftMagnitude: 0.15,
                traceHref: "/runs/run_1",
                compareHref: "/runs/compare?left=run_1",
            },
        ]);
        expect(csv).toContain("run_1");
        expect(csv).toContain("-0.1");
    });

    it("exports issue explorer summaries and selected runs", () => {
        const csv = issueExplorerToCsv(
            [
                {
                    type: "unsupported_claim",
                    totalCount: 3,
                    runCount: 2,
                    avgSeverity: 3.5,
                    maxSeverity: 4,
                },
            ],
            "unsupported_claim",
            [
                {
                    runId: "run_1",
                    question: "Topic",
                    model: "gpt-test",
                    pipelinePreset: "standard",
                    issueCount: 2,
                    countForType: 1,
                    maxSeverity: 4,
                    href: "/runs/run_1",
                },
            ],
        );
        expect(csv).toContain("unsupported_claim");
        expect(csv).toContain("run_1");
    });

    it("exports outlier rows", () => {
        const csv = outliersToCsv([
            {
                benchmarkId: "bench_1",
                runId: "run_1",
                avgSimilarity: 0.42,
                zScore: -1.2,
                peerRunId: "run_2",
                peerCompareHref: "/runs/compare?left=run_1&right=run_2",
            },
        ]);
        expect(csv).toContain("run_1");
        expect(csv).toContain("run_2");
    });

    it("exports evidence explorer summaries and selected runs", () => {
        const csv = evidenceExplorerToCsv([{ riskLevel: 4, runCount: 2 }], 4, [
            {
                runId: "run_1",
                question: "Topic",
                model: "gpt-test",
                pipelinePreset: "research_deep",
                evidenceRiskLevel: 4,
                href: "/runs/run_1",
            },
        ]);
        expect(csv).toContain("riskLevel,runCount");
        expect(csv).toContain("run_1");
    });

    it("exports counterfactual explorer summaries and selected runs", () => {
        const csv = counterfactualExplorerToCsv(
            [{ mode: "missing evidence", runCount: 3 }],
            "missing evidence",
            [
                {
                    runId: "run_1",
                    question: "Topic",
                    model: "gpt-test",
                    pipelinePreset: "research_deep",
                    failureModeCount: 2,
                    href: "/runs/run_1",
                },
            ],
        );
        expect(csv).toContain("missing evidence");
        expect(csv).toContain("run_1");
    });
});
