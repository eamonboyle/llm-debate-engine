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
import { InfoTooltip } from "../InfoTooltip";

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
            <h3 style={{ marginTop: 0 }}>
                Run metric deltas (right - left)
                <InfoTooltip helpKey="runMetricDeltas" />
            </h3>
            {chartRows.length === 0 ? (
                <p className="small muted">
                    No numeric deltas available for chart comparison.
                </p>
            ) : null}
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="metric" stroke="var(--color-text-muted)" tick={{ fill: "var(--color-text-secondary)" }} />
                    <YAxis stroke="var(--color-text-muted)" tick={{ fill: "var(--color-text-secondary)" }} />
                    <Tooltip
                        contentStyle={{
                            background: "var(--color-bg-card)",
                            border: "1px solid var(--color-border-default)",
                            borderRadius: "var(--radius-md)",
                        }}
                    />
                    <Bar dataKey="delta" fill="var(--color-data-cyan)" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
