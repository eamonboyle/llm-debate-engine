import { describe, expect, it } from "vitest";
import { comparePayloadToCsv, runCompareToCsv } from "./compareExport";
import { buildRunComparePayload } from "./runCompare";
import type { RunArtifact } from "./data";

function makeRun(id: string, solver: number): RunArtifact {
    return {
        kind: "run",
        id,
        question: `Question ${id}`,
        metadata: {
            createdAt: "2025-01-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: {
            id,
            finalAnswer: `Answer ${id}`,
            steps: [{ id: "s1", agentName: "Solver", role: "solver" }],
            metrics: {
                confidence: { solver },
                critique: { byType: { missing: 1 } },
            },
        },
    };
}

describe("compareExport", () => {
    it("flattens nested compare payloads into metric rows", () => {
        const csv = comparePayloadToCsv(
            { id: "left", metrics: { confidence: { solver: 0.3 } } },
            { id: "right", metrics: { confidence: { solver: 0.6 } } },
            { metrics: { confidence: { solver: 0.3 } } },
        );

        expect(csv).toContain("metric,left,right,delta");
        expect(csv).toContain("metrics.confidence.solver,0.3,0.6,0.3");
        expect(csv).toContain("id,left,right,");
    });

    it("exports run compare payloads", () => {
        const payload = buildRunComparePayload(
            makeRun("run_left", 0.3),
            makeRun("run_right", 0.6),
        );
        const csv = runCompareToCsv(payload);

        expect(csv).toContain("metrics.confidence.solver,0.3,0.6,0.3");
        expect(csv).toContain("id,run_left,run_right,");
    });
});
