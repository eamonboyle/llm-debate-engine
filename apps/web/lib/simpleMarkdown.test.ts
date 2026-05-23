import { describe, expect, it } from "vitest";
import { renderSimpleMarkdown } from "./simpleMarkdown";

describe("renderSimpleMarkdown", () => {
    it("renders headings and list items", () => {
        const html = renderSimpleMarkdown(
            "# Title\n\n## Section\n\n- one\n- two\n",
        );
        expect(html).toContain("<h1>Title</h1>");
        expect(html).toContain("<h2>Section</h2>");
        expect(html).toContain("<li>one</li>");
        expect(html).toContain("<li>two</li>");
    });

    it("escapes HTML in content", () => {
        const html = renderSimpleMarkdown("<script>alert(1)</script>");
        expect(html).not.toContain("<script>");
        expect(html).toContain("&lt;script&gt;");
    });
});
