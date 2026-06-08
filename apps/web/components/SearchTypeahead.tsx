"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearch } from "./SearchProvider";

type SearchApiResult = {
    query: string;
    totals: { runs: number; benchmarks: number; questions: number };
    runs: Array<{
        id: string;
        question: string;
        model: string;
        preset: string;
    }>;
    benchmarks: Array<{
        id: string;
        question: string;
        model: string;
        runs: number;
    }>;
    questions: Array<{
        question: string;
        runCount: number;
        benchmarkCount: number;
    }>;
};

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
    }
    return target.isContentEditable;
}

export function SearchTypeahead() {
    const { open, openSearch, closeSearch } = useSearch();
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SearchApiResult | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const close = useCallback(() => {
        closeSearch();
        setQuery("");
        setResult(null);
        setLoading(false);
    }, [closeSearch]);

    const fetchResults = useCallback(async (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
            setResult(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `/api/search?q=${encodeURIComponent(trimmed)}&limit=6`,
            );
            if (!response.ok) {
                setResult(null);
                return;
            }
            const data = (await response.json()) as SearchApiResult;
            setResult(data);
        } catch {
            setResult(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && open) {
                event.preventDefault();
                close();
                return;
            }
            if (
                event.key !== "/" ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey
            ) {
                return;
            }
            if (isEditableTarget(event.target)) return;
            event.preventDefault();
            openSearch();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [close, open, openSearch]);

    useEffect(() => {
        if (!open) return;
        const frame = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void fetchResults(query);
        }, 200);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [fetchResults, open, query]);

    if (!open) return null;

    const hasResults =
        result &&
        (result.runs.length > 0 ||
            result.benchmarks.length > 0 ||
            result.questions.length > 0);

    return (
        <div
            className="search-overlay"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
            }}
        >
            <div
                className="search-dialog card"
                role="dialog"
                aria-modal="true"
                aria-label="Search artifacts"
            >
                <form method="get" action="/search" onSubmit={() => close()}>
                    <div className="search-dialog-input-row">
                        <input
                            ref={inputRef}
                            name="q"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Question, answer, run ID, model..."
                            className="input search-dialog-input"
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <button type="submit" className="button">
                            Search
                        </button>
                        <button
                            type="button"
                            className="button secondary"
                            onClick={close}
                        >
                            Esc
                        </button>
                    </div>
                </form>

                <div className="search-dialog-results">
                    {loading ? (
                        <p className="small muted">Searching…</p>
                    ) : !query.trim() ? (
                        <p className="small muted">
                            Type to search runs, benchmarks, and questions.
                            Press <kbd>/</kbd> anytime to reopen.
                        </p>
                    ) : !hasResults ? (
                        <p className="small muted">
                            No matches for &ldquo;{query.trim()}&rdquo;.
                        </p>
                    ) : (
                        <>
                            {result!.runs.length > 0 ? (
                                <section className="search-dialog-section">
                                    <h3 className="search-dialog-section-title">
                                        Runs ({result!.totals.runs})
                                    </h3>
                                    <ul className="search-dialog-list">
                                        {result!.runs.map((run) => (
                                            <li key={run.id}>
                                                <Link
                                                    href={`/runs/${run.id}`}
                                                    className="search-dialog-item"
                                                    onClick={close}
                                                >
                                                    <span className="search-dialog-item-title">
                                                        {run.question}
                                                    </span>
                                                    <span className="search-dialog-item-meta">
                                                        {run.id} · {run.model} ·{" "}
                                                        {run.preset}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ) : null}

                            {result!.benchmarks.length > 0 ? (
                                <section className="search-dialog-section">
                                    <h3 className="search-dialog-section-title">
                                        Benchmarks ({result!.totals.benchmarks})
                                    </h3>
                                    <ul className="search-dialog-list">
                                        {result!.benchmarks.map((benchmark) => (
                                            <li key={benchmark.id}>
                                                <Link
                                                    href={`/benchmarks/${benchmark.id}`}
                                                    className="search-dialog-item"
                                                    onClick={close}
                                                >
                                                    <span className="search-dialog-item-title">
                                                        {benchmark.question}
                                                    </span>
                                                    <span className="search-dialog-item-meta">
                                                        {benchmark.id} ·{" "}
                                                        {benchmark.runs} runs ·{" "}
                                                        {benchmark.model}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ) : null}

                            {result!.questions.length > 0 ? (
                                <section className="search-dialog-section">
                                    <h3 className="search-dialog-section-title">
                                        Questions ({result!.totals.questions})
                                    </h3>
                                    <ul className="search-dialog-list">
                                        {result!.questions.map((group) => (
                                            <li key={group.question}>
                                                <Link
                                                    href={`/questions/view?question=${encodeURIComponent(group.question)}`}
                                                    className="search-dialog-item"
                                                    onClick={close}
                                                >
                                                    <span className="search-dialog-item-title">
                                                        {group.question}
                                                    </span>
                                                    <span className="search-dialog-item-meta">
                                                        {group.runCount} runs ·{" "}
                                                        {group.benchmarkCount}{" "}
                                                        benchmarks
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ) : null}

                            {result!.query ? (
                                <div className="search-dialog-footer">
                                    <Link
                                        href={`/search?q=${encodeURIComponent(result!.query)}`}
                                        className="button secondary"
                                        onClick={close}
                                    >
                                        View all results
                                    </Link>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
