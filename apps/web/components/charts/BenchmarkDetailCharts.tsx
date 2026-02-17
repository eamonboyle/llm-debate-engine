"use client";

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
    modeSizes: number[];
    thresholdCounts: Array<{ threshold: string; modeCount: number }>;
    similarityPairs: Array<{ i: number; j: number; similarity: number }>;
    runs: number;
};

function similarityColor(value: number) {
    if (value >= 0.95) return "#14532d";
    if (value >= 0.9) return "#166534";
    if (value >= 0.8) return "#15803d";
    if (value >= 0.7) return "#65a30d";
    if (value >= 0.5) return "#a16207";
    return "#991b1b";
}

export function BenchmarkDetailCharts({
    modeSizes,
    thresholdCounts,
    similarityPairs,
    runs,
}: BenchmarkDetailChartsProps) {
    const modeData = modeSizes.map((size, idx) => ({
        mode: `mode_${idx + 1}`,
        size,
    }));

    const matrix: number[][] = Array.from({ length: runs }, (_, i) =>
        Array.from({ length: runs }, (_, j) => (i === j ? 1 : 0)),
    );
    for (const pair of similarityPairs) {
        if (
            matrix[pair.i] &&
            typeof matrix[pair.i][pair.j] === "number" &&
            matrix[pair.j] &&
            typeof matrix[pair.j][pair.i] === "number"
        ) {
            matrix[pair.i][pair.j] = pair.similarity;
            matrix[pair.j][pair.i] = pair.similarity;
        }
    }

    return (
        <div className="stack">
            <div className="two-col">
                <div className="card" style={{ height: 340 }}>
                    <h3 style={{ marginTop: 0 }}>Mode size distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={modeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="mode" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip />
                            <Bar dataKey="size" fill="#22d3ee" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ height: 340 }}>
                    <h3 style={{ marginTop: 0 }}>Threshold sensitivity</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={thresholdCounts}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="threshold" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip />
                            <Bar dataKey="modeCount" fill="#818cf8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>Pairwise similarity heatmap</h3>
                <div style={{ overflowX: "auto" }}>
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
                                            style={{
                                                background:
                                                    i === j
                                                        ? "#0f172a"
                                                        : similarityColor(value),
                                                color: "#e2e8f0",
                                                minWidth: 52,
                                                textAlign: "center",
                                                fontSize: 12,
                                            }}
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
