import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadRunById, loadRunsByQuestion } from "../../../lib/data";
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
    const previousRuns = await loadRunsByQuestion(run.question, run.id);

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
                <h2 style={{ marginTop: 0 }}>Previous answers</h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Other runs for this question — see how the LLM&apos;s answer
                    varied
                </p>
                {previousRuns.length === 0 ? (
                    <p className="muted">
                        No other runs for this question yet.
                    </p>
                ) : (
                    <div className="previous-answers-list">
                        {previousRuns.map((r, idx) => (
                            <div
                                key={r.id}
                                className="previous-answer-item"
                                style={{
                                    padding: "0.75rem 0",
                                    borderBottom:
                                        idx < previousRuns.length - 1
                                            ? "1px solid var(--color-border, #e0e0e0)"
                                            : undefined,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "0.5rem 1rem",
                                        alignItems: "baseline",
                                        marginBottom: 4,
                                    }}
                                >
                                    <Link href={`/runs/${r.id}`}>
                                        <code className="small">
                                            {r.id.slice(-20)}
                                        </code>
                                    </Link>
                                    <span className="small muted">
                                        {new Date(
                                            r.metadata.createdAt,
                                        ).toLocaleString()}
                                    </span>
                                    <span className="small muted">
                                        {r.metadata.model} ·{" "}
                                        {r.metadata.pipelinePreset}
                                    </span>
                                    <Link
                                        href={`/runs/${r.id}`}
                                        className="button"
                                        style={{
                                            padding: "0.2rem 0.5rem",
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        View trace
                                    </Link>
                                </div>
                                <p
                                    className="small muted"
                                    style={{ margin: 0 }}
                                >
                                    {r.run.finalAnswer.length > 200
                                        ? `${r.run.finalAnswer.slice(0, 200)}…`
                                        : r.run.finalAnswer}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
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
