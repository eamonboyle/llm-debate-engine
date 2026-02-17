import type { Metadata } from "next";
import { loadBenchmarkArtifacts, loadBenchmarksByIds } from "../../../lib/data";
import { CompareDeltaChart } from "../../../components/charts/CompareDeltaChart";
import { buildBenchmarkComparePayload } from "../../../lib/benchmarkCompare";

export const metadata: Metadata = {
    title: "Benchmark compare",
};

type CompareSearchParams = {
    left?: string;
    right?: string;
};

export default async function BenchmarkComparePage({
    searchParams,
}: {
    searchParams: Promise<CompareSearchParams>;
}) {
    const params = await searchParams;
    const artifacts = await loadBenchmarkArtifacts();
    const selectedIds = [params.left, params.right].filter(
        (v): v is string => typeof v === "string" && v.length > 0,
    );
    const selected = await loadBenchmarksByIds(selectedIds);
    const left = selected.find((b) => b.id === params.left) ?? null;
    const right = selected.find((b) => b.id === params.right) ?? null;
    const compare = left && right ? buildBenchmarkComparePayload(left, right) : null;
    const leftLabel = left ? `left:${left.id.slice(0, 6)}` : "left";
    const rightLabel = right ? `right:${right.id.slice(0, 6)}` : "right";

    return (
        <section className="stack">
            <div>
                <h1 className="title">Benchmark compare</h1>
                <p className="subtitle">
                    Select two benchmark artifacts and inspect divergence and stability
                    side-by-side.
                </p>
            </div>

            <form className="card" method="get">
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                    }}
                >
                    <div>
                        <label className="small muted" htmlFor="left">
                            Left benchmark
                        </label>
                        <select
                            id="left"
                            name="left"
                            className="input"
                            defaultValue={params.left ?? ""}
                        >
                            <option value="">Select left benchmark</option>
                            {artifacts.map((artifact) => (
                                <option key={`left-${artifact.id}`} value={artifact.id}>
                                    {artifact.id} · {artifact.question.slice(0, 80)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="small muted" htmlFor="right">
                            Right benchmark
                        </label>
                        <select
                            id="right"
                            name="right"
                            className="input"
                            defaultValue={params.right ?? ""}
                        >
                            <option value="">Select right benchmark</option>
                            {artifacts.map((artifact) => (
                                <option key={`right-${artifact.id}`} value={artifact.id}>
                                    {artifact.id} · {artifact.question.slice(0, 80)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                    <button type="submit" className="button">
                        Compare
                    </button>
                    <a href="/benchmarks/compare" className="button secondary">
                        Clear
                    </a>
                </div>
            </form>

            <div className="two-col">
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Left</h2>
                    {!left ? (
                        <p className="muted">No left benchmark selected.</p>
                    ) : (
                        <ul>
                            <li>
                                <strong>ID:</strong> {left.id}
                            </li>
                            <li>
                                <strong>Question:</strong> {left.question}
                            </li>
                            <li>
                                <strong>Runs:</strong> {left.payload.runs}
                            </li>
                            <li>
                                <strong>Mode count:</strong> {left.payload.modeCount}
                            </li>
                            <li>
                                <strong>Entropy:</strong>{" "}
                                {left.payload.divergenceEntropy}
                            </li>
                            <li>
                                <strong>Stability mean:</strong>{" "}
                                {compare?.left.stabilityPairwiseMean ?? "-"}
                            </li>
                        </ul>
                    )}
                </div>
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Right</h2>
                    {!right ? (
                        <p className="muted">No right benchmark selected.</p>
                    ) : (
                        <ul>
                            <li>
                                <strong>ID:</strong> {right.id}
                            </li>
                            <li>
                                <strong>Question:</strong> {right.question}
                            </li>
                            <li>
                                <strong>Runs:</strong> {right.payload.runs}
                            </li>
                            <li>
                                <strong>Mode count:</strong> {right.payload.modeCount}
                            </li>
                            <li>
                                <strong>Entropy:</strong>{" "}
                                {right.payload.divergenceEntropy}
                            </li>
                            <li>
                                <strong>Stability mean:</strong>{" "}
                                {compare?.right.stabilityPairwiseMean ?? "-"}
                            </li>
                        </ul>
                    )}
                </div>
            </div>

            {left && right ? (
                <div className="stack">
                    <div className="card">
                        <h2 style={{ marginTop: 0 }}>Delta summary</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>Left</th>
                                    <th>Right</th>
                                    <th>Delta (right - left)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Runs</td>
                                    <td>{left.payload.runs}</td>
                                    <td>{right.payload.runs}</td>
                                    <td>{compare?.delta.runs}</td>
                                </tr>
                                <tr>
                                    <td>Mode count</td>
                                    <td>{left.payload.modeCount}</td>
                                    <td>{right.payload.modeCount}</td>
                                    <td>{compare?.delta.modeCount}</td>
                                </tr>
                                <tr>
                                    <td>Divergence entropy</td>
                                    <td>{left.payload.divergenceEntropy}</td>
                                    <td>{right.payload.divergenceEntropy}</td>
                                    <td>
                                        {compare
                                            ? compare.delta.divergenceEntropy.toFixed(3)
                                            : "-"}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Stability mean</td>
                                    <td>{compare?.left.stabilityPairwiseMean ?? "-"}</td>
                                    <td>{compare?.right.stabilityPairwiseMean ?? "-"}</td>
                                    <td>
                                        {typeof compare?.delta.stabilityPairwiseMean ===
                                        "number"
                                            ? compare.delta.stabilityPairwiseMean.toFixed(3)
                                            : "-"}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <CompareDeltaChart
                        leftLabel={leftLabel}
                        rightLabel={rightLabel}
                        rows={[
                            {
                                metric: "modeCount",
                                left: compare?.left.modeCount ?? null,
                                right: compare?.right.modeCount ?? null,
                            },
                            {
                                metric: "entropy",
                                left: compare?.left.divergenceEntropy ?? null,
                                right: compare?.right.divergenceEntropy ?? null,
                            },
                            {
                                metric: "stability",
                                left: compare?.left.stabilityPairwiseMean ?? null,
                                right: compare?.right.stabilityPairwiseMean ?? null,
                            },
                        ]}
                    />
                </div>
            ) : null}
        </section>
    );
}
