import { describe, expect, it } from "vitest";
import type { ConfidenceDriftRow } from "./confidenceDrift";
import { buildDriftTrendSeries } from "./driftTrends";

describe("driftTrends", () => {
    it("builds chronological drift trend series", () => {
        const rows: ConfidenceDriftRow[] = [
            {
                runId: "run-b",
                createdAt: "2026-01-02T00:00:00.000Z",
                question: "Q",
                model: "m",
                pipelinePreset: "standard",
                solverToRevisionDelta: -0.2,
                revisionToSynthesizerDelta: 0.1,
                calibratedMinusSynthDelta: 0.05,
                driftMagnitude: 0.3,
                traceHref: "/runs/run-b",
                compareHref: "/runs/compare?left=run-b",
            },
            {
                runId: "run-a",
                createdAt: "2026-01-01T00:00:00.000Z",
                question: "Q",
                model: "m",
                pipelinePreset: "standard",
                solverToRevisionDelta: -0.1,
                driftMagnitude: 0.1,
                traceHref: "/runs/run-a",
                compareHref: "/runs/compare?left=run-a",
            },
        ];

        const series = buildDriftTrendSeries(rows);
        expect(series).toHaveLength(2);
        expect(series[0]?.createdAt).toBe("2026-01-01T00:00:00.000Z");
        expect(series[1]?.createdAt).toBe("2026-01-02T00:00:00.000Z");
        expect(series[0]?.solverToRevisionDelta).toBe(-0.1);
    });
});
