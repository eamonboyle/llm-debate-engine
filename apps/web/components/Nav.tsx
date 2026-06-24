"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { openGlobalSearch } from "../lib/openSearch";
import { RecentViewsMenu } from "./RecentViewsMenu";
import { SavedFiltersMenu } from "./SavedFiltersMenu";

type NavLeaf = {
    href: string;
    label: string;
    hint?: string;
};

type NavEntry =
    | { type: "link"; href: string; label: string }
    | { type: "group"; label: string; items: NavLeaf[] };

const NAV_ENTRIES: NavEntry[] = [
    { type: "link", href: "/", label: "Overview" },
    {
        type: "link",
        href: "/search",
        label: "Search",
    },
    {
        type: "group",
        label: "Explore",
        items: [
            {
                href: "/questions",
                label: "Questions",
                hint: "Grouped by research topic",
            },
            {
                href: "/catalog",
                label: "Catalog",
                hint: "Models and presets",
            },
            {
                href: "/pipeline",
                label: "Pipeline",
                hint: "Presets and agents",
            },
            {
                href: "/agents",
                label: "Agent stats",
                hint: "Step counts per agent",
            },
        ],
    },
    {
        type: "group",
        label: "Runs",
        items: [
            {
                href: "/activity",
                label: "Activity",
                hint: "Chronological timeline",
            },
            {
                href: "/runs",
                label: "All runs",
                hint: "Filter and browse traces",
            },
            {
                href: "/runs/compare",
                label: "Compare runs",
                hint: "Side-by-side metrics",
            },
        ],
    },
    {
        type: "group",
        label: "Benchmarks",
        items: [
            {
                href: "/benchmarks",
                label: "All benchmarks",
                hint: "Divergence and modes",
            },
            {
                href: "/benchmarks/compare",
                label: "Compare benchmarks",
                hint: "Stability deltas",
            },
        ],
    },
    {
        type: "group",
        label: "Insights",
        items: [
            {
                href: "/leaderboard",
                label: "Leaderboard",
                hint: "Per-model run metrics",
            },
            {
                href: "/leaderboard/compare",
                label: "Compare models",
                hint: "Side-by-side model averages",
            },
            {
                href: "/evidence",
                label: "Evidence planning",
                hint: "EvidencePlanner risk levels",
            },
            {
                href: "/timing",
                label: "Pipeline timing",
                hint: "Per-agent step durations",
            },
            {
                href: "/presets",
                label: "Preset leaderboard",
                hint: "Per-pipeline preset metrics",
            },
            {
                href: "/presets/compare",
                label: "Compare presets",
                hint: "Side-by-side preset averages",
            },
            {
                href: "/quality",
                label: "Quality insights",
                hint: "Judge rubric scores",
            },
            {
                href: "/issues",
                label: "Critique issues",
                hint: "Skeptic issue breakdown",
            },
            {
                href: "/counterfactual",
                label: "Counterfactual",
                hint: "Failure mode explorer",
            },
            {
                href: "/drift",
                label: "Confidence drift",
                hint: "Stage-to-stage deltas",
            },
            {
                href: "/outliers",
                label: "Outliers",
                hint: "Low-similarity benchmark runs",
            },
            {
                href: "/similarity",
                label: "Similarity",
                hint: "Cross-benchmark pairwise explorer",
            },
            {
                href: "/judgments",
                label: "Judge verdicts",
                hint: "Searchable judge narratives",
            },
            {
                href: "/report",
                label: "Report",
                hint: "Markdown analysis export",
            },
            {
                href: "/glossary",
                label: "Glossary",
                hint: "Metric definitions",
            },
            {
                href: "/status",
                label: "Data status",
                hint: "Artifact health check",
            },
        ],
    },
];

function isLeafActive(pathname: string, href: string): boolean {
    if (href === "/") return pathname === "/";
    if (pathname === href) return true;
    if (!pathname.startsWith(href + "/")) return false;

    if (href === "/runs" && pathname.startsWith("/runs/compare")) {
        return false;
    }
    if (href === "/benchmarks" && pathname.startsWith("/benchmarks/compare")) {
        return false;
    }
    if (href === "/presets" && pathname.startsWith("/presets/compare")) {
        return false;
    }
    if (
        href === "/leaderboard" &&
        pathname.startsWith("/leaderboard/compare")
    ) {
        return false;
    }
    return true;
}

function isGroupActive(pathname: string, items: NavLeaf[]): boolean {
    return items.some((item) => isLeafActive(pathname, item.href));
}

function NavChevron({ open }: { open: boolean }) {
    return (
        <svg
            className={`nav-chevron ${open ? "nav-chevron-open" : ""}`}
            width="10"
            height="10"
            viewBox="0 0 10 10"
            aria-hidden="true"
        >
            <path
                d="M2 3.5L5 6.5L8 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function NavLeafLink({
    item,
    pathname,
    onNavigate,
    className = "nav-link",
}: {
    item: NavLeaf;
    pathname: string;
    onNavigate?: () => void;
    className?: string;
}) {
    const active = isLeafActive(pathname, item.href);
    return (
        <Link
            href={item.href}
            className={`${className} ${active ? "nav-link-active" : ""}`}
            onClick={onNavigate}
        >
            <span className="nav-leaf-label">{item.label}</span>
            {item.hint ? (
                <span className="nav-leaf-hint">{item.hint}</span>
            ) : null}
        </Link>
    );
}

const HOVER_CLOSE_DELAY_MS = 280;

function prefersHoverOpen() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function NavDropdown({
    label,
    items,
    pathname,
    onNavigate,
}: {
    label: string;
    items: NavLeaf[];
    pathname: string;
    onNavigate?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const active = isGroupActive(pathname, items);

    const clearCloseTimer = () => {
        if (closeTimerRef.current != null) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    };

    const openMenu = () => {
        clearCloseTimer();
        setOpen(true);
    };

    const scheduleClose = () => {
        clearCloseTimer();
        if (!prefersHoverOpen()) return;
        closeTimerRef.current = setTimeout(() => {
            setOpen(false);
            closeTimerRef.current = null;
        }, HOVER_CLOSE_DELAY_MS);
    };

    useEffect(() => {
        return () => clearCloseTimer();
    }, []);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                clearCloseTimer();
                setOpen(false);
            }
        };
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                clearCloseTimer();
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onEscape);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onEscape);
        };
    }, [open]);

    useEffect(() => {
        clearCloseTimer();
        setOpen(false);
    }, [pathname]);

    return (
        <div
            ref={rootRef}
            className={`nav-dropdown ${open ? "nav-dropdown-open" : ""} ${active ? "nav-dropdown-active" : ""}`}
            onPointerEnter={() => {
                if (prefersHoverOpen()) openMenu();
            }}
            onPointerLeave={() => {
                scheduleClose();
            }}
        >
            <button
                type="button"
                className={`nav-dropdown-trigger ${active ? "nav-link-active" : ""}`}
                aria-expanded={open}
                aria-haspopup="true"
                aria-controls={panelId}
                onClick={() => {
                    clearCloseTimer();
                    setOpen((value) => !value);
                }}
            >
                <span>{label}</span>
                <NavChevron open={open} />
            </button>
            <div
                className={`nav-dropdown-flyout ${open ? "nav-dropdown-flyout-open" : ""}`}
                aria-hidden={!open}
            >
                <div id={panelId} className="nav-dropdown-panel" role="menu">
                    {items.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            className={`nav-dropdown-item ${isLeafActive(pathname, item.href) ? "nav-dropdown-item-active" : ""}`}
                            onClick={() => {
                                clearCloseTimer();
                                setOpen(false);
                                onNavigate?.();
                            }}
                            onPointerEnter={() => {
                                if (prefersHoverOpen()) openMenu();
                            }}
                        >
                            <span className="nav-dropdown-item-label">
                                {item.label}
                            </span>
                            {item.hint ? (
                                <span className="nav-dropdown-item-hint">
                                    {item.hint}
                                </span>
                            ) : null}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

function NavMobileGroup({
    label,
    items,
    pathname,
    onNavigate,
}: {
    label: string;
    items: NavLeaf[];
    pathname: string;
    onNavigate: () => void;
}) {
    const active = isGroupActive(pathname, items);
    return (
        <div
            className={`nav-mobile-group ${active ? "nav-mobile-group-active" : ""}`}
        >
            <div className="nav-mobile-group-label">{label}</div>
            {items.map((item) => (
                <NavLeafLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={onNavigate}
                    className="nav-link nav-link-nested"
                />
            ))}
        </div>
    );
}

function renderDesktopNav(pathname: string): ReactNode {
    return NAV_ENTRIES.map((entry) => {
        if (entry.type === "link") {
            return (
                <NavLeafLink
                    key={entry.href}
                    item={{ href: entry.href, label: entry.label }}
                    pathname={pathname}
                    className="nav-link"
                />
            );
        }
        return (
            <NavDropdown
                key={entry.label}
                label={entry.label}
                items={entry.items}
                pathname={pathname}
            />
        );
    });
}

function renderMobileNav(pathname: string, onNavigate: () => void): ReactNode {
    return NAV_ENTRIES.map((entry) => {
        if (entry.type === "link") {
            return (
                <NavLeafLink
                    key={entry.href}
                    item={{ href: entry.href, label: entry.label }}
                    pathname={pathname}
                    onNavigate={onNavigate}
                    className="nav-link"
                />
            );
        }
        return (
            <NavMobileGroup
                key={entry.label}
                label={entry.label}
                items={entry.items}
                pathname={pathname}
                onNavigate={onNavigate}
            />
        );
    });
}

export function Nav() {
    const pathname = usePathname();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    useEffect(() => {
        setMobileNavOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (mobileNavOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileNavOpen]);

    return (
        <header className="site-header">
            <div className="site-header-inner">
                <Link href="/" className="site-brand">
                    <span className="site-brand-icon">◈</span>
                    <span className="site-brand-text">LLM Debate Research</span>
                </Link>
                <button
                    type="button"
                    className="nav-toggle"
                    aria-label="Toggle navigation menu"
                    aria-expanded={mobileNavOpen}
                    onClick={() => setMobileNavOpen((v) => !v)}
                >
                    <span className="nav-toggle-bar" />
                    <span className="nav-toggle-bar" />
                    <span className="nav-toggle-bar" />
                </button>
                <nav
                    className={`nav nav-desktop ${mobileNavOpen ? "nav-open" : ""}`}
                    aria-label="Primary"
                >
                    <div className="nav-desktop-row">
                        <button
                            type="button"
                            className="nav-search-trigger"
                            aria-label="Search artifacts (keyboard shortcut /)"
                            onClick={openGlobalSearch}
                        >
                            <span
                                className="nav-search-trigger-icon"
                                aria-hidden
                            >
                                ⌕
                            </span>
                            <span className="nav-search-trigger-label">
                                Search
                            </span>
                            <kbd className="nav-search-kbd">/</kbd>
                        </button>
                        <RecentViewsMenu />
                        <SavedFiltersMenu />
                        {renderDesktopNav(pathname)}
                    </div>
                    <div className="nav-mobile-stack">
                        <button
                            type="button"
                            className="nav-search-trigger nav-search-trigger-mobile"
                            aria-label="Search artifacts"
                            onClick={() => {
                                setMobileNavOpen(false);
                                openGlobalSearch();
                            }}
                        >
                            <span
                                className="nav-search-trigger-icon"
                                aria-hidden
                            >
                                ⌕
                            </span>
                            <span className="nav-search-trigger-label">
                                Search artifacts
                            </span>
                            <kbd className="nav-search-kbd">/</kbd>
                        </button>
                        <div className="nav-recent-mobile">
                            <RecentViewsMenu />
                            <SavedFiltersMenu />
                        </div>
                        {renderMobileNav(pathname, () =>
                            setMobileNavOpen(false),
                        )}
                    </div>
                </nav>
            </div>
            <div
                className={`nav-overlay ${mobileNavOpen ? "nav-overlay-visible" : ""}`}
                aria-hidden="true"
                onClick={() => setMobileNavOpen(false)}
            />
        </header>
    );
}
