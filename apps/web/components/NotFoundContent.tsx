"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function describeMissingResource(pathname: string): {
    title: string;
    subtitle: string;
    primaryHref: string;
    primaryLabel: string;
} {
    if (pathname.startsWith("/runs/")) {
        return {
            title: "Run not found",
            subtitle:
                "This run ID is not in the artifact store. It may have been removed, renamed, or never synced to this deployment.",
            primaryHref: "/runs",
            primaryLabel: "Browse all runs",
        };
    }

    if (pathname.startsWith("/benchmarks/")) {
        return {
            title: "Benchmark not found",
            subtitle:
                "This benchmark ID is not in the artifact store. Check the ID or browse benchmarks to find a related experiment.",
            primaryHref: "/benchmarks",
            primaryLabel: "Browse all benchmarks",
        };
    }

    if (pathname.startsWith("/questions/view")) {
        return {
            title: "Question hub not found",
            subtitle:
                "No artifacts match this research question. Try the questions index or search for a related topic.",
            primaryHref: "/questions",
            primaryLabel: "Browse questions",
        };
    }

    return {
        title: "Page not found",
        subtitle:
            "The page you requested does not exist. Use search to find runs, benchmarks, and research questions.",
        primaryHref: "/search",
        primaryLabel: "Search artifacts",
    };
}

export function NotFoundContent() {
    const pathname = usePathname() ?? "";
    const { title, subtitle, primaryHref, primaryLabel } =
        describeMissingResource(pathname);

    return (
        <section className="stack">
            <h1 className="title">{title}</h1>
            <p className="subtitle">{subtitle}</p>
            <div
                className="page-actions"
                style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
            >
                <Link href={primaryHref} className="button">
                    {primaryLabel}
                </Link>
                <Link href="/" className="button secondary">
                    Back to overview
                </Link>
                <Link href="/search" className="button secondary">
                    Search
                </Link>
            </div>
        </section>
    );
}
