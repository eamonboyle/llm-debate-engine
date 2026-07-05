import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import {
    aggregateCounterfactualStrings,
    extractCounterfactualDetailsForRuns,
} from "./counterfactualDetails";

function makeRunWithCounterfactual(
    id: string,
    failureModes: string[],
    mitigations: string[],
): RunArtifact {
    return {
        kind: "run",
        id,
        question: "Counterfactual?",
        metadata: {
            createdAt: "2026-01-01T00:00:00.000Z",
            model: "gpt-test",
            pipelinePreset: "research_deep",
            fastMode: false,
        },
        run: {
            id,
            finalAnswer: "answer",
            steps: [
                {
                    id: "step-1",
                    agentName: "Counterfactual",
                    role: "research",
                    output: {
                        kind: "counterfactual",
                        data: {
                            failureModes,
                            triggerConditions: ["Low adoption"],
                            mitigations,
                        },
                    },
                },
            ],
            metrics: {},
        },
    };
}

describe("counterfactualDetails", () => {
    it("extracts counterfactual details for a failure mode", () => {
        const runs = [
            makeRunWithCounterfactual(
                "run_a",
                ["Model drift", "Data leakage"],
                ["Retrain monthly"],
            ),
            makeRunWithCounterfactual(
                "run_b",
                ["Other mode"],
                ["Add monitoring"],
            ),
        ];

        const rows = extractCounterfactualDetailsForRuns(runs, {
            failureMode: "Model drift",
        });
        expect(rows).toHaveLength(1);
        expect(rows[0]?.runId).toBe("run_a");
        expect(rows[0]?.mitigations).toEqual(["Retrain monthly"]);
    });

    it("aggregates recurring mitigations", () => {
        const runs = [
            makeRunWithCounterfactual(
                "run_a",
                ["Model drift"],
                ["Retrain monthly"],
            ),
            makeRunWithCounterfactual(
                "run_b",
                ["Model drift"],
                ["Retrain monthly", "Add guardrails"],
            ),
        ];

        const rows = extractCounterfactualDetailsForRuns(runs, {
            failureMode: "Model drift",
        });
        const aggregated = aggregateCounterfactualStrings(rows, "mitigations");
        expect(aggregated[0]).toMatchObject({
            text: "Retrain monthly",
            runCount: 2,
        });
    });
});
