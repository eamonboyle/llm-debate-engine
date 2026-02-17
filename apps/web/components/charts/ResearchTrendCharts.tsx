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

type ResearchTrendChartsProps = {
    presets: Record<string, number>;
    evidenceRiskDistribution: Record<string, number>;
    benchmarks: Array<{
        id: string;
        createdAt: string;
        divergenceEntropy: number;
        stabilityPairwiseMean?: number;
    }>;
};

function shortLabel(id: string, createdAt: string, idx: number) {
    const date = new Date(createdAt);
    const stamp = Number.isNaN(date.getTime())
        ? `item-${idx + 1}`
        : `${date.getMonth() + 1}/${date.getDate()}`;
    return `${stamp}-${id.slice(0, 6)}`;
}

export function ResearchTrendCharts({
    presets,
    evidenceRiskDistribution,
    benchmarks,
}: ResearchTrendChartsProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const presetRows = Object.entries(presets).map(([preset, count]) => ({
        preset,
        count,
    }));
    const evidenceRiskRows = Object.entries(evidenceRiskDistribution)
        .map(([riskLevel, count]) => ({
            riskLevel,
            count,
            numericRisk: Number(riskLevel),
        }))
        .sort((a, b) => {
            if (Number.isFinite(a.numericRisk) && Number.isFinite(b.numericRisk)) {
                return a.numericRisk - b.numericRisk;
            }
            return a.riskLevel.localeCompare(b.riskLevel);
        });

    const benchmarkTrendRows = benchmarks
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((benchmark, idx) => ({
            label: shortLabel(benchmark.id, benchmark.createdAt, idx),
            entropy: benchmark.divergenceEntropy,
            stability: benchmark.stabilityPairwiseMean ?? 0,
        }));

    if (!mounted) {
        return (
            <div className="three-col">
                <div className="card" style={{ height: 340 }} />
                <div className="card" style={{ height: 340 }} />
                <div className="card" style={{ height: 340 }} />
            </div>
        );
    }

    return (
        <div className="three-col">
            <div className="card" style={{ height: 340 }}>
                <h3 style={{ marginTop: 0 }}>Preset usage distribution</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={presetRows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="preset" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#22d3ee" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="card" style={{ height: 340 }}>
                <h3 style={{ marginTop: 0 }}>Benchmark entropy & stability trend</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={benchmarkTrendRows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="label" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="entropy"
                            stroke="#f97316"
                            dot={false}
                            name="divergenceEntropy"
                        />
                        <Line
                            type="monotone"
                            dataKey="stability"
                            stroke="#818cf8"
                            dot={false}
                            name="stabilityPairwiseMean"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="card" style={{ height: 340 }}>
                <h3 style={{ marginTop: 0 }}>Evidence planner risk distribution</h3>
                {evidenceRiskRows.length === 0 ? (
                    <p className="small muted">
                        No evidence planner risk data available.
                    </p>
                ) : null}
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evidenceRiskRows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="riskLevel" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#34d399" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
