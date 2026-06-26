"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
    buildFilterViewHref,
    deleteSavedFilterView,
    readSavedFilterViews,
    saveFilterView,
    type SavedFilterView,
    type SavedFilterViewScope,
} from "../lib/savedFilterViews";

type SavedFilterViewsMenuProps = {
    scope: SavedFilterViewScope;
    basePath: string;
    currentParams: Record<string, string | undefined>;
};

function summarizeParams(params: Record<string, string>): string {
    const parts = Object.entries(params).map(([key, value]) => `${key}=${value}`);
    if (parts.length === 0) return "no filters";
    const joined = parts.join(", ");
    return joined.length > 72 ? `${joined.slice(0, 69)}…` : joined;
}

export function SavedFilterViewsMenu({
    scope,
    basePath,
    currentParams,
}: SavedFilterViewsMenuProps) {
    const menuId = useId();
    const [open, setOpen] = useState(false);
    const [views, setViews] = useState<SavedFilterView[]>([]);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);

    const activeParams = Object.fromEntries(
        Object.entries(currentParams).filter(
            (entry): entry is [string, string] =>
                typeof entry[1] === "string" && entry[1].length > 0,
        ),
    );
    const hasActiveFilters = Object.keys(activeParams).length > 0;

    useEffect(() => {
        const refresh = () => setViews(readSavedFilterViews(scope));
        refresh();
        window.addEventListener("saved-filter-views-updated", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("saved-filter-views-updated", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, [scope]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);

    const handleSave = () => {
        setError("");
        if (!hasActiveFilters) {
            setError("Apply at least one filter before saving.");
            return;
        }
        try {
            saveFilterView(scope, name, activeParams);
            setName("");
            setViews(readSavedFilterViews(scope));
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Could not save filter view.",
            );
        }
    };

    return (
        <div className="saved-filter-views" ref={rootRef}>
            <button
                type="button"
                className="button secondary"
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-controls={menuId}
                onClick={() => setOpen((value) => !value)}
            >
                Saved filters
                {views.length > 0 ? (
                    <span className="saved-filter-views-count">
                        {views.length}
                    </span>
                ) : null}
            </button>
            {open ? (
                <div
                    id={menuId}
                    className="saved-filter-views-panel card"
                    role="dialog"
                    aria-label="Saved filter views"
                >
                    <div className="saved-filter-views-save">
                        <input
                            className="input"
                            placeholder="Name this filter view"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleSave();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="button"
                            onClick={handleSave}
                            disabled={!hasActiveFilters}
                        >
                            Save current
                        </button>
                    </div>
                    {error ? (
                        <p className="small" style={{ color: "var(--danger)" }}>
                            {error}
                        </p>
                    ) : null}
                    {!hasActiveFilters ? (
                        <p className="small muted">
                            Apply filters on this page, then save them for
                            one-click reuse.
                        </p>
                    ) : (
                        <p className="small muted">
                            Current: {summarizeParams(activeParams)}
                        </p>
                    )}
                    {views.length === 0 ? (
                        <p className="small muted">No saved filter views yet.</p>
                    ) : (
                        <ul className="saved-filter-views-list">
                            {views.map((view) => (
                                <li key={view.id}>
                                    <Link
                                        href={buildFilterViewHref(
                                            basePath,
                                            view.params,
                                        )}
                                        className="saved-filter-views-item"
                                        onClick={() => setOpen(false)}
                                    >
                                        <span className="saved-filter-views-name">
                                            {view.name}
                                        </span>
                                        <span className="small muted">
                                            {summarizeParams(view.params)}
                                        </span>
                                    </Link>
                                    <button
                                        type="button"
                                        className="saved-filter-views-delete"
                                        aria-label={`Delete ${view.name}`}
                                        onClick={() => {
                                            deleteSavedFilterView(view.id);
                                            setViews(
                                                readSavedFilterViews(scope),
                                            );
                                        }}
                                    >
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    );
}
