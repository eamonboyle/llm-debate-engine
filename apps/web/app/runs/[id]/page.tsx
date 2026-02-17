import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadRunById } from "../../../lib/data";
import { TraceStep } from "../../../components/trace/TraceStep";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const run = await loadRunById(id);
    const title = run
        ? `${run.question.slice(0, 50)}${run.question.length > 50 ? "…" : ""}`
        : id;
    return { title: `Run: ${title}` };
}

export default async function RunTracePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const run = await loadRunById(id);
    if (!run) notFound();

    const steps = run.run.steps;

    return (
        <section className="stack">
            <div>
                <h1 className="title">Run trace</h1>
                <p className="subtitle">
                    {run.id} ·{" "}
                    {new Date(run.metadata.createdAt).toLocaleString()}
                </p>
                <div className="page-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a
                        href={`/runs/compare?left=${run.id}`}
                        className="button secondary"
                    >
                        Compare as left
                    </a>
                    <a
                        href={`/runs/compare?right=${run.id}`}
                        className="button secondary"
                    >
                        Compare as right
                    </a>
                </div>
            </div>

            <div className="grid-4">
                <div className="card">
                    <div className="small muted">Question</div>
                    <div style={{ marginTop: 6 }}>{run.question}</div>
                </div>
                <div className="card">
                    <div className="small muted">Model</div>
                    <div style={{ marginTop: 6 }}>{run.metadata.model}</div>
                </div>
                <div className="card">
                    <div className="small muted">Preset</div>
                    <div style={{ marginTop: 6 }}>
                        {run.metadata.pipelinePreset}
                    </div>
                </div>
                <div className="card">
                    <div className="small muted">Fast mode</div>
                    <div style={{ marginTop: 6 }}>
                        {run.metadata.fastMode ? "true" : "false"}
                    </div>
                </div>
            </div>

            <div className="card trace-final-answer">
                <h2 style={{ marginTop: 0 }}>Final answer</h2>
                <p>{run.run.finalAnswer}</p>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Step-by-step outputs</h2>
                <div className="trace-timeline">
                    {steps.map((step, idx) => (
                        <TraceStep
                            key={step.id}
                            step={step}
                            index={idx}
                            isLast={idx === steps.length - 1}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
