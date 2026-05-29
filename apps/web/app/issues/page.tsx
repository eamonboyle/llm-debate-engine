import type { Metadata } from "next";
import Link from "next/link";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { loadAnalysisIndex } from "../../lib/data";
import {
    buildIssueTypeSummaries,
    listRunsForIssueType,
} from "../../lib/issueExplorer";

export const metadata: Metadata = {
    title: "Critique issues",
};

type IssuesSearchParams = {
    type?: string;
};

export default async function IssuesExplorerPage({
    searchParams,
}: {
    searchParams: Promise<IssuesSearchParams>;
}) {
    const params = await searchParams;
    const index = await loadAnalysisIndex();

    if (!index) {
        return (
            <section className="stack">
                <h1 className="title">Critique issues</h1>
                <p className="subtitle">
                    No analysis index found. Run <code>pnpm analyze</code> to
                    aggregate skeptic issue types across runs.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const summaries = buildIssueTypeSummaries(index);
    const selectedType = (params.type ?? "").trim();
    const selectedRuns = selectedType
        ? listRunsForIssueType(index, selectedType)
        : [];

    return (
        <section className="stack">
            <div>
                <h1 className="title">Critique issues</h1>
                <p className="subtitle">
                    Skeptic issue types aggregated from {index.totals.runs}{" "}
                    indexed run
                    {index.totals.runs === 1 ? "" : "s"}. Select a type to see
                    which traces contributed.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/" className="button secondary">
                        Overview
                    </Link>
                    <Link href="/leaderboard" className="button secondary">
                        Model leaderboard
                    </Link>
                </div>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Issue types</h2>
                {summaries.length === 0 ? (
                    <p className="muted">No critique issues recorded yet.</p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "type", label: "Type" },
                            { key: "totalCount", label: "Total issues" },
                            { key: "runCount", label: "Runs affected" },
                            {
                                key: "explore",
                                label: "Explore",
                                render: (row) => {
                                    const type = (row as { type: string }).type;
                                    const active =
                                        type.toLowerCase() ===
                                        selectedType.toLowerCase();
                                    return (
                                        <Link
                                            href={`/issues?type=${encodeURIComponent(type)}`}
                                            aria-current={
                                                active ? "page" : undefined
                                            }
                                        >
                                            {active ? "Selected" : "View runs"}
                                        </Link>
                                    );
                                },
                            },
                        ]}
                        data={summaries}
                        getRowId={(row) => (row as { type: string }).type}
                        renderCardActions={(row) => {
                            const type = (row as { type: string }).type;
                            return (
                                <Link
                                    href={`/issues?type=${encodeURIComponent(type)}`}
                                    className="button"
                                >
                                    View runs
                                </Link>
                            );
                        }}
                    />
                )}
            </div>

            {selectedType ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>
                        Runs with &ldquo;{selectedType}&rdquo; issues
                    </h2>
                    {selectedRuns.length === 0 ? (
                        <p className="muted">
                            No runs in the current index include this issue
                            type.
                        </p>
                    ) : (
                        <ResponsiveTable
                            columns={[
                                { key: "runId", label: "Run ID" },
                                { key: "question", label: "Question" },
                                { key: "model", label: "Model" },
                                {
                                    key: "countForType",
                                    label: "This type",
                                },
                                {
                                    key: "issueCount",
                                    label: "Total issues",
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
                            renderCardActions={(row) => (
                                <Link
                                    href={(row as { href: string }).href}
                                    className="button"
                                >
                                    View trace
                                </Link>
                            )}
                        />
                    )}
                    <div className="filter-actions" style={{ marginTop: 16 }}>
                        <Link href="/issues" className="button secondary">
                            Clear selection
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <p className="muted" style={{ margin: 0 }}>
                        Pick an issue type above to list contributing run
                        traces.
                    </p>
                </div>
            )}
        </section>
    );
}
