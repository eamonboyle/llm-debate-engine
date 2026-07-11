import type { Metadata } from "next";
import Link from "next/link";
import { InsightFilterCard } from "../../components/InsightFilterCard";
import { MetricCard } from "../../components/MetricCard";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { collectArtifactFacets } from "../../lib/artifactFacets";
import {
    filterRunArtifacts,
    loadBenchmarkArtifacts,
    loadRunArtifacts,
    type ArtifactFilterParams,
} from "../../lib/data";
import { buildQueryString } from "../../lib/listPagination";
import {
    buildPipelineErrorRows,
    collectPipelineErrorAgents,
} from "../../lib/pipelineErrors";
import {
    buildPipelineErrorByAgent,
    buildPipelineErrorTrendSeries,
} from "../../lib/pipelineErrorTrends";
import { PipelineErrorTrendCharts } from "../../components/charts/PipelineErrorTrendCharts";

export const metadata: Metadata = {
    title: "Pipeline errors",
};

type ErrorsSearchParams = ArtifactFilterParams & {
    agent?: string;
};

export default async function PipelineErrorsPage({
    searchParams,
}: {
    searchParams: Promise<ErrorsSearchParams>;
}) {
    const params = await searchParams;
    const [allRuns, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const { models, presets } = collectArtifactFacets(allRuns, benchmarks);
    const filteredRuns = filterRunArtifacts(allRuns, params);
    const rows = buildPipelineErrorRows(filteredRuns, {
        agent: params.agent,
    });
    const errorAgents = collectPipelineErrorAgents(filteredRuns);
    const errorTrendSeries = buildPipelineErrorTrendSeries(rows);
    const errorAgentSeries = buildPipelineErrorByAgent(rows);
    const uniqueRuns = new Set(rows.map((row) => row.runId)).size;

    if (allRuns.length === 0) {
        return (
            <section className="stack">
                <h1 className="title">Pipeline errors</h1>
                <p className="subtitle">
                    No run artifacts yet. Failed agent steps will appear here
                    once debate runs are available.
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
                <h1 className="title">Pipeline errors</h1>
                <p className="subtitle">
                    Agent step failures across run traces — useful for spotting
                    timeouts, parse errors, and model failures in the debate
                    pipeline.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/agents" className="button secondary">
                        Agent stats
                    </Link>
                    <Link href="/runs" className="button secondary">
                        Browse runs
                    </Link>
                    <Link href="/timing" className="button secondary">
                        Pipeline timing
                    </Link>
                </div>
            </div>

            <InsightFilterCard
                action="/errors"
                models={models}
                presets={presets}
                params={params}
                totalRuns={allRuns.length}
                filteredRuns={filteredRuns.length}
            />

            <form className="card" method="get">
                <div className="filter-grid">
                    {params.q ? (
                        <input type="hidden" name="q" value={params.q} />
                    ) : null}
                    {params.model ? (
                        <input
                            type="hidden"
                            name="model"
                            value={params.model}
                        />
                    ) : null}
                    {params.preset ? (
                        <input
                            type="hidden"
                            name="preset"
                            value={params.preset}
                        />
                    ) : null}
                    {params.fast ? (
                        <input type="hidden" name="fast" value={params.fast} />
                    ) : null}
                    {params.from ? (
                        <input type="hidden" name="from" value={params.from} />
                    ) : null}
                    {params.to ? (
                        <input type="hidden" name="to" value={params.to} />
                    ) : null}
                    <select
                        name="agent"
                        className="input"
                        defaultValue={params.agent ?? ""}
                    >
                        <option value="">All agents with errors</option>
                        {errorAgents.map((agent) => (
                            <option key={agent} value={agent}>
                                {agent}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Apply agent filter
                    </button>
                    <Link href="/errors" className="button secondary">
                        Clear agent
                    </Link>
                </div>
            </form>

            {rows.length > 0 ? (
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <a
                        href={`/api/errors${buildQueryString(params, {})}`}
                        className="button secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                    >
                        Export JSON
                    </a>
                    <a
                        href={`/api/errors${buildQueryString(params, {})}&format=csv`}
                        className="button secondary"
                        download="pipeline-errors.csv"
                    >
                        Export CSV
                    </a>
                </div>
            ) : null}

            <div className="grid-4">
                <MetricCard
                    label="Step errors"
                    value={rows.length}
                    helpKey="skippedFiles"
                />
                <MetricCard
                    label="Runs with errors"
                    value={uniqueRuns}
                    helpKey="runArtifacts"
                />
                <MetricCard
                    label="Agents affected"
                    value={errorAgents.length}
                    helpKey="agentStats"
                />
                <MetricCard
                    label="Runs in scope"
                    value={filteredRuns.length}
                    helpKey="runArtifacts"
                />
            </div>

            <PipelineErrorTrendCharts
                trendSeries={errorTrendSeries}
                agentSeries={errorAgentSeries}
            />

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Failed steps</h2>
                {rows.length === 0 ? (
                    <p className="muted">
                        No agent step errors in the current filter scope. This
                        is expected for healthy runs — broaden filters or
                        inspect individual traces for warnings.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "runId", label: "Run ID" },
                            { key: "agentName", label: "Agent" },
                            {
                                key: "stepIndex",
                                label: "Step",
                                hideOnMobile: true,
                            },
                            {
                                key: "error",
                                label: "Error",
                                cellClass: "cell-question",
                                render: (row) => (
                                    <TruncateText
                                        text={(row as { error: string }).error}
                                        maxLength={96}
                                    />
                                ),
                            },
                            {
                                key: "model",
                                label: "Model",
                                hideOnMobile: true,
                            },
                            {
                                key: "preset",
                                label: "Preset",
                                hideOnMobile: true,
                            },
                            {
                                key: "trace",
                                label: "Open",
                                cellClass: "cell-actions",
                                render: (row) => (
                                    <Link
                                        href={
                                            (row as { traceHref: string })
                                                .traceHref
                                        }
                                    >
                                        Trace
                                    </Link>
                                ),
                            },
                        ]}
                        data={rows}
                        getRowId={(row) =>
                            `${(row as { runId: string }).runId}-${(row as { stepIndex: number }).stepIndex}`
                        }
                        renderCardActions={(row) => {
                            const r = row as {
                                traceHref: string;
                                runId: string;
                            };
                            return (
                                <Link href={r.traceHref} className="button">
                                    View trace
                                </Link>
                            );
                        }}
                    />
                )}
            </div>
        </section>
    );
}
