import type { Metadata } from "next";
import Link from "next/link";
import { loadAnalysisIndex, loadAnalysisReport } from "../../lib/data";
import { renderSimpleMarkdown } from "../../lib/simpleMarkdown";
import { ResponsiveTable } from "../../components/ResponsiveTable";

export const metadata: Metadata = {
    title: "Analysis report",
};

export default async function AnalysisReportPage() {
    const [report, index] = await Promise.all([
        loadAnalysisReport(),
        loadAnalysisIndex(),
    ]);

    if (!report) {
        return (
            <section className="stack">
                <h1 className="title">Analysis report</h1>
                <p className="subtitle">
                    No report found. Generate one with{" "}
                    <code>pnpm analyze -- --markdown</code> (writes{" "}
                    <code>runs/analysis-report.md</code>).
                </p>
                <Link href="/" className="button">
                    Back to overview
                </Link>
            </section>
        );
    }

    const html = renderSimpleMarkdown(report);
    const skipped = index?.skipped ?? [];

    return (
        <section className="stack">
            <div>
                <h1 className="title">Analysis report</h1>
                <p className="subtitle">
                    Markdown summary from the latest <code>analyze-runs</code>{" "}
                    export.
                    {index
                        ? ` Index generated ${new Date(index.generatedAt).toLocaleString()}.`
                        : null}
                </p>
            </div>

            {skipped.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Skipped artifacts</h2>
                    <p className="small muted">
                        Files that could not be parsed during indexing (
                        {skipped.length} total).
                    </p>
                    <ResponsiveTable
                        columns={[
                            { key: "file", label: "File" },
                            { key: "error", label: "Error" },
                        ]}
                        data={skipped.map((entry) => ({
                            file: entry.file,
                            error: entry.error,
                        }))}
                        getRowId={(row) => (row as { file: string }).file}
                    />
                </div>
            ) : null}

            <article
                className="card markdown-report"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </section>
    );
}
