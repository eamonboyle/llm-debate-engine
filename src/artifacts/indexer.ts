import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
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

function mean(values: number[]): number {
    if (!values.length) return 0;
    return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function stddev(values: number[]): number {
    if (values.length < 2) return 0;
    const m = mean(values);
    const variance =
        values.reduce((acc, value) => acc + (value - m) ** 2, 0) /
        (values.length - 1);
    return Math.sqrt(variance);
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
    if (xs.length !== ys.length || xs.length < 2) return 0;
    const xMean = mean(xs);
    const yMean = mean(ys);

    let num = 0;
    let xDen = 0;
    let yDen = 0;
    for (let i = 0; i < xs.length; i++) {
        const x = xs[i] - xMean;
        const y = ys[i] - yMean;
        num += x * y;
        xDen += x * x;
        yDen += y * y;
    }
    const den = Math.sqrt(xDen * yDen);
    if (den === 0) return 0;
    return num / den;
}

function round3(value: number): number {
    return Math.round(value * 1000) / 1000;
}

function csvEscape(value: unknown): string {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function toCsv(rows: Array<Record<string, unknown>>, headers: string[]): string {
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
    const topOutliers = index.aggregates.outlierRuns.slice(0, 5);
    const topBenchmarks = index.benchmarks
        .slice()
        .sort((a, b) => b.divergenceEntropy - a.divergenceEntropy)
        .slice(0, 5);

    const lines: string[] = [
        "# Analysis Report",
        "",
        `Generated: ${index.generatedAt}`,
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
    },
): Promise<AnalysisIndex> {
    const loaded = await loadRunArtifacts(runsDir);
    const questionFilter = opts?.questionContains?.trim().toLowerCase();
    const modelFilter = opts?.modelContains?.trim().toLowerCase();
    const presetFilter = opts?.presetEquals;
    const fastModeFilter = opts?.fastMode;
    const runs =
        loaded.runs.filter((artifact) => {
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
            return true;
        });
    const benchmarks =
        loaded.benchmarks.filter((artifact) => {
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
            return true;
        });

    const issueTypeCounts: Record<string, number> = {};
    const issueSeverityByTypeBuckets: Record<string, SeverityBucket> = {};
    const confidenceSolverToRevision: number[] = [];
    const confidenceRevisionToSynth: number[] = [];
    const calibratedMinusSynth: number[] = [];
    const critiqueVsConfidence: AnalysisIndex["aggregates"]["critiqueVsConfidence"] = [];
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

        presets[artifact.metadata.pipelinePreset] += 1;

        if (typeof confidence.solverToRevisionDelta === "number") {
            confidenceSolverToRevision.push(confidence.solverToRevisionDelta);
        }
        if (typeof confidence.revisionToSynthesizerDelta === "number") {
            confidenceRevisionToSynth.push(confidence.revisionToSynthesizerDelta);
        }
        if (
            typeof confidence.calibratedAdjusted === "number" &&
            typeof confidence.synthesizer === "number"
        ) {
            calibratedMinusSynth.push(
                confidence.calibratedAdjusted - confidence.synthesizer,
            );
        }

        const issues = run.steps
            .filter((step) => step.output?.kind === "critique")
            .flatMap((step) =>
                step.output?.kind === "critique" ? step.output.data.issues : [],
            );
        for (const issue of issues) {
            issueTypeCounts[issue.type] = (issueTypeCounts[issue.type] ?? 0) + 1;
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
                revisionToSynthesizerDelta: confidence.revisionToSynthesizerDelta,
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

    const outlierRuns = benchmarks
        .map((artifact) => {
            const runIds = artifact.payload.runIds;
            const pairs = artifact.payload.summary.stability?.pairs;
            if (!runIds?.length || !pairs?.length) return null;

            const sums = new Array(runIds.length).fill(0);
            const counts = new Array(runIds.length).fill(0);
            for (const pair of pairs) {
                if (
                    typeof pair.i !== "number" ||
                    typeof pair.j !== "number" ||
                    typeof pair.similarity !== "number"
                ) {
                    continue;
                }
                if (pair.i >= runIds.length || pair.j >= runIds.length) continue;
                sums[pair.i] += pair.similarity;
                counts[pair.i] += 1;
                sums[pair.j] += pair.similarity;
                counts[pair.j] += 1;
            }

            const avgByRun = runIds.map((_, idx) =>
                counts[idx] > 0 ? sums[idx] / counts[idx] : 1,
            );
            const meanAvg = mean(avgByRun);
            const stdevAvg = stddev(avgByRun);

            let minIndex = 0;
            for (let i = 1; i < avgByRun.length; i++) {
                if (avgByRun[i] < avgByRun[minIndex]) minIndex = i;
            }

            const outlierAvg = avgByRun[minIndex];
            return {
                benchmarkId: artifact.id,
                runId: runIds[minIndex],
                avgSimilarity: round3(outlierAvg),
                zScore:
                    stdevAvg === 0 ? 0 : round3((outlierAvg - meanAvg) / stdevAvg),
            };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .sort((a, b) => a.avgSimilarity - b.avgSimilarity);

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
                revisionToSynthesizerMean: round3(mean(confidenceRevisionToSynth)),
                calibratedMinusSynthMean: round3(mean(calibratedMinusSynth)),
            },
            confidenceCorrelation: {
                severityVsSolverToRevisionDelta,
                severityVsRevisionToSynthesizerDelta,
            },
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
    questionContains?: string;
    modelContains?: string;
    presetEquals?: PipelinePreset;
    fastMode?: boolean;
}): Promise<{
    path: string;
    index: AnalysisIndex;
    csvPaths?: { runs: string; benchmarks: string };
    markdownPath?: string;
    bundlePath?: string;
}> {
    const runsDir = opts?.runsDir ?? "runs";
    const outputFileName = opts?.outputFileName ?? "analysis-index.json";
    const writeCsv = opts?.writeCsv ?? false;
    const writeMarkdown = opts?.writeMarkdown ?? false;
    const markdownFileName = opts?.markdownFileName ?? "analysis-report.md";
    const writeBundle = opts?.writeBundle ?? false;
    const bundleFileName = opts?.bundleFileName ?? "analysis-bundle.json";
    const index = await buildAnalysisIndex(runsDir, {
        questionContains: opts?.questionContains,
        modelContains: opts?.modelContains,
        presetEquals: opts?.presetEquals,
        fastMode: opts?.fastMode,
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

    return {
        path: outputPath,
        index,
        csvPaths,
        markdownPath,
        bundlePath,
    };
}
