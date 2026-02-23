import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { mean, pearsonCorrelation, round3, stddev } from "../core/math";
import { computeOutlierRuns } from "./indexerAggregates";
import { loadRunArtifacts } from "./loader";
import { inferModeLabel } from "../analysis/modeLabeler";
import type { PipelinePreset } from "../types/artifact";
import type {
    AnalysisBenchmarkSummary,
    AnalysisIndex,
    AnalysisRunSummary,
} from "../types/analysis";

type SeverityBucket = {
    count: number;
    sumSeverity: number;
    maxSeverity: number;
};

function csvEscape(value: unknown): string {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function toCsv(
    rows: Array<Record<string, unknown>>,
    headers: string[],
): string {
    const lines = [headers.join(",")];
    for (const row of rows) {
        lines.push(headers.map((header) => csvEscape(row[header])).join(","));
    }
    return `${lines.join("\n")}\n`;
}

function toMarkdownReport(index: AnalysisIndex): string {
    const topIssueTypes = Object.entries(index.aggregates.issueTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const topOutliers = (index.aggregates.outlierRuns ?? []).slice(0, 5);
    const topCounterfactualFailureModes = Object.entries(
        index.aggregates.counterfactualFailureModeCounts ?? {},
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const topBenchmarks = index.benchmarks
        .slice()
        .sort((a, b) => b.divergenceEntropy - a.divergenceEntropy)
        .slice(0, 5);

    const lines: string[] = [
        "# Analysis Report",
        "",
        `Generated: ${index.generatedAt}`,
        "",
        "## Filter context",
        "",
        `- questionContains: ${index.filterContext?.questionContains ?? "(none)"}`,
        `- modelContains: ${index.filterContext?.modelContains ?? "(none)"}`,
        `- presetEquals: ${index.filterContext?.presetEquals ?? "(none)"}`,
        `- fastMode: ${
            typeof index.filterContext?.fastMode === "boolean"
                ? String(index.filterContext.fastMode)
                : "(none)"
        }`,
        `- createdAfter: ${index.filterContext?.createdAfter ?? "(none)"}`,
        `- createdBefore: ${index.filterContext?.createdBefore ?? "(none)"}`,
        "",
        "## Totals",
        "",
        `- Runs: ${index.totals.runs}`,
        `- Benchmarks: ${index.totals.benchmarks}`,
        `- Skipped files: ${index.totals.skippedFiles}`,
        "",
        "## Confidence drift",
        "",
        `- Solver -> Revision mean delta: ${index.aggregates.confidenceDrift.solverToRevisionMean}`,
        `- Revision -> Synthesizer mean delta: ${index.aggregates.confidenceDrift.revisionToSynthesizerMean}`,
        `- Calibrated - Synthesizer mean delta: ${index.aggregates.confidenceDrift.calibratedMinusSynthMean}`,
        `- Evidence planner risk mean: ${index.aggregates.evidencePlanning?.riskLevelMean ?? 0}`,
        `- Severity vs Solver -> Revision correlation: ${index.aggregates.confidenceCorrelation.severityVsSolverToRevisionDelta}`,
        `- Severity vs Revision -> Synthesizer correlation: ${index.aggregates.confidenceCorrelation.severityVsRevisionToSynthesizerDelta}`,
        "",
        "## Top issue types",
        "",
    ];

    if (topIssueTypes.length === 0) {
        lines.push("- No critique issues recorded.");
    } else {
        for (const [type, count] of topIssueTypes) {
            lines.push(`- ${type}: ${count}`);
        }
    }

    lines.push("", "## Most divergent benchmarks (by entropy)", "");
    if (topBenchmarks.length === 0) {
        lines.push("- No benchmark artifacts available.");
    } else {
        for (const benchmark of topBenchmarks) {
            lines.push(
                `- ${benchmark.id}: entropy=${benchmark.divergenceEntropy}, modes=${benchmark.modeCount}, runs=${benchmark.runs}`,
            );
        }
    }

    lines.push("", "## Outlier runs (lowest average similarity)", "");
    if (topOutliers.length === 0) {
        lines.push("- No outlier run data available.");
    } else {
        for (const outlier of topOutliers) {
            lines.push(
                `- ${outlier.runId} (benchmark ${outlier.benchmarkId}): avgSimilarity=${outlier.avgSimilarity}, zScore=${outlier.zScore}`,
            );
        }
    }

    lines.push("", "## Top counterfactual failure modes", "");
    if (topCounterfactualFailureModes.length === 0) {
        lines.push("- No counterfactual failure modes recorded.");
    } else {
        for (const [failureMode, count] of topCounterfactualFailureModes) {
            lines.push(`- ${failureMode}: ${count}`);
        }
    }

    lines.push("");
    return lines.join("\n");
}

export async function buildAnalysisIndex(
    runsDir = "runs",
    opts?: {
        questionContains?: string;
        modelContains?: string;
        presetEquals?: PipelinePreset;
        fastMode?: boolean;
        createdAfter?: string;
        createdBefore?: string;
    },
): Promise<AnalysisIndex> {
    const loaded = await loadRunArtifacts(runsDir);
    const questionFilter = opts?.questionContains?.trim().toLowerCase();
    const modelFilter = opts?.modelContains?.trim().toLowerCase();
    const presetFilter = opts?.presetEquals;
    const fastModeFilter = opts?.fastMode;
    const createdAfter =
        opts?.createdAfter &&
        !Number.isNaN(new Date(opts.createdAfter).getTime())
            ? new Date(opts.createdAfter)
            : undefined;
    const createdBefore =
        opts?.createdBefore &&
        !Number.isNaN(new Date(opts.createdBefore).getTime())
            ? new Date(opts.createdBefore)
            : undefined;
    const runs = loaded.runs.filter((artifact) => {
        if (
            questionFilter &&
            questionFilter.length > 0 &&
            !artifact.question.toLowerCase().includes(questionFilter)
        ) {
            return false;
        }
        if (
            modelFilter &&
            modelFilter.length > 0 &&
            !artifact.metadata.model.toLowerCase().includes(modelFilter)
        ) {
            return false;
        }
        if (presetFilter && artifact.metadata.pipelinePreset !== presetFilter) {
            return false;
        }
        if (
            typeof fastModeFilter === "boolean" &&
            artifact.metadata.fastMode !== fastModeFilter
        ) {
            return false;
        }
        const createdAt = new Date(artifact.metadata.createdAt);
        if (
            createdAfter &&
            !Number.isNaN(createdAt.getTime()) &&
            createdAt < createdAfter
        ) {
            return false;
        }
        if (
            createdBefore &&
            !Number.isNaN(createdAt.getTime()) &&
            createdAt > createdBefore
        ) {
            return false;
        }
        return true;
    });
    const benchmarks = loaded.benchmarks.filter((artifact) => {
        if (
            questionFilter &&
            questionFilter.length > 0 &&
            !artifact.question.toLowerCase().includes(questionFilter)
        ) {
            return false;
        }
        if (
            modelFilter &&
            modelFilter.length > 0 &&
            !artifact.metadata.model.toLowerCase().includes(modelFilter)
        ) {
            return false;
        }
        if (presetFilter && artifact.metadata.pipelinePreset !== presetFilter) {
            return false;
        }
        if (
            typeof fastModeFilter === "boolean" &&
            artifact.metadata.fastMode !== fastModeFilter
        ) {
            return false;
        }
        const createdAt = new Date(artifact.metadata.createdAt);
        if (
            createdAfter &&
            !Number.isNaN(createdAt.getTime()) &&
            createdAt < createdAfter
        ) {
            return false;
        }
        if (
            createdBefore &&
            !Number.isNaN(createdAt.getTime()) &&
            createdAt > createdBefore
        ) {
            return false;
        }
        return true;
    });

    const issueTypeCounts: Record<string, number> = {};
    const issueSeverityByTypeBuckets: Record<string, SeverityBucket> = {};
    const confidenceSolverToRevision: number[] = [];
    const confidenceRevisionToSynth: number[] = [];
    const calibratedMinusSynth: number[] = [];
    const evidenceRiskLevels: number[] = [];
    const evidenceRiskLevelDistribution: Record<string, number> = {};
    const counterfactualFailureModeCounts: Record<string, number> = {};
    const critiqueVsConfidence: AnalysisIndex["aggregates"]["critiqueVsConfidence"] =
        [];
    const presets: Record<PipelinePreset, number> = {
        standard: 0,
        research_deep: 0,
        fast_research: 0,
    };

    const runSummaries: AnalysisRunSummary[] = runs.map((artifact) => {
        const run = artifact.run;
        const confidence = run.metrics.confidence ?? {};
        const critique = run.metrics.critique ?? {};
        const quality = run.metrics.quality;
        const research = run.metrics.research;
        const counterfactualFailureModesFromSteps = run.steps
            .filter((step) => step.output?.kind === "counterfactual")
            .flatMap((step) =>
                step.output?.kind === "counterfactual"
                    ? step.output.data.failureModes
                    : [],
            )
            .filter(
                (mode): mode is string =>
                    typeof mode === "string" && mode.trim().length > 0,
            );
        const metricsCounterfactualFailureModeCount =
            typeof research?.counterfactualFailureModeCount === "number"
                ? research.counterfactualFailureModeCount
                : undefined;
        const metricsTopCounterfactualFailureMode =
            typeof research?.topCounterfactualFailureMode === "string" &&
            research.topCounterfactualFailureMode.trim().length > 0
                ? research.topCounterfactualFailureMode
                : undefined;
        const counterfactualFailureModeCount =
            counterfactualFailureModesFromSteps.length > 0
                ? counterfactualFailureModesFromSteps.length
                : metricsCounterfactualFailureModeCount;
        const topCounterfactualFailureMode =
            counterfactualFailureModesFromSteps[0] ??
            metricsTopCounterfactualFailureMode;

        presets[artifact.metadata.pipelinePreset] += 1;

        if (typeof confidence.solverToRevisionDelta === "number") {
            confidenceSolverToRevision.push(confidence.solverToRevisionDelta);
        }
        if (typeof confidence.revisionToSynthesizerDelta === "number") {
            confidenceRevisionToSynth.push(
                confidence.revisionToSynthesizerDelta,
            );
        }
        if (
            typeof confidence.calibratedAdjusted === "number" &&
            typeof confidence.synthesizer === "number"
        ) {
            calibratedMinusSynth.push(
                confidence.calibratedAdjusted - confidence.synthesizer,
            );
        }
        if (typeof research?.evidenceRiskLevel === "number") {
            evidenceRiskLevels.push(research.evidenceRiskLevel);
            const bucket = String(research.evidenceRiskLevel);
            evidenceRiskLevelDistribution[bucket] =
                (evidenceRiskLevelDistribution[bucket] ?? 0) + 1;
        }
        for (const failureMode of counterfactualFailureModesFromSteps) {
            counterfactualFailureModeCounts[failureMode] =
                (counterfactualFailureModeCounts[failureMode] ?? 0) + 1;
        }
        if (
            counterfactualFailureModesFromSteps.length === 0 &&
            topCounterfactualFailureMode &&
            typeof counterfactualFailureModeCount === "number" &&
            counterfactualFailureModeCount > 0
        ) {
            counterfactualFailureModeCounts[topCounterfactualFailureMode] =
                (counterfactualFailureModeCounts[
                    topCounterfactualFailureMode
                ] ?? 0) + counterfactualFailureModeCount;
        }

        const issues = run.steps
            .filter((step) => step.output?.kind === "critique")
            .flatMap((step) =>
                step.output?.kind === "critique" ? step.output.data.issues : [],
            );
        for (const issue of issues) {
            issueTypeCounts[issue.type] =
                (issueTypeCounts[issue.type] ?? 0) + 1;
            const bucket = issueSeverityByTypeBuckets[issue.type] ?? {
                count: 0,
                sumSeverity: 0,
                maxSeverity: 0,
            };
            bucket.count += 1;
            bucket.sumSeverity += issue.severity;
            bucket.maxSeverity = Math.max(bucket.maxSeverity, issue.severity);
            issueSeverityByTypeBuckets[issue.type] = bucket;
        }

        critiqueVsConfidence.push({
            runId: artifact.id,
            maxSeverity: critique.maxSeverity,
            solverToRevisionDelta: confidence.solverToRevisionDelta,
            revisionToSynthesizerDelta: confidence.revisionToSynthesizerDelta,
        });

        return {
            id: artifact.id,
            question: artifact.question,
            createdAt: artifact.metadata.createdAt,
            model: artifact.metadata.model,
            pipelinePreset: artifact.metadata.pipelinePreset,
            fastMode: artifact.metadata.fastMode,
            stepCount: run.steps.length,
            finalAnswerPreview: run.finalAnswer.slice(0, 220),
            confidence: {
                solver: confidence.solver,
                revision: confidence.revision,
                synthesizer: confidence.synthesizer,
                calibratedAdjusted: confidence.calibratedAdjusted,
                solverToRevisionDelta: confidence.solverToRevisionDelta,
                revisionToSynthesizerDelta:
                    confidence.revisionToSynthesizerDelta,
            },
            critique: {
                issueCount: issues.length,
                maxSeverity: critique.maxSeverity,
                avgSeverity: critique.avgSeverity,
                byType: critique.byType,
            },
            quality: quality
                ? {
                      coherence: quality.coherence,
                      completeness: quality.completeness,
                      factualRisk: quality.factualRisk,
                      uncertaintyHandling: quality.uncertaintyHandling,
                  }
                : undefined,
            research:
                typeof research?.evidenceRiskLevel === "number" ||
                typeof counterfactualFailureModeCount === "number" ||
                typeof topCounterfactualFailureMode === "string"
                    ? {
                          evidenceRiskLevel: research?.evidenceRiskLevel,
                          counterfactualFailureModeCount,
                          topCounterfactualFailureMode,
                      }
                    : undefined,
        };
    });

    const benchmarkSummaries: AnalysisBenchmarkSummary[] = benchmarks.map(
        (artifact) => {
            const payload = artifact.payload;
            const modeLabels = (payload.modes ?? []).map((mode, idx) => ({
                modeIndex: idx,
                size: mode.size,
                label: inferModeLabel(mode.exemplarPreview),
                exemplarPreview: mode.exemplarPreview,
            }));

            return {
                id: artifact.id,
                question: artifact.question,
                createdAt: artifact.metadata.createdAt,
                model: artifact.metadata.model,
                pipelinePreset: artifact.metadata.pipelinePreset,
                fastMode: artifact.metadata.fastMode,
                runs: payload.runs,
                modeCount: payload.modeCount,
                modeSizes: payload.modeSizes,
                divergenceEntropy: payload.divergenceEntropy,
                stabilityPairwiseMean: payload.summary.stability?.pairwiseMean,
                threshold: payload.threshold,
                modeLabels,
            };
        },
    );

    const outlierRuns = computeOutlierRuns(benchmarks);

    const issueSeverityByType = Object.entries(issueSeverityByTypeBuckets).map(
        ([type, bucket]) => ({
            type,
            count: bucket.count,
            avgSeverity: round3(bucket.sumSeverity / bucket.count),
            maxSeverity: bucket.maxSeverity,
        }),
    );

    const severityVsSolver = critiqueVsConfidence.filter(
        (entry) =>
            typeof entry.maxSeverity === "number" &&
            typeof entry.solverToRevisionDelta === "number",
    );
    const severityVsRevision = critiqueVsConfidence.filter(
        (entry) =>
            typeof entry.maxSeverity === "number" &&
            typeof entry.revisionToSynthesizerDelta === "number",
    );
    const severityVsSolverToRevisionDelta = round3(
        pearsonCorrelation(
            severityVsSolver.map((entry) => entry.maxSeverity as number),
            severityVsSolver.map(
                (entry) => entry.solverToRevisionDelta as number,
            ),
        ),
    );
    const severityVsRevisionToSynthesizerDelta = round3(
        pearsonCorrelation(
            severityVsRevision.map((entry) => entry.maxSeverity as number),
            severityVsRevision.map(
                (entry) => entry.revisionToSynthesizerDelta as number,
            ),
        ),
    );

    return {
        generatedAt: new Date().toISOString(),
        filterContext: {
            questionContains: opts?.questionContains,
            modelContains: opts?.modelContains,
            presetEquals: opts?.presetEquals,
            fastMode: opts?.fastMode,
            createdAfter: opts?.createdAfter,
            createdBefore: opts?.createdBefore,
        },
        totals: {
            runs: runSummaries.length,
            benchmarks: benchmarkSummaries.length,
            skippedFiles: loaded.skipped.length,
        },
        runs: runSummaries,
        benchmarks: benchmarkSummaries,
        aggregates: {
            issueTypeCounts,
            issueSeverityByType,
            confidenceDrift: {
                solverToRevisionMean: round3(mean(confidenceSolverToRevision)),
                revisionToSynthesizerMean: round3(
                    mean(confidenceRevisionToSynth),
                ),
                calibratedMinusSynthMean: round3(mean(calibratedMinusSynth)),
            },
            confidenceCorrelation: {
                severityVsSolverToRevisionDelta,
                severityVsRevisionToSynthesizerDelta,
            },
            evidencePlanning: {
                riskLevelMean: round3(mean(evidenceRiskLevels)),
                riskLevelDistribution: evidenceRiskLevelDistribution,
            },
            counterfactualFailureModeCounts,
            outlierRuns,
            critiqueVsConfidence,
            presets,
        },
        skipped: loaded.skipped,
    };
}

export async function buildAndWriteAnalysisIndex(opts?: {
    runsDir?: string;
    outputFileName?: string;
    writeCsv?: boolean;
    writeMarkdown?: boolean;
    markdownFileName?: string;
    writeBundle?: boolean;
    bundleFileName?: string;
    writeChunks?: boolean;
    chunkFileName?: string;
    questionContains?: string;
    modelContains?: string;
    presetEquals?: PipelinePreset;
    fastMode?: boolean;
    createdAfter?: string;
    createdBefore?: string;
}): Promise<{
    path: string;
    index: AnalysisIndex;
    csvPaths?: { runs: string; benchmarks: string };
    markdownPath?: string;
    bundlePath?: string;
    chunkPath?: string;
}> {
    const runsDir = opts?.runsDir ?? "runs";
    const outputFileName = opts?.outputFileName ?? "analysis-index.json";
    const writeCsv = opts?.writeCsv ?? false;
    const writeMarkdown = opts?.writeMarkdown ?? false;
    const markdownFileName = opts?.markdownFileName ?? "analysis-report.md";
    const writeBundle = opts?.writeBundle ?? false;
    const bundleFileName = opts?.bundleFileName ?? "analysis-bundle.json";
    const writeChunks = opts?.writeChunks ?? false;
    const chunkFileName =
        opts?.chunkFileName ?? "analysis-benchmark-pairs.json";
    const index = await buildAnalysisIndex(runsDir, {
        questionContains: opts?.questionContains,
        modelContains: opts?.modelContains,
        presetEquals: opts?.presetEquals,
        fastMode: opts?.fastMode,
        createdAfter: opts?.createdAfter,
        createdBefore: opts?.createdBefore,
    });

    await mkdir(runsDir, { recursive: true });
    const outputPath = join(runsDir, outputFileName);
    await writeFile(outputPath, JSON.stringify(index, null, 2), "utf-8");

    let csvPaths: { runs: string; benchmarks: string } | undefined;
    if (writeCsv) {
        const runCsvPath = join(runsDir, "analysis-runs.csv");
        const benchmarkCsvPath = join(runsDir, "analysis-benchmarks.csv");

        const runRows = index.runs.map((run) => ({
            id: run.id,
            question: run.question,
            createdAt: run.createdAt,
            model: run.model,
            pipelinePreset: run.pipelinePreset,
            fastMode: run.fastMode,
            stepCount: run.stepCount,
            issueCount: run.critique.issueCount,
            evidenceRiskLevel: run.research?.evidenceRiskLevel ?? "",
            counterfactualFailureModeCount:
                run.research?.counterfactualFailureModeCount ?? "",
            topCounterfactualFailureMode:
                run.research?.topCounterfactualFailureMode ?? "",
            maxSeverity: run.critique.maxSeverity ?? "",
            solverConfidence: run.confidence.solver ?? "",
            revisionConfidence: run.confidence.revision ?? "",
            synthesizerConfidence: run.confidence.synthesizer ?? "",
            calibratedAdjusted: run.confidence.calibratedAdjusted ?? "",
            solverToRevisionDelta: run.confidence.solverToRevisionDelta ?? "",
            revisionToSynthesizerDelta:
                run.confidence.revisionToSynthesizerDelta ?? "",
            finalAnswerPreview: run.finalAnswerPreview,
        }));
        const benchmarkRows = index.benchmarks.map((benchmark) => ({
            id: benchmark.id,
            question: benchmark.question,
            createdAt: benchmark.createdAt,
            model: benchmark.model,
            pipelinePreset: benchmark.pipelinePreset,
            fastMode: benchmark.fastMode,
            runs: benchmark.runs,
            modeCount: benchmark.modeCount,
            modeSizes: benchmark.modeSizes.join("|"),
            divergenceEntropy: benchmark.divergenceEntropy,
            stabilityPairwiseMean: benchmark.stabilityPairwiseMean ?? "",
            threshold: benchmark.threshold ?? "",
        }));

        const runsCsv = toCsv(runRows, [
            "id",
            "question",
            "createdAt",
            "model",
            "pipelinePreset",
            "fastMode",
            "stepCount",
            "issueCount",
            "evidenceRiskLevel",
            "counterfactualFailureModeCount",
            "topCounterfactualFailureMode",
            "maxSeverity",
            "solverConfidence",
            "revisionConfidence",
            "synthesizerConfidence",
            "calibratedAdjusted",
            "solverToRevisionDelta",
            "revisionToSynthesizerDelta",
            "finalAnswerPreview",
        ]);
        const benchmarksCsv = toCsv(benchmarkRows, [
            "id",
            "question",
            "createdAt",
            "model",
            "pipelinePreset",
            "fastMode",
            "runs",
            "modeCount",
            "modeSizes",
            "divergenceEntropy",
            "stabilityPairwiseMean",
            "threshold",
        ]);

        await Promise.all([
            writeFile(runCsvPath, runsCsv, "utf-8"),
            writeFile(benchmarkCsvPath, benchmarksCsv, "utf-8"),
        ]);
        csvPaths = { runs: runCsvPath, benchmarks: benchmarkCsvPath };
    }

    let markdownPath: string | undefined;
    if (writeMarkdown) {
        markdownPath = join(runsDir, markdownFileName);
        const markdown = toMarkdownReport(index);
        await writeFile(markdownPath, markdown, "utf-8");
    }

    let bundlePath: string | undefined;
    if (writeBundle) {
        const artifacts = await loadRunArtifacts(runsDir);
        bundlePath = join(runsDir, bundleFileName);
        const bundle = {
            generatedAt: new Date().toISOString(),
            index,
            runs: artifacts.runs,
            benchmarks: artifacts.benchmarks,
            skipped: artifacts.skipped,
        };
        await writeFile(bundlePath, JSON.stringify(bundle, null, 2), "utf-8");
    }

    let chunkPath: string | undefined;
    if (writeChunks) {
        const artifacts = await loadRunArtifacts(runsDir);
        const pairwise = artifacts.benchmarks
            .map((artifact) => ({
                benchmarkId: artifact.id,
                runIds: artifact.payload.runIds ?? [],
                pairs: artifact.payload.summary.stability?.pairs ?? [],
            }))
            .filter((entry) => entry.pairs.length > 0);

        chunkPath = join(runsDir, chunkFileName);
        await writeFile(
            chunkPath,
            JSON.stringify(
                {
                    generatedAt: new Date().toISOString(),
                    pairwise,
                },
                null,
                2,
            ),
            "utf-8",
        );
    }

    return {
        path: outputPath,
        index,
        csvPaths,
        markdownPath,
        bundlePath,
        chunkPath,
    };
}
