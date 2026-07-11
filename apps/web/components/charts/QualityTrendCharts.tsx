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
import type { QualityTrendPoint } from "../../lib/qualityTrends";

type QualityTrendChartsProps = {
    series: QualityTrendPoint[];
};

export function QualityTrendCharts({ series }: QualityTrendChartsProps) {
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
                Judge rubric scores over time
                <InfoTooltip helpKey="qualityTrend" />
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
                        domain={[1, 5]}
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
                    <Line
                        type="monotone"
                        dataKey="coherence"
                        stroke="var(--color-data-cyan)"
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                        name="coherence"
                    />
                    <Line
                        type="monotone"
                        dataKey="completeness"
                        stroke="var(--color-accent)"
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                        name="completeness"
                    />
                    <Line
                        type="monotone"
                        dataKey="factualRisk"
                        stroke="var(--color-warning)"
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                        name="factualRisk"
                    />
                    <Line
                        type="monotone"
                        dataKey="uncertaintyHandling"
                        stroke="var(--color-data-violet)"
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                        name="uncertaintyHandling"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
