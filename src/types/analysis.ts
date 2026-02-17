import type { PipelinePreset } from "./artifact";

export type AnalysisRunSummary = {
    id: string;
    question: string;
    createdAt: string;
    model: string;
    pipelinePreset: PipelinePreset;
    fastMode: boolean;
    stepCount: number;
    finalAnswerPreview: string;
    confidence: {
        solver?: number;
        revision?: number;
        synthesizer?: number;
        calibratedAdjusted?: number;
        solverToRevisionDelta?: number;
        revisionToSynthesizerDelta?: number;
    };
    critique: {
        issueCount: number;
        maxSeverity?: number;
        avgSeverity?: number;
        byType?: Record<string, number>;
    };
    quality?: {
        coherence?: number;
        completeness?: number;
        factualRisk?: number;
        uncertaintyHandling?: number;
    };
};

export type AnalysisBenchmarkSummary = {
    id: string;
    question: string;
    createdAt: string;
    model: string;
    pipelinePreset: PipelinePreset;
    fastMode: boolean;
    runs: number;
    modeCount: number;
    modeSizes: number[];
    divergenceEntropy: number;
    stabilityPairwiseMean?: number;
    threshold?: number;
    modeLabels: Array<{
        modeIndex: number;
        size: number;
        label: string;
        exemplarPreview: string;
    }>;
};

export type AnalysisIndex = {
    generatedAt: string;
    totals: {
        runs: number;
        benchmarks: number;
        skippedFiles: number;
    };
    runs: AnalysisRunSummary[];
    benchmarks: AnalysisBenchmarkSummary[];
    aggregates: {
        issueTypeCounts: Record<string, number>;
        issueSeverityByType: Array<{
            type: string;
            count: number;
            avgSeverity: number;
            maxSeverity: number;
        }>;
        confidenceDrift: {
            solverToRevisionMean: number;
            revisionToSynthesizerMean: number;
            calibratedMinusSynthMean: number;
        };
        outlierRuns: Array<{
            benchmarkId: string;
            runId: string;
            avgSimilarity: number;
            zScore: number;
        }>;
        critiqueVsConfidence: Array<{
            runId: string;
            maxSeverity?: number;
            solverToRevisionDelta?: number;
            revisionToSynthesizerDelta?: number;
        }>;
        presets: Record<PipelinePreset, number>;
    };
    skipped: Array<{ file: string; error: string }>;
};
