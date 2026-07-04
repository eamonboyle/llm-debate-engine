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

type CounterfactualModeChartProps = {
    rows: Array<{ mode: string; runCount: number }>;
    exploreBasePath?: string;
    exploreQuery?: Record<string, string | undefined>;
    maxModes?: number;
};

function truncateMode(mode: string, maxLength = 28): string {
    if (mode.length <= maxLength) return mode;
    return `${mode.slice(0, maxLength - 1)}…`;
}

export function CounterfactualModeChart({
    rows,
    exploreBasePath = "/counterfactual",
    exploreQuery = {},
    maxModes = 10,
}: CounterfactualModeChartProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const chartRows = [...rows]
        .sort((a, b) => b.runCount - a.runCount || a.mode.localeCompare(b.mode))
        .slice(0, maxModes)
        .map((row) => ({
            mode: row.mode,
            label: truncateMode(row.mode),
            count: row.runCount,
        }));

    if (!mounted) {
        return <div className="card" style={{ height: 360 }} />;
    }

    if (chartRows.length === 0) {
        return null;
    }

    return (
        <div className="card" style={{ height: 360 }}>
            <h3 style={{ marginTop: 0 }}>
                Top failure modes
                <InfoTooltip helpKey="counterfactualFailureModeCount" />
            </h3>
            <p className="small muted" style={{ marginBottom: 8 }}>
                Click a bar to drill into runs reporting that top failure mode.
            </p>
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
                        stroke="var(--color-text-muted)"
                        tick={{ fill: "var(--color-text-secondary)" }}
                    />
                    <YAxis
                        type="category"
                        dataKey="label"
                        width={140}
                        stroke="var(--color-text-muted)"
                        tick={{
                            fill: "var(--color-text-secondary)",
                            fontSize: 11,
                        }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "var(--color-bg-card)",
                            border: "1px solid var(--color-border-default)",
                            borderRadius: "var(--radius-md)",
                        }}
                        formatter={(value) => [value, "Runs"]}
                        labelFormatter={(_, payload) => {
                            const item = payload?.[0]?.payload as
                                | { mode?: string }
                                | undefined;
                            return item?.mode ?? "";
                        }}
                    />
                    <Legend />
                    <Bar
                        dataKey="count"
                        fill="var(--color-data-violet)"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(data) => {
                            const mode = (
                                data as { payload?: { mode?: string } }
                            ).payload?.mode;
                            if (!mode) return;
                            const params = new URLSearchParams();
                            for (const [key, value] of Object.entries(
                                exploreQuery,
                            )) {
                                if (value) params.set(key, value);
                            }
                            params.set("mode", mode);
                            router.push(`${exploreBasePath}?${params}`);
                        }}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
