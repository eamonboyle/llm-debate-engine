"use client";

import { useEffect, useState } from "react";
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

type IssueSeverityChartProps = {
    rows: Array<{
        type: string;
        avgSeverity?: number;
        maxSeverity?: number;
    }>;
};

export function IssueSeverityChart({ rows }: IssueSeverityChartProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const chartRows = rows
        .filter(
            (row) =>
                typeof row.avgSeverity === "number" ||
                typeof row.maxSeverity === "number",
        )
        .map((row) => ({
            type: row.type,
            avgSeverity: row.avgSeverity ?? 0,
            maxSeverity: row.maxSeverity ?? 0,
        }));

    if (chartRows.length === 0) {
        return (
            <p className="muted" style={{ margin: 0 }}>
                No severity aggregates available. Re-run{" "}
                <code>pnpm analyze</code> on a recent artifact set.
            </p>
        );
    }

    if (!mounted) {
        return <div style={{ height: 320 }} />;
    }

    return (
        <div style={{ height: 320 }}>
            <h3 style={{ marginTop: 0 }}>
                Severity by issue type
                <InfoTooltip helpKey="issueSeverityByType" />
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                        dataKey="type"
                        stroke="var(--color-text-muted)"
                        tick={{ fill: "var(--color-text-secondary)" }}
                    />
                    <YAxis
                        domain={[0, 5]}
                        stroke="var(--color-text-muted)"
                        tick={{ fill: "var(--color-text-secondary)" }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "var(--color-bg-card)",
                            border: "1px solid var(--color-border-default)",
                            borderRadius: "var(--radius-md)",
                        }}
                        labelStyle={{ color: "var(--color-text-primary)" }}
                    />
                    <Legend />
                    <Bar
                        dataKey="avgSeverity"
                        name="Avg severity"
                        fill="var(--color-data-cyan)"
                        radius={[4, 4, 0, 0]}
                    />
                    <Bar
                        dataKey="maxSeverity"
                        name="Max severity"
                        fill="var(--color-data-violet)"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
