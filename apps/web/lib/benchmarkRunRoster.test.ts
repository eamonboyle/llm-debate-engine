import { describe, expect, it } from "vitest";
import { buildBenchmarkRunRoster } from "./benchmarkRunRoster";

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
