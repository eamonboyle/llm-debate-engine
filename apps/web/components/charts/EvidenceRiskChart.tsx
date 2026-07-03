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

type EvidenceRiskChartProps = {
    rows: Array<{ riskLevel: number; runCount: number }>;
    exploreBasePath?: string;
    exploreQuery?: Record<string, string | undefined>;
};

export function EvidenceRiskChart({
    rows,
    exploreBasePath = "/evidence",
    exploreQuery = {},
}: EvidenceRiskChartProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const chartRows = rows
        .map((row) => ({
            riskLevel: String(row.riskLevel),
            count: row.runCount,
            numericRisk: row.riskLevel,
        }))
        .sort((a, b) => a.numericRisk - b.numericRisk);

    if (!mounted) {
        return <div className="card" style={{ height: 320 }} />;
    }

    if (chartRows.length === 0) {
        return null;
    }

    return (
        <div className="card" style={{ height: 320 }}>
            <h3 style={{ marginTop: 0 }}>
                Risk level distribution
                <InfoTooltip helpKey="evidencePlannerRiskDistribution" />
            </h3>
            <p className="small muted" style={{ marginBottom: 8 }}>
                Click a bar to drill into runs at that risk level.
            </p>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                        dataKey="riskLevel"
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
                        dataKey="count"
                        fill="var(--color-data-teal)"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        onClick={(data) => {
                            const riskLevel = (
                                data as { payload?: { riskLevel?: string } }
                            ).payload?.riskLevel;
                            if (!riskLevel) return;
                            const params = new URLSearchParams();
                            for (const [key, value] of Object.entries(
                                exploreQuery,
                            )) {
                                if (value) params.set(key, value);
                            }
                            params.set("level", riskLevel);
                            router.push(`${exploreBasePath}?${params}`);
                        }}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
