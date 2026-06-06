"use client";

import { useEffect, useState } from "react";

type ApiStatusPayload = {
    runsDirLabel: string;
    artifactCounts: { runs: number; benchmarks: number };
    readiness: Record<string, boolean>;
    indexGeneratedAt: string | null;
    indexTotals: {
        runs: number;
        benchmarks: number;
        skippedFiles: number;
    } | null;
};

export function ApiStatusPanel() {
    const [payload, setPayload] = useState<ApiStatusPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const response = await fetch("/api/status");
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const data = (await response.json()) as ApiStatusPayload;
                if (!cancelled) {
                    setPayload(data);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load API status",
                    );
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    async function copyJson() {
        if (!payload) return;
        try {
            await navigator.clipboard.writeText(
                JSON.stringify(payload, null, 2),
            );
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div className="card">
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    alignItems: "baseline",
                    justifyContent: "space-between",
                }}
            >
                <h2 style={{ margin: 0 }}>API status snapshot</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a
                        href="/api/status"
                        className="button secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Open /api/status
                    </a>
                    <button
                        type="button"
                        className="button secondary"
                        onClick={() => void copyJson()}
                        disabled={!payload}
                    >
                        {copied ? "Copied" : "Copy JSON"}
                    </button>
                </div>
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
                Live readiness payload from the status API — useful for scripts
                and automation checks.
            </p>
            {error ? (
                <p className="muted" style={{ color: "var(--color-warning)" }}>
                    Could not load API status: {error}
                </p>
            ) : payload ? (
                <pre className="api-status-json">
                    {JSON.stringify(payload, null, 2)}
                </pre>
            ) : (
                <p className="small muted">Loading API status…</p>
            )}
        </div>
    );
}
