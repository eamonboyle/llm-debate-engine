import { describe, expect, it } from "vitest";
import type { DebateRun } from "../types/agent";
import { computeBasicMetrics } from "./metrics";

function makeRunWithResearchSteps(): DebateRun {
    return {
        id: "run_metrics",
        createdAt: new Date().toISOString(),
        question: "Q",
        steps: [
            {
                id: "e1",
                agentName: "EvidencePlannerAgent",
                role: "research",
                request: {
                    model: "test",
                    temperature: 0,
                    messages: [],
                    schemaName: "EvidencePlan",
                    schema: {},
                },
                rawAttempts: [],
                createdAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                output: {
                    kind: "evidence_plan",
                    data: {
                        evidenceRequirements: ["Independent benchmarks"],
                        verificationChecks: ["Cross-check assumptions"],
                        majorUnknowns: ["Distribution shift"],
                        riskLevel: 4,
                    },
                },
            },
            {
                id: "c1",
                agentName: "CounterfactualAgent",
                role: "research",
                request: {
                    model: "test",
                    temperature: 0,
                    messages: [],
                    schemaName: "Counterfactual",
                    schema: {},
                },
                rawAttempts: [],
                createdAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                output: {
                    kind: "counterfactual",
                    data: {
                        failureModes: [
                            "Evidence becomes stale",
                            "Hidden assumption mismatch",
                        ],
                        triggerConditions: ["Rapid policy shift"],
                        mitigations: ["Re-run with fresh sources"],
                    },
                },
            },
        ],
        finalAnswer: "A",
        metrics: {
            confidence: {},
            critique: {},
        },
    };
}

describe("computeBasicMetrics research fields", () => {
    it("captures evidence risk and counterfactual mode metrics", () => {
        const run = makeRunWithResearchSteps();
        computeBasicMetrics(run);

        expect(run.metrics.research?.evidenceRiskLevel).toBe(4);
        expect(run.metrics.research?.counterfactualFailureModeCount).toBe(2);
        expect(run.metrics.research?.topCounterfactualFailureMode).toBe(
            "Evidence becomes stale",
        );
    });
});
