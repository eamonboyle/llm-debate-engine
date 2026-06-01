import type { Metadata } from "next";
import Link from "next/link";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { loadAnalysisIndex } from "../../lib/data";
import {
    buildFailureModeSummaries,
    listRunsForFailureMode,
} from "../../lib/counterfactualExplorer";

export const metadata: Metadata = {
    title: "Counterfactual modes",
};

type CounterfactualSearchParams = {
    mode?: string;
};

export default async function CounterfactualExplorerPage({
    searchParams,
}: {
    searchParams: Promise<CounterfactualSearchParams>;
}) {
    const params = await searchParams;
    const index = await loadAnalysisIndex();

    if (!index) {
        return (
            <section className="stack">
                <h1 className="title">Counterfactual failure modes</h1>
                <p className="subtitle">
                    Failure mode aggregates require an analysis index. Run{" "}
                    <code>pnpm analyze</code> after deep-pipeline runs with a
                    Counterfactual step.
                </p>
                <Link href="/status" className="button">
                    Check data status
                </Link>
            </section>
        );
    }

    const summaries = buildFailureModeSummaries(index);
    const selectedMode = (params.mode ?? "").trim();
    const selectedRuns = selectedMode
        ? listRunsForFailureMode(index, selectedMode)
        : [];

    return (
        <section className="stack">
            <div>
                <h1 className="title">Counterfactual failure modes</h1>
                <p className="subtitle">
                    Top counterfactual failure modes from {index.totals.runs}{" "}
                    indexed runs. Select a mode to see which traces reported it
                    as the primary failure mode.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/" className="button secondary">
                        Overview
                    </Link>
                    <Link href="/issues" className="button secondary">
                        Critique issues
                    </Link>
                    <Link href="/drift" className="button secondary">
                        Confidence drift
                    </Link>
                </div>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Failure modes</h2>
                {summaries.length === 0 ? (
                    <p className="muted">
                        No counterfactual failure modes in the current index.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            {
                                key: "mode",
                                label: "Failure mode",
                                cellClass: "cell-question",
                                render: (row) => (
                                    <TruncateText
                                        text={(row as { mode: string }).mode}
                                        maxLength={96}
                                    />
                                ),
                            },
                            { key: "runCount", label: "Runs (top mode)" },
                            {
                                key: "explore",
                                label: "Explore",
                                render: (row) => {
                                    const mode = (row as { mode: string }).mode;
                                    const active =
                                        mode.toLowerCase() ===
                                        selectedMode.toLowerCase();
                                    return (
                                        <Link
                                            href={`/counterfactual?mode=${encodeURIComponent(mode)}`}
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
                        getRowId={(row) => (row as { mode: string }).mode}
                        renderCardActions={(row) => (
                            <Link
                                href={`/counterfactual?mode=${encodeURIComponent((row as { mode: string }).mode)}`}
                                className="button"
                            >
                                View runs
                            </Link>
                        )}
                    />
                )}
            </div>

            {selectedMode ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Runs with this top mode</h2>
                    <p className="small muted" style={{ marginBottom: 12 }}>
                        {selectedMode}
                    </p>
                    {selectedRuns.length === 0 ? (
                        <p className="muted">
                            No runs in the current index list this as their top
                            counterfactual failure mode.
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
                                            maxLength={72}
                                            className="muted"
                                        />
                                    ),
                                },
                                { key: "model", label: "Model" },
                                {
                                    key: "failureModeCount",
                                    label: "Modes found",
                                    helpKey: "counterfactualFailureModeCount",
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
                        <Link
                            href="/counterfactual"
                            className="button secondary"
                        >
                            Clear selection
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <p className="muted" style={{ margin: 0 }}>
                        Pick a failure mode above to list contributing run
                        traces.
                    </p>
                </div>
            )}
        </section>
    );
}
