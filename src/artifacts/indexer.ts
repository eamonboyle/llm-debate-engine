import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { loadRunArtifacts } from "./loader";
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

function round3(value: number): number {
    return Math.round(value * 1000) / 1000;
}

function inferModeLabel(exemplarPreview: string): string {
    const text = exemplarPreview.toLowerCase();
    if (text.includes("existential") || text.includes("catastrophic")) {
        return "high-risk framing";
    }
    if (text.includes("policy") || text.includes("governance")) {
        return "policy-oriented";
    }
    if (text.includes("technical") || text.includes("alignment")) {
        return "technical framing";
    }
    if (text.includes("economic") || text.includes("jobs")) {
        return "economic framing";
    }
    return "general framing";
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

export async function buildAnalysisIndex(
    runsDir = "runs",
): Promise<AnalysisIndex> {
    const loaded = await loadRunArtifacts(runsDir);

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

    const runSummaries: AnalysisRunSummary[] = loaded.runs.map((artifact) => {
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

    const benchmarkSummaries: AnalysisBenchmarkSummary[] = loaded.benchmarks.map(
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

    const outlierRuns = loaded.benchmarks
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
}): Promise<{
    path: string;
    index: AnalysisIndex;
    csvPaths?: { runs: string; benchmarks: string };
}> {
    const runsDir = opts?.runsDir ?? "runs";
    const outputFileName = opts?.outputFileName ?? "analysis-index.json";
    const writeCsv = opts?.writeCsv ?? false;
    const index = await buildAnalysisIndex(runsDir);

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

    return {
        path: outputPath,
        index,
        csvPaths,
    };
}
