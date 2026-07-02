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
import { formatDurationMs } from "../../lib/stepTiming";

type AgentTimingChartProps = {
    rows: Array<{
        agentName: string;
        avgDurationMs: number;
        medianDurationMs: number;
    }>;
};

export function AgentTimingChart({ rows }: AgentTimingChartProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const chartRows = rows.map((row) => ({
        agent: row.agentName,
        avgDurationMs: row.avgDurationMs,
        medianDurationMs: row.medianDurationMs,
    }));

    if (chartRows.length === 0) {
        return (
            <p className="muted" style={{ margin: 0 }}>
                No step timings available for the current filters.
            </p>
        );
    }

    if (!mounted) {
        return <div style={{ height: 360 }} />;
    }

    return (
        <div style={{ height: 360 }}>
            <h3 style={{ marginTop: 0 }}>
                Average step duration by agent
                <InfoTooltip helpKey="pipelineTiming" />
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartRows}
                    layout="vertical"
                    margin={{ left: 8 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                        type="number"
                        tickFormatter={(value) =>
                            formatDurationMs(Number(value))
                        }
                        stroke="var(--color-text-muted)"
                        tick={{ fill: "var(--color-text-secondary)" }}
                    />
                    <YAxis
                        type="category"
                        dataKey="agent"
                        width={120}
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
                        formatter={(value, name) => [
                            formatDurationMs(Number(value)),
                            name === "avgDurationMs" ? "Average" : "Median",
                        ]}
                    />
                    <Legend />
                    <Bar
                        dataKey="avgDurationMs"
                        name="Average"
                        fill="var(--color-data-cyan)"
                        radius={[0, 4, 4, 0]}
                    />
                    <Bar
                        dataKey="medianDurationMs"
                        name="Median"
                        fill="var(--color-data-violet)"
                        radius={[0, 4, 4, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
