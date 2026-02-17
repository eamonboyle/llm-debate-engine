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
                <h3 style={{ marginTop: 0 }}>Critique issue types</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={issueRows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="type" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#38bdf8" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="card" style={{ height: 360 }}>
                <h3 style={{ marginTop: 0 }}>Severity vs confidence delta</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                            type="number"
                            dataKey="severity"
                            name="severity"
                            stroke="#94a3b8"
                        />
                        <YAxis
                            type="number"
                            dataKey="delta"
                            name="solverToRevisionDelta"
                            stroke="#94a3b8"
                        />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                        <Scatter data={scatterRows} fill="#818cf8" />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
