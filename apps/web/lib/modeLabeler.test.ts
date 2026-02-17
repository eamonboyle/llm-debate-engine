import { describe, expect, it } from "vitest";
import { inferModeLabel } from "./modeLabeler";

describe("web mode labeler", () => {
    it("labels high-risk framing before other categories", () => {
        expect(
            inferModeLabel("Catastrophic governance failure from misaligned systems"),
        ).toBe("high-risk framing");
    });

    it("labels policy-oriented content", () => {
        expect(
            inferModeLabel("Policy reforms and international governance pathways"),
        ).toBe("policy-oriented");
    });

    it("labels technical framing content", () => {
        expect(
            inferModeLabel("Technical alignment plans for frontier model control"),
        ).toBe("technical framing");
    });

    it("labels economic framing content", () => {
        expect(
            inferModeLabel("Economic and jobs impact from deployment acceleration"),
        ).toBe("economic framing");
    });

    it("falls back to general framing", () => {
        expect(inferModeLabel("Broad social framing without keywords")).toBe(
            "general framing",
        );
    });
});
