import type { AnalysisIndex } from "./data";
import {
    buildBenchmarkIndexLookup,
    formatTopModeLabel,
} from "./benchmarkIndexLookup";

export type QuestionHubMetrics = {
    indexedRunCount: number;
    avgIssueCount: number | null;
    avgSeverity: number | null;
    avgSolverConfidence: number | null;
    avgEvidenceRisk: number | null;
    avgSolverToRevisionDelta: number | null;
    runsWithQualityScores: number;
    avgCoherence: number | null;
    avgFactualRisk: number | null;
};

export type QuestionHubBenchmarkMetrics = {
    indexedBenchmarkCount: number;
    avgDivergenceEntropy: number | null;
    avgStability: number | null;
    avgModeCount: number | null;
    avgRunsPerBenchmark: number | null;
};

export type QuestionHubRunRow = {
    id: string;
    createdAt: string;
    model: string;
    preset: string;
    preview: string;
    issueCount?: number;
    avgSeverity?: number;
    solverConfidence?: number;
    coherence?: number;
    factualRisk?: number;
};

export type QuestionHubBenchmarkRow = {
    id: string;
    stability?: number;
    topMode?: string | null;
};

function average(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeQuestionHubMetrics(
    index: AnalysisIndex,
    question: string,
): QuestionHubMetrics | null {
    const runs = index.runs.filter((run) => run.question === question);
    if (runs.length === 0) return null;

    const issueCounts = runs.map((run) => run.critique.issueCount);
    const severities = runs
        .map((run) => run.critique.avgSeverity)
        .filter((value): value is number => typeof value === "number");
    const solverConfidences = runs
        .map((run) => run.confidence.solver)
        .filter((value): value is number => typeof value === "number");
    const evidenceRisks = runs
        .map((run) => run.research?.evidenceRiskLevel)
        .filter((value): value is number => typeof value === "number");
    const driftDeltas = runs
        .map((run) => run.confidence.solverToRevisionDelta)
        .filter((value): value is number => typeof value === "number");
    const qualityRuns = runs.filter(
        (run) =>
            run.quality?.coherence != null || run.quality?.factualRisk != null,
    );
    const coherenceScores = qualityRuns
        .map((run) => run.quality?.coherence)
        .filter((value): value is number => typeof value === "number");
    const factualRiskScores = qualityRuns
        .map((run) => run.quality?.factualRisk)
        .filter((value): value is number => typeof value === "number");

    return {
        indexedRunCount: runs.length,
        avgIssueCount: average(issueCounts),
        avgSeverity: average(severities),
        avgSolverConfidence: average(solverConfidences),
        avgEvidenceRisk: average(evidenceRisks),
        avgSolverToRevisionDelta: average(driftDeltas),
        runsWithQualityScores: qualityRuns.length,
        avgCoherence: average(coherenceScores),
        avgFactualRisk: average(factualRiskScores),
    };
}

export function buildQuestionHubRunRows(
    index: AnalysisIndex,
    question: string,
    runIds: string[],
): Map<string, QuestionHubRunRow> {
    const rows = new Map<string, QuestionHubRunRow>();
    const indexed = index.runs.filter((run) => run.question === question);

    for (const run of indexed) {
        if (!runIds.includes(run.id)) continue;
        rows.set(run.id, {
            id: run.id,
            createdAt: run.createdAt,
            model: run.model,
            preset: run.pipelinePreset,
            preview: run.finalAnswerPreview,
            issueCount: run.critique.issueCount,
            avgSeverity: run.critique.avgSeverity,
            solverConfidence: run.confidence.solver,
            coherence: run.quality?.coherence,
            factualRisk: run.quality?.factualRisk,
        });
    }

    return rows;
}

export function summarizeQuestionHubBenchmarkMetrics(
    index: AnalysisIndex,
    question: string,
): QuestionHubBenchmarkMetrics | null {
    const benchmarks = index.benchmarks.filter(
        (benchmark) => benchmark.question === question,
    );
    if (benchmarks.length === 0) return null;

    const entropies = benchmarks.map(
        (benchmark) => benchmark.divergenceEntropy,
    );
    const stabilities = benchmarks
        .map((benchmark) => benchmark.stabilityPairwiseMean)
        .filter((value): value is number => typeof value === "number");
    const modeCounts = benchmarks.map((benchmark) => benchmark.modeCount);
    const runsPerBenchmark = benchmarks.map((benchmark) => benchmark.runs);

    return {
        indexedBenchmarkCount: benchmarks.length,
        avgDivergenceEntropy: average(entropies),
        avgStability: average(stabilities),
        avgModeCount: average(modeCounts),
        avgRunsPerBenchmark: average(runsPerBenchmark),
    };
}

export function buildQuestionHubBenchmarkRows(
    index: AnalysisIndex,
    question: string,
    benchmarkIds: string[],
): Map<string, QuestionHubBenchmarkRow> {
    const lookup = buildBenchmarkIndexLookup(index);
    const rows = new Map<string, QuestionHubBenchmarkRow>();

    for (const benchmark of index.benchmarks) {
        if (benchmark.question !== question) continue;
        if (!benchmarkIds.includes(benchmark.id)) continue;

        const indexed = lookup.get(benchmark.id);
        rows.set(benchmark.id, {
            id: benchmark.id,
            stability: indexed?.stabilityPairwiseMean,
            topMode: indexed ? formatTopModeLabel(indexed.modeLabels) : null,
        });
    }

    return rows;
}
