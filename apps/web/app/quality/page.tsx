import type { Metadata } from "next";
import Link from "next/link";
import { InsightFilterCard } from "../../components/InsightFilterCard";
import { MetricCard } from "../../components/MetricCard";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { loadAnalysisIndex, loadRunArtifacts } from "../../lib/data";
import { applyIndexFilters, collectIndexFacets } from "../../lib/indexFilters";
import {
    buildQualityRunRows,
    summarizeQuality,
} from "../../lib/qualityInsights";
import {
    aggregateJudgeNarratives,
    listRunsForNarrativeTheme,
    type NarrativeThemeKind,
} from "../../lib/judgeNarrativeInsights";
import { buildQueryString } from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Quality insights",
};

type QualitySearchParams = {
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
    theme?: string;
    narrativeKind?: string;
};

function resolveNarrativeKind(
    value: string | undefined,
): NarrativeThemeKind | null {
    if (value === "strength" || value === "weakness") return value;
    return null;
}

function formatScore(value: number | null) {
    return typeof value === "number" ? value.toFixed(1) : "—";
}

export default async function QualityInsightsPage({
    searchParams,
}: {
    searchParams: Promise<QualitySearchParams>;
}) {
    const params = await searchParams;
    const rawIndex = await loadAnalysisIndex();

    if (!rawIndex) {
        return (
            <section className="stack">
                <h1 className="title">Quality insights</h1>
                <p className="subtitle">
                    Judge rubric scores are indexed with{" "}
                    <code>pnpm analyze</code>. Generate an analysis index to
                    compare coherence and factual risk across runs.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const { models, presets } = collectIndexFacets(rawIndex);
    const index = applyIndexFilters(rawIndex, params);
    const summary = summarizeQuality(index);
    const rows = buildQualityRunRows(index);
    const qualityRunIds = new Set(
        rows
            .filter(
                (row) =>
                    row.coherence != null ||
                    row.completeness != null ||
                    row.factualRisk != null ||
                    row.uncertaintyHandling != null,
            )
            .map((row) => row.id),
    );
    const allRuns = await loadRunArtifacts();
    const narratives =
        qualityRunIds.size > 0
            ? aggregateJudgeNarratives(allRuns, qualityRunIds)
            : { strengths: [], weaknesses: [] };
    const selectedTheme = (params.theme ?? "").trim();
    const selectedNarrativeKind = resolveNarrativeKind(params.narrativeKind);
    const themeRunRows =
        selectedTheme && selectedNarrativeKind
            ? listRunsForNarrativeTheme(
                  allRuns,
                  selectedTheme,
                  selectedNarrativeKind,
                  qualityRunIds,
              )
            : [];

    function themeHref(text: string, kind: NarrativeThemeKind) {
        return `/quality${buildQueryString(params, {
            theme: text,
            narrativeKind: kind,
        })}`;
    }

    return (
        <section className="stack">
            <div>
                <h1 className="title">Quality insights</h1>
                <p className="subtitle">
                    Judge rubric scores (1–5) from deep pipeline presets —
                    sorted by coherence, then lowest factual risk.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/leaderboard" className="button secondary">
                        Model leaderboard
                    </Link>
                    <Link href="/presets" className="button secondary">
                        Preset leaderboard
                    </Link>
                    <Link href="/glossary" className="button secondary">
                        Glossary
                    </Link>
                </div>
            </div>

            <InsightFilterCard
                action="/quality"
                models={models}
                presets={presets}
                params={params}
                totalRuns={rawIndex.runs.length}
                filteredRuns={index.runs.length}
            />

            {summary.withQualityScores > 0 ? (
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <a
                        href={`/api/quality${buildQueryString(params, {})}`}
                        className="button secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                    >
                        Export JSON
                    </a>
                    <a
                        href={`/api/quality${buildQueryString(params, {})}&format=csv`}
                        className="button secondary"
                        download="quality-insights.csv"
                    >
                        Export CSV
                    </a>
                </div>
            ) : null}

            <div className="grid-4">
                <MetricCard
                    label="Runs with rubric scores"
                    value={summary.withQualityScores}
                    helper={`of ${summary.runCount} indexed`}
                />
                <MetricCard
                    label="Avg coherence"
                    value={formatScore(summary.avgCoherence)}
                    helpKey="coherence"
                />
                <MetricCard
                    label="Avg completeness"
                    value={formatScore(summary.avgCompleteness)}
                    helpKey="completeness"
                />
                <MetricCard
                    label="Avg factual risk"
                    value={formatScore(summary.avgFactualRisk)}
                    helpKey="factualRisk"
                />
            </div>

            {summary.withQualityScores === 0 ? (
                <div className="card">
                    <p className="muted">
                        No judge rubric scores in the analysis index yet. They
                        appear when runs use a deep preset with a Judge step.
                    </p>
                    <p className="small muted" style={{ marginTop: 12 }}>
                        Browse individual traces for per-step judgement output,
                        or run new experiments with <code>research_deep</code>.
                    </p>
                </div>
            ) : (
                <>
                    {narratives.strengths.length > 0 ||
                    narratives.weaknesses.length > 0 ? (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(280px, 1fr))",
                                gap: "1rem",
                            }}
                        >
                            {narratives.strengths.length > 0 ? (
                                <div className="card">
                                    <h2 style={{ marginTop: 0 }}>
                                        Recurring strengths
                                    </h2>
                                    <p className="small muted">
                                        Themes from judge narratives across
                                        filtered runs with rubric scores — click
                                        to list all matching traces.
                                    </p>
                                    <ul className="trace-summary-list">
                                        {narratives.strengths.map((theme) => (
                                            <li key={theme.text}>
                                                <Link
                                                    href={themeHref(
                                                        theme.text,
                                                        "strength",
                                                    )}
                                                >
                                                    {theme.text}
                                                </Link>
                                                <span className="small muted">
                                                    {" "}
                                                    · {theme.runCount} run
                                                    {theme.runCount === 1
                                                        ? ""
                                                        : "s"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                            {narratives.weaknesses.length > 0 ? (
                                <div className="card">
                                    <h2 style={{ marginTop: 0 }}>
                                        Recurring weaknesses
                                    </h2>
                                    <p className="small muted">
                                        Common critique themes from judge steps
                                        — click to list all runs mentioning the
                                        theme.
                                    </p>
                                    <ul className="trace-summary-list">
                                        {narratives.weaknesses.map((theme) => (
                                            <li key={theme.text}>
                                                <Link
                                                    href={themeHref(
                                                        theme.text,
                                                        "weakness",
                                                    )}
                                                >
                                                    {theme.text}
                                                </Link>
                                                <span className="small muted">
                                                    {" "}
                                                    · {theme.runCount} run
                                                    {theme.runCount === 1
                                                        ? ""
                                                        : "s"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {selectedTheme && selectedNarrativeKind ? (
                        <div className="card">
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 10,
                                    alignItems: "baseline",
                                    justifyContent: "space-between",
                                }}
                            >
                                <h2 style={{ margin: 0 }}>
                                    Runs with{" "}
                                    {selectedNarrativeKind === "strength"
                                        ? "strength"
                                        : "weakness"}
                                    : {selectedTheme}
                                </h2>
                                <Link
                                    href={`/quality${buildQueryString(params, {
                                        theme: undefined,
                                        narrativeKind: undefined,
                                    })}`}
                                    className="button secondary"
                                >
                                    Clear theme
                                </Link>
                            </div>
                            {themeRunRows.length === 0 ? (
                                <p className="muted">
                                    No runs in the current filter mention this
                                    theme.
                                </p>
                            ) : (
                                <ResponsiveTable
                                    columns={[
                                        { key: "runId", label: "Run ID" },
                                        {
                                            key: "question",
                                            label: "Question",
                                            cellClass: "cell-question",
                                            render: (row) => (
                                                <TruncateText
                                                    text={
                                                        (
                                                            row as {
                                                                question: string;
                                                            }
                                                        ).question
                                                    }
                                                    maxLength={72}
                                                    className="muted"
                                                />
                                            ),
                                        },
                                        {
                                            key: "model",
                                            label: "Model",
                                            helpKey: "model",
                                        },
                                        {
                                            key: "preset",
                                            label: "Preset",
                                            helpKey: "preset",
                                        },
                                        {
                                            key: "trace",
                                            label: "Open",
                                            render: (row) => (
                                                <Link
                                                    href={
                                                        (
                                                            row as {
                                                                traceHref: string;
                                                            }
                                                        ).traceHref
                                                    }
                                                >
                                                    Trace
                                                </Link>
                                            ),
                                        },
                                    ]}
                                    data={themeRunRows}
                                    getRowId={(row) =>
                                        (row as { runId: string }).runId
                                    }
                                />
                            )}
                        </div>
                    ) : null}

                    <div className="card">
                        <h2 style={{ marginTop: 0 }}>Runs by quality</h2>
                        <ResponsiveTable
                            columns={[
                                { key: "id", label: "Run ID" },
                                {
                                    key: "question",
                                    label: "Question",
                                    cellClass: "cell-question",
                                    render: (row) => (
                                        <TruncateText
                                            text={
                                                (row as { question: string })
                                                    .question
                                            }
                                            maxLength={72}
                                            className="muted"
                                        />
                                    ),
                                },
                                {
                                    key: "model",
                                    label: "Model",
                                    helpKey: "model",
                                },
                                {
                                    key: "preset",
                                    label: "Preset",
                                    helpKey: "preset",
                                },
                                {
                                    key: "coherence",
                                    label: "Coherence",
                                    helpKey: "coherence",
                                },
                                {
                                    key: "completeness",
                                    label: "Completeness",
                                    helpKey: "completeness",
                                },
                                {
                                    key: "factualRisk",
                                    label: "Factual risk",
                                    helpKey: "factualRisk",
                                },
                                {
                                    key: "uncertaintyHandling",
                                    label: "Uncertainty",
                                    helpKey: "uncertaintyHandling",
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
                                id: row.id,
                                question: row.question,
                                model: row.model,
                                preset: row.preset,
                                coherence: formatScore(row.coherence),
                                completeness: formatScore(row.completeness),
                                factualRisk: formatScore(row.factualRisk),
                                uncertaintyHandling: formatScore(
                                    row.uncertaintyHandling,
                                ),
                                traceHref: row.traceHref,
                            }))}
                            getRowId={(row) => (row as { id: string }).id}
                            renderCardActions={(row) => (
                                <Link
                                    href={
                                        (row as { traceHref: string }).traceHref
                                    }
                                    className="button"
                                >
                                    View trace
                                </Link>
                            )}
                        />
                    </div>
                </>
            )}
        </section>
    );
}
