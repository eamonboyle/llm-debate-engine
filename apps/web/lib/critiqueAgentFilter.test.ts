import { describe, expect, it } from "vitest";
import {
    critiqueAgentFilterLabel,
    matchesCritiqueAgentFilter,
    parseCritiqueAgentFilter,
} from "./critiqueAgentFilter";

describe("critiqueAgentFilter", () => {
    it("parses agent filter values", () => {
        expect(parseCritiqueAgentFilter(undefined)).toBe("all");
        expect(parseCritiqueAgentFilter("skeptic")).toBe("skeptic");
        expect(parseCritiqueAgentFilter("redteam")).toBe("redteam");
        expect(parseCritiqueAgentFilter("unknown")).toBe("all");
    });

    it("matches roles for skeptic and red team", () => {
        expect(matchesCritiqueAgentFilter("skeptic", "all")).toBe(true);
        expect(matchesCritiqueAgentFilter("skeptic", "skeptic")).toBe(true);
        expect(matchesCritiqueAgentFilter("skeptic", "redteam")).toBe(false);
        expect(matchesCritiqueAgentFilter("redteam", "redteam")).toBe(true);
        expect(matchesCritiqueAgentFilter("red_team", "redteam")).toBe(true);
    });

    it("returns readable labels", () => {
        expect(critiqueAgentFilterLabel("all")).toBe("All critique agents");
        expect(critiqueAgentFilterLabel("skeptic")).toBe("Skeptic only");
    });
});
