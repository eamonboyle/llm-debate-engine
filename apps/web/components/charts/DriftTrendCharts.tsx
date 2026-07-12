"use client";

import { useEffect, useState } from "react";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { InfoTooltip } from "../InfoTooltip";
import type { DriftTrendPoint } from "../../lib/driftTrends";

type DriftTrendChartsProps = {
    series: DriftTrendPoint[];
};

export function DriftTrendCharts({ series }: DriftTrendChartsProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (series.length === 0) {
        return null;
    }

    if (!mounted) {
        return <div className="card" style={{ height: 340 }} />;
    }

    return (
        <div className="card" style={{ height: 340 }}>
            <h3 style={{ marginTop: 0 }}>
                Confidence drift over time
                <InfoTooltip helpKey="driftTrend" />
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                        dataKey="label"
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
                        formatter={(value, name) => [
                            typeof value === "number"
                                ? value.toFixed(3)
                                : value,
                            name,
                        ]}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="solverToRevisionDelta"
                        stroke="var(--color-data-cyan)"
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                        name="solver→revision"
                    />
                    <Line
                        type="monotone"
                        dataKey="revisionToSynthesizerDelta"
                        stroke="var(--color-accent)"
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                        name="revision→synth"
                    />
                    <Line
                        type="monotone"
                        dataKey="calibratedMinusSynthDelta"
                        stroke="var(--color-data-violet)"
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                        name="calibrated−synth"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
