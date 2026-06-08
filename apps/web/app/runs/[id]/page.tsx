import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    loadBenchmarksByQuestion,
    loadRunById,
    loadRunsByQuestion,
} from "../../../lib/data";
import { TraceStep } from "../../../components/trace/TraceStep";
import { TraceStepNav } from "../../../components/trace/TraceStepNav";
import { RunMetricsSummary } from "../../../components/RunMetricsSummary";
import { ConsensusSummary } from "../../../components/ConsensusSummary";
import { CritiqueBreakdown } from "../../../components/CritiqueBreakdown";
import { CritiqueByAgent } from "../../../components/CritiqueByAgent";
import { extractConsensusSummary } from "../../../lib/consensusSummary";
import { extractCritiqueByType } from "../../../lib/critiqueBreakdown";
import { extractCritiqueByAgent } from "../../../lib/critiqueByAgent";
import { DownloadArtifactLink } from "../../../components/DownloadArtifactLink";
import { CopyPageLink } from "../../../components/CopyPageLink";
import { CopyTextButton } from "../../../components/CopyTextButton";
import { summarizeRun } from "../../../lib/runCompare";
import { questionHubHref } from "../../../lib/questionGroups";

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
    const [previousRuns, relatedBenchmarks] = await Promise.all([
        loadRunsByQuestion(run.question, run.id),
        loadBenchmarksByQuestion(run.question),
    ]);
    const metricsSummary = summarizeRun(run);
    const consensusSummary = extractConsensusSummary(run);
    const critiqueByType = extractCritiqueByType(run);
    const critiqueByAgent = extractCritiqueByAgent(run);
    const { schemaVersion, pipelineVersion } = run.metadata;

    return (
        <section className="stack">
            <div>
                <h1 className="title">Run trace</h1>
                <p className="subtitle">
                    {run.id} ·{" "}
                    {new Date(run.metadata.createdAt).toLocaleString()}
                </p>
                <div
                    className="page-actions"
                    style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                    <DownloadArtifactLink
                        href={`/api/runs/${run.id}?download=1`}
                        filename={`${run.id}.json`}
                    />
                    <CopyPageLink />
                    <Link
                        href={questionHubHref(run.question)}
                        className="button secondary"
                    >
                        Question hub
                    </Link>
                    <a
                        href={`/runs?q=${encodeURIComponent(run.question)}`}
                        className="button secondary"
                    >
                        All runs for question
                    </a>
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
                {schemaVersion != null ? (
                    <div className="card">
                        <div className="small muted">Schema version</div>
                        <div style={{ marginTop: 6 }}>{schemaVersion}</div>
                    </div>
                ) : null}
                {pipelineVersion ? (
                    <div className="card">
                        <div className="small muted">Pipeline version</div>
                        <div style={{ marginTop: 6 }}>
                            <code className="small">{pipelineVersion}</code>
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Metrics snapshot</h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Aggregated confidence, critique, and research signals from
                    this run artifact.
                </p>
                <RunMetricsSummary summary={metricsSummary} />
            </div>

            {consensusSummary ? (
                <div className="card">
                    <h2 style={{ marginTop: 0 }}>Answer consensus</h2>
                    <p
                        className="small muted"
                        style={{ marginBottom: "1rem" }}
                    >
                        Embedding-based agreement between solver, revision, and
                        synthesizer proposals in this run.
                    </p>
                    <ConsensusSummary consensus={consensusSummary} />
                </div>
            ) : null}

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Critique by agent</h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Issue counts from each critique step — Skeptic and Red team
                    when the deep research preset ran both.
                </p>
                <CritiqueByAgent entries={critiqueByAgent} />
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Critique by issue type</h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Skeptic issue counts grouped by type for this trace.
                </p>
                <CritiqueBreakdown entries={critiqueByType} />
            </div>

            <div className="card trace-final-answer">
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <h2 style={{ margin: 0 }}>Final answer</h2>
                    <CopyTextButton
                        text={run.run.finalAnswer}
                        label="Copy answer"
                    />
                </div>
                <p style={{ marginTop: "1rem" }}>{run.run.finalAnswer}</p>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Benchmarks for this question</h2>
                <p className="small muted" style={{ marginBottom: "1rem" }}>
                    Multi-run stability experiments on the same research
                    question.
                </p>
                {relatedBenchmarks.length === 0 ? (
                    <p className="muted">
                        No benchmarks recorded for this question yet.
                    </p>
                ) : (
                    <div className="previous-answers-list">
                        {relatedBenchmarks.map((benchmark, idx) => (
                            <div
                                key={benchmark.id}
                                className="previous-answer-item"
                                style={{
                                    padding: "0.75rem 0",
                                    borderBottom:
                                        idx < relatedBenchmarks.length - 1
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
                                    <Link href={`/benchmarks/${benchmark.id}`}>
                                        <code className="small">
                                            {benchmark.id.slice(-20)}
                                        </code>
                                    </Link>
                                    <span className="small muted">
                                        {new Date(
                                            benchmark.metadata.createdAt,
                                        ).toLocaleString()}
                                    </span>
                                    <span className="small muted">
                                        {benchmark.metadata.model} ·{" "}
                                        {benchmark.metadata.pipelinePreset} ·{" "}
                                        {benchmark.payload.runs} runs ·{" "}
                                        {benchmark.payload.modeCount} modes
                                    </span>
                                    <Link
                                        href={`/benchmarks/${benchmark.id}`}
                                        className="button"
                                        style={{
                                            padding: "0.2rem 0.5rem",
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        View benchmark
                                    </Link>
                                </div>
                                <p
                                    className="small muted"
                                    style={{ margin: 0 }}
                                >
                                    Entropy{" "}
                                    {benchmark.payload.divergenceEntropy.toFixed(
                                        3,
                                    )}
                                    {benchmark.payload.summary?.stability
                                        ?.pairwiseMean != null
                                        ? ` · stability ${benchmark.payload.summary.stability.pairwiseMean.toFixed(3)}`
                                        : null}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
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
                                    <Link
                                        href={`/runs/compare?left=${run.id}&right=${r.id}`}
                                        className="button secondary"
                                        style={{
                                            padding: "0.2rem 0.5rem",
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        Compare
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

            <div className="card trace-steps-card">
                <h2 style={{ marginTop: 0 }}>Step-by-step outputs</h2>
                <TraceStepNav
                    steps={steps.map((step) => ({
                        id: step.id,
                        agentName: step.agentName,
                        role: step.role,
                    }))}
                />
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
