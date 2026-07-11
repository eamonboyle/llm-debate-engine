"use client";

import { useEffect, useState } from "react";
import {
    Bar,
    BarChart,
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
import type {
    PipelineErrorAgentPoint,
    PipelineErrorTrendPoint,
} from "../../lib/pipelineErrorTrends";

type PipelineErrorTrendChartsProps = {
    trendSeries: PipelineErrorTrendPoint[];
    agentSeries: PipelineErrorAgentPoint[];
};

export function PipelineErrorTrendCharts({
    trendSeries,
    agentSeries,
}: PipelineErrorTrendChartsProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (trendSeries.length === 0 && agentSeries.length === 0) {
        return null;
    }

    if (!mounted) {
        return (
            <div className="trend-grid">
                <div className="card" style={{ height: 340 }} />
                <div className="card" style={{ height: 340 }} />
            </div>
        );
    }

    return (
        <div className="trend-grid">
            <div className="card" style={{ height: 340 }}>
                <h3 style={{ marginTop: 0 }}>
                    Errors over time
                    <InfoTooltip helpKey="pipelineErrors" />
                </h3>
                {trendSeries.length === 0 ? (
                    <p className="small muted">
                        No dated errors in the current filter scope.
                    </p>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendSeries}>
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
                                allowDecimals={false}
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
                                dataKey="errorCount"
                                stroke="var(--color-warning)"
                                dot={false}
                                strokeWidth={2}
                                name="Step errors"
                            />
                            <Line
                                type="monotone"
                                dataKey="runCount"
                                stroke="var(--color-data-violet)"
                                dot={false}
                                strokeWidth={2}
                                name="Runs affected"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
            <div className="card" style={{ height: 340 }}>
                <h3 style={{ marginTop: 0 }}>
                    Errors by agent
                    <InfoTooltip helpKey="agentStats" />
                </h3>
                {agentSeries.length === 0 ? (
                    <p className="small muted">
                        No agent failures in the current filter scope.
                    </p>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agentSeries} layout="vertical">
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.06)"
                            />
                            <XAxis
                                type="number"
                                allowDecimals={false}
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
                            />
                            <Legend />
                            <Bar
                                dataKey="errorCount"
                                fill="var(--color-warning)"
                                radius={[0, 4, 4, 0]}
                                name="Step errors"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
