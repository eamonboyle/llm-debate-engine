import { loadBenchmarkArtifacts } from "../../lib/data";

export default async function BenchmarksPage() {
    const benchmarks = await loadBenchmarkArtifacts();

    return (
        <section className="stack">
            <div>
                <h1 className="title">Benchmark artifacts</h1>
                <p className="subtitle">
                    Inspect benchmark-level divergence, mode structure, and stability.
                </p>
            </div>

            <div className="card">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Created</th>
                                <th>Question</th>
                                <th>Runs</th>
                                <th>Modes</th>
                                <th>Entropy</th>
                                <th>Open</th>
                            </tr>
                        </thead>
                        <tbody>
                            {benchmarks.map((benchmark) => (
                                <tr key={benchmark.id}>
                                    <td>{benchmark.id}</td>
                                    <td>
                                        {new Date(
                                            benchmark.metadata.createdAt,
                                        ).toLocaleString()}
                                    </td>
                                    <td>{benchmark.question}</td>
                                    <td>{benchmark.payload.runs}</td>
                                    <td>{benchmark.payload.modeCount}</td>
                                    <td>{benchmark.payload.divergenceEntropy}</td>
                                    <td>
                                        <a href={`/benchmarks/${benchmark.id}`}>Details</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
