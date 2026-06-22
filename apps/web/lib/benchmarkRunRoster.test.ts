import { describe, expect, it } from "vitest";
import {
    buildBenchmarkRunRoster,
    enrichBenchmarkRunRoster,
    sortBenchmarkRunRoster,
} from "./benchmarkRunRoster";
import type { RunArtifact } from "./data";

describe("buildBenchmarkRunRoster", () => {
    it("computes average pairwise similarity per run", () => {
        const roster = buildBenchmarkRunRoster({
            runIds: ["a", "b", "c"],
            pairs: [
                { i: 0, j: 1, similarity: 0.8 },
                { i: 0, j: 2, similarity: 0.6 },
                { i: 1, j: 2, similarity: 0.9 },
            ],
            modes: [{ members: [0, 1] }, { members: [2] }],
        });

        expect(roster).toHaveLength(3);
        expect(roster[0].avgSimilarity).toBeCloseTo(0.7);
        expect(roster[1].avgSimilarity).toBeCloseTo(0.85);
        expect(roster[2].avgSimilarity).toBeCloseTo(0.75);
        expect(roster[0].modeIndex).toBe(0);
        expect(roster[2].modeIndex).toBe(1);
    });

    it("returns null similarity when pairs are missing", () => {
        const roster = buildBenchmarkRunRoster({
            runIds: ["a", "b"],
            pairs: [],
        });
        expect(roster[0].avgSimilarity).toBeNull();
    });
});

describe("sortBenchmarkRunRoster", () => {
    it("orders runs by ascending average similarity", () => {
        const roster = buildBenchmarkRunRoster({
            runIds: ["a", "b", "c"],
            pairs: [
                { i: 0, j: 1, similarity: 0.8 },
                { i: 0, j: 2, similarity: 0.6 },
                { i: 1, j: 2, similarity: 0.9 },
            ],
        });
        const sorted = sortBenchmarkRunRoster(roster);
        expect(sorted.map((row) => row.runId)).toEqual(["a", "c", "b"]);
    });
});

describe("enrichBenchmarkRunRoster", () => {
    it("adds model and metric fields from run artifacts and index lookup", () => {
        const roster = buildBenchmarkRunRoster({
            runIds: ["run_a"],
            pairs: [],
        });
        const run: RunArtifact = {
            kind: "run",
            id: "run_a",
            question: "Q",
            metadata: {
                createdAt: new Date().toISOString(),
                model: "gpt-test",
                pipelinePreset: "standard",
                fastMode: false,
            },
            run: {
                id: "run_a",
                finalAnswer: "A",
                steps: [],
                metrics: {
                    confidence: { solver: 0.7 },
                    critique: { byType: { omission: 2 } },
                },
            },
        };
        const enriched = enrichBenchmarkRunRoster(
            roster,
            new Map([[run.id, run]]),
            new Map([
                [
                    "run_a",
                    {
                        issueCount: 3,
                        solverConfidence: 0.8,
                    },
                ],
            ]),
        );
        expect(enriched[0]).toMatchObject({
            runId: "run_a",
            model: "gpt-test",
            preset: "standard",
            solverConfidence: 0.8,
            issueCount: 3,
        });
    });
});
