import { describe, expect, it } from "vitest";
import type { AnalysisIndex, RunArtifact } from "./data";
import {
    buildConfidenceDriftRows,
    buildDriftCompareHref,
    summarizeConfidenceDrift,
} from "./confidenceDrift";

function makeIndex(): AnalysisIndex {
    return {
        generatedAt: "2026-01-01T00:00:00.000Z",
        totals: { runs: 2, benchmarks: 0, skippedFiles: 0 },
        runs: [
            {
                id: "run-low",
                question: "Q",
                createdAt: "2026-01-01T00:00:00.000Z",
                model: "m",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "a",
                confidence: {
                    solverToRevisionDelta: -0.1,
                    revisionToSynthesizerDelta: 0.05,
                },
                critique: { issueCount: 0, maxSeverity: 2 },
            },
            {
                id: "run-high",
                question: "Q",
                createdAt: "2026-01-02T00:00:00.000Z",
                model: "m",
                pipelinePreset: "research_deep",
                fastMode: false,
                finalAnswerPreview: "b",
                confidence: {
                    solverToRevisionDelta: -0.5,
                    revisionToSynthesizerDelta: 0.4,
                },
                critique: { issueCount: 0, maxSeverity: 5 },
            },
        ],
        benchmarks: [],
        aggregates: {
            issueTypeCounts: {},
            confidenceDrift: {
                solverToRevisionMean: -0.3,
                revisionToSynthesizerMean: 0.2,
                calibratedMinusSynthMean: 0,
            },
            confidenceCorrelation: {
                severityVsSolverToRevisionDelta: 0.5,
                severityVsRevisionToSynthesizerDelta: 0.1,
            },
            presets: {},
            critiqueVsConfidence: [
                {
                    runId: "run-low",
                    maxSeverity: 2,
                    solverToRevisionDelta: -0.1,
                },
            ],
        },
        skipped: [],
    };
}

describe("confidenceDrift", () => {
    it("sorts runs by combined drift magnitude", () => {
        const rows = buildConfidenceDriftRows(makeIndex());
        expect(rows[0]?.runId).toBe("run-high");
        expect(rows[0]?.driftMagnitude).toBeCloseTo(0.9, 5);
    });

    it("summarizes aggregate drift stats", () => {
        const summary = summarizeConfidenceDrift(makeIndex());
        expect(summary.runCount).toBe(2);
        expect(summary.solverToRevisionMean).toBe(-0.3);
        expect(summary.severityVsSolverToRevision).toBe(0.5);
        expect(summary.severityVsRevisionToSynthesizer).toBe(0.1);
        expect(summary.calibratedMinusSynthMean).toBe(0);
    });

    it("computes per-run calibrated minus synthesizer delta", () => {
        const index = makeIndex();
        index.runs[0]!.confidence = {
            ...index.runs[0]!.confidence,
            calibratedAdjusted: 0.8,
            synthesizer: 0.7,
        };
        const rows = buildConfidenceDriftRows(index);
        expect(
            rows.find((row) => row.runId === "run-low")
                ?.calibratedMinusSynthDelta,
        ).toBeCloseTo(0.1, 5);
    });

    it("builds peer-aware compare href when run artifacts are provided", () => {
        const runs: RunArtifact[] = [
            {
                kind: "run",
                id: "run-low",
                question: "Q",
                metadata: {
                    createdAt: "2026-01-01T00:00:00.000Z",
                    model: "m",
                    pipelinePreset: "research_deep",
                    fastMode: false,
                },
                run: {
                    id: "run-low",
                    finalAnswer: "a",
                    steps: [],
                    metrics: {},
                },
            },
            {
                kind: "run",
                id: "run-high",
                question: "Q",
                metadata: {
                    createdAt: "2026-01-02T00:00:00.000Z",
                    model: "m",
                    pipelinePreset: "research_deep",
                    fastMode: false,
                },
                run: {
                    id: "run-high",
                    finalAnswer: "b",
                    steps: [],
                    metrics: {},
                },
            },
        ];

        expect(buildDriftCompareHref(runs, "run-high")).toBe(
            "/runs/compare?left=run-high&right=run-low",
        );

        const rows = buildConfidenceDriftRows(makeIndex(), { runs });
        expect(rows.find((row) => row.runId === "run-high")?.compareHref).toBe(
            "/runs/compare?left=run-high&right=run-low",
        );
    });
});
