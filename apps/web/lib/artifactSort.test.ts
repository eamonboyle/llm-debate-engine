import { describe, expect, it } from "vitest";
import { sortArtifactsByCreatedAt } from "./artifactSort";

type FakeArtifact = {
    id: string;
    metadata: {
        createdAt: string;
    };
};

describe("artifact sort helpers", () => {
    it("sorts artifacts newest first by default semantics", () => {
        const artifacts: FakeArtifact[] = [
            { id: "b", metadata: { createdAt: "2025-01-01T00:00:00.000Z" } },
            { id: "a", metadata: { createdAt: "2025-01-01T00:00:00.000Z" } },
            { id: "c", metadata: { createdAt: "2025-02-01T00:00:00.000Z" } },
        ];
        const sorted = sortArtifactsByCreatedAt(artifacts, "newest");
        expect(sorted.map((item) => item.id)).toEqual(["c", "a", "b"]);
    });

    it("sorts artifacts oldest first with deterministic id tie-breaks", () => {
        const artifacts: FakeArtifact[] = [
            { id: "b", metadata: { createdAt: "2025-01-01T00:00:00.000Z" } },
            { id: "a", metadata: { createdAt: "2025-01-01T00:00:00.000Z" } },
            { id: "c", metadata: { createdAt: "2025-02-01T00:00:00.000Z" } },
        ];
        const sorted = sortArtifactsByCreatedAt(artifacts, "oldest");
        expect(sorted.map((item) => item.id)).toEqual(["a", "b", "c"]);
    });
});
