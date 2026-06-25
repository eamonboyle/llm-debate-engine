import type { AnalysisIndex } from "./data";

export type ReviewQueueReason =
    | "benchmark_outlier"
    | "high_critique_pressure"
    | "elevated_factual_risk"
    | "low_coherence";

export type ReviewQueueItem = {
    runId: string;
    question: string;
    model: string;
    preset: string;
    createdAt: string;
    reasons: ReviewQueueReason[];
    priority: number;
    traceHref: string;
    peerCompareHref: string | null;
};

const REASON_LABELS: Record<ReviewQueueReason, string> = {
    benchmark_outlier: "Benchmark outlier",
    high_critique_pressure: "High critique pressure",
    elevated_factual_risk: "Elevated factual risk",
    low_coherence: "Low coherence score",
};

export function reviewReasonLabel(reason: ReviewQueueReason): string {
    return REASON_LABELS[reason];
}

function percentileThreshold(values: number[], percentile: number): number {
    if (values.length === 0) return Number.POSITIVE_INFINITY;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1),
    );
    return sorted[index] ?? Number.POSITIVE_INFINITY;
}

export function buildReviewQueue(
    index: AnalysisIndex,
    opts: {
        outlierPeerCompare?: Map<string, string | null>;
        limit?: number;
    } = {},
): ReviewQueueItem[] {
    const outlierRunIds = new Set(
        (index.aggregates.outlierRuns ?? []).map((row) => row.runId),
    );
    const issueCounts = index.runs.map((run) => run.critique.issueCount);
    const issueThreshold = percentileThreshold(issueCounts, 90);

    const byRunId = new Map<string, ReviewQueueItem>();

    for (const run of index.runs) {
        const reasons: ReviewQueueReason[] = [];
        let priority = 0;

        if (outlierRunIds.has(run.id)) {
            reasons.push("benchmark_outlier");
            priority += 40;
        }

        if (run.critique.issueCount >= issueThreshold && issueThreshold > 0) {
            reasons.push("high_critique_pressure");
            priority += 20 + Math.min(run.critique.issueCount, 10);
        }

        const factualRisk = run.quality?.factualRisk;
        if (typeof factualRisk === "number" && factualRisk >= 4) {
            reasons.push("elevated_factual_risk");
            priority += 15 + factualRisk;
        }

        const coherence = run.quality?.coherence;
        if (typeof coherence === "number" && coherence <= 2) {
            reasons.push("low_coherence");
            priority += 12 + (3 - coherence) * 4;
        }

        if (reasons.length === 0) continue;

        const peerRunId = opts.outlierPeerCompare?.get(run.id) ?? null;
        byRunId.set(run.id, {
            runId: run.id,
            question: run.question,
            model: run.model,
            preset: run.pipelinePreset,
            createdAt: run.createdAt,
            reasons,
            priority,
            traceHref: `/runs/${run.id}`,
            peerCompareHref: peerRunId
                ? `/runs/compare?left=${run.id}&right=${peerRunId}`
                : null,
        });
    }

    return [...byRunId.values()]
        .sort(
            (a, b) =>
                b.priority - a.priority ||
                b.createdAt.localeCompare(a.createdAt),
        )
        .slice(0, opts.limit ?? 50);
}

export type ReviewQueueSummary = {
    totalFlagged: number;
    outlierCount: number;
    highIssueCount: number;
    factualRiskCount: number;
    lowCoherenceCount: number;
};

export function summarizeReviewQueue(
    items: ReviewQueueItem[],
): ReviewQueueSummary {
    return {
        totalFlagged: items.length,
        outlierCount: items.filter((item) =>
            item.reasons.includes("benchmark_outlier"),
        ).length,
        highIssueCount: items.filter((item) =>
            item.reasons.includes("high_critique_pressure"),
        ).length,
        factualRiskCount: items.filter((item) =>
            item.reasons.includes("elevated_factual_risk"),
        ).length,
        lowCoherenceCount: items.filter((item) =>
            item.reasons.includes("low_coherence"),
        ).length,
    };
}
