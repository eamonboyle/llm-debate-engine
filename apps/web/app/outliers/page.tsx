import type { Metadata } from "next";
import Link from "next/link";
import { MetricCard } from "../../components/MetricCard";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { loadAnalysisIndex } from "../../lib/data";

export const metadata: Metadata = {
    title: "Outlier runs",
};

export default async function OutliersPage() {
    const index = await loadAnalysisIndex();

    if (!index) {
        return (
            <section className="stack">
                <h1 className="title">Outlier runs</h1>
                <p className="subtitle">
                    Outlier detection requires an analysis index with benchmark
                    pairwise similarity. Run <code>pnpm analyze</code> after
                    generating benchmark artifacts.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const outliers = index.aggregates.outlierRuns ?? [];
    const sorted = [...outliers].sort(
        (a, b) => a.avgSimilarity - b.avgSimilarity,
    );

    return (
        <section className="stack">
            <div>
                <h1 className="title">Outlier runs</h1>
                <p className="subtitle">
                    Runs with the lowest average pairwise similarity within
                    their parent benchmark — useful for spotting divergent
                    answers in multi-run experiments.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/" className="button secondary">
                        Overview
                    </Link>
                    <Link href="/benchmarks" className="button secondary">
                        All benchmarks
                    </Link>
                </div>
            </div>

            <div className="grid-4">
                <MetricCard
                    label="Outliers indexed"
                    value={sorted.length}
                    helpKey="outlierRuns"
                />
                <MetricCard
                    label="Benchmark artifacts"
                    value={index.totals.benchmarks}
                    helpKey="benchmarkArtifacts"
                />
                <MetricCard
                    label="Lowest avg similarity"
                    value={sorted[0] ? sorted[0].avgSimilarity.toFixed(3) : "—"}
                    helpKey="avgSimilarity"
                />
                <MetricCard
                    label="Most negative z-score"
                    value={
                        sorted.length > 0
                            ? Math.min(
                                  ...sorted.map((row) => row.zScore),
                              ).toFixed(2)
                            : "—"
                    }
                    helpKey="zScore"
                />
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Ranked outlier list</h2>
                {sorted.length === 0 ? (
                    <p className="muted">
                        No outlier data in the current index. Re-run analysis
                        after benchmarks with stability pairs are available, or
                        use <code>pnpm analyze -- --chunks</code> for pairwise
                        exports.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "benchmarkId", label: "Benchmark" },
                            { key: "runId", label: "Run ID" },
                            {
                                key: "avgSimilarity",
                                label: "Avg similarity",
                                helpKey: "avgSimilarity",
                            },
                            {
                                key: "zScore",
                                label: "Z-score",
                                helpKey: "zScore",
                            },
                            {
                                key: "benchmark",
                                label: "Benchmark",
                                hideOnMobile: true,
                                render: (row) => (
                                    <Link
                                        href={`/benchmarks/${(row as { benchmarkId: string }).benchmarkId}`}
                                    >
                                        Open
                                    </Link>
                                ),
                            },
                            {
                                key: "trace",
                                label: "Trace",
                                render: (row) => (
                                    <Link
                                        href={`/runs/${(row as { runId: string }).runId}`}
                                    >
                                        Open
                                    </Link>
                                ),
                            },
                            {
                                key: "compare",
                                label: "Compare",
                                hideOnMobile: true,
                                render: (row) => {
                                    const r = row as {
                                        benchmarkId: string;
                                        runId: string;
                                    };
                                    return (
                                        <Link
                                            href={`/runs/compare?left=${r.runId}`}
                                        >
                                            Compare
                                        </Link>
                                    );
                                },
                            },
                        ]}
                        data={sorted}
                        getRowId={(row) =>
                            `${(row as { benchmarkId: string }).benchmarkId}-${(row as { runId: string }).runId}`
                        }
                        renderCardActions={(row) => {
                            const r = row as {
                                benchmarkId: string;
                                runId: string;
                            };
                            return (
                                <>
                                    <Link
                                        href={`/runs/${r.runId}`}
                                        className="button"
                                    >
                                        View trace
                                    </Link>
                                    <Link
                                        href={`/benchmarks/${r.benchmarkId}`}
                                        className="button secondary"
                                    >
                                        Benchmark
                                    </Link>
                                </>
                            );
                        }}
                    />
                )}
            </div>
        </section>
    );
}
