import type { AgentStatRow } from "./agentStats";
import type { ConfidenceDriftRow } from "./confidenceDrift";
import type { BenchmarkArtifact, RunArtifact } from "./data";
import type {
    IssueTypeSummary,
    RunIssueRow,
} from "./issueExplorer";
import type { QuestionGroup } from "./questionGroups";
import type { ModelLeaderboardRow } from "./modelLeaderboard";
import type { PresetLeaderboardRow } from "./presetLeaderboard";
import type { QualityRunRow } from "./qualityInsights";
import type { GlobalSearchResult } from "./globalSearch";
import type { AgentTimingRow } from "./stepTiming";

function escapeCsv(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function row(values: Array<string | number | boolean>): string {
    return values.map((value) => escapeCsv(String(value))).join(",");
}

export function runArtifactsToCsv(runs: RunArtifact[]): string {
    const header = [
        "id",
        "createdAt",
        "question",
        "model",
        "pipelinePreset",
        "fastMode",
        "finalAnswer",
    ];
    const rows = runs.map((run) =>
        row([
            run.id,
            run.metadata.createdAt,
            run.question,
            run.metadata.model,
            run.metadata.pipelinePreset,
            run.metadata.fastMode,
            run.run.finalAnswer,
        ]),
    );
    return [header.join(","), ...rows].join("\n");
}

export function benchmarkArtifactsToCsv(
    benchmarks: BenchmarkArtifact[],
): string {
    const header = [
        "id",
        "createdAt",
        "question",
        "model",
        "pipelinePreset",
        "fastMode",
        "runs",
        "modeCount",
        "divergenceEntropy",
        "stabilityPairwiseMean",
    ];
    const rows = benchmarks.map((benchmark) =>
        row([
            benchmark.id,
            benchmark.metadata.createdAt,
            benchmark.question,
            benchmark.metadata.model,
            benchmark.metadata.pipelinePreset,
            benchmark.metadata.fastMode,
            benchmark.payload.runs,
            benchmark.payload.modeCount,
            benchmark.payload.divergenceEntropy,
            benchmark.payload.summary?.stability?.pairwiseMean ?? "",
        ]),
    );
    return [header.join(","), ...rows].join("\n");
}

export function questionGroupsToCsv(groups: QuestionGroup[]): string {
    const header = [
        "question",
        "runCount",
        "benchmarkCount",
        "latestCreatedAt",
        "models",
        "presets",
        "sampleRunId",
        "sampleBenchmarkId",
    ];
    const rows = groups.map((group) =>
        row([
            group.question,
            group.runCount,
            group.benchmarkCount,
            group.latestCreatedAt,
            group.models.join("; "),
            group.presets.join("; "),
            group.sampleRunId ?? "",
            group.sampleBenchmarkId ?? "",
        ]),
    );
    return [header.join(","), ...rows].join("\n");
}

export function modelLeaderboardToCsv(rows: ModelLeaderboardRow[]): string {
    const header = [
        "model",
        "runCount",
        "avgIssueCount",
        "avgMaxSeverity",
        "avgSolverToRevisionDelta",
        "avgEvidenceRisk",
        "avgSolverConfidence",
    ];
    const csvRows = rows.map((entry) =>
        row([
            entry.model,
            entry.runCount,
            entry.avgIssueCount,
            entry.avgMaxSeverity ?? "",
            entry.avgSolverToRevisionDelta ?? "",
            entry.avgEvidenceRisk ?? "",
            entry.avgSolverConfidence ?? "",
        ]),
    );
    return [header.join(","), ...csvRows].join("\n");
}

export function presetLeaderboardToCsv(rows: PresetLeaderboardRow[]): string {
    const header = [
        "preset",
        "runCount",
        "avgIssueCount",
        "avgMaxSeverity",
        "avgSolverToRevisionDelta",
        "avgEvidenceRisk",
        "avgCoherence",
    ];
    const csvRows = rows.map((entry) =>
        row([
            entry.preset,
            entry.runCount,
            entry.avgIssueCount,
            entry.avgMaxSeverity ?? "",
            entry.avgSolverToRevisionDelta ?? "",
            entry.avgEvidenceRisk ?? "",
            entry.avgCoherence ?? "",
        ]),
    );
    return [header.join(","), ...csvRows].join("\n");
}

export function qualityRunsToCsv(rows: QualityRunRow[]): string {
    const header = [
        "id",
        "question",
        "model",
        "preset",
        "createdAt",
        "coherence",
        "completeness",
        "factualRisk",
        "uncertaintyHandling",
        "issueCount",
    ];
    const csvRows = rows.map((entry) =>
        row([
            entry.id,
            entry.question,
            entry.model,
            entry.preset,
            entry.createdAt,
            entry.coherence ?? "",
            entry.completeness ?? "",
            entry.factualRisk ?? "",
            entry.uncertaintyHandling ?? "",
            entry.issueCount,
        ]),
    );
    return [header.join(","), ...csvRows].join("\n");
}

export function searchResultsToCsv(result: GlobalSearchResult): string {
    const sections: string[] = [];

    sections.push("section,question,runCount,benchmarkCount,latestCreatedAt");
    for (const group of result.questions) {
        sections.push(
            row([
                "question",
                group.question,
                group.runCount,
                group.benchmarkCount,
                group.latestCreatedAt,
            ]),
        );
    }

    sections.push("");
    sections.push(
        "section,id,question,model,preset,createdAt,runs,modeCount,entropy,preview",
    );
    for (const run of result.runs) {
        sections.push(
            row([
                "run",
                run.id,
                run.question,
                run.model,
                run.preset,
                run.createdAt,
                "",
                "",
                "",
                run.preview,
            ]),
        );
    }

    for (const benchmark of result.benchmarks) {
        sections.push(
            row([
                "benchmark",
                benchmark.id,
                benchmark.question,
                benchmark.model,
                benchmark.preset,
                benchmark.createdAt,
                benchmark.runs,
                benchmark.modeCount,
                benchmark.entropy,
                "",
            ]),
        );
    }

    return sections.join("\n");
}

export function agentStatsToCsv(rows: AgentStatRow[]): string {
    const header = [
        "agentName",
        "stepCount",
        "runCount",
        "errorCount",
        "avgDurationMs",
    ];
    const csvRows = rows.map((entry) =>
        row([
            entry.agentName,
            entry.stepCount,
            entry.runCount,
            entry.errorCount,
            entry.avgDurationMs ?? "",
        ]),
    );
    return [header.join(","), ...csvRows].join("\n");
}

export function agentTimingToCsv(rows: AgentTimingRow[]): string {
    const header = [
        "agentName",
        "role",
        "sampleCount",
        "avgDurationMs",
        "medianDurationMs",
        "totalDurationMs",
    ];
    const csvRows = rows.map((entry) =>
        row([
            entry.agentName,
            entry.role,
            entry.sampleCount,
            entry.avgDurationMs,
            entry.medianDurationMs,
            entry.totalDurationMs,
        ]),
    );
    return [header.join(","), ...csvRows].join("\n");
}

export function confidenceDriftToCsv(rows: ConfidenceDriftRow[]): string {
    const header = [
        "runId",
        "question",
        "model",
        "pipelinePreset",
        "maxSeverity",
        "solverToRevisionDelta",
        "revisionToSynthesizerDelta",
        "calibratedMinusSynthDelta",
        "driftMagnitude",
    ];
    const csvRows = rows.map((entry) =>
        row([
            entry.runId,
            entry.question,
            entry.model,
            entry.pipelinePreset,
            entry.maxSeverity ?? "",
            entry.solverToRevisionDelta ?? "",
            entry.revisionToSynthesizerDelta ?? "",
            entry.calibratedMinusSynthDelta ?? "",
            entry.driftMagnitude ?? "",
        ]),
    );
    return [header.join(","), ...csvRows].join("\n");
}

export function issueExplorerToCsv(
    summaries: IssueTypeSummary[],
    selectedType?: string,
    selectedRuns: RunIssueRow[] = [],
): string {
    const sections: string[] = [];
    sections.push("type,totalCount,runCount,avgSeverity,maxSeverity");
    for (const summary of summaries) {
        sections.push(
            row([
                summary.type,
                summary.totalCount,
                summary.runCount,
                summary.avgSeverity ?? "",
                summary.maxSeverity ?? "",
            ]),
        );
    }

    if (selectedType && selectedRuns.length > 0) {
        sections.push("");
        sections.push(
            `selectedType,${escapeCsv(selectedType)}`,
            "runId,question,model,pipelinePreset,countForType,issueCount,maxSeverity",
        );
        for (const runRow of selectedRuns) {
            sections.push(
                row([
                    runRow.runId,
                    runRow.question,
                    runRow.model,
                    runRow.pipelinePreset,
                    runRow.countForType,
                    runRow.issueCount,
                    runRow.maxSeverity ?? "",
                ]),
            );
        }
    }

    return sections.join("\n");
}
