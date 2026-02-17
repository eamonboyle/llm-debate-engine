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

type ResearchTrendChartsProps = {
    presets: Record<string, number>;
    evidenceRiskDistribution: Record<string, number>;
    benchmarks: Array<{
        id: string;
        createdAt: string;
        divergenceEntropy: number;
        stabilityPairwiseMean?: number;
    }>;
    runs: Array<{
        id: string;
        createdAt: string;
        evidenceRiskLevel?: number;
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
    runs,
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
            if (
                Number.isFinite(a.numericRisk) &&
                Number.isFinite(b.numericRisk)
            ) {
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
    const runRiskTrendRows = runs
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .filter(
            (
                run,
            ): run is {
                id: string;
                createdAt: string;
                evidenceRiskLevel: number;
            } => typeof run.evidenceRiskLevel === "number",
        )
        .map((run, idx) => ({
            label: shortLabel(run.id, run.createdAt, idx),
            riskLevel: run.evidenceRiskLevel,
        }));

    if (!mounted) {
        return (
            <div className="trend-grid">
                <div className="card" style={{ height: 340 }} />
                <div className="card" style={{ height: 340 }} />
                <div className="card" style={{ height: 340 }} />
                <div className="card" style={{ height: 340 }} />
            </div>
        );
    }

    return (
        <div className="trend-grid">
            <div className="card" style={{ height: 340 }}>
                <h3 style={{ marginTop: 0 }}>
                    Preset usage distribution
                    <InfoTooltip helpKey="presetUsageDistribution" />
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={presetRows}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.06)"
                        />
                        <XAxis
                            dataKey="preset"
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
                            fill="var(--color-data-cyan)"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="card" style={{ height: 340 }}>
                <h3 style={{ marginTop: 0 }}>
                    Benchmark entropy & stability trend
                    <InfoTooltip helpKey="benchmarkEntropyStabilityTrend" />
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={benchmarkTrendRows}>
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
                            dataKey="entropy"
                            stroke="var(--color-accent)"
                            dot={false}
                            strokeWidth={2}
                            name="divergenceEntropy"
                        />
                        <Line
                            type="monotone"
                            dataKey="stability"
                            stroke="var(--color-data-violet)"
                            dot={false}
                            strokeWidth={2}
                            name="stabilityPairwiseMean"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="card" style={{ height: 340 }}>
                <h3 style={{ marginTop: 0 }}>
                    Evidence planner risk distribution
                    <InfoTooltip helpKey="evidencePlannerRiskDistribution" />
                </h3>
                {evidenceRiskRows.length === 0 ? (
                    <p className="small muted">
                        No evidence planner risk data available.
                    </p>
                ) : null}
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evidenceRiskRows}>
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
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="card" style={{ height: 340 }}>
                <h3 style={{ marginTop: 0 }}>
                    Evidence risk trend by run time
                    <InfoTooltip helpKey="evidenceRiskTrendByRunTime" />
                </h3>
                {runRiskTrendRows.length === 0 ? (
                    <p className="small muted">
                        No run-level evidence risk data available.
                    </p>
                ) : null}
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={runRiskTrendRows}>
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
                            stroke="var(--color-text-muted)"
                            tick={{ fill: "var(--color-text-secondary)" }}
                            domain={[1, 5]}
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
                            dataKey="riskLevel"
                            stroke="var(--color-data-teal)"
                            dot={false}
                            strokeWidth={2}
                            name="evidenceRiskLevel"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
