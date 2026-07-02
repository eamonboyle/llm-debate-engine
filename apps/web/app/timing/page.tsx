import type { Metadata } from "next";
import Link from "next/link";
import { InsightFilterCard } from "../../components/InsightFilterCard";
import { MetricCard } from "../../components/MetricCard";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { collectArtifactFacets } from "../../lib/artifactFacets";
import {
    filterRunArtifacts,
    loadBenchmarkArtifacts,
    loadRunArtifacts,
    type ArtifactFilterParams,
} from "../../lib/data";
import {
    buildAgentTimingStats,
    formatDurationMs,
    summarizeStepTiming,
} from "../../lib/stepTiming";
import { AgentTimingChart } from "../../components/charts/AgentTimingChart";
import { buildQueryString } from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Pipeline timing",
};

type TimingSearchParams = ArtifactFilterParams;

export default async function PipelineTimingPage({
    searchParams,
}: {
    searchParams: Promise<TimingSearchParams>;
}) {
    const params = await searchParams;
    const [allRuns, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const { models, presets } = collectArtifactFacets(allRuns, benchmarks);
    const runs = filterRunArtifacts(allRuns, params);
    const summary = summarizeStepTiming(runs);
    const rows = buildAgentTimingStats(runs);
    const filtersActive = runs.length !== allRuns.length;

    if (allRuns.length === 0) {
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
                    {runs.length === 1 ? "" : "s"}
                    {filtersActive ? ` (${allRuns.length} total)` : ""} with
                    timestamped steps.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/agents" className="button secondary">
                        Agent stats
                    </Link>
                    <Link href="/pipeline" className="button secondary">
                        Pipeline reference
                    </Link>
                    <Link href="/runs" className="button secondary">
                        All runs
                    </Link>
                </div>
            </div>

            <InsightFilterCard
                action="/timing"
                models={models}
                presets={presets}
                params={params}
                totalRuns={allRuns.length}
                filteredRuns={runs.length}
            />

            {rows.length > 0 ? (
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <a
                        href={`/api/timing${buildQueryString(params, {})}`}
                        className="button secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                    >
                        Export JSON
                    </a>
                    <a
                        href={`/api/timing${buildQueryString(params, {})}&format=csv`}
                        className="button secondary"
                        download="pipeline-timing.csv"
                    >
                        Export CSV
                    </a>
                </div>
            ) : null}

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
                        {runs.length === 0
                            ? "No runs match the current filters."
                            : "No step timestamps found. Timings appear when run artifacts include createdAt and completedAt on each step."}
                    </p>
                ) : (
                    <>
                        <AgentTimingChart
                            rows={rows.map((row) => ({
                                agentName: row.agentName,
                                avgDurationMs: row.avgDurationMs,
                                medianDurationMs: row.medianDurationMs,
                            }))}
                        />
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
                                            (
                                                row as {
                                                    medianDurationMs: number;
                                                }
                                            ).medianDurationMs,
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
                    </>
                )}
            </div>
        </section>
    );
}
