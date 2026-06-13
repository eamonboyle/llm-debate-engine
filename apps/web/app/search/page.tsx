import type { Metadata } from "next";
import Link from "next/link";
import { ModelFilterSelect } from "../../components/ModelFilterSelect";
import { PresetFilterSelect } from "../../components/PresetFilterSelect";
import {
    ResponsiveTable,
    TruncateText,
} from "../../components/ResponsiveTable";
import { collectArtifactFacets } from "../../lib/artifactFacets";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../../lib/data";
import { buildQueryString } from "../../lib/listPagination";
import { searchArtifacts, questionHubHref } from "../../lib/globalSearch";

export const metadata: Metadata = {
    title: "Search",
};

type SearchParams = {
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};

function hasActiveSearch(params: SearchParams): boolean {
    return Boolean(
        (params.q ?? "").trim() ||
            params.model ||
            params.preset ||
            params.fast ||
            params.from ||
            params.to,
    );
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const params = await searchParams;
    const query = (params.q ?? "").trim();
    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);
    const { models, presets } = collectArtifactFacets(runs, benchmarks);
    const active = hasActiveSearch(params);

    if (!active) {
        return (
            <section className="stack">
                <div>
                    <h1 className="title">Search artifacts</h1>
                    <p className="subtitle">
                        Search across run traces, benchmarks, and research
                        questions in one place. Press{" "}
                        <kbd className="kbd-hint">/</kbd> from any page to open
                        search.
                    </p>
                </div>
                <form className="card" method="get" action="/search">
                    <div className="filter-grid">
                        <input
                            id="search-q"
                            name="q"
                            className="input"
                            placeholder="Question, answer, run ID, model..."
                            autoFocus
                        />
                        <ModelFilterSelect
                            models={models}
                            defaultValue=""
                            listId="search-model-filter-options"
                        />
                        <PresetFilterSelect presets={presets} defaultValue="" />
                        <select name="fast" defaultValue="" className="input">
                            <option value="">Fast mode: any</option>
                            <option value="true">Fast only</option>
                            <option value="false">Non-fast only</option>
                        </select>
                        <input
                            type="datetime-local"
                            name="from"
                            className="input"
                            title="Created at or after"
                        />
                        <input
                            type="datetime-local"
                            name="to"
                            className="input"
                            title="Created at or before"
                        />
                    </div>
                    <div className="filter-actions" style={{ marginTop: 12 }}>
                        <button type="submit" className="button">
                            Search
                        </button>
                    </div>
                </form>
                <p className="small muted">
                    {runs.length} runs · {benchmarks.length} benchmarks in the
                    store.
                </p>
            </section>
        );
    }

    const results = searchArtifacts(runs, benchmarks, query, {
        filters: {
            model: params.model,
            preset: params.preset,
            fast: params.fast,
            from: params.from,
            to: params.to,
        },
    });
    const encodedQ = encodeURIComponent(query);
    const hasResults =
        results.totals.runs > 0 ||
        results.totals.benchmarks > 0 ||
        results.totals.questions > 0;
    const filterSummary = [
        query ? `“${query}”` : null,
        params.model ? `model: ${params.model}` : null,
        params.preset ? `preset: ${params.preset}` : null,
        params.fast === "true"
            ? "fast mode"
            : params.fast === "false"
              ? "non-fast"
              : null,
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <section className="stack">
            <div>
                <h1 className="title">Search results</h1>
                <p className="subtitle">
                    Matches for {filterSummary || "your filters"} across the
                    artifact store.
                </p>
            </div>

            <form className="card" method="get" action="/search">
                <div className="filter-grid">
                    <input
                        name="q"
                        className="input"
                        defaultValue={query}
                        placeholder="Question, answer, run ID, model..."
                    />
                    <ModelFilterSelect
                        models={models}
                        defaultValue={params.model ?? ""}
                        listId="search-model-filter-options-results"
                    />
                    <PresetFilterSelect
                        presets={presets}
                        defaultValue={params.preset ?? ""}
                    />
                    <select
                        name="fast"
                        defaultValue={params.fast ?? ""}
                        className="input"
                    >
                        <option value="">Fast mode: any</option>
                        <option value="true">Fast only</option>
                        <option value="false">Non-fast only</option>
                    </select>
                    <input
                        type="datetime-local"
                        name="from"
                        defaultValue={params.from ?? ""}
                        className="input"
                        title="Created at or after"
                    />
                    <input
                        type="datetime-local"
                        name="to"
                        defaultValue={params.to ?? ""}
                        className="input"
                        title="Created at or before"
                    />
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Search again
                    </button>
                    <Link href="/search" className="button secondary">
                        Clear
                    </Link>
                </div>
            </form>

            <div className="grid-4">
                <div className="card">
                    <div className="small muted">Runs</div>
                    <div style={{ marginTop: 6, fontSize: "1.25rem" }}>
                        {results.totals.runs}
                    </div>
                    {results.totals.runs > 0 ? (
                        <Link
                            href={`/runs${buildQueryString(params, { q: query || undefined })}`}
                            className="small"
                            style={{ display: "inline-block", marginTop: 8 }}
                        >
                            View all runs →
                        </Link>
                    ) : null}
                </div>
                <div className="card">
                    <div className="small muted">Benchmarks</div>
                    <div style={{ marginTop: 6, fontSize: "1.25rem" }}>
                        {results.totals.benchmarks}
                    </div>
                    {results.totals.benchmarks > 0 ? (
                        <Link
                            href={`/benchmarks${buildQueryString(params, { q: query || undefined })}`}
                            className="small"
                            style={{ display: "inline-block", marginTop: 8 }}
                        >
                            View all benchmarks →
                        </Link>
                    ) : null}
                </div>
                <div className="card">
                    <div className="small muted">Questions</div>
                    <div style={{ marginTop: 6, fontSize: "1.25rem" }}>
                        {results.totals.questions}
                    </div>
                    {results.totals.questions > 0 && query ? (
                        <Link
                            href={`/questions?q=${encodedQ}`}
                            className="small"
                            style={{ display: "inline-block", marginTop: 8 }}
                        >
                            View questions →
                        </Link>
                    ) : null}
                </div>
                <div className="card">
                    <div className="small muted">Showing per section</div>
                    <div style={{ marginTop: 6, fontSize: "1.25rem" }}>
                        up to 12
                    </div>
                </div>
            </div>

            {!hasResults ? (
                <div className="card">
                    <p className="muted">
                        No runs, benchmarks, or questions matched your search.
                        Try a shorter phrase, broaden filters, or check
                        spelling.
                    </p>
                </div>
            ) : null}

            {results.questions.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Questions</h2>
                    <ResponsiveTable
                        columns={[
                            {
                                key: "question",
                                label: "Question",
                                cellClass: "cell-question",
                                render: (row) => (
                                    <Link
                                        href={questionHubHref(
                                            (row as { question: string })
                                                .question,
                                        )}
                                    >
                                        <TruncateText
                                            text={
                                                (row as { question: string })
                                                    .question
                                            }
                                            maxLength={90}
                                        />
                                    </Link>
                                ),
                            },
                            { key: "runCount", label: "Runs" },
                            { key: "benchmarkCount", label: "Benchmarks" },
                        ]}
                        data={results.questions}
                        getRowId={(row) =>
                            (row as { question: string }).question
                        }
                    />
                </div>
            ) : null}

            {results.runs.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Runs</h2>
                    <ResponsiveTable
                        columns={[
                            { key: "id", label: "ID" },
                            {
                                key: "question",
                                label: "Question",
                                hideOnMobile: true,
                                render: (row) => (
                                    <TruncateText
                                        text={
                                            (row as { question: string })
                                                .question
                                        }
                                        maxLength={70}
                                        className="muted"
                                    />
                                ),
                            },
                            { key: "model", label: "Model" },
                            {
                                key: "open",
                                label: "Open",
                                render: (row) => (
                                    <Link
                                        href={`/runs/${(row as { id: string }).id}`}
                                    >
                                        Trace
                                    </Link>
                                ),
                            },
                        ]}
                        data={results.runs}
                        getRowId={(row) => (row as { id: string }).id}
                    />
                </div>
            ) : null}

            {results.benchmarks.length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Benchmarks</h2>
                    <ResponsiveTable
                        columns={[
                            { key: "id", label: "ID" },
                            {
                                key: "entropy",
                                label: "Entropy",
                                render: (row) =>
                                    (
                                        row as { entropy: number }
                                    ).entropy.toFixed(3),
                            },
                            { key: "modeCount", label: "Modes" },
                            {
                                key: "open",
                                label: "Open",
                                render: (row) => (
                                    <Link
                                        href={`/benchmarks/${(row as { id: string }).id}`}
                                    >
                                        Details
                                    </Link>
                                ),
                            },
                        ]}
                        data={results.benchmarks}
                        getRowId={(row) => (row as { id: string }).id}
                    />
                </div>
            ) : null}
        </section>
    );
}
