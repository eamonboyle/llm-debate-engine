import { describe, expect, it } from "vitest";
import type { AnalysisIndex } from "./data";
import {
    buildReviewQueue,
    reviewReasonLabel,
    summarizeReviewQueue,
} from "./reviewQueue";

function sampleIndex(): AnalysisIndex {
    return {
        generatedAt: new Date().toISOString(),
        totals: { runs: 4, benchmarks: 1, skippedFiles: 0 },
        runs: [
            {
                id: "run_outlier",
                question: "Q1",
                createdAt: "2026-01-04T00:00:00.000Z",
                model: "gpt-a",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "A",
                confidence: {},
                critique: { issueCount: 2 },
            },
            {
                id: "run_issues",
                question: "Q2",
                createdAt: "2026-01-03T00:00:00.000Z",
                model: "gpt-a",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "B",
                confidence: {},
                critique: { issueCount: 8 },
            },
            {
                id: "run_quality",
                question: "Q3",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "gpt-b",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "C",
                confidence: {},
                critique: { issueCount: 1 },
                quality: {
                    coherence: 1.5,
                    factualRisk: 4.5,
                },
            },
            {
                id: "run_clean",
                question: "Q4",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "gpt-b",
                pipelinePreset: "standard",
                fastMode: false,
                finalAnswerPreview: "D",
                confidence: {},
                critique: { issueCount: 1 },
            },
        ],
        benchmarks: [],
        skipped: [],
        aggregates: {
            issueTypeCounts: {},
            confidenceDrift: {
                solverToRevisionMean: 0,
                revisionToSynthesizerMean: 0,
                calibratedMinusSynthMean: 0,
            },
            presets: {},
            critiqueVsConfidence: [],
            outlierRuns: [
                {
                    benchmarkId: "bench_1",
                    runId: "run_outlier",
                    avgSimilarity: 0.2,
                    zScore: -2,
                },
            ],
        },
    };
}

describe("reviewQueue", () => {
    it("flags outliers, high issue counts, and low quality runs", () => {
        const items = buildReviewQueue(sampleIndex());
        expect(items.map((item) => item.runId)).toEqual([
            "run_outlier",
            "run_quality",
            "run_issues",
        ]);

        const quality = items.find((item) => item.runId === "run_quality");
        const issues = items.find((item) => item.runId === "run_issues");
        const outlier = items.find((item) => item.runId === "run_outlier");

        expect(quality?.reasons).toContain("elevated_factual_risk");
        expect(quality?.reasons).toContain("low_coherence");
        expect(issues?.reasons).toContain("high_critique_pressure");
        expect(outlier?.reasons).toContain("benchmark_outlier");
    });

    it("summarizes review queue counts by reason", () => {
        const items = buildReviewQueue(sampleIndex());
        const summary = summarizeReviewQueue(items);
        expect(summary.totalFlagged).toBe(3);
        expect(summary.outlierCount).toBe(1);
        expect(summary.highIssueCount).toBe(1);
        expect(summary.factualRiskCount).toBe(1);
        expect(summary.lowCoherenceCount).toBe(1);
    });

    it("maps reason codes to labels", () => {
        expect(reviewReasonLabel("benchmark_outlier")).toBe(
            "Benchmark outlier",
        );
    });
});
