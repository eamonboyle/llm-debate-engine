import type { Metadata } from "next";
import Link from "next/link";
import { InsightFilterCard } from "../../components/InsightFilterCard";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { loadAnalysisIndex, loadRunArtifacts } from "../../lib/data";
import { IssueSeverityChart } from "../../components/charts/IssueSeverityChart";
import {
    applyIndexFilters,
    collectIndexFacets,
    hasActiveIndexFilters,
} from "../../lib/indexFilters";
import {
    buildIssueTypeSummaries,
    listRunsForIssueType,
} from "../../lib/issueExplorer";
import {
    buildIssueTypeSummariesFromRuns,
    listRunsForIssueTypeFromArtifacts,
} from "../../lib/issueExplorerByAgent";
import {
    critiqueAgentFilterLabel,
    parseCritiqueAgentFilter,
    type CritiqueAgentFilter,
} from "../../lib/critiqueAgentFilter";
import { extractCritiqueNotesForRuns } from "../../lib/critiqueNotes";
import { buildQueryString } from "../../lib/listPagination";

export const metadata: Metadata = {
    title: "Critique issues",
};

type IssuesSearchParams = {
    type?: string;
    agent?: string;
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};

function agentFilterHref(
    params: IssuesSearchParams,
    agent: CritiqueAgentFilter,
): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (
            typeof value === "string" &&
            value.length > 0 &&
            key !== "agent"
        ) {
            query.set(key, value);
        }
    }
    if (agent !== "all") {
        query.set("agent", agent);
    }
    const suffix = query.toString();
    return suffix ? `/issues?${suffix}` : "/issues";
}

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

    const { models, presets } = collectIndexFacets(index);
    const filteredIndex = applyIndexFilters(index, params);
    const agentFilter = parseCritiqueAgentFilter(params.agent);
    const useAgentFilter = agentFilter !== "all";
    const filteredRunIds = new Set(filteredIndex.runs.map((run) => run.id));
    const runArtifacts = useAgentFilter ? await loadRunArtifacts() : [];
    const scopedArtifacts = useAgentFilter
        ? runArtifacts.filter((run) => filteredRunIds.has(run.id))
        : [];

    const summaries = useAgentFilter
        ? buildIssueTypeSummariesFromRuns(scopedArtifacts, agentFilter)
        : buildIssueTypeSummaries(filteredIndex, {
              useIndexedSeverity:
                  !hasActiveIndexFilters(params) &&
                  Boolean(index.aggregates.issueSeverityByType?.length),
          });
    const selectedType = (params.type ?? "").trim();
    const selectedRuns = selectedType
        ? useAgentFilter
            ? listRunsForIssueTypeFromArtifacts(
                  scopedArtifacts,
                  selectedType,
                  agentFilter,
              )
            : listRunsForIssueType(filteredIndex, selectedType)
        : [];
    const critiqueNotes = selectedType
        ? extractCritiqueNotesForRuns(
              useAgentFilter ? scopedArtifacts : await loadRunArtifacts(),
              selectedType,
              new Set(selectedRuns.map((row) => row.runId)),
              agentFilter,
          )
        : [];

    return (
        <section className="stack">
            <div>
                <h1 className="title">Critique issues</h1>
                <p className="subtitle">
                    Critique issue types from Skeptic and Red team agents
                    across {filteredIndex.totals.runs} indexed run
                    {filteredIndex.totals.runs === 1 ? "" : "s"}
                    {filteredIndex.totals.runs !== index.totals.runs
                        ? ` (${index.totals.runs} total)`
                        : ""}
                    {useAgentFilter ? ` · ${critiqueAgentFilterLabel(agentFilter)}` : ""}
                    . Select a type to see which traces contributed.
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

            <InsightFilterCard
                action="/issues"
                models={models}
                presets={presets}
                params={params}
                totalRuns={index.totals.runs}
                filteredRuns={filteredIndex.totals.runs}
                preserveKeys={["type", "agent"]}
            />

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Critique agent</h2>
                <p className="small muted" style={{ marginTop: 0 }}>
                    Filter issue counts by which critique agent raised them.
                    Deep presets include both Skeptic and Red team steps.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    {(
                        [
                            "all",
                            "skeptic",
                            "redteam",
                        ] as CritiqueAgentFilter[]
                    ).map((filter) => {
                        const active = agentFilter === filter;
                        return (
                            <Link
                                key={filter}
                                href={agentFilterHref(params, filter)}
                                className={`button ${active ? "" : "secondary"}`}
                                aria-current={active ? "page" : undefined}
                            >
                                {critiqueAgentFilterLabel(filter)}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {summaries.length > 0 ? (
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <a
                        href={`/api/issues${buildQueryString(params, {})}`}
                        className="button secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                    >
                        Export JSON
                    </a>
                    <a
                        href={`/api/issues${buildQueryString(params, {})}&format=csv`}
                        className="button secondary"
                        download="critique-issues.csv"
                    >
                        Export CSV
                    </a>
                </div>
            ) : null}

            <div className="card">
                <IssueSeverityChart rows={summaries} />
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
                                key: "avgSeverity",
                                label: "Avg severity",
                                helpKey: "avgSeverity",
                                hideOnMobile: true,
                                render: (row) =>
                                    typeof (row as { avgSeverity?: number })
                                        .avgSeverity === "number"
                                        ? (
                                              row as { avgSeverity: number }
                                          ).avgSeverity.toFixed(2)
                                        : "—",
                            },
                            {
                                key: "maxSeverity",
                                label: "Max severity",
                                helpKey: "maxSeverity",
                                hideOnMobile: true,
                            },
                            {
                                key: "explore",
                                label: "Explore",
                                render: (row) => {
                                    const type = (row as { type: string }).type;
                                    const active =
                                        type.toLowerCase() ===
                                        selectedType.toLowerCase();
                                    const query = new URLSearchParams();
                                    for (const [key, value] of Object.entries(
                                        params,
                                    )) {
                                        if (
                                            typeof value === "string" &&
                                            value.length > 0 &&
                                            key !== "type"
                                        ) {
                                            query.set(key, value);
                                        }
                                    }
                                    query.set("type", type);
                                    return (
                                        <Link
                                            href={`/issues?${query.toString()}`}
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
                            const query = new URLSearchParams();
                            for (const [key, value] of Object.entries(params)) {
                                if (
                                    typeof value === "string" &&
                                    value.length > 0 &&
                                    key !== "type"
                                ) {
                                    query.set(key, value);
                                }
                            }
                            query.set("type", type);
                            return (
                                <Link
                                    href={`/issues?${query.toString()}`}
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
                        <Link
                            href={(() => {
                                const query = new URLSearchParams();
                                for (const [key, value] of Object.entries(
                                    params,
                                )) {
                                    if (
                                        key !== "type" &&
                                        typeof value === "string" &&
                                        value.length > 0
                                    ) {
                                        query.set(key, value);
                                    }
                                }
                                const suffix = query.toString();
                                return suffix ? `/issues?${suffix}` : "/issues";
                            })()}
                            className="button secondary"
                        >
                            Clear selection
                        </Link>
                    </div>
                </div>
            ) : null}

            {selectedType && critiqueNotes.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>
                        Critique notes for &ldquo;{selectedType}&rdquo;
                    </h2>
                    <p className="small muted" style={{ marginTop: 0 }}>
                        Verbatim critique notes from run traces —{" "}
                        {critiqueNotes.length} note
                        {critiqueNotes.length === 1 ? "" : "s"} across{" "}
                        {selectedRuns.length} run
                        {selectedRuns.length === 1 ? "" : "s"}.
                        {useAgentFilter
                            ? ` Showing ${critiqueAgentFilterLabel(agentFilter).toLowerCase()}.`
                            : ""}
                    </p>
                    <ResponsiveTable
                        columns={[
                            {
                                key: "severity",
                                label: "Severity",
                                render: (row) =>
                                    (row as { severity: number }).severity,
                            },
                            {
                                key: "note",
                                label: "Note",
                                cellClass: "cell-question",
                                render: (row) => (
                                    <TruncateText
                                        text={(row as { note: string }).note}
                                        maxLength={160}
                                    />
                                ),
                            },
                            {
                                key: "agentName",
                                label: "Agent",
                                hideOnMobile: true,
                            },
                            {
                                key: "runId",
                                label: "Run",
                                hideOnMobile: true,
                            },
                            {
                                key: "open",
                                label: "Open",
                                render: (row) => (
                                    <Link href={(row as { href: string }).href}>
                                        Trace
                                    </Link>
                                ),
                            },
                        ]}
                        data={critiqueNotes}
                        getRowId={(row) => {
                            const r = row as {
                                runId: string;
                                agentName: string;
                                severity: number;
                                note: string;
                            };
                            return `${r.runId}-${r.agentName}-${r.severity}-${r.note.slice(0, 40)}`;
                        }}
                        renderCardActions={(row) => (
                            <Link
                                href={(row as { href: string }).href}
                                className="button"
                            >
                                View trace
                            </Link>
                        )}
                    />
                </div>
            ) : selectedType ? null : (
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
