import { describe, expect, it } from "vitest";
import { buildLeaderboardCompareSuggestions } from "./leaderboardCompareSuggestions";

const entries = [
    { key: "gpt-4", runCount: 12 },
    { key: "gpt-4o", runCount: 10 },
    { key: "claude", runCount: 4 },
    { key: "gemini", runCount: 2 },
];

describe("buildLeaderboardCompareSuggestions", () => {
    it("returns empty when both sides are selected", () => {
        expect(
            buildLeaderboardCompareSuggestions(
                entries,
                { left: "gpt-4", right: "claude" },
                "/leaderboard/compare",
            ),
        ).toEqual([]);
    });

    it("suggests peers when only left is selected", () => {
        const suggestions = buildLeaderboardCompareSuggestions(
            entries,
            { left: "gpt-4" },
            "/leaderboard/compare",
        );
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0]?.href).toContain("left=gpt-4");
        expect(suggestions[0]?.href).toContain("right=");
    });

    it("suggests peers when only right is selected", () => {
        const suggestions = buildLeaderboardCompareSuggestions(
            entries,
            { right: "gpt-4o" },
            "/presets/compare",
            { fast: "true" },
        );
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0]?.href).toContain("right=gpt-4o");
        expect(suggestions[0]?.href).toContain("fast=true");
    });
});
