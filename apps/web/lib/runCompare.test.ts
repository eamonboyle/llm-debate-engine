import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import { buildRunComparePayload, summarizeRun } from "./runCompare";

function makeRunArtifact(params: {
    id: string;
    confidence?: Record<string, number>;
    critiqueByType?: Record<string, number>;
    critiqueMaxSeverity?: number;
    quality?: Record<string, number>;
    research?: Record<string, number | string>;
    stepCount?: number;
}): RunArtifact {
    return {
        kind: "run",
        id: params.id,
        question: `Question ${params.id}`,
        metadata: {
            createdAt: "2025-01-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "standard",
            fastMode: false,
        },
        run: {
            id: params.id,
            finalAnswer: `Final answer ${params.id}`,
            steps: Array.from({ length: params.stepCount ?? 1 }).map((_, idx) => ({
                id: `step_${idx}`,
                agentName: "Solver",
                role: "solver",
            })),
            metrics: {
                confidence: params.confidence,
                critique: {
                    byType: params.critiqueByType ?? {},
                    maxSeverity: params.critiqueMaxSeverity,
                },
                quality: params.quality,
                research: params.research,
            },
        },
    };
}

describe("run compare helpers", () => {
    it("summarizes run metrics consistently", () => {
        const run = makeRunArtifact({
            id: "run_a",
            confidence: { solver: 0.4, synthesizer: 0.7 },
            critiqueByType: { missing: 2, factual_error: 1 },
            critiqueMaxSeverity: 4,
            quality: { completeness: 0.8 },
            research: { evidenceRiskLevel: 4 },
            stepCount: 3,
        });

        const summary = summarizeRun(run);
        expect(summary.stepCount).toBe(3);
        expect(summary.metrics.confidence.solver).toBe(0.4);
        expect(summary.metrics.confidence.synthesizer).toBe(0.7);
        expect(summary.metrics.critique.issueCount).toBe(3);
        expect(summary.metrics.critique.maxSeverity).toBe(4);
        expect(summary.metrics.quality.completeness).toBe(0.8);
        expect(summary.metrics.research.evidenceRiskLevel).toBe(4);
        expect(summary.metrics.research.counterfactualFailureModeCount).toBeNull();
        expect(summary.metrics.research.topCounterfactualFailureMode).toBeNull();
    });

    it("computes deltas and preserves nulls for missing metrics", () => {
        const left = makeRunArtifact({
            id: "run_left",
            confidence: { solver: 0.3, synthesizer: 0.5 },
            critiqueByType: { missing: 1 },
            quality: { factualRisk: 0.4 },
            research: {
                evidenceRiskLevel: 2,
                counterfactualFailureModeCount: 1,
                topCounterfactualFailureMode: "Mode A",
            },
            stepCount: 1,
        });
        const right = makeRunArtifact({
            id: "run_right",
            confidence: { solver: 0.8 },
            critiqueByType: { missing: 3, overconfidence: 1 },
            quality: {},
            research: {
                evidenceRiskLevel: 5,
                counterfactualFailureModeCount: 3,
                topCounterfactualFailureMode: "Mode B",
            },
            stepCount: 2,
        });

        const compared = buildRunComparePayload(left, right);
        expect(compared.delta.stepCount).toBe(1);
        expect(compared.delta.confidence.solver).toBeCloseTo(0.5, 3);
        expect(compared.delta.confidence.synthesizer).toBeNull();
        expect(compared.delta.critique.issueCount).toBe(3);
        expect(compared.delta.quality.factualRisk).toBeNull();
        expect(compared.delta.research.evidenceRiskLevel).toBe(3);
        expect(compared.delta.research.counterfactualFailureModeCount).toBe(2);
        expect(compared.left.metrics.research.topCounterfactualFailureMode).toBe(
            "Mode A",
        );
        expect(compared.right.metrics.research.topCounterfactualFailureMode).toBe(
            "Mode B",
        );
    });
});
