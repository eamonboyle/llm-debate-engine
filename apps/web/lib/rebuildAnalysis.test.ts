import { describe, expect, it } from "vitest";
import { parseAnalysisRebuildFilters } from "./rebuildAnalysis";

describe("parseAnalysisRebuildFilters", () => {
    it("parses rebuild filter payload", () => {
        expect(
            parseAnalysisRebuildFilters({
                questionContains: "climate",
                modelContains: "gpt",
                presetEquals: "research_deep",
                fastMode: "true",
                createdAfter: "2026-01-01T00:00",
            }),
        ).toEqual({
            questionContains: "climate",
            modelContains: "gpt",
            presetEquals: "research_deep",
            fastMode: true,
            createdAfter: "2026-01-01T00:00:00.000Z",
            createdBefore: undefined,
        });
    });

    it("ignores invalid preset values", () => {
        expect(
            parseAnalysisRebuildFilters({
                presetEquals: "not-a-preset",
            }).presetEquals,
        ).toBeUndefined();
    });
});
