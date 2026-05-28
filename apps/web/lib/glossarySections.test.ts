import { describe, expect, it } from "vitest";
import {
    buildGlossarySections,
    filterGlossarySections,
} from "./glossarySections";

describe("glossary sections", () => {
    it("builds non-empty curated sections", () => {
        const sections = buildGlossarySections();
        expect(sections.length).toBeGreaterThan(0);
        expect(sections[0]?.entries.length).toBeGreaterThan(0);
    });

    it("filters entries by query", () => {
        const sections = buildGlossarySections();
        const filtered = filterGlossarySections(sections, "entropy");
        expect(filtered.some((s) => s.entries.length > 0)).toBe(true);
        expect(
            filtered.every((s) =>
                s.entries.every(
                    (e) =>
                        e.key.toLowerCase().includes("entropy") ||
                        e.description.toLowerCase().includes("entropy"),
                ),
            ),
        ).toBe(true);
    });
});
