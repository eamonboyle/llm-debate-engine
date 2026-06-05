import { MetricCard } from "./MetricCard";
import type { ConsensusSummaryData } from "../lib/consensusSummary";

type ConsensusSummaryProps = {
    consensus: ConsensusSummaryData;
};

export function ConsensusSummary({ consensus }: ConsensusSummaryProps) {
    return (
        <div className="stack">
            <div className="grid-4">
                <MetricCard
                    label="Consensus strength"
                    value={
                        consensus.strength != null
                            ? consensus.strength.toFixed(3)
                            : "—"
                    }
                    helpKey="consensusStrength"
                />
                <MetricCard
                    label="Answers compared"
                    value={consensus.included.length || "—"}
                    helpKey="consensusIncluded"
                />
                <MetricCard
                    label="Pairwise comparisons"
                    value={consensus.pairs.length || "—"}
                    helpKey="consensusPairs"
                />
            </div>
            {consensus.included.length > 0 ? (
                <p className="small muted" style={{ margin: 0 }}>
                    Included: {consensus.included.join(", ")}
                </p>
            ) : null}
            {consensus.pairs.length > 0 ? (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Pair</th>
                                <th>Similarity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {consensus.pairs.map((pair, idx) => (
                                <tr key={`${pair.a}-${pair.b}-${idx}`}>
                                    <td>
                                        <code className="small">
                                            {pair.a} ↔ {pair.b}
                                        </code>
                                    </td>
                                    <td>{pair.similarity.toFixed(3)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </div>
    );
}
