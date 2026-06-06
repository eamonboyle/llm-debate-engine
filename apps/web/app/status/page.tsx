import type { Metadata } from "next";
import Link from "next/link";
import { ApiStatusPanel } from "../../components/ApiStatusPanel";
import { MetricCard } from "../../components/MetricCard";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { loadAnalysisIndex, loadDataStatus } from "../../lib/data";

export const metadata: Metadata = {
    title: "Data status",
};

export default async function DataStatusPage() {
    const [status, index] = await Promise.all([
        loadDataStatus(),
        loadAnalysisIndex(),
    ]);

    const indexReady = status.hasAnalysisIndex || status.hasAnalysisBundle;
    const artifactsReady =
        status.artifactCounts.runs > 0 || status.artifactCounts.benchmarks > 0;

    const checklist = [
        {
            item: "Run or benchmark artifacts",
            ok: artifactsReady,
            hint: artifactsReady
                ? `${status.artifactCounts.runs} runs, ${status.artifactCounts.benchmarks} benchmarks`
                : "Add JSON artifacts under runs/ or set RUNS_DIR",
        },
        {
            item: "Analysis index",
            ok: indexReady,
            hint: indexReady
                ? status.hasAnalysisIndex
                    ? "analysis-index.json"
                    : "analysis-bundle.json (index fallback)"
                : "Run pnpm analyze locally",
        },
        {
            item: "Markdown report",
            ok: status.hasAnalysisReport,
            hint: status.hasAnalysisReport
                ? "analysis-report.md"
                : "Run pnpm analyze -- --markdown",
        },
        {
            item: "Benchmark pairwise export",
            ok: status.hasBenchmarkPairs,
            hint: status.hasBenchmarkPairs
                ? "analysis-benchmark-pairs.json"
                : "Optional: pnpm analyze -- --chunks",
        },
        {
            item: "Run summary CSV",
            ok: status.hasAnalysisRunsCsv,
            hint: status.hasAnalysisRunsCsv
                ? "analysis-runs.csv"
                : "Optional: pnpm analyze -- --csv",
        },
        {
            item: "Benchmark summary CSV",
            ok: status.hasAnalysisBenchmarksCsv,
            hint: status.hasAnalysisBenchmarksCsv
                ? "analysis-benchmarks.csv"
                : "Optional: pnpm analyze -- --csv",
        },
    ];

    return (
        <section className="stack">
            <div>
                <h1 className="title">Data status</h1>
                <p className="subtitle">
                    Quick health check for the artifact store powering this
                    dashboard. Data source: {status.runsDirLabel}.
                </p>
            </div>

            <div className="grid-4">
                <MetricCard
                    label="Run artifacts"
                    value={status.artifactCounts.runs}
                    helpKey="runArtifacts"
                />
                <MetricCard
                    label="Benchmark artifacts"
                    value={status.artifactCounts.benchmarks}
                    helpKey="benchmarkArtifacts"
                />
                <MetricCard
                    label="Index skipped files"
                    value={status.indexTotals?.skippedFiles ?? "—"}
                    helpKey="skippedFiles"
                />
                <MetricCard
                    label="Parse errors in index"
                    value={status.skippedCount}
                    helper={
                        status.skippedCount > 0
                            ? "see report for details"
                            : undefined
                    }
                />
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Readiness checklist</h2>
                <ResponsiveTable
                    columns={[
                        {
                            key: "status",
                            label: "Status",
                            render: (row) =>
                                (row as { ok: boolean }).ok ? (
                                    <span
                                        style={{
                                            color: "var(--color-success)",
                                        }}
                                    >
                                        Ready
                                    </span>
                                ) : (
                                    <span
                                        style={{
                                            color: "var(--color-warning)",
                                        }}
                                    >
                                        Missing
                                    </span>
                                ),
                        },
                        { key: "item", label: "Resource" },
                        { key: "hint", label: "Details" },
                    ]}
                    data={checklist}
                    getRowId={(row) => (row as { item: string }).item}
                />
            </div>

            <ApiStatusPanel />

            {status.analysisGeneratedAt ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Analysis index</h2>
                    <p className="small muted">
                        Generated{" "}
                        {new Date(status.analysisGeneratedAt).toLocaleString()}
                        {status.indexTotals
                            ? ` · ${status.indexTotals.runs} runs indexed · ${status.indexTotals.benchmarks} benchmarks`
                            : null}
                    </p>
                    <div
                        className="page-actions"
                        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                    >
                        <Link href="/" className="button">
                            Open overview
                        </Link>
                        <Link href="/report" className="button secondary">
                            View report
                        </Link>
                        <a
                            href="/api/analysis"
                            className="button secondary"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            API: index JSON
                        </a>
                        {status.hasAnalysisReport ? (
                            <a
                                href="/api/analysis/report"
                                className="button secondary"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                API: report markdown
                            </a>
                        ) : null}
                        {status.hasAnalysisRunsCsv ? (
                            <a
                                href="/api/analysis/csv/runs"
                                className="button secondary"
                                download="analysis-runs.csv"
                            >
                                Download runs CSV
                            </a>
                        ) : null}
                        {status.hasAnalysisBenchmarksCsv ? (
                            <a
                                href="/api/analysis/csv/benchmarks"
                                className="button secondary"
                                download="analysis-benchmarks.csv"
                            >
                                Download benchmarks CSV
                            </a>
                        ) : null}
                        {status.hasAnalysisBundle ? (
                            <a
                                href="/api/analysis/bundle?download=1"
                                className="button secondary"
                                download="analysis-bundle.json"
                            >
                                Download analysis bundle
                            </a>
                        ) : null}
                        {status.hasAnalysisBundle ? (
                            <a
                                href="/api/analysis/bundle"
                                className="button secondary"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                API: analysis bundle
                            </a>
                        ) : null}
                    </div>
                </div>
            ) : (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>No analysis index yet</h2>
                    <p className="muted">
                        The overview charts and KPIs need an analysis index.
                        Generate one with <code>pnpm analyze</code> after adding
                        run artifacts.
                    </p>
                    {artifactsReady ? (
                        <p className="small muted">
                            You can still browse <Link href="/runs">runs</Link>{" "}
                            and <Link href="/benchmarks">benchmarks</Link> from
                            raw JSON files.
                        </p>
                    ) : null}
                </div>
            )}

            {index && index.skipped.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Skipped during indexing</h2>
                    <p className="small muted">
                        {index.skipped.length} file
                        {index.skipped.length === 1 ? "" : "s"} could not be
                        parsed. Full list also appears on the{" "}
                        <Link href="/report">analysis report</Link> page.
                    </p>
                    <ResponsiveTable
                        columns={[
                            { key: "file", label: "File" },
                            { key: "error", label: "Error" },
                        ]}
                        data={index.skipped.slice(0, 20).map((entry) => ({
                            file: entry.file,
                            error: entry.error,
                        }))}
                        getRowId={(row) => (row as { file: string }).file}
                    />
                    {index.skipped.length > 20 ? (
                        <p className="small muted" style={{ marginTop: 12 }}>
                            Showing first 20 of {index.skipped.length} skipped
                            files.
                        </p>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}
