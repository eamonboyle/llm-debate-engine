import { describe, expect, it } from "vitest";
import { findMostSimilarPeerRunId } from "./benchmarkPeers";

describe("findMostSimilarPeerRunId", () => {
    const runIds = ["run-a", "run-b", "run-c"];
    const pairs = [
        { i: 0, j: 1, similarity: 0.9 },
        { i: 0, j: 2, similarity: 0.5 },
        { i: 1, j: 2, similarity: 0.7 },
    ];

    it("returns the peer with highest average similarity to the target", () => {
        expect(findMostSimilarPeerRunId("run-a", runIds, pairs)).toBe("run-b");
        expect(findMostSimilarPeerRunId("run-c", runIds, pairs)).toBe("run-b");
    });

    it("returns null when the run is not in the benchmark", () => {
        expect(findMostSimilarPeerRunId("run-x", runIds, pairs)).toBeNull();
    });
});
