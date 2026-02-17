import { filterRunArtifacts, loadRunArtifacts } from "../../lib/data";

type RunsSearchParams = {
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};

export default async function RunsPage({
    searchParams,
}: {
    searchParams: Promise<RunsSearchParams>;
}) {
    const runs = await loadRunArtifacts();
    const params = await searchParams;
    const filtered = filterRunArtifacts(runs, {
        q: params.q,
        model: params.model,
        preset: params.preset,
        fast: params.fast,
        from: params.from,
        to: params.to,
    });

    return (
        <section className="stack">
            <div>
                <h1 className="title">Run artifacts</h1>
                <p className="subtitle">
                    Deep dive each run with model, preset, and metric snapshots.
                </p>
            </div>

            <form className="card" method="get">
                <div
                    style={{
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                    }}
                >
                    <input
                        name="q"
                        placeholder="Search question / answer"
                        defaultValue={params.q ?? ""}
                        className="input"
                    />
                    <input
                        name="model"
                        placeholder="Model contains..."
                        defaultValue={params.model ?? ""}
                        className="input"
                    />
                    <input
                        name="preset"
                        placeholder="Preset (standard, research_deep...)"
                        defaultValue={params.preset ?? ""}
                        className="input"
                    />
                    <select name="fast" defaultValue={params.fast ?? ""} className="input">
                        <option value="">Fast mode: any</option>
                        <option value="true">Fast only</option>
                        <option value="false">Non-fast only</option>
                    </select>
                    <input
                        type="datetime-local"
                        name="from"
                        defaultValue={params.from ?? ""}
                        className="input"
                        title="Created at or after"
                    />
                    <input
                        type="datetime-local"
                        name="to"
                        defaultValue={params.to ?? ""}
                        className="input"
                        title="Created at or before"
                    />
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                    <button type="submit" className="button">
                        Apply filters
                    </button>
                    <a href="/runs" className="button secondary">
                        Clear
                    </a>
                    <span className="small muted" style={{ alignSelf: "center" }}>
                        Showing {filtered.length} of {runs.length}
                    </span>
                </div>
            </form>

            <div className="card">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Created</th>
                                <th>Question</th>
                                <th>Model</th>
                                <th>Preset</th>
                                <th>Fast</th>
                                <th>Final answer</th>
                                <th>Open</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((run) => (
                                <tr key={run.id}>
                                    <td>{run.id}</td>
                                    <td>
                                        {new Date(run.metadata.createdAt).toLocaleString()}
                                    </td>
                                    <td>{run.question}</td>
                                    <td>{run.metadata.model}</td>
                                    <td>{run.metadata.pipelinePreset}</td>
                                    <td>{run.metadata.fastMode ? "yes" : "no"}</td>
                                    <td className="muted">{run.run.finalAnswer}</td>
                                    <td>
                                        <a href={`/runs/${run.id}`}>Trace</a>
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
