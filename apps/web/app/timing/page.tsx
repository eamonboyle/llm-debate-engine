import type { Metadata } from "next";
import Link from "next/link";
import { MetricCard } from "../../components/MetricCard";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { loadRunArtifacts } from "../../lib/data";
import {
    buildAgentTimingStats,
    formatDurationMs,
    summarizeStepTiming,
} from "../../lib/stepTiming";

export const metadata: Metadata = {
    title: "Pipeline timing",
};

export default async function PipelineTimingPage() {
    const runs = await loadRunArtifacts();
    const summary = summarizeStepTiming(runs);
    const rows = buildAgentTimingStats(runs);

    if (runs.length === 0) {
        return (
            <section className="stack">
                <h1 className="title">Pipeline timing</h1>
                <p className="subtitle">
                    No run artifacts yet. Step durations are computed from
                    per-step timestamps in run traces.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    return (
        <section className="stack">
            <div>
                <h1 className="title">Pipeline timing</h1>
                <p className="subtitle">
                    Average agent step duration across {runs.length} run
                    {runs.length === 1 ? "" : "s"} with timestamped steps.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/pipeline" className="button secondary">
                        Pipeline reference
                    </Link>
                    <Link href="/runs" className="button secondary">
                        All runs
                    </Link>
                </div>
            </div>

            <div className="grid-4">
                <MetricCard label="Run artifacts" value={runs.length} />
                <MetricCard
                    label="Runs with timings"
                    value={summary.runsWithTiming}
                />
                <MetricCard label="Agents sampled" value={summary.agentCount} />
                <MetricCard
                    label="Avg step duration"
                    value={
                        summary.avgStepDurationMs != null
                            ? formatDurationMs(summary.avgStepDurationMs)
                            : "—"
                    }
                />
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>By agent</h2>
                {rows.length === 0 ? (
                    <p className="muted">
                        No step timestamps found. Timings appear when run
                        artifacts include <code>createdAt</code> and{" "}
                        <code>completedAt</code> on each step.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "agentName", label: "Agent" },
                            { key: "role", label: "Role" },
                            { key: "sampleCount", label: "Samples" },
                            {
                                key: "avgDurationMs",
                                label: "Avg duration",
                                render: (row) =>
                                    formatDurationMs(
                                        (row as { avgDurationMs: number })
                                            .avgDurationMs,
                                    ),
                            },
                            {
                                key: "medianDurationMs",
                                label: "Median",
                                render: (row) =>
                                    formatDurationMs(
                                        (row as { medianDurationMs: number })
                                            .medianDurationMs,
                                    ),
                            },
                            {
                                key: "totalDurationMs",
                                label: "Total",
                                render: (row) =>
                                    formatDurationMs(
                                        (row as { totalDurationMs: number })
                                            .totalDurationMs,
                                    ),
                            },
                        ]}
                        data={rows}
                        getRowId={(row) =>
                            `${(row as { agentName: string }).agentName}-${(row as { role: string }).role}`
                        }
                    />
                )}
            </div>
        </section>
    );
}
