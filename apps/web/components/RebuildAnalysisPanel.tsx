"use client";

import { useState } from "react";

type RebuildResponse = {
    ok?: boolean;
    error?: string;
    generatedAt?: string;
    totals?: {
        runs: number;
        benchmarks: number;
        skippedFiles: number;
    };
    filters?: {
        questionContains?: string;
        modelContains?: string;
        presetEquals?: string;
        fastMode?: boolean;
        createdAfter?: string;
        createdBefore?: string;
    };
};

type RebuildAnalysisPanelProps = {
    enabled: boolean;
    artifactRuns: number;
    artifactBenchmarks: number;
    presetOptions: string[];
};

type RebuildFilters = {
    questionContains: string;
    modelContains: string;
    presetEquals: string;
    fastMode: string;
    createdAfter: string;
    createdBefore: string;
};

const EMPTY_FILTERS: RebuildFilters = {
    questionContains: "",
    modelContains: "",
    presetEquals: "",
    fastMode: "",
    createdAfter: "",
    createdBefore: "",
};

export function RebuildAnalysisPanel({
    enabled,
    artifactRuns,
    artifactBenchmarks,
    presetOptions,
}: RebuildAnalysisPanelProps) {
    const [status, setStatus] = useState<
        "idle" | "loading" | "success" | "error"
    >("idle");
    const [message, setMessage] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<RebuildFilters>(EMPTY_FILTERS);

    const hasArtifacts = artifactRuns > 0 || artifactBenchmarks > 0;

    function updateFilter<K extends keyof RebuildFilters>(
        key: K,
        value: RebuildFilters[K],
    ) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    function buildPayload() {
        const payload: Record<string, string | boolean> = {};
        if (filters.questionContains.trim()) {
            payload.questionContains = filters.questionContains.trim();
        }
        if (filters.modelContains.trim()) {
            payload.modelContains = filters.modelContains.trim();
        }
        if (filters.presetEquals) {
            payload.presetEquals = filters.presetEquals;
        }
        if (filters.fastMode === "true") payload.fastMode = true;
        if (filters.fastMode === "false") payload.fastMode = false;
        if (filters.createdAfter) {
            payload.createdAfter = filters.createdAfter;
        }
        if (filters.createdBefore) {
            payload.createdBefore = filters.createdBefore;
        }
        return payload;
    }

    async function rebuild() {
        setStatus("loading");
        setMessage(null);

        const payload = buildPayload();

        try {
            const response = await fetch("/api/analysis/rebuild", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = (await response.json()) as RebuildResponse;

            if (!response.ok) {
                throw new Error(result.error ?? `HTTP ${response.status}`);
            }

            const totals = result.totals;
            const filterNote =
                Object.keys(payload).length > 0 ? " (filtered subset)" : "";
            const summary = totals
                ? `Indexed ${totals.runs} runs and ${totals.benchmarks} benchmarks${filterNote}.`
                : "Analysis index rebuilt.";
            setStatus("success");
            setMessage(
                `${summary} Refresh this page to see updated charts and exports.`,
            );
        } catch (error) {
            setStatus("error");
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to rebuild analysis index",
            );
        }
    }

    return (
        <div className="card">
            <h2 style={{ marginTop: 0 }}>Rebuild analysis index</h2>
            <p className="small muted">
                Regenerate <code>analysis-index.json</code> plus CSV, markdown
                report, bundle, and benchmark pair exports from artifacts in{" "}
                <code>runs/</code>. Equivalent to <code>pnpm analyze:full</code>{" "}
                for self-hosted deployments. Optional filters mirror CLI{" "}
                <code>analyze-runs</code> flags.
            </p>
            {!enabled ? (
                <p className="muted" style={{ marginBottom: 0 }}>
                    Rebuild is disabled on read-only deployments (for example
                    Vercel). Run <code>pnpm analyze:full</code> locally and
                    commit the generated files instead.
                </p>
            ) : !hasArtifacts ? (
                <p className="muted" style={{ marginBottom: 0 }}>
                    Add run or benchmark artifacts before rebuilding the index.
                </p>
            ) : (
                <>
                    <div style={{ marginBottom: 12 }}>
                        <button
                            type="button"
                            className="button secondary"
                            onClick={() => setShowFilters((value) => !value)}
                        >
                            {showFilters
                                ? "Hide rebuild filters"
                                : "Add rebuild filters"}
                        </button>
                    </div>
                    {showFilters ? (
                        <div
                            className="filter-grid"
                            style={{ marginBottom: 12 }}
                        >
                            <input
                                value={filters.questionContains}
                                onChange={(event) =>
                                    updateFilter(
                                        "questionContains",
                                        event.target.value,
                                    )
                                }
                                placeholder="Question contains..."
                                className="input"
                            />
                            <input
                                value={filters.modelContains}
                                onChange={(event) =>
                                    updateFilter(
                                        "modelContains",
                                        event.target.value,
                                    )
                                }
                                placeholder="Model contains..."
                                className="input"
                            />
                            <select
                                value={filters.presetEquals}
                                onChange={(event) =>
                                    updateFilter(
                                        "presetEquals",
                                        event.target.value,
                                    )
                                }
                                className="input"
                            >
                                <option value="">Preset: any</option>
                                {presetOptions.map((preset) => (
                                    <option key={preset} value={preset}>
                                        {preset}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={filters.fastMode}
                                onChange={(event) =>
                                    updateFilter("fastMode", event.target.value)
                                }
                                className="input"
                            >
                                <option value="">Fast mode: any</option>
                                <option value="true">Fast only</option>
                                <option value="false">Non-fast only</option>
                            </select>
                            <input
                                type="datetime-local"
                                value={filters.createdAfter}
                                onChange={(event) =>
                                    updateFilter(
                                        "createdAfter",
                                        event.target.value,
                                    )
                                }
                                className="input"
                                title="Created at or after"
                            />
                            <input
                                type="datetime-local"
                                value={filters.createdBefore}
                                onChange={(event) =>
                                    updateFilter(
                                        "createdBefore",
                                        event.target.value,
                                    )
                                }
                                className="input"
                                title="Created at or before"
                            />
                        </div>
                    ) : null}
                    <div
                        className="page-actions"
                        style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            alignItems: "center",
                        }}
                    >
                        <button
                            type="button"
                            className="button"
                            onClick={() => void rebuild()}
                            disabled={status === "loading"}
                        >
                            {status === "loading"
                                ? "Rebuilding…"
                                : "Rebuild analysis index"}
                        </button>
                        {status === "success" ? (
                            <span style={{ color: "var(--color-success)" }}>
                                Done
                            </span>
                        ) : null}
                        {status === "error" ? (
                            <span style={{ color: "var(--color-warning)" }}>
                                Failed
                            </span>
                        ) : null}
                    </div>
                </>
            )}
            {message ? (
                <p
                    className="small muted"
                    style={{
                        marginTop: 12,
                        marginBottom: 0,
                        color:
                            status === "error"
                                ? "var(--color-warning)"
                                : undefined,
                    }}
                >
                    {message}
                </p>
            ) : null}
        </div>
    );
}
