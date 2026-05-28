import type { Metadata } from "next";
import Link from "next/link";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { loadRunArtifacts } from "../../lib/data";
import {
    PIPELINE_AGENTS,
    PIPELINE_PRESETS,
    presetById,
} from "../../lib/pipelinePresets";

export const metadata: Metadata = {
    title: "Pipeline reference",
};

function countPresetsInRuns(
    runs: Awaited<ReturnType<typeof loadRunArtifacts>>,
): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const run of runs) {
        const preset = run.metadata.pipelinePreset;
        counts[preset] = (counts[preset] ?? 0) + 1;
    }
    return counts;
}

export default async function PipelineReferencePage() {
    const runs = await loadRunArtifacts();
    const presetCounts = countPresetsInRuns(runs);

    return (
        <section className="stack">
            <div>
                <h1 className="title">Pipeline reference</h1>
                <p className="subtitle">
                    Debate presets and agent roles used by the CLI engine. Trace
                    pages show which agents ran for each artifact.
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <Link href="/catalog" className="button secondary">
                        Experiment catalog
                    </Link>
                    <Link href="/runs" className="button secondary">
                        Browse runs
                    </Link>
                </div>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Presets</h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Choose a preset with{" "}
                    <code>pnpm ask &quot;…&quot; --preset research_deep</code>.
                    The <code>--fast</code> flag skips revision and synthesizer
                    where supported.
                </p>
                {PIPELINE_PRESETS.map((preset) => {
                    const count = presetCounts[preset.id] ?? 0;
                    return (
                        <div key={preset.id} className="pipeline-preset-block">
                            <div className="pipeline-preset-header">
                                <h3 className="pipeline-preset-title">
                                    <code>{preset.id}</code>
                                    <span className="muted">
                                        {" "}
                                        · {preset.label}
                                    </span>
                                </h3>
                                {count > 0 ? (
                                    <Link
                                        href={`/runs?preset=${preset.id}`}
                                        className="small"
                                    >
                                        {count} run{count === 1 ? "" : "s"} in
                                        store
                                    </Link>
                                ) : (
                                    <span className="small muted">
                                        No runs yet
                                    </span>
                                )}
                            </div>
                            {preset.notes ? (
                                <p className="small muted">{preset.notes}</p>
                            ) : null}
                            <ol className="pipeline-step-list">
                                {preset.steps.map((step) => (
                                    <li key={step}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    );
                })}
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Agents</h2>
                <ResponsiveTable
                    columns={[
                        { key: "name", label: "Agent" },
                        { key: "role", label: "Role" },
                        {
                            key: "description",
                            label: "Description",
                            hideOnMobile: true,
                        },
                    ]}
                    data={PIPELINE_AGENTS.map((agent) => ({
                        name: agent.name,
                        role: agent.role,
                        description: agent.description,
                    }))}
                    getRowId={(row) => (row as { name: string }).name}
                />
            </div>

            {Object.keys(presetCounts).length > 0 ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Presets in your data</h2>
                    <p className="small muted">
                        Presets observed in loaded run artifacts (including
                        custom or legacy values).
                    </p>
                    <ResponsiveTable
                        columns={[
                            { key: "preset", label: "Preset" },
                            { key: "count", label: "Runs" },
                            {
                                key: "known",
                                label: "Reference",
                                render: (row) => {
                                    const id = (row as { preset: string })
                                        .preset;
                                    const known = presetById(id);
                                    return known ? (
                                        <span className="muted">
                                            {known.label}
                                        </span>
                                    ) : (
                                        <span className="muted">
                                            Not in default list
                                        </span>
                                    );
                                },
                            },
                            {
                                key: "explore",
                                label: "Explore",
                                render: (row) => (
                                    <Link
                                        href={`/runs?preset=${encodeURIComponent((row as { preset: string }).preset)}`}
                                    >
                                        Filter runs
                                    </Link>
                                ),
                            },
                        ]}
                        data={Object.entries(presetCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([preset, count]) => ({
                                preset,
                                count,
                            }))}
                        getRowId={(row) => (row as { preset: string }).preset}
                    />
                </div>
            ) : null}
        </section>
    );
}
