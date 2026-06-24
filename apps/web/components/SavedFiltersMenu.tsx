"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
    clearSavedFilters,
    readSavedFilters,
    removeSavedFilter,
    type SavedFilterEntry,
} from "../lib/savedFilters";

function formatSavedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
}

export function SavedFiltersMenu() {
    const menuId = useId();
    const [open, setOpen] = useState(false);
    const [entries, setEntries] = useState<SavedFilterEntry[]>([]);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const refresh = () => setEntries(readSavedFilters());
        refresh();
        window.addEventListener("saved-filters-updated", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("saved-filters-updated", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, []);

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

    return (
        <div className="nav-recent" ref={rootRef}>
            <button
                type="button"
                className="nav-recent-trigger"
                aria-expanded={open}
                aria-haspopup="menu"
                aria-controls={menuId}
                onClick={() => setOpen((value) => !value)}
            >
                <span aria-hidden>★</span>
                <span>Saved</span>
                {entries.length > 0 ? (
                    <span className="nav-recent-count">{entries.length}</span>
                ) : null}
            </button>
            {open ? (
                <div
                    id={menuId}
                    className="nav-recent-menu"
                    role="menu"
                    aria-label="Saved filter bookmarks"
                >
                    {entries.length === 0 ? (
                        <p className="nav-recent-empty">
                            Apply filters on a list page, then use Save filters
                            to bookmark the view.
                        </p>
                    ) : (
                        <ul className="nav-recent-list">
                            {entries.map((entry) => (
                                <li key={entry.id}>
                                    <Link
                                        href={entry.href}
                                        className="nav-recent-item"
                                        role="menuitem"
                                        onClick={() => setOpen(false)}
                                    >
                                        <span className="nav-recent-kind">
                                            filter
                                        </span>
                                        <span className="nav-recent-title">
                                            {entry.label}
                                        </span>
                                        <span className="nav-recent-meta">
                                            {formatSavedAt(entry.savedAt)}
                                        </span>
                                    </Link>
                                    <button
                                        type="button"
                                        className="nav-recent-clear"
                                        style={{ marginTop: 4 }}
                                        onClick={() =>
                                            removeSavedFilter(entry.id)
                                        }
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {entries.length > 0 ? (
                        <button
                            type="button"
                            className="nav-recent-clear"
                            onClick={() => {
                                clearSavedFilters();
                                setEntries([]);
                            }}
                        >
                            Clear saved filters
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
