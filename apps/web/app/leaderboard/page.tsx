import type { Metadata } from "next";
import Link from "next/link";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { loadAnalysisIndex } from "../../lib/data";
import { buildModelLeaderboard } from "../../lib/modelLeaderboard";

export const metadata: Metadata = {
    title: "Model leaderboard",
};

type LeaderboardSearchParams = {
    fast?: string;
};

function resolveFastMode(value: string | undefined): boolean | undefined {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
}

function formatMetric(value: number | null, digits = 2) {
    return typeof value === "number" ? value.toFixed(digits) : "—";
}

export default async function ModelLeaderboardPage({
    searchParams,
}: {
    searchParams: Promise<LeaderboardSearchParams>;
}) {
    const params = await searchParams;
    const fastMode = resolveFastMode(params.fast);
    const index = await loadAnalysisIndex();

    if (!index) {
        return (
            <section className="stack">
                <h1 className="title">Model leaderboard</h1>
                <p className="subtitle">
                    Aggregated run metrics require an analysis index. Run{" "}
                    <code>pnpm analyze</code> after adding run artifacts.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const filteredRunCount =
        fastMode === undefined
            ? index.runs.length
            : index.runs.filter((run) => run.fastMode === fastMode).length;
    const rows = buildModelLeaderboard(index, { fastMode });

    return (
        <section className="stack">
            <div>
                <h1 className="title">Model leaderboard</h1>
                <p className="subtitle">
                    Average critique pressure and confidence drift per model
                    across {filteredRunCount} indexed run
                    {filteredRunCount === 1 ? "" : "s"}
                    {fastMode === undefined
                        ? ""
                        : fastMode
                          ? " (fast mode only)"
                          : " (non-fast only)"}
                    . Use the catalog for raw artifact counts.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/catalog" className="button secondary">
                        Experiment catalog
                    </Link>
                    <Link href="/presets" className="button secondary">
                        Preset leaderboard
                    </Link>
                    <Link href="/quality" className="button secondary">
                        Quality insights
                    </Link>
                    <Link href="/issues" className="button secondary">
                        Critique issues
                    </Link>
                    <Link
                        href="/leaderboard/compare"
                        className="button secondary"
                    >
                        Compare models
                    </Link>
                </div>
            </div>

            <form className="card" method="get">
                <div className="filter-grid">
                    <select
                        name="fast"
                        defaultValue={params.fast ?? ""}
                        className="input"
                    >
                        <option value="">Fast mode: any</option>
                        <option value="true">Fast only</option>
                        <option value="false">Non-fast only</option>
                    </select>
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Apply
                    </button>
                    <Link href="/leaderboard" className="button secondary">
                        Clear
                    </Link>
                </div>
            </form>

            <div className="card">
                {rows.length === 0 ? (
                    <p className="muted">No runs in the analysis index.</p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "model", label: "Model", helpKey: "model" },
                            { key: "runCount", label: "Runs" },
                            {
                                key: "avgIssueCount",
                                label: "Avg issues",
                                helpKey: "issueCount",
                            },
                            {
                                key: "avgMaxSeverity",
                                label: "Avg max severity",
                                helpKey: "maxSeverity",
                            },
                            {
                                key: "avgSolverToRevisionDelta",
                                label: "Avg solver→revision Δ",
                                helpKey: "solverToRevisionDelta",
                            },
                            {
                                key: "avgEvidenceRisk",
                                label: "Avg evidence risk",
                                helpKey: "evidenceRiskLevel",
                            },
                            {
                                key: "avgSolverConfidence",
                                label: "Avg solver conf.",
                                helpKey: "solverConfidence",
                            },
                            {
                                key: "explore",
                                label: "Explore",
                                render: (row) => (
                                    <Link
                                        href={
                                            (row as { runsHref: string })
                                                .runsHref
                                        }
                                    >
                                        Filter runs
                                    </Link>
                                ),
                            },
                        ]}
                        data={rows.map((row) => ({
                            ...row,
                            avgIssueCount: formatMetric(row.avgIssueCount),
                            avgMaxSeverity: formatMetric(row.avgMaxSeverity),
                            avgSolverToRevisionDelta: formatMetric(
                                row.avgSolverToRevisionDelta,
                                3,
                            ),
                            avgEvidenceRisk: formatMetric(row.avgEvidenceRisk),
                            avgSolverConfidence: formatMetric(
                                row.avgSolverConfidence,
                                3,
                            ),
                        }))}
                        getRowId={(row) => (row as { model: string }).model}
                        renderCardActions={(row) => (
                            <Link
                                href={(row as { runsHref: string }).runsHref}
                                className="button"
                            >
                                View runs
                            </Link>
                        )}
                    />
                )}
            </div>
        </section>
    );
}
