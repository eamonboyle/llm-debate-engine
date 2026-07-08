import Link from "next/link";
import { loadAnalysisIndex, loadDataStatus } from "../lib/data";
import { computeIndexFreshness } from "../lib/indexFreshness";

export async function StaleIndexBanner() {
    const [status, index] = await Promise.all([
        loadDataStatus(),
        loadAnalysisIndex(),
    ]);
    const freshness = computeIndexFreshness(status, index);

    if (!freshness.stale) {
        return null;
    }

    return (
        <div className="card" style={{ borderColor: "var(--color-warning)" }}>
            <h2 style={{ marginTop: 0 }}>Analysis index may be stale</h2>
            <p className="muted" style={{ marginBottom: 12 }}>
                {freshness.missingIndex
                    ? "Artifacts are loaded but the analysis index is missing."
                    : `The index covers ${freshness.indexedRuns} runs and ${freshness.indexedBenchmarks} benchmarks, but ${freshness.artifactRuns} runs and ${freshness.artifactBenchmarks} artifacts exist on disk.`}{" "}
                Aggregates on this page may omit recent experiments until you
                rebuild.
            </p>
            <Link href="/status" className="button secondary">
                Rebuild from data status
            </Link>
        </div>
    );
}
