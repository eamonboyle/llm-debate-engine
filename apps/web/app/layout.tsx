import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sora, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Nav } from "../components/Nav";
import { TooltipProviderWrapper } from "../components/TooltipProviderWrapper";

const sora = Sora({
    subsets: ["latin"],
    variable: "--font-display",
    display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-body",
    display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-mono",
    display: "swap",
});

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
        <html
            lang="en"
            className={`${sora.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
        >
            <body className={ibmPlexSans.className}>
                <TooltipProviderWrapper>
                    <main className="page-shell">
                        <Nav />
                        {children}
                    </main>
                </TooltipProviderWrapper>
            </body>
        </html>
    );
}
