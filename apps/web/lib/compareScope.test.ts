import { describe, expect, it } from "vitest";
import { compareScopeQuery, filterByQuestionScope } from "./compareScope";

describe("compareScope", () => {
    it("filters items by question substring", () => {
        const items = [
            { id: "1", question: "Is AI dangerous?" },
            { id: "2", question: "Climate policy options" },
        ];
        const filtered = filterByQuestionScope(items, "ai dangerous");
        expect(filtered.map((i) => i.id)).toEqual(["1"]);
    });

    it("returns compare query params when question is set", () => {
        expect(compareScopeQuery("  Alpha  ")).toEqual({ question: "Alpha" });
        expect(compareScopeQuery("")).toEqual({});
    });
});
