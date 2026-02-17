"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { InfoTooltip } from "../InfoTooltip";

type CompareDeltaChartProps = {
    leftLabel: string;
    rightLabel: string;
    rows: Array<{
        metric: string;
        left: number | null;
        right: number | null;
    }>;
};

export function CompareDeltaChart({
    leftLabel,
    rightLabel,
    rows,
}: CompareDeltaChartProps) {
    const chartRows = rows
        .filter(
            (row): row is { metric: string; left: number; right: number } =>
                typeof row.left === "number" && typeof row.right === "number",
        )
        .map((row) => ({
            metric: row.metric,
            [leftLabel]: row.left,
            [rightLabel]: row.right,
        }));

    return (
        <div className="card" style={{ height: 360 }}>
            <h3 style={{ marginTop: 0 }}>
                Side-by-side metric comparison
                <InfoTooltip helpKey="sideBySideMetricComparison" />
            </h3>
            {chartRows.length === 0 ? (
                <p className="small muted">
                    No numeric metrics available for chart comparison.
                </p>
            ) : null}
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                        dataKey="metric"
                        stroke="var(--color-text-muted)"
                        tick={{ fill: "var(--color-text-secondary)" }}
                    />
                    <YAxis
                        stroke="var(--color-text-muted)"
                        tick={{ fill: "var(--color-text-secondary)" }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "var(--color-bg-card)",
                            border: "1px solid var(--color-border-default)",
                            borderRadius: "var(--radius-md)",
                        }}
                    />
                    <Legend />
                    <Bar
                        dataKey={leftLabel}
                        fill="var(--color-data-cyan)"
                        radius={[4, 4, 0, 0]}
                    />
                    <Bar
                        dataKey={rightLabel}
                        fill="var(--color-data-violet)"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
