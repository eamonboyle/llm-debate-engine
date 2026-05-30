import type { Metadata } from "next";
import Link from "next/link";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { loadAnalysisIndex } from "../../lib/data";
import { buildPresetLeaderboard } from "../../lib/presetLeaderboard";

export const metadata: Metadata = {
    title: "Preset leaderboard",
};

function formatMetric(value: number | null, digits = 2) {
    return typeof value === "number" ? value.toFixed(digits) : "—";
}

export default async function PresetLeaderboardPage() {
    const index = await loadAnalysisIndex();

    if (!index) {
        return (
            <section className="stack">
                <h1 className="title">Preset leaderboard</h1>
                <p className="subtitle">
                    Pipeline preset comparisons require an analysis index. Run{" "}
                    <code>pnpm analyze</code> after adding run artifacts.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const rows = buildPresetLeaderboard(index);

    return (
        <section className="stack">
            <div>
                <h1 className="title">Preset leaderboard</h1>
                <p className="subtitle">
                    Average critique pressure, confidence drift, and judge
                    rubric scores per pipeline preset across {index.totals.runs}{" "}
                    indexed runs.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/leaderboard" className="button secondary">
                        Model leaderboard
                    </Link>
                    <Link href="/pipeline" className="button secondary">
                        Pipeline reference
                    </Link>
                    <Link href="/catalog" className="button secondary">
                        Experiment catalog
                    </Link>
                </div>
            </div>

            <div className="card">
                {rows.length === 0 ? (
                    <p className="muted">No runs in the analysis index.</p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            {
                                key: "preset",
                                label: "Preset",
                                helpKey: "preset",
                            },
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
                                key: "avgCoherence",
                                label: "Avg coherence",
                                helpKey: "coherence",
                            },
                            {
                                key: "explore",
                                label: "Explore",
                                cellClass: "cell-actions",
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
                            preset: row.preset,
                            runCount: row.runCount,
                            avgIssueCount: formatMetric(row.avgIssueCount),
                            avgMaxSeverity: formatMetric(row.avgMaxSeverity),
                            avgSolverToRevisionDelta: formatMetric(
                                row.avgSolverToRevisionDelta,
                            ),
                            avgCoherence: formatMetric(row.avgCoherence),
                            runsHref: row.runsHref,
                        }))}
                        getRowId={(row) => (row as { preset: string }).preset}
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
