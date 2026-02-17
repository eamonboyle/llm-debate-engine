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

type RunCompareDeltaChartProps = {
    rows: Array<{
        metric: string;
        delta: number | null;
    }>;
};

export function RunCompareDeltaChart({ rows }: RunCompareDeltaChartProps) {
    const chartRows = rows.filter(
        (row): row is { metric: string; delta: number } =>
            typeof row.delta === "number",
    );

    return (
        <div className="card" style={{ height: 360 }}>
            <h3 style={{ marginTop: 0 }}>Run metric deltas (right - left)</h3>
            {chartRows.length === 0 ? (
                <p className="small muted">
                    No numeric deltas available for chart comparison.
                </p>
            ) : null}
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="metric" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="delta" fill="#22d3ee" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
