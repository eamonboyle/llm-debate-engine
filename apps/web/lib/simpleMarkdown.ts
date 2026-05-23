function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Minimal markdown renderer for analysis-report.md (headings, lists, paragraphs).
 */
export function renderSimpleMarkdown(markdown: string): string {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const parts: string[] = [];
    let inList = false;

    const closeList = () => {
        if (inList) {
            parts.push("</ul>");
            inList = false;
        }
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const trimmed = line.trim();

        if (trimmed === "") {
            closeList();
            continue;
        }

        if (trimmed.startsWith("### ")) {
            closeList();
            parts.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
            continue;
        }
        if (trimmed.startsWith("## ")) {
            closeList();
            parts.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
            continue;
        }
        if (trimmed.startsWith("# ")) {
            closeList();
            parts.push(`<h1>${escapeHtml(trimmed.slice(2))}</h1>`);
            continue;
        }
        if (trimmed.startsWith("- ")) {
            if (!inList) {
                parts.push("<ul>");
                inList = true;
            }
            parts.push(`<li>${escapeHtml(trimmed.slice(2))}</li>`);
            continue;
        }

        closeList();
        parts.push(`<p>${escapeHtml(trimmed)}</p>`);
    }

    closeList();
    return parts.join("\n");
}
