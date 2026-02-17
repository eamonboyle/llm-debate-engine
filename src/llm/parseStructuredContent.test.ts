import { describe, it, expect } from "vitest";
import { parseStructuredContent } from "./OpenAiCompatibleClient";

describe("parseStructuredContent", () => {
    const sample = {
        answer: "Yes",
        keyClaims: ["A"],
        assumptions: [],
        confidence: 0.9,
    };

    it("parses string content", () => {
        const raw = JSON.stringify(sample);
        expect(parseStructuredContent<typeof sample>(raw)).toEqual(sample);
    });

    it("handles empty string", () => {
        expect(parseStructuredContent<Record<string, unknown>>("")).toEqual({});
    });

    it("parses array with output_json block", () => {
        const raw = [{ type: "output_json", output_json: sample }];
        expect(parseStructuredContent<typeof sample>(raw)).toEqual(sample);
    });

    it("parses array with text block", () => {
        const raw = [{ type: "text", text: JSON.stringify(sample) }];
        expect(parseStructuredContent<typeof sample>(raw)).toEqual(sample);
    });

    it("returns empty object for empty array", () => {
        expect(parseStructuredContent<Record<string, unknown>>([])).toEqual({});
    });

    it("returns empty object for null/undefined", () => {
        expect(parseStructuredContent<Record<string, unknown>>(null)).toEqual(
            {},
        );
        expect(
            parseStructuredContent<Record<string, unknown>>(undefined),
        ).toEqual({});
    });
});
