"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { CritiqueConfidenceScatter } from "./CritiqueConfidenceScatter";

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
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const issueRows = Object.entries(issueTypeCounts).map(([type, count]) => ({
        type,
        count,
    }));

    const scatterPoints = critiqueVsConfidence
        .filter(
            (row) =>
                typeof row.maxSeverity === "number" &&
                typeof row.solverToRevisionDelta === "number",
        )
        .map((row) => ({
            runId: row.runId,
            maxSeverity: row.maxSeverity as number,
            solverToRevisionDelta: row.solverToRevisionDelta as number,
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
                <p className="small muted" style={{ marginBottom: 8 }}>
                    Click a bar to explore runs with that issue type.
                </p>
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
                            cursor="pointer"
                            onClick={(data) => {
                                const issueType = (
                                    data as { payload?: { type?: string } }
                                ).payload?.type;
                                if (issueType) {
                                    router.push(
                                        `/issues?type=${encodeURIComponent(issueType)}`,
                                    );
                                }
                            }}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <CritiqueConfidenceScatter points={scatterPoints} />
        </div>
    );
}
