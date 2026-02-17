"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

type BenchmarkDetailChartsProps = {
    benchmarkId: string;
    modeSizes: number[];
    thresholdCounts: Array<{ threshold: string; modeCount: number }>;
    similarityPairs?: Array<{ i: number; j: number; similarity: number }>;
    runs: number;
};

function similarityColor(value: number) {
    if (value >= 0.95) return "rgba(34, 197, 94, 0.5)";
    if (value >= 0.9) return "rgba(34, 197, 94, 0.4)";
    if (value >= 0.8) return "rgba(34, 197, 94, 0.3)";
    if (value >= 0.7) return "rgba(234, 179, 8, 0.4)";
    if (value >= 0.5) return "rgba(251, 146, 60, 0.4)";
    return "rgba(248, 113, 113, 0.4)";
}

export function BenchmarkDetailCharts({
    benchmarkId,
    modeSizes,
    thresholdCounts,
    similarityPairs = [],
    runs,
}: BenchmarkDetailChartsProps) {
    const [pairs, setPairs] = useState(similarityPairs);
    const [pairsSource, setPairsSource] = useState<"artifact" | "chunk">(
        similarityPairs.length > 0 ? "artifact" : "artifact",
    );

    useEffect(() => {
        let cancelled = false;
        async function loadPairs() {
            try {
                const response = await fetch(`/api/benchmarks/${benchmarkId}/pairs`, {
                    cache: "no-store",
                });
                if (!response.ok) return;
                const json = (await response.json()) as {
                    source?: "chunk" | "artifact";
                    pairs?: Array<{ i: number; j: number; similarity: number }>;
                };
                if (!cancelled && Array.isArray(json.pairs)) {
                    setPairs(json.pairs);
                    setPairsSource(json.source === "chunk" ? "chunk" : "artifact");
                }
            } catch {
                // keep initial pairs
            }
        }
        loadPairs();
        return () => {
            cancelled = true;
        };
    }, [benchmarkId]);

    const modeData = modeSizes.map((size, idx) => ({
        mode: `mode_${idx + 1}`,
        size,
    }));

    const matrix: number[][] = useMemo(() => {
        const next: number[][] = Array.from({ length: runs }, (_, i) =>
            Array.from({ length: runs }, (_, j) => (i === j ? 1 : 0)),
        );
        for (const pair of pairs) {
            if (
                next[pair.i] &&
                typeof next[pair.i][pair.j] === "number" &&
                next[pair.j] &&
                typeof next[pair.j][pair.i] === "number"
            ) {
                next[pair.i][pair.j] = pair.similarity;
                next[pair.j][pair.i] = pair.similarity;
            }
        }
        return next;
    }, [pairs, runs]);

    return (
        <div className="stack">
            <div className="two-col">
                <div className="card" style={{ height: 340 }}>
                    <h3 style={{ marginTop: 0 }}>Mode size distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={modeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="mode" stroke="var(--color-text-muted)" tick={{ fill: "var(--color-text-secondary)" }} />
                            <YAxis stroke="var(--color-text-muted)" tick={{ fill: "var(--color-text-secondary)" }} />
                            <Tooltip
                                contentStyle={{
                                    background: "var(--color-bg-card)",
                                    border: "1px solid var(--color-border-default)",
                                    borderRadius: "var(--radius-md)",
                                }}
                            />
                            <Bar dataKey="size" fill="var(--color-data-cyan)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ height: 340 }}>
                    <h3 style={{ marginTop: 0 }}>Threshold sensitivity</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={thresholdCounts}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="threshold" stroke="var(--color-text-muted)" tick={{ fill: "var(--color-text-secondary)" }} />
                            <YAxis stroke="var(--color-text-muted)" tick={{ fill: "var(--color-text-secondary)" }} />
                            <Tooltip
                                contentStyle={{
                                    background: "var(--color-bg-card)",
                                    border: "1px solid var(--color-border-default)",
                                    borderRadius: "var(--radius-md)",
                                }}
                            />
                            <Bar dataKey="modeCount" fill="var(--color-data-violet)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>Pairwise similarity heatmap</h3>
                <p className="small muted">
                    source: {pairsSource} ({pairs.length} pairwise entries)
                </p>
                <div className="benchmark-heatmap-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th />
                                {Array.from({ length: runs }, (_, idx) => (
                                    <th key={`head-${idx}`}>r{idx}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {matrix.map((row, i) => (
                                <tr key={`row-${i}`}>
                                    <th>r{i}</th>
                                    {row.map((value, j) => (
                                        <td
                                            key={`cell-${i}-${j}`}
                                            className="benchmark-heatmap-cell"
                                            style={{
                                                background:
                                                    i === j
                                                        ? "var(--color-bg-elevated)"
                                                        : similarityColor(value),
                                                color: "var(--color-text-primary)",
                                                minWidth: 44,
                                            }}
                                            title={`r${i} vs r${j}: ${value.toFixed(3)}`}
                                        >
                                            {value.toFixed(3)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
