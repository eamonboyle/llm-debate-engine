import type { Metadata } from "next";
import Link from "next/link";
import { InsightFilterCard } from "../../components/InsightFilterCard";
import { MetricCard } from "../../components/MetricCard";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { loadAnalysisIndex } from "../../lib/data";
import {
    buildEvidenceRiskSummaries,
    listRunsForEvidenceRisk,
    summarizeEvidencePlanning,
} from "../../lib/evidenceExplorer";
import { applyIndexFilters, collectIndexFacets } from "../../lib/indexFilters";
import { buildQueryString } from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Evidence planning",
};

type EvidenceSearchParams = {
    level?: string;
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};

export default async function EvidenceExplorerPage({
    searchParams,
}: {
    searchParams: Promise<EvidenceSearchParams>;
}) {
    const params = await searchParams;
    const rawIndex = await loadAnalysisIndex();

    if (!rawIndex) {
        return (
            <section className="stack">
                <h1 className="title">Evidence planning</h1>
                <p className="subtitle">
                    EvidencePlanner risk scores require an analysis index. Run{" "}
                    <code>pnpm analyze</code> after deep-pipeline runs with an
                    EvidencePlanner step.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const { models, presets } = collectIndexFacets(rawIndex);
    const index = applyIndexFilters(rawIndex, params);
    const summary = summarizeEvidencePlanning(index);
    const riskSummaries = buildEvidenceRiskSummaries(index);
    const selectedLevel = Number((params.level ?? "").trim());
    const selectedRuns = Number.isFinite(selectedLevel)
        ? listRunsForEvidenceRisk(index, selectedLevel)
        : [];

    return (
        <section className="stack">
            <div>
                <h1 className="title">Evidence planning</h1>
                <p className="subtitle">
                    EvidencePlanner risk levels (1–5) across{" "}
                    {rawIndex.totals.runs} indexed runs. Select a level to see
                    which traces reported it.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/" className="button secondary">
                        Overview
                    </Link>
                    <Link href="/counterfactual" className="button secondary">
                        Counterfactual modes
                    </Link>
                    <Link href="/drift" className="button secondary">
                        Confidence drift
                    </Link>
                </div>
            </div>

            <InsightFilterCard
                action="/evidence"
                models={models}
                presets={presets}
                params={params}
                totalRuns={rawIndex.runs.length}
                filteredRuns={index.runs.length}
                preserveKeys={["level"]}
            />

            <div className="grid-4">
                <MetricCard
                    label="Runs with risk score"
                    value={summary.runCountWithRisk}
                />
                <MetricCard
                    label="Mean risk level"
                    value={
                        summary.riskLevelMean != null
                            ? summary.riskLevelMean.toFixed(2)
                            : "—"
                    }
                    helpKey="evidenceRiskLevel"
                />
                <MetricCard
                    label="High risk (≥4)"
                    value={summary.highRiskCount}
                    helpKey="evidenceRiskLevel"
                />
                <MetricCard
                    label="Distinct levels"
                    value={riskSummaries.length}
                />
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Risk level distribution</h2>
                {riskSummaries.length === 0 ? (
                    <p className="muted">
                        No evidence risk scores in the current index. They
                        appear when runs use a deep preset with an
                        EvidencePlanner step.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            {
                                key: "riskLevel",
                                label: "Risk level",
                                helpKey: "evidenceRiskLevel",
                            },
                            { key: "runCount", label: "Runs" },
                            {
                                key: "explore",
                                label: "Explore",
                                render: (row) => (
                                    <Link
                                        href={`/evidence${buildQueryString(
                                            params,
                                            {
                                                level: String(
                                                    (
                                                        row as {
                                                            riskLevel: number;
                                                        }
                                                    ).riskLevel,
                                                ),
                                            },
                                        )}`}
                                    >
                                        View runs
                                    </Link>
                                ),
                            },
                        ]}
                        data={riskSummaries}
                        getRowId={(row) =>
                            String((row as { riskLevel: number }).riskLevel)
                        }
                    />
                )}
            </div>

            {Number.isFinite(selectedLevel) ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>
                        Runs at risk level {selectedLevel}
                    </h2>
                    {selectedRuns.length === 0 ? (
                        <p className="muted">
                            No runs recorded at this risk level.
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
                                                (row as { question: string })
                                                    .question
                                            }
                                            maxLength={80}
                                        />
                                    ),
                                },
                                {
                                    key: "model",
                                    label: "Model",
                                    helpKey: "model",
                                },
                                {
                                    key: "pipelinePreset",
                                    label: "Preset",
                                    helpKey: "preset",
                                },
                                {
                                    key: "open",
                                    label: "Open",
                                    render: (row) => (
                                        <Link
                                            href={
                                                (row as { href: string }).href
                                            }
                                        >
                                            Trace
                                        </Link>
                                    ),
                                },
                            ]}
                            data={selectedRuns}
                            getRowId={(row) => (row as { runId: string }).runId}
                        />
                    )}
                </div>
            ) : null}
        </section>
    );
}
