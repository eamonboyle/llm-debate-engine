import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import {
    buildAgentTimingStats,
    buildRunStepTiming,
    formatDurationMs,
    summarizeRunStepTiming,
} from "./stepTiming";

function sampleRun(): RunArtifact {
    return {
        kind: "run",
        id: "run-1",
        question: "Q?",
        metadata: {
            createdAt: "2026-01-01T00:00:00.000Z",
            model: "m",
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: {
            id: "run-1",
            finalAnswer: "answer",
            steps: [
                {
                    id: "s1",
                    agentName: "SolverAgent",
                    role: "Solver",
                    createdAt: "2026-01-01T00:00:00.000Z",
                    completedAt: "2026-01-01T00:00:02.000Z",
                },
                {
                    id: "s2",
                    agentName: "SkepticAgent",
                    role: "Skeptic",
                    createdAt: "2026-01-01T00:00:02.000Z",
                    completedAt: "2026-01-01T00:00:05.000Z",
                },
            ],
            metrics: {},
        },
    };
}

describe("stepTiming", () => {
    it("aggregates per-agent durations", () => {
        const rows = buildAgentTimingStats([sampleRun()]);
        expect(rows).toHaveLength(2);
        expect(rows[0].agentName).toBe("SkepticAgent");
        expect(rows[0].avgDurationMs).toBe(3000);
        expect(rows[1].agentName).toBe("SolverAgent");
        expect(rows[1].avgDurationMs).toBe(2000);
    });

    it("formats durations for display", () => {
        expect(formatDurationMs(450)).toBe("450ms");
        expect(formatDurationMs(2500)).toBe("2.5s");
        expect(formatDurationMs(125_000)).toBe("2m 5s");
    });

    it("builds per-run step timing rows", () => {
        const rows = buildRunStepTiming(sampleRun());
        expect(rows).toHaveLength(2);
        expect(rows[0].durationMs).toBe(2000);
        expect(rows[1].durationMs).toBe(3000);

        const summary = summarizeRunStepTiming(rows);
        expect(summary.timedStepCount).toBe(2);
        expect(summary.totalDurationMs).toBe(5000);
        expect(summary.avgStepDurationMs).toBe(2500);
    });
});
