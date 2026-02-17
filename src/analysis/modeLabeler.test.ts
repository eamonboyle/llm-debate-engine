import { describe, expect, it } from "vitest";
import { inferModeLabel } from "./modeLabeler";

describe("inferModeLabel", () => {
    it("labels high-risk framing", () => {
        expect(
            inferModeLabel(
                "This scenario carries catastrophic existential risk.",
            ),
        ).toBe("high-risk framing");
    });

    it("labels policy-oriented framing", () => {
        expect(
            inferModeLabel("Policy and governance interventions are key."),
        ).toBe("policy-oriented");
    });

    it("labels technical framing", () => {
        expect(
            inferModeLabel("A technical alignment strategy is required."),
        ).toBe("technical framing");
    });

    it("labels economic framing", () => {
        expect(
            inferModeLabel("Economic and jobs impacts dominate this mode."),
        ).toBe("economic framing");
    });

    it("falls back to general framing", () => {
        expect(
            inferModeLabel("Balanced answer with mixed considerations."),
        ).toBe("general framing");
    });
});
