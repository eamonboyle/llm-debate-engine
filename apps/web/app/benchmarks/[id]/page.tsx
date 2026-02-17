import { notFound } from "next/navigation";
import { loadBenchmarkById } from "../../../lib/data";
import { BenchmarkDetailCharts } from "../../../components/charts/BenchmarkDetailCharts";

function inferModeLabel(preview: string) {
    const text = preview.toLowerCase();
    if (text.includes("policy") || text.includes("governance")) {
        return "policy-oriented";
    }
    if (text.includes("technical") || text.includes("alignment")) {
        return "technical framing";
    }
    if (text.includes("economic") || text.includes("jobs")) {
        return "economic framing";
    }
    if (text.includes("existential") || text.includes("catastrophic")) {
        return "high-risk framing";
    }
    return "general framing";
}

export default async function BenchmarkDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const benchmark = await loadBenchmarkById(id);

    if (!benchmark) {
        notFound();
    }

    const modeSizes = benchmark.payload.modeSizes.join(", ");
    const pairs = benchmark.payload.summary?.stability?.pairs ?? [];
    const thresholdCounts = [
        { threshold: "0.8", modeCount: benchmark.payload.modeCountAt0_8 ?? 0 },
        { threshold: "0.9", modeCount: benchmark.payload.modeCountAt0_9 ?? 0 },
        { threshold: "0.95", modeCount: benchmark.payload.modeCountAt0_95 ?? 0 },
    ];
    const modes = benchmark.payload.modes ?? [];

    return (
        <section className="stack">
            <div>
                <h1 className="title">Benchmark detail</h1>
                <p className="subtitle">{benchmark.id}</p>
            </div>

            <div className="grid-4">
                <div className="card">
                    <div className="small muted">Question</div>
                    <div style={{ marginTop: 6 }}>{benchmark.question}</div>
                </div>
                <div className="card">
                    <div className="small muted">Runs</div>
                    <div style={{ marginTop: 6, fontSize: 24 }}>
                        {benchmark.payload.runs}
                    </div>
                </div>
                <div className="card">
                    <div className="small muted">Mode count</div>
                    <div style={{ marginTop: 6, fontSize: 24 }}>
                        {benchmark.payload.modeCount}
                    </div>
                </div>
                <div className="card">
                    <div className="small muted">Divergence entropy</div>
                    <div style={{ marginTop: 6, fontSize: 24 }}>
                        {benchmark.payload.divergenceEntropy}
                    </div>
                </div>
            </div>

            <div className="card">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a
                        className="button secondary"
                        href={`/benchmarks/compare?left=${benchmark.id}`}
                    >
                        Compare as left
                    </a>
                    <a
                        className="button secondary"
                        href={`/benchmarks/compare?right=${benchmark.id}`}
                    >
                        Compare as right
                    </a>
                </div>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Mode structure</h2>
                <p className="muted small">Mode sizes: [{modeSizes}]</p>
            </div>

            <BenchmarkDetailCharts
                modeSizes={benchmark.payload.modeSizes}
                thresholdCounts={thresholdCounts}
                similarityPairs={pairs}
                runs={benchmark.payload.runs}
            />

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Mode explorer</h2>
                {modes.length === 0 ? (
                    <p className="muted">No mode exemplars available in artifact.</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Mode</th>
                                    <th>Label</th>
                                    <th>Size</th>
                                    <th>Members</th>
                                    <th>Exemplar preview</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modes.map((mode, idx) => (
                                    <tr key={`mode-${idx}`}>
                                        <td>{idx}</td>
                                        <td>{inferModeLabel(mode.exemplarPreview)}</td>
                                        <td>{mode.size}</td>
                                        <td>{mode.members.join(", ")}</td>
                                        <td className="muted">{mode.exemplarPreview}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
