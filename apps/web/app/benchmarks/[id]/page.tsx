import { notFound } from "next/navigation";
import { loadBenchmarkById } from "../../../lib/data";

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
                <h2 style={{ marginTop: 0 }}>Mode structure</h2>
                <p className="muted small">Mode sizes: [{modeSizes}]</p>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Pairwise similarity sample</h2>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Run i</th>
                                <th>Run j</th>
                                <th>Similarity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pairs.slice(0, 50).map((pair, idx) => (
                                <tr key={`${pair.i}-${pair.j}-${idx}`}>
                                    <td>{pair.i}</td>
                                    <td>{pair.j}</td>
                                    <td>{pair.similarity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
