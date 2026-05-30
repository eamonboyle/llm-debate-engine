import type { BenchmarkArtifact, RunArtifact } from "./data";

export type ArtifactSortOrder = "newest" | "oldest";

export type RunSortOrder =
    | ArtifactSortOrder
    | "issues_desc"
    | "issues_asc"
    | "evidence_risk_desc"
    | "solver_conf_desc"
    | "drift_desc";

export type BenchmarkSortOrder =
    | ArtifactSortOrder
    | "entropy_desc"
    | "modes_desc"
    | "stability_desc"
    | "runs_desc";

const RUN_SORT_ORDERS = new Set<RunSortOrder>([
    "newest",
    "oldest",
    "issues_desc",
    "issues_asc",
    "evidence_risk_desc",
    "solver_conf_desc",
    "drift_desc",
]);

const BENCHMARK_SORT_ORDERS = new Set<BenchmarkSortOrder>([
    "newest",
    "oldest",
    "entropy_desc",
    "modes_desc",
    "stability_desc",
    "runs_desc",
]);

type ArtifactLike = {
    id: string;
    metadata: {
        createdAt: string;
    };
};

function toTimestamp(value: string): number | null {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function compareIds(a: string, b: string): number {
    return a.localeCompare(b);
}

function toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object") return {};
    return value as Record<string, unknown>;
}

function toNumberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sumObjectNumberValues(value: unknown): number {
    const record = toRecord(value);
    let sum = 0;
    for (const item of Object.values(record)) {
        if (typeof item === "number" && Number.isFinite(item)) {
            sum += item;
        }
    }
    return sum;
}

function runIssueCount(run: RunArtifact): number {
    return sumObjectNumberValues(run.run.metrics.critique?.byType);
}

function runEvidenceRisk(run: RunArtifact): number | null {
    return toNumberOrNull(run.run.metrics.research?.evidenceRiskLevel);
}

function runSolverConfidence(run: RunArtifact): number | null {
    return toNumberOrNull(run.run.metrics.confidence?.solver);
}

function runConfidenceDriftMagnitude(run: RunArtifact): number | null {
    const delta = toNumberOrNull(
        run.run.metrics.confidence?.solverToRevisionDelta,
    );
    return delta == null ? null : Math.abs(delta);
}

function benchmarkStability(benchmark: BenchmarkArtifact): number | null {
    return toNumberOrNull(benchmark.payload.summary?.stability?.pairwiseMean);
}

export function resolveRunSortOrder(value: string | undefined): RunSortOrder {
    if (value && RUN_SORT_ORDERS.has(value as RunSortOrder)) {
        return value as RunSortOrder;
    }
    return "newest";
}

export function resolveBenchmarkSortOrder(
    value: string | undefined,
): BenchmarkSortOrder {
    if (value && BENCHMARK_SORT_ORDERS.has(value as BenchmarkSortOrder)) {
        return value as BenchmarkSortOrder;
    }
    return "newest";
}

export function sortArtifactsByCreatedAt<T extends ArtifactLike>(
    items: T[],
    order: ArtifactSortOrder,
): T[] {
    return items.slice().sort((a, b) => {
        const aTime = toTimestamp(a.metadata.createdAt);
        const bTime = toTimestamp(b.metadata.createdAt);

        if (aTime != null && bTime != null && aTime !== bTime) {
            return order === "newest" ? bTime - aTime : aTime - bTime;
        }

        if (a.metadata.createdAt !== b.metadata.createdAt) {
            return order === "newest"
                ? b.metadata.createdAt.localeCompare(a.metadata.createdAt)
                : a.metadata.createdAt.localeCompare(b.metadata.createdAt);
        }

        return compareIds(a.id, b.id);
    });
}

function compareNullableNumbers(
    a: number | null,
    b: number | null,
    direction: "asc" | "desc",
): number | null {
    if (a == null && b == null) return null;
    if (a == null) return 1;
    if (b == null) return -1;
    if (a === b) return null;
    return direction === "desc" ? b - a : a - b;
}

export function sortRunArtifacts(
    runs: RunArtifact[],
    order: RunSortOrder,
): RunArtifact[] {
    if (order === "newest" || order === "oldest") {
        return sortArtifactsByCreatedAt(runs, order);
    }

    return runs.slice().sort((a, b) => {
        let cmp: number | null = null;

        if (order === "issues_desc" || order === "issues_asc") {
            const aIssues = runIssueCount(a);
            const bIssues = runIssueCount(b);
            if (aIssues !== bIssues) {
                cmp =
                    order === "issues_desc"
                        ? bIssues - aIssues
                        : aIssues - bIssues;
            }
        } else if (order === "evidence_risk_desc") {
            cmp = compareNullableNumbers(
                runEvidenceRisk(a),
                runEvidenceRisk(b),
                "desc",
            );
        } else if (order === "solver_conf_desc") {
            cmp = compareNullableNumbers(
                runSolverConfidence(a),
                runSolverConfidence(b),
                "desc",
            );
        } else if (order === "drift_desc") {
            cmp = compareNullableNumbers(
                runConfidenceDriftMagnitude(a),
                runConfidenceDriftMagnitude(b),
                "desc",
            );
        }

        if (cmp != null && cmp !== 0) return cmp;
        return sortArtifactsByCreatedAt([a, b], "newest")[0].id === a.id
            ? -1
            : 1;
    });
}

export function sortBenchmarkArtifacts(
    benchmarks: BenchmarkArtifact[],
    order: BenchmarkSortOrder,
): BenchmarkArtifact[] {
    if (order === "newest" || order === "oldest") {
        return sortArtifactsByCreatedAt(benchmarks, order);
    }

    return benchmarks.slice().sort((a, b) => {
        let cmp: number | null = null;

        if (order === "entropy_desc") {
            cmp = b.payload.divergenceEntropy - a.payload.divergenceEntropy;
        } else if (order === "modes_desc") {
            cmp = b.payload.modeCount - a.payload.modeCount;
        } else if (order === "runs_desc") {
            cmp = b.payload.runs - a.payload.runs;
        } else if (order === "stability_desc") {
            cmp = compareNullableNumbers(
                benchmarkStability(a),
                benchmarkStability(b),
                "desc",
            );
        }

        if (cmp != null && cmp !== 0) return cmp;
        return sortArtifactsByCreatedAt([a, b], "newest")[0].id === a.id
            ? -1
            : 1;
    });
}
