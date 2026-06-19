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
};

type RebuildAnalysisPanelProps = {
    enabled: boolean;
    artifactRuns: number;
    artifactBenchmarks: number;
};

export function RebuildAnalysisPanel({
    enabled,
    artifactRuns,
    artifactBenchmarks,
}: RebuildAnalysisPanelProps) {
    const [status, setStatus] = useState<
        "idle" | "loading" | "success" | "error"
    >("idle");
    const [message, setMessage] = useState<string | null>(null);

    const hasArtifacts = artifactRuns > 0 || artifactBenchmarks > 0;

    async function rebuild() {
        setStatus("loading");
        setMessage(null);

        try {
            const response = await fetch("/api/analysis/rebuild", {
                method: "POST",
            });
            const payload = (await response.json()) as RebuildResponse;

            if (!response.ok) {
                throw new Error(payload.error ?? `HTTP ${response.status}`);
            }

            const totals = payload.totals;
            const summary = totals
                ? `Indexed ${totals.runs} runs and ${totals.benchmarks} benchmarks.`
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
                <code>runs/</code>. Equivalent to{" "}
                <code>pnpm analyze:full</code> for self-hosted deployments.
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
