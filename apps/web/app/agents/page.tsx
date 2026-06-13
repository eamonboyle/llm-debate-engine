import type { Metadata } from "next";
import Link from "next/link";
import { ModelFilterSelect } from "../../components/ModelFilterSelect";
import { PresetFilterSelect } from "../../components/PresetFilterSelect";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { buildAgentStats, formatAgentDuration } from "../../lib/agentStats";
import { collectArtifactFacets } from "../../lib/artifactFacets";
import {
    filterRunArtifacts,
    loadBenchmarkArtifacts,
    loadRunArtifacts,
} from "../../lib/data";
import { buildQueryString } from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Agent pipeline stats",
};

type AgentSearchParams = {
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};

export default async function AgentStatsPage({
    searchParams,
}: {
    searchParams: Promise<AgentSearchParams>;
}) {
    const params = await searchParams;
    const [allRuns, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const { models, presets } = collectArtifactFacets(allRuns, benchmarks);
    const runs = filterRunArtifacts(allRuns, {
        model: params.model,
        preset: params.preset,
        fast: params.fast,
        from: params.from,
        to: params.to,
    });
    const hasFilters = Boolean(
        params.model ||
            params.preset ||
            params.fast ||
            params.from ||
            params.to,
    );

    if (allRuns.length === 0) {
        return (
            <section className="stack">
                <h1 className="title">Agent pipeline stats</h1>
                <p className="subtitle">
                    No run artifacts yet. Complete debate runs locally, then
                    return here to see which agents executed and how often.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const rows = buildAgentStats(runs);
    const totalSteps = rows.reduce((sum, row) => sum + row.stepCount, 0);
    const totalErrors = rows.reduce((sum, row) => sum + row.errorCount, 0);

    return (
        <section className="stack">
            <div>
                <h1 className="title">Agent pipeline stats</h1>
                <p className="subtitle">
                    How often each debate agent appears across {runs.length}{" "}
                    run trace{runs.length === 1 ? "" : "s"}
                    {hasFilters ? ` (filtered from ${allRuns.length} total)` : ""}
                    — step counts, participating runs, errors, and average step
                    duration when timestamps are available.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/pipeline" className="button secondary">
                        Pipeline reference
                    </Link>
                    <Link href="/runs" className="button secondary">
                        Browse runs
                    </Link>
                </div>
            </div>

            <form className="card" method="get">
                <div className="filter-grid">
                    <ModelFilterSelect
                        models={models}
                        defaultValue={params.model ?? ""}
                        listId="agents-model-filter-options"
                    />
                    <PresetFilterSelect
                        presets={presets}
                        defaultValue={params.preset ?? ""}
                    />
                    <select
                        name="fast"
                        defaultValue={params.fast ?? ""}
                        className="input"
                    >
                        <option value="">Fast mode: any</option>
                        <option value="true">Fast only</option>
                        <option value="false">Non-fast only</option>
                    </select>
                    <input
                        type="datetime-local"
                        name="from"
                        defaultValue={params.from ?? ""}
                        className="input"
                        title="Created at or after"
                    />
                    <input
                        type="datetime-local"
                        name="to"
                        defaultValue={params.to ?? ""}
                        className="input"
                        title="Created at or before"
                    />
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Apply filters
                    </button>
                    <Link href="/agents" className="button secondary">
                        Clear
                    </Link>
                    <span className="small muted">
                        {runs.length} run{runs.length === 1 ? "" : "s"} in scope
                    </span>
                </div>
            </form>

            <div className="grid-4">
                <div className="card">
                    <div className="small muted">Unique agents</div>
                    <div style={{ marginTop: 6, fontSize: "1.25rem" }}>
                        {rows.length}
                    </div>
                </div>
                <div className="card">
                    <div className="small muted">Total steps</div>
                    <div style={{ marginTop: 6, fontSize: "1.25rem" }}>
                        {totalSteps}
                    </div>
                </div>
                <div className="card">
                    <div className="small muted">Step errors</div>
                    <div style={{ marginTop: 6, fontSize: "1.25rem" }}>
                        {totalErrors}
                    </div>
                </div>
                <div className="card">
                    <div className="small muted">Runs indexed</div>
                    <div style={{ marginTop: 6, fontSize: "1.25rem" }}>
                        {runs.length}
                    </div>
                </div>
            </div>

            <div className="card">
                {runs.length === 0 ? (
                    <p className="muted">
                        No runs match your filters. Try broadening model, preset,
                        or date range.
                    </p>
                ) : rows.length === 0 ? (
                    <p className="muted">
                        No agent steps found in the filtered run artifacts.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "agentName", label: "Agent" },
                            { key: "stepCount", label: "Steps" },
                            { key: "runCount", label: "Runs" },
                            { key: "errorCount", label: "Errors" },
                            {
                                key: "avgDuration",
                                label: "Avg duration",
                                hideOnMobile: true,
                            },
                            {
                                key: "share",
                                label: "Step share",
                                hideOnMobile: true,
                                render: (row) => {
                                    const count = (row as { stepCount: number })
                                        .stepCount;
                                    const pct =
                                        totalSteps > 0
                                            ? (100 * count) / totalSteps
                                            : 0;
                                    return `${pct.toFixed(1)}%`;
                                },
                            },
                        ]}
                        data={rows.map((row) => ({
                            ...row,
                            avgDuration: formatAgentDuration(row.avgDurationMs),
                        }))}
                        getRowId={(row) =>
                            (row as { agentName: string }).agentName
                        }
                    />
                )}
            </div>

            {hasFilters ? (
                <p className="small muted">
                    Filtered view.{" "}
                    <Link href={`/runs${buildQueryString(params, {})}`}>
                        Browse matching runs
                    </Link>
                </p>
            ) : null}
        </section>
    );
}
