import type { Metadata } from "next";
import Link from "next/link";
import { InsightFilterCard } from "../../components/InsightFilterCard";
import { MetricCard } from "../../components/MetricCard";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { collectArtifactFacets } from "../../lib/artifactFacets";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../lib/data";
import { buildJudgeVerdictRows } from "../../lib/judgeVerdictBrowser";

export const metadata: Metadata = {
    title: "Judge verdicts",
};

type JudgmentsSearchParams = {
    q?: string;
    verdictQ?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};

function formatScore(value: number | null) {
    return typeof value === "number" ? value.toFixed(1) : "—";
}

export default async function JudgeVerdictsPage({
    searchParams,
}: {
    searchParams: Promise<JudgmentsSearchParams>;
}) {
    const params = await searchParams;
    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const { models, presets } = collectArtifactFacets(runs, benchmarks);
    const allRows = buildJudgeVerdictRows(runs);
    const rows = buildJudgeVerdictRows(runs, params);

    const avgCoherence =
        rows.length > 0
            ? rows
                  .filter((row) => row.coherence != null)
                  .reduce((sum, row) => sum + (row.coherence ?? 0), 0) /
              Math.max(1, rows.filter((row) => row.coherence != null).length)
            : null;

    return (
        <section className="stack">
            <div>
                <h1 className="title">Judge verdicts</h1>
                <p className="subtitle">
                    Searchable judge narratives from deep-pipeline runs —
                    summaries, rubric scores, and recurring strengths or
                    weaknesses.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/quality" className="button secondary">
                        Quality insights
                    </Link>
                    <Link href="/runs" className="button secondary">
                        All runs
                    </Link>
                </div>
            </div>

            <InsightFilterCard
                action="/judgments"
                models={models}
                presets={presets}
                params={params}
                totalRuns={allRows.length}
                filteredRuns={rows.length}
                extraFields={
                    <input
                        name="verdictQ"
                        placeholder="Search verdict text, strengths, weaknesses..."
                        defaultValue={params.verdictQ ?? ""}
                        className="input"
                    />
                }
            />

            <div className="grid-4">
                <MetricCard
                    label="Verdicts in store"
                    value={allRows.length}
                    helper="runs with Judge step output"
                />
                <MetricCard
                    label="Matching verdicts"
                    value={rows.length}
                    helper="after filters"
                />
                <MetricCard
                    label="Avg coherence"
                    value={formatScore(avgCoherence)}
                    helpKey="coherence"
                />
                <MetricCard
                    label="Unique models"
                    value={new Set(rows.map((row) => row.model)).size}
                    helpKey="model"
                />
            </div>

            {allRows.length === 0 ? (
                <div className="card">
                    <p className="muted">
                        No judge verdicts found in run artifacts. They appear
                        when experiments use a deep preset with a Judge step
                        (for example <code>research_deep</code>).
                    </p>
                </div>
            ) : rows.length === 0 ? (
                <div className="card">
                    <p className="muted">
                        No verdicts match the current filters. Try clearing
                        filters or broadening the verdict text search.
                    </p>
                </div>
            ) : (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Verdict narratives</h2>
                    <ResponsiveTable
                        columns={[
                            { key: "runId", label: "Run ID" },
                            {
                                key: "summary",
                                label: "Summary",
                                cellClass: "cell-question",
                                render: (row) => (
                                    <TruncateText
                                        text={
                                            (row as { summary: string })
                                                .summary || "(no summary)"
                                        }
                                        maxLength={96}
                                    />
                                ),
                            },
                            {
                                key: "coherence",
                                label: "Coherence",
                                helpKey: "coherence",
                            },
                            {
                                key: "factualRisk",
                                label: "Factual risk",
                                helpKey: "factualRisk",
                            },
                            { key: "model", label: "Model", helpKey: "model" },
                            {
                                key: "preset",
                                label: "Preset",
                                helpKey: "preset",
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
                        data={rows.map((row) => ({
                            runId: row.runId,
                            summary: row.summary,
                            coherence: formatScore(row.coherence),
                            factualRisk: formatScore(row.factualRisk),
                            model: row.model,
                            preset: row.preset,
                            traceHref: row.traceHref,
                            strengths: row.strengths,
                            weaknesses: row.weaknesses,
                        }))}
                        getRowId={(row) => (row as { runId: string }).runId}
                        renderCardActions={(row) => (
                            <Link
                                href={(row as { traceHref: string }).traceHref}
                                className="button"
                            >
                                View trace
                            </Link>
                        )}
                    />
                </div>
            )}
        </section>
    );
}
