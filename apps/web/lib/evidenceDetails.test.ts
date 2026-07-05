import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import {
    aggregateEvidenceStrings,
    extractEvidenceDetailsForRuns,
} from "./evidenceDetails";

function makeRunWithEvidence(
    id: string,
    riskLevel: number,
    verificationChecks: string[],
): RunArtifact {
    return {
        kind: "run",
        id,
        question: "Evidence?",
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
                    agentName: "EvidencePlanner",
                    role: "research",
                    output: {
                        kind: "evidence_plan",
                        data: {
                            riskLevel,
                            evidenceRequirements: ["Primary sources"],
                            verificationChecks,
                            majorUnknowns: ["Sample size"],
                        },
                    },
                },
            ],
            metrics: {},
        },
    };
}

describe("evidenceDetails", () => {
    it("extracts evidence plan details filtered by risk level", () => {
        const runs = [
            makeRunWithEvidence("run_a", 4, ["Check citations"]),
            makeRunWithEvidence("run_b", 3, ["Check citations", "Peer review"]),
        ];

        const rows = extractEvidenceDetailsForRuns(runs, { riskLevel: 4 });
        expect(rows).toHaveLength(1);
        expect(rows[0]?.runId).toBe("run_a");
        expect(rows[0]?.verificationChecks).toEqual(["Check citations"]);
    });

    it("aggregates recurring verification checks", () => {
        const runs = [
            makeRunWithEvidence("run_a", 4, ["Check citations"]),
            makeRunWithEvidence("run_b", 4, ["Check citations", "Peer review"]),
        ];

        const rows = extractEvidenceDetailsForRuns(runs, { riskLevel: 4 });
        const aggregated = aggregateEvidenceStrings(
            rows,
            "verificationChecks",
        );
        expect(aggregated[0]).toMatchObject({
            text: "Check citations",
            runCount: 2,
        });
    });
});
