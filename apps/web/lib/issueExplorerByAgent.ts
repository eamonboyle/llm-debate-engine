import type { RunArtifact } from "./data";
import type { CritiqueAgentFilter } from "./critiqueAgentFilter";
import { matchesCritiqueAgentFilter } from "./critiqueAgentFilter";
import type { IssueTypeSummary, RunIssueRow } from "./issueExplorer";

type CritiqueIssue = {
    severity: number;
    type: string;
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
            if (typeof severity !== "number" || !Number.isFinite(severity)) {
                return null;
            }
            if (typeof type !== "string" || !type.trim()) return null;
            return { severity, type: type.trim() };
        })
        .filter((issue): issue is CritiqueIssue => issue !== null);
}

function mean(values: number[]): number | undefined {
    if (values.length === 0) return undefined;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildIssueTypeSummariesFromRuns(
    runs: RunArtifact[],
    agentFilter: CritiqueAgentFilter,
): IssueTypeSummary[] {
    const totalCounts = new Map<string, number>();
    const runCounts = new Map<string, Set<string>>();
    const severitiesByType = new Map<string, number[]>();

    for (const run of runs) {
        const issuesForRun: CritiqueIssue[] = [];

        for (const step of run.run.steps) {
            if (step.output?.kind !== "critique") continue;
            if (!matchesCritiqueAgentFilter(step.role, agentFilter)) continue;
            issuesForRun.push(...extractIssues(step.output));
        }

        if (issuesForRun.length === 0) continue;

        const byType = new Map<string, number[]>();
        for (const issue of issuesForRun) {
            const bucket = byType.get(issue.type) ?? [];
            bucket.push(issue.severity);
            byType.set(issue.type, bucket);
        }

        for (const [type, severities] of byType.entries()) {
            totalCounts.set(type, (totalCounts.get(type) ?? 0) + severities.length);
            const runSet = runCounts.get(type) ?? new Set<string>();
            runSet.add(run.id);
            runCounts.set(type, runSet);

            const severityBucket = severitiesByType.get(type) ?? [];
            severityBucket.push(...severities);
            severitiesByType.set(type, severityBucket);
        }
    }

    return [...totalCounts.entries()]
        .map(([type, totalCount]) => {
            const severities = severitiesByType.get(type) ?? [];
            return {
                type,
                totalCount,
                runCount: runCounts.get(type)?.size ?? 0,
                avgSeverity: mean(severities),
                maxSeverity:
                    severities.length > 0
                        ? Math.max(...severities)
                        : undefined,
            };
        })
        .sort((a, b) => b.totalCount - a.totalCount);
}

export function listRunsForIssueTypeFromArtifacts(
    runs: RunArtifact[],
    issueType: string,
    agentFilter: CritiqueAgentFilter,
): RunIssueRow[] {
    const normalized = issueType.trim().toLowerCase();
    if (!normalized) return [];

    const rows: RunIssueRow[] = [];

    for (const run of runs) {
        let issueCount = 0;
        let countForType = 0;
        let maxSeverity: number | undefined;

        for (const step of run.run.steps) {
            if (step.output?.kind !== "critique") continue;
            if (!matchesCritiqueAgentFilter(step.role, agentFilter)) continue;

            for (const issue of extractIssues(step.output)) {
                issueCount += 1;
                maxSeverity =
                    maxSeverity == null
                        ? issue.severity
                        : Math.max(maxSeverity, issue.severity);
                if (issue.type.toLowerCase() === normalized) {
                    countForType += 1;
                }
            }
        }

        if (countForType <= 0) continue;

        rows.push({
            runId: run.id,
            question: run.question,
            model: run.metadata.model,
            pipelinePreset: run.metadata.pipelinePreset,
            issueCount,
            countForType,
            maxSeverity,
            href: `/runs/${run.id}`,
        });
    }

    return rows.sort((a, b) => b.countForType - a.countForType);
}
