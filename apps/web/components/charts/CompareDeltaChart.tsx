"use client";

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

type CompareDeltaChartProps = {
    leftLabel: string;
    rightLabel: string;
    rows: Array<{
        metric: string;
        left: number;
        right: number;
    }>;
};

export function CompareDeltaChart({
    leftLabel,
    rightLabel,
    rows,
}: CompareDeltaChartProps) {
    const chartRows = rows.map((row) => ({
        metric: row.metric,
        [leftLabel]: row.left,
        [rightLabel]: row.right,
    }));

    return (
        <div className="card" style={{ height: 360 }}>
            <h3 style={{ marginTop: 0 }}>Side-by-side metric comparison</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="metric" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={leftLabel} fill="#22d3ee" />
                    <Bar dataKey={rightLabel} fill="#818cf8" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
