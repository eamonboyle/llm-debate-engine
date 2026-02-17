import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>
                <main className="page-shell">
                    <nav className="nav">
                        <a href="/">Overview</a>
                        <a href="/runs">Runs</a>
                        <a href="/benchmarks">Benchmarks</a>
                    </nav>
                    {children}
                </main>
            </body>
        </html>
    );
}
