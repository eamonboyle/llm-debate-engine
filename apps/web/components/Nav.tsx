"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
    { href: "/", label: "Overview" },
    { href: "/runs", label: "Runs" },
    { href: "/runs/compare", label: "Compare runs" },
    { href: "/benchmarks", label: "Benchmarks" },
    { href: "/benchmarks/compare", label: "Compare benchmarks" },
] as const;

function isActive(pathname: string, href: string): boolean {
    if (href === "/") return pathname === "/";
    if (pathname === href) return true;
    if (pathname.startsWith(href + "/")) {
        // /runs/compare should not activate "Runs", only "Compare runs"
        if (href === "/runs" && pathname.startsWith("/runs/compare")) return false;
        if (href === "/benchmarks" && pathname.startsWith("/benchmarks/compare")) return false;
        return true;
    }
    return false;
}

export function Nav() {
    const pathname = usePathname();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    // Close mobile nav on route change
    useEffect(() => {
        setMobileNavOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile nav is open
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
                <nav className={`nav ${mobileNavOpen ? "nav-open" : ""}`}>
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(pathname, item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-link ${active ? "nav-link-active" : ""}`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
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
