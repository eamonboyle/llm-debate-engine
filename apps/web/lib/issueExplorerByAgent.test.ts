import { describe, expect, it } from "vitest";
import type { RunArtifact } from "./data";
import {
    buildIssueTypeSummariesFromRuns,
    listRunsForIssueTypeFromArtifacts,
} from "./issueExplorerByAgent";

function makeRun(steps: RunArtifact["run"]["steps"]): RunArtifact {
    return {
        kind: "run",
        id: "r1",
        question: "Q",
        metadata: {
            createdAt: "2026-01-01T00:00:00.000Z",
            model: "m",
            pipelinePreset: "research_deep",
            fastMode: false,
        },
        run: {
            id: "r1",
            finalAnswer: "a",
            steps,
            metrics: {},
        },
    };
}

describe("issueExplorerByAgent", () => {
    it("builds issue summaries scoped to skeptic critiques", () => {
        const run = makeRun([
            {
                id: "s1",
                agentName: "SkepticAgent",
                role: "skeptic",
                output: {
                    kind: "critique",
                    data: {
                        issues: [
                            { severity: 4, type: "factual", note: "a" },
                            { severity: 2, type: "logic", note: "b" },
                        ],
                    },
                },
            },
            {
                id: "s2",
                agentName: "RedTeamAgent",
                role: "redteam",
                output: {
                    kind: "critique",
                    data: {
                        issues: [{ severity: 5, type: "missing", note: "c" }],
                    },
                },
            },
        ]);

        const summaries = buildIssueTypeSummariesFromRuns([run], "skeptic");
        expect(summaries).toHaveLength(2);
        expect(summaries[0]).toMatchObject({
            type: "factual",
            totalCount: 1,
            runCount: 1,
        });
        expect(
            summaries.some((row) => row.type === "missing"),
        ).toBe(false);
    });

    it("lists runs for an issue type from artifact traces", () => {
        const run = makeRun([
            {
                id: "s1",
                agentName: "RedTeamAgent",
                role: "redteam",
                output: {
                    kind: "critique",
                    data: {
                        issues: [{ severity: 5, type: "missing", note: "c" }],
                    },
                },
            },
        ]);

        const rows = listRunsForIssueTypeFromArtifacts(
            [run],
            "missing",
            "redteam",
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            runId: "r1",
            countForType: 1,
            issueCount: 1,
        });
    });
});
