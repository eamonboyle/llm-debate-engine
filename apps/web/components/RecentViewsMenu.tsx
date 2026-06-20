"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
    clearRecentViews,
    readRecentViews,
    type RecentViewEntry,
} from "../lib/recentViews";

function formatViewedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
}

export function RecentViewsMenu() {
    const menuId = useId();
    const [open, setOpen] = useState(false);
    const [entries, setEntries] = useState<RecentViewEntry[]>([]);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const refresh = () => setEntries(readRecentViews());
        refresh();
        window.addEventListener("recent-views-updated", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("recent-views-updated", refresh);
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
                <span aria-hidden>◷</span>
                <span>Recent</span>
                {entries.length > 0 ? (
                    <span className="nav-recent-count">{entries.length}</span>
                ) : null}
            </button>
            {open ? (
                <div
                    id={menuId}
                    className="nav-recent-menu"
                    role="menu"
                    aria-label="Recently viewed artifacts"
                >
                    {entries.length === 0 ? (
                        <p className="nav-recent-empty">
                            Open a run or benchmark trace to build your recent
                            list.
                        </p>
                    ) : (
                        <ul className="nav-recent-list">
                            {entries.map((entry) => (
                                <li key={`${entry.kind}:${entry.id}`}>
                                    <Link
                                        href={entry.href}
                                        className="nav-recent-item"
                                        role="menuitem"
                                        onClick={() => setOpen(false)}
                                    >
                                        <span className="nav-recent-kind">
                                            {entry.kind}
                                        </span>
                                        <span className="nav-recent-title">
                                            {entry.title}
                                        </span>
                                        <span className="nav-recent-meta">
                                            {entry.id.slice(-18)} ·{" "}
                                            {formatViewedAt(entry.viewedAt)}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    {entries.length > 0 ? (
                        <button
                            type="button"
                            className="nav-recent-clear"
                            onClick={() => {
                                clearRecentViews();
                                setEntries([]);
                            }}
                        >
                            Clear recent
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
