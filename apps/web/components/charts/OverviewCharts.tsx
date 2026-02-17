"use client";

import { useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { InfoTooltip } from "../InfoTooltip";

type OverviewChartsProps = {
    issueTypeCounts: Record<string, number>;
    critiqueVsConfidence: Array<{
        runId: string;
        maxSeverity?: number;
        solverToRevisionDelta?: number;
    }>;
};

export function OverviewCharts({
    issueTypeCounts,
    critiqueVsConfidence,
}: OverviewChartsProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const issueRows = Object.entries(issueTypeCounts).map(([type, count]) => ({
        type,
        count,
    }));

    const scatterRows = critiqueVsConfidence
        .filter(
            (row) =>
                typeof row.maxSeverity === "number" &&
                typeof row.solverToRevisionDelta === "number",
        )
        .map((row) => ({
            severity: row.maxSeverity as number,
            delta: row.solverToRevisionDelta as number,
            runId: row.runId,
        }));

    if (!mounted) {
        return (
            <div className="two-col">
                <div className="card" style={{ height: 360 }} />
                <div className="card" style={{ height: 360 }} />
            </div>
        );
    }

    return (
        <div className="two-col">
            <div className="card" style={{ height: 360 }}>
                <h3 style={{ marginTop: 0 }}>
                    Critique issue types
                    <InfoTooltip helpKey="critiqueIssueTypes" />
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={issueRows}>
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
                            dataKey="count"
                            fill="var(--color-data-cyan)"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="card" style={{ height: 360 }}>
                <h3 style={{ marginTop: 0 }}>
                    Severity vs confidence delta
                    <InfoTooltip helpKey="severityVsConfidenceDelta" />
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.06)"
                        />
                        <XAxis
                            type="number"
                            dataKey="severity"
                            name="severity"
                            stroke="var(--color-text-muted)"
                            tick={{ fill: "var(--color-text-secondary)" }}
                        />
                        <YAxis
                            type="number"
                            dataKey="delta"
                            name="solverToRevisionDelta"
                            stroke="var(--color-text-muted)"
                            tick={{ fill: "var(--color-text-secondary)" }}
                        />
                        <Tooltip
                            cursor={{
                                strokeDasharray: "3 3",
                                stroke: "var(--color-border-default)",
                            }}
                            contentStyle={{
                                background: "var(--color-bg-card)",
                                border: "1px solid var(--color-border-default)",
                                borderRadius: "var(--radius-md)",
                            }}
                        />
                        <Scatter
                            data={scatterRows}
                            fill="var(--color-data-violet)"
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
