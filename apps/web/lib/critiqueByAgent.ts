import type { RunArtifact } from "./data";

export type CritiqueAgentSummary = {
    agentName: string;
    role: string;
    issueCount: number;
    maxSeverity: number | null;
    avgSeverity: number | null;
    byType: Record<string, number>;
};

type CritiqueIssue = {
    severity: number;
    type: string;
};

function round3(value: number): number {
    return Math.round(value * 1000) / 1000;
}

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
            if (typeof severity !== "number" || !Number.isFinite(severity)) {
                return null;
            }
            if (typeof type !== "string" || !type.trim()) return null;
            return { severity, type };
        })
        .filter((issue): issue is CritiqueIssue => issue !== null);
}

export function extractCritiqueByAgent(
    run: RunArtifact,
): CritiqueAgentSummary[] {
    const summaries: CritiqueAgentSummary[] = [];

    for (const step of run.run.steps) {
        if (step.output?.kind !== "critique") continue;
        const issues = extractIssues(step.output);
        if (issues.length === 0) continue;

        const byType: Record<string, number> = {};
        const severities: number[] = [];
        for (const issue of issues) {
            byType[issue.type] = (byType[issue.type] ?? 0) + 1;
            severities.push(issue.severity);
        }

        summaries.push({
            agentName: step.agentName,
            role: step.role,
            issueCount: issues.length,
            maxSeverity: Math.max(...severities),
            avgSeverity: round3(
                severities.reduce((sum, value) => sum + value, 0) /
                    severities.length,
            ),
            byType,
        });
    }

    return summaries.sort(
        (a, b) =>
            b.issueCount - a.issueCount ||
            a.agentName.localeCompare(b.agentName),
    );
}
