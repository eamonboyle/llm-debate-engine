import type { RunArtifact } from "./data";

export type CritiqueNoteRow = {
    runId: string;
    question: string;
    model: string;
    agentName: string;
    severity: number;
    type: string;
    note: string;
    href: string;
};

type CritiqueIssue = {
    severity: number;
    type: string;
    note: string;
};

function extractIssues(output: unknown): CritiqueIssue[] {
    if (!output || typeof output !== "object") return [];
    const data = (output as { data?: unknown }).data ?? output;
    if (!data || typeof data !== "object") return [];
    const issues = (data as { issues?: unknown }).issues;
    if (!Array.isArray(issues)) return [];

    return issues
        .map((issue) => {
            if (!issue || typeof issue !== "object") return null;
            const severity = (issue as { severity?: unknown }).severity;
            const type = (issue as { type?: unknown }).type;
            const note = (issue as { note?: unknown }).note;
            if (typeof severity !== "number" || !Number.isFinite(severity)) {
                return null;
            }
            if (typeof type !== "string" || !type.trim()) return null;
            const noteText =
                typeof note === "string"
                    ? note.trim()
                    : note != null
                      ? String(note).trim()
                      : "";
            return { severity, type: type.trim(), note: noteText };
        })
        .filter((issue): issue is CritiqueIssue => issue !== null);
}

export function extractCritiqueNotesFromRun(
    run: RunArtifact,
    issueType?: string,
): CritiqueNoteRow[] {
    const normalizedType = issueType?.trim().toLowerCase();
    const rows: CritiqueNoteRow[] = [];

    for (const step of run.run.steps) {
        if (step.output?.kind !== "critique") continue;
        const issues = extractIssues(step.output);
        for (const issue of issues) {
            if (
                normalizedType &&
                issue.type.toLowerCase() !== normalizedType
            ) {
                continue;
            }
            rows.push({
                runId: run.id,
                question: run.question,
                model: run.metadata.model,
                agentName: step.agentName,
                severity: issue.severity,
                type: issue.type,
                note: issue.note || "—",
                href: `/runs/${run.id}`,
            });
        }
    }

    return rows;
}

export function extractCritiqueNotesForRuns(
    runs: RunArtifact[],
    issueType: string,
    runIds?: Set<string>,
): CritiqueNoteRow[] {
    const normalized = issueType.trim().toLowerCase();
    if (!normalized) return [];

    const rows: CritiqueNoteRow[] = [];
    for (const run of runs) {
        if (runIds && !runIds.has(run.id)) continue;
        rows.push(...extractCritiqueNotesFromRun(run, normalized));
    }

    return rows.sort(
        (a, b) =>
            b.severity - a.severity ||
            a.runId.localeCompare(b.runId) ||
            a.agentName.localeCompare(b.agentName),
    );
}
