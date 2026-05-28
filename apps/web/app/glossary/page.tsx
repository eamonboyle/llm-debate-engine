import type { Metadata } from "next";
import Link from "next/link";
import {
    buildGlossarySections,
    filterGlossarySections,
} from "../../lib/glossarySections";

export const metadata: Metadata = {
    title: "Glossary",
};

type GlossarySearchParams = {
    q?: string;
};

export default async function GlossaryPage({
    searchParams,
}: {
    searchParams: Promise<GlossarySearchParams>;
}) {
    const params = await searchParams;
    const query = (params.q ?? "").trim();
    const sections = filterGlossarySections(buildGlossarySections(), query);
    const totalEntries = sections.reduce(
        (sum, section) => sum + section.entries.length,
        0,
    );

    return (
        <section className="stack">
            <div>
                <h1 className="title">Metric glossary</h1>
                <p className="subtitle">
                    Definitions for dashboard metrics, trace steps, and chart
                    labels. Tooltips across the app use the same source.
                </p>
            </div>

            <form className="card" method="get">
                <label className="small muted" htmlFor="glossary-q">
                    Search terms
                </label>
                <input
                    id="glossary-q"
                    name="q"
                    className="input"
                    placeholder="entropy, skeptic, calibration..."
                    defaultValue={query}
                />
                <div className="filter-actions" style={{ marginTop: 12 }}>
                    <button type="submit" className="button">
                        Search
                    </button>
                    <Link href="/glossary" className="button secondary">
                        Clear
                    </Link>
                    <span className="small muted">
                        {totalEntries} term{totalEntries === 1 ? "" : "s"}
                    </span>
                </div>
            </form>

            {sections.length === 0 ? (
                <div className="card">
                    <p className="muted">
                        No glossary terms match your search.
                    </p>
                </div>
            ) : (
                sections.map((section) => (
                    <div key={section.id} className="card" id={section.id}>
                        <h2 style={{ marginTop: 0 }}>{section.title}</h2>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Term</th>
                                        <th>Meaning</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {section.entries.map((entry) => (
                                        <tr key={entry.key}>
                                            <td>
                                                <code>{entry.key}</code>
                                            </td>
                                            <td>{entry.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}

            <p className="small muted">
                See also <code>docs/chart-interpretation.md</code> in the
                repository for deeper chart guidance.
            </p>
        </section>
    );
}
