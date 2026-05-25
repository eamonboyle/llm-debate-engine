import { describe, expect, it } from "vitest";
import { questionHubHref } from "./questionHub";

describe("questionHubHref", () => {
    it("encodes question text in the query string", () => {
        expect(questionHubHref("Is AI an existential threat?")).toBe(
            "/questions/view?question=Is%20AI%20an%20existential%20threat%3F",
        );
    });

    it("handles empty question", () => {
        expect(questionHubHref("")).toBe("/questions/view?question=");
    });
});
