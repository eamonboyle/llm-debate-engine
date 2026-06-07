import type { ActivityEntry } from "./activityFeed";

function escapeCsv(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

export function activityEntriesToCsv(entries: ActivityEntry[]): string {
    const header = [
        "kind",
        "id",
        "createdAt",
        "question",
        "model",
        "pipelinePreset",
        "fastMode",
        "detail",
        "href",
    ];
    const rows = entries.map((entry) =>
        [
            entry.kind,
            entry.id,
            entry.createdAt,
            entry.question,
            entry.model,
            entry.pipelinePreset,
            entry.fastMode ? "true" : "false",
            entry.detail,
            entry.href,
        ]
            .map((value) => escapeCsv(String(value)))
            .join(","),
    );
    return [header.join(","), ...rows].join("\n");
}
