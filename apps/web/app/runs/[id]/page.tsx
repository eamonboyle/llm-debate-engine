import { notFound } from "next/navigation";
import { loadRunById } from "../../../lib/data";

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

function renderStructuredSummary(output: unknown) {
    if (!isRecord(output)) return null;
    const kind = output.kind;
    const data = output.data;
    if (!isRecord(data) || typeof kind !== "string") return null;

    if (kind === "proposal") {
        const answer =
            typeof data.answer === "string" ? data.answer : "(missing answer)";
        const confidence =
            typeof data.confidence === "number" ? data.confidence : undefined;
        const keyClaims = Array.isArray(data.keyClaims)
            ? data.keyClaims.filter((v): v is string => typeof v === "string")
            : [];
        return (
            <div className="card" style={{ marginTop: 12 }}>
                <div className="small muted">Structured summary</div>
                <p style={{ marginTop: 6 }}>{answer}</p>
                <p className="small muted">
                    confidence: {confidence == null ? "-" : confidence}
                </p>
                {keyClaims.length > 0 ? (
                    <ul style={{ marginTop: 6 }}>
                        {keyClaims.slice(0, 6).map((claim, idx) => (
                            <li key={`${claim}-${idx}`}>{claim}</li>
                        ))}
                    </ul>
                ) : null}
            </div>
        );
    }

    if (kind === "critique") {
        const issues = Array.isArray(data.issues)
            ? data.issues.filter((v): v is Record<string, unknown> => isRecord(v))
            : [];
        return (
            <div className="card" style={{ marginTop: 12 }}>
                <div className="small muted">Structured summary</div>
                <p style={{ marginTop: 6 }}>Issue count: {issues.length}</p>
                {issues.length > 0 ? (
                    <ul style={{ marginTop: 6 }}>
                        {issues.slice(0, 6).map((issue, idx) => (
                            <li key={`issue-${idx}`}>
                                [{String(issue.severity ?? "-")}]{" "}
                                {String(issue.type ?? "unknown")} —{" "}
                                {String(issue.note ?? "")}
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>
        );
    }

    if (kind === "judgement") {
        const rubric = isRecord(data.rubricScores) ? data.rubricScores : {};
        return (
            <div className="card" style={{ marginTop: 12 }}>
                <div className="small muted">Structured summary</div>
                <p style={{ marginTop: 6 }}>
                    Coherence: {String(rubric.coherence ?? "-")} · Completeness:{" "}
                    {String(rubric.completeness ?? "-")} · Factual risk:{" "}
                    {String(rubric.factualRisk ?? "-")} · Uncertainty handling:{" "}
                    {String(rubric.uncertaintyHandling ?? "-")}
                </p>
                <p className="small muted">{String(data.summary ?? "")}</p>
            </div>
        );
    }

    if (kind === "evidence_plan") {
        const evidenceRequirements = Array.isArray(data.evidenceRequirements)
            ? data.evidenceRequirements
                  .filter((v): v is string => typeof v === "string")
                  .slice(0, 6)
            : [];
        const verificationChecks = Array.isArray(data.verificationChecks)
            ? data.verificationChecks
                  .filter((v): v is string => typeof v === "string")
                  .slice(0, 6)
            : [];
        const majorUnknowns = Array.isArray(data.majorUnknowns)
            ? data.majorUnknowns
                  .filter((v): v is string => typeof v === "string")
                  .slice(0, 4)
            : [];
        const riskLevel =
            typeof data.riskLevel === "number" ? data.riskLevel : undefined;
        return (
            <div className="card" style={{ marginTop: 12 }}>
                <div className="small muted">Structured summary</div>
                <p className="small muted">Risk level: {riskLevel ?? "-"}</p>
                {evidenceRequirements.length > 0 ? (
                    <>
                        <p style={{ marginTop: 6, marginBottom: 4 }}>
                            Evidence requirements
                        </p>
                        <ul>
                            {evidenceRequirements.map((item, idx) => (
                                <li key={`ev-${idx}`}>{item}</li>
                            ))}
                        </ul>
                    </>
                ) : null}
                {verificationChecks.length > 0 ? (
                    <>
                        <p style={{ marginTop: 6, marginBottom: 4 }}>
                            Verification checks
                        </p>
                        <ul>
                            {verificationChecks.map((item, idx) => (
                                <li key={`vc-${idx}`}>{item}</li>
                            ))}
                        </ul>
                    </>
                ) : null}
                {majorUnknowns.length > 0 ? (
                    <>
                        <p style={{ marginTop: 6, marginBottom: 4 }}>
                            Major unknowns
                        </p>
                        <ul>
                            {majorUnknowns.map((item, idx) => (
                                <li key={`mu-${idx}`}>{item}</li>
                            ))}
                        </ul>
                    </>
                ) : null}
            </div>
        );
    }

    return null;
}

export default async function RunTracePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const run = await loadRunById(id);
    if (!run) notFound();

    return (
        <section className="stack">
            <div>
                <h1 className="title">Run trace</h1>
                <p className="subtitle">
                    {run.id} · {new Date(run.metadata.createdAt).toLocaleString()}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a href={`/runs/compare?left=${run.id}`} className="button secondary">
                        Compare as left
                    </a>
                    <a href={`/runs/compare?right=${run.id}`} className="button secondary">
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
                    <div style={{ marginTop: 6 }}>{run.metadata.pipelinePreset}</div>
                </div>
                <div className="card">
                    <div className="small muted">Fast mode</div>
                    <div style={{ marginTop: 6 }}>
                        {run.metadata.fastMode ? "true" : "false"}
                    </div>
                </div>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Final answer</h2>
                <p>{run.run.finalAnswer}</p>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Step-by-step outputs</h2>
                <div className="stack">
                    {run.run.steps.map((step, idx) => (
                        <div
                            key={step.id}
                            className="card"
                            style={{ background: "#020617", borderColor: "#334155" }}
                        >
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                <strong>
                                    {idx + 1}. {step.agentName}
                                </strong>
                                <span className="small muted">role: {step.role}</span>
                                {step.createdAt ? (
                                    <span className="small muted">
                                        created: {new Date(step.createdAt).toLocaleString()}
                                    </span>
                                ) : null}
                                {step.error ? (
                                    <span style={{ color: "#fca5a5" }}>error: {step.error}</span>
                                ) : null}
                            </div>
                            {renderStructuredSummary(step.output)}
                            <pre
                                style={{
                                    marginTop: 12,
                                    overflowX: "auto",
                                    padding: 12,
                                    background: "#0f172a",
                                    borderRadius: 8,
                                    border: "1px solid #1e293b",
                                    fontSize: 12,
                                }}
                            >
                                {JSON.stringify(step.output ?? null, null, 2)}
                            </pre>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
