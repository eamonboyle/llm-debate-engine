"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CartesianGrid,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { InfoTooltip } from "../InfoTooltip";

export type CritiqueConfidencePoint = {
    runId: string;
    maxSeverity: number;
    solverToRevisionDelta: number;
};

type CritiqueConfidenceScatterProps = {
    points: CritiqueConfidencePoint[];
    title?: string;
    helpKey?: string;
    hint?: string;
    height?: number;
};

export function CritiqueConfidenceScatter({
    points,
    title = "Severity vs confidence delta",
    helpKey = "severityVsConfidenceDelta",
    hint = "Click a point to open the run trace.",
    height = 360,
}: CritiqueConfidenceScatterProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const scatterRows = points.map((row) => ({
        severity: row.maxSeverity,
        delta: row.solverToRevisionDelta,
        runId: row.runId,
    }));

    if (!mounted) {
        return <div className="card" style={{ height }} />;
    }

    if (scatterRows.length === 0) {
        return (
            <div className="card" style={{ minHeight: height }}>
                <h3 style={{ marginTop: 0 }}>
                    {title}
                    <InfoTooltip helpKey={helpKey} />
                </h3>
                <p className="muted">
                    No runs with both severity and solver→revision delta in the
                    current filter.
                </p>
            </div>
        );
    }

    return (
        <div className="card" style={{ height }}>
            <h3 style={{ marginTop: 0 }}>
                {title}
                <InfoTooltip helpKey={helpKey} />
            </h3>
            <p className="small muted" style={{ marginBottom: 8 }}>
                {hint}
            </p>
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
                        formatter={(value, name) => [
                            typeof value === "number"
                                ? value.toFixed(3)
                                : value,
                            name,
                        ]}
                        labelFormatter={(_, payload) => {
                            const runId = payload?.[0]?.payload?.runId;
                            return runId
                                ? `Run ${String(runId).slice(-12)}`
                                : "Run";
                        }}
                    />
                    <Scatter
                        data={scatterRows}
                        fill="var(--color-data-violet)"
                        cursor="pointer"
                        onClick={(point) => {
                            const runId = (
                                point as { payload?: { runId?: string } }
                            ).payload?.runId;
                            if (runId) router.push(`/runs/${runId}`);
                        }}
                    />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
