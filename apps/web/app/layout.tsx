import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const SITE_NAME = "LLM Debate Research";
const DESCRIPTION =
    "Multi-agent LLM debate research platform for structured debates, analysis, and model evaluation. Explore runs, benchmarks, and metrics.";

export const metadata: Metadata = {
    title: {
        default: SITE_NAME,
        template: `%s | ${SITE_NAME}`,
    },
    description: DESCRIPTION,
    keywords: [
        "LLM",
        "debate",
        "research",
        "AI",
        "multi-agent",
        "benchmark",
        "policy analysis",
    ],
    authors: [{ name: "LLM Debate Research Platform" }],
    creator: "LLM Debate Research Platform",
    robots: {
        index: true,
        follow: true,
    },
    openGraph: {
        type: "website",
        title: SITE_NAME,
        description: DESCRIPTION,
        siteName: SITE_NAME,
    },
    twitter: {
        card: "summary",
        title: SITE_NAME,
        description: DESCRIPTION,
    },
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>
                <main className="page-shell">
                    <nav className="nav">
                        <a href="/">Overview</a>
                        <a href="/runs">Runs</a>
                        <a href="/runs/compare">Run compare</a>
                        <a href="/benchmarks">Benchmarks</a>
                        <a href="/benchmarks/compare">Benchmark compare</a>
                    </nav>
                    {children}
                </main>
            </body>
        </html>
    );
}
