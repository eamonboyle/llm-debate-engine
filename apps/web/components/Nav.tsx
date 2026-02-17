"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

    return (
        <header className="site-header">
            <div className="site-header-inner">
                <Link href="/" className="site-brand">
                    <span className="site-brand-icon">◈</span>
                    <span className="site-brand-text">LLM Debate Research</span>
                </Link>
                <nav className="nav">
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
        </header>
    );
}
