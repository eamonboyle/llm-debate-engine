const METRIC_ITEMS = [
    {
        key: "modeCount",
        description:
            "Number of clusters discovered from benchmark final-answer embeddings.",
    },
    {
        key: "divergenceEntropy",
        description:
            "Entropy of run distribution across modes; higher means broader divergence.",
    },
    {
        key: "stability.pairwiseMean",
        description:
            "Average pairwise cosine similarity across final answers in a benchmark.",
    },
    {
        key: "solver->revision Δ",
        description:
            "Confidence change after critique incorporation; often negative for recalibration.",
    },
    {
        key: "corr(severity, solver->revision Δ)",
        description:
            "Pearson correlation between critique max severity and solver->revision confidence delta.",
    },
    {
        key: "corr(severity, revision->synth Δ)",
        description:
            "Pearson correlation between critique max severity and revision->synth confidence delta.",
    },
    {
        key: "evidencePlanning.riskLevelMean",
        description:
            "Mean risk score (1-5) output by EvidencePlanner across included runs.",
    },
    {
        key: "counterfactualFailureModeCounts",
        description:
            "Frequency map of CounterfactualAgent failure modes across included runs.",
    },
    {
        key: "outlierRuns.avgSimilarity",
        description:
            "Per-benchmark run with lowest mean similarity to peers (potential anomalous mode).",
    },
];

export function MetricGlossary() {
    return (
        <div className="card">
            <h2 style={{ marginTop: 0 }}>Metric glossary</h2>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Interpretation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {METRIC_ITEMS.map((item) => (
                            <tr key={item.key}>
                                <td>
                                    <code>{item.key}</code>
                                </td>
                                <td>{item.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="small muted" style={{ marginTop: 10 }}>
                See <code>docs/chart-interpretation.md</code> for deeper
                guidance.
            </p>
        </div>
    );
}
