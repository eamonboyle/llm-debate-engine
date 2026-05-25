import type { Metadata } from "next";
import Link from "next/link";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { loadDataStatus } from "../../lib/data";

export const metadata: Metadata = {
    title: "Data status",
};

function StatusBadge({ ok }: { ok: boolean }) {
    return (
        <span
            className={
                ok ? "status-badge status-ok" : "status-badge status-missing"
            }
        >
            {ok ? "Ready" : "Missing"}
        </span>
    );
}

export default async function DataStatusPage() {
    const status = await loadDataStatus();

    const rows = [
        {
            key: "Run artifacts",
            value: String(status.runArtifactCount),
            ok: status.runArtifactCount > 0,
            hint: "Individual debate traces in runs/",
        },
        {
            key: "Benchmark artifacts",
            value: String(status.benchmarkArtifactCount),
            ok: status.benchmarkArtifactCount > 0,
            hint: "Multi-run benchmark summaries",
        },
        {
            key: "Analysis index",
            value: status.analysisIndex.present
                ? status.analysisIndex.source === "index"
                    ? "analysis-index.json"
                    : "analysis-bundle.json (index)"
                : "Not loaded",
            ok: status.analysisIndex.present,
            hint: "Run pnpm analyze to generate",
        },
        {
            key: "Analysis report",
            value: status.analysisReport.present
                ? `${status.analysisReport.byteLength ?? 0} bytes`
                : "Not found",
            ok: status.analysisReport.present,
            hint: "pnpm analyze -- --markdown",
        },
        {
            key: "Benchmark pairs export",
            value: status.analysisBenchmarkPairs.present
                ? "analysis-benchmark-pairs.json"
                : "Not found",
            ok: status.analysisBenchmarkPairs.present,
            hint: "pnpm analyze -- --chunks",
        },
        {
            key: "Analysis bundle",
            value: status.analysisBundle.present
                ? "analysis-bundle.json"
                : "Not found",
            ok: status.analysisBundle.present,
            hint: "pnpm analyze -- --bundle",
        },
        {
            key: "Skipped files (index)",
            value: String(status.skippedFileCount),
            ok: status.skippedFileCount === 0,
            hint: "Parse errors during indexing",
        },
    ];

    const indexGenerated = status.analysisIndex.generatedAt
        ? new Date(status.analysisIndex.generatedAt).toLocaleString()
        : null;

    return (
        <section className="stack">
            <div>
                <h1 className="title">Data status</h1>
                <p className="subtitle">
                    What the dashboard can read from the artifact directory. Use
                    this to confirm local setup before exploring runs and
                    benchmarks.
                </p>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Artifact directory</h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    <code>{status.runsDir}</code>
                    {process.env.RUNS_DIR ? (
                        <> · overridden by RUNS_DIR</>
                    ) : null}
                </p>
                {indexGenerated ? (
                    <p className="small muted">
                        Analysis index generated {indexGenerated}.
                    </p>
                ) : null}
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Availability</h2>
                <ResponsiveTable
                    columns={[
                        { key: "key", label: "Resource" },
                        {
                            key: "status",
                            label: "Status",
                            render: (row) => (
                                <StatusBadge ok={(row as { ok: boolean }).ok} />
                            ),
                        },
                        { key: "value", label: "Detail" },
                        {
                            key: "hint",
                            label: "How to populate",
                            hideOnMobile: true,
                            render: (row) => (
                                <span className="muted small">
                                    {(row as { hint: string }).hint}
                                </span>
                            ),
                        },
                    ]}
                    data={rows}
                    getRowId={(row) => (row as { key: string }).key}
                />
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Quick links</h2>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/" className="button">
                        Overview
                    </Link>
                    <Link href="/runs" className="button secondary">
                        Runs
                    </Link>
                    <Link href="/benchmarks" className="button secondary">
                        Benchmarks
                    </Link>
                    {status.analysisReport.present ? (
                        <Link href="/report" className="button secondary">
                            Analysis report
                        </Link>
                    ) : null}
                    <a href="/api/analysis" className="button secondary">
                        API: analysis index
                    </a>
                </div>
            </div>

            {!status.analysisIndex.present ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Getting started</h2>
                    <p className="muted">
                        Generate artifacts with the CLI, then build the analysis
                        index for charts and KPIs on the overview page.
                    </p>
                    <pre className="code-block">
                        <code>{`pnpm ask "Your question?" --preset research_deep
pnpm benchmark "Your question?" --runs 5
pnpm analyze`}</code>
                    </pre>
                </div>
            ) : null}
        </section>
    );
}
