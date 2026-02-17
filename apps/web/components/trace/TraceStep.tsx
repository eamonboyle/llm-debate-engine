"use client";

import { useState } from "react";

type Step = {
    id: string;
    agentName: string;
    role: string;
    output?: unknown;
    error?: string;
    createdAt?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

function getStepKind(output: unknown): string | null {
    if (!isRecord(output) || typeof output.kind !== "string") return null;
    return output.kind;
}

function getKindColor(kind: string): string {
    const map: Record<string, string> = {
        proposal: "var(--color-data-teal)",
        critique: "var(--color-data-coral)",
        judgement: "var(--color-accent)",
        evidence_plan: "var(--color-data-cyan)",
        counterfactual: "var(--color-data-violet)",
        decomposition: "var(--color-data-amber)",
        calibration: "var(--color-info)",
    };
    return map[kind] ?? "var(--color-text-muted)";
}

function StructuredSummary({ output }: { output: unknown }) {
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
            <div className="trace-summary">
                <p className="trace-summary-main">{answer}</p>
                {confidence != null && (
                    <p className="trace-summary-meta">confidence: {confidence}</p>
                )}
                {keyClaims.length > 0 && (
                    <ul className="trace-summary-list">
                        {keyClaims.slice(0, 6).map((claim, idx) => (
                            <li key={idx}>{claim}</li>
                        ))}
                    </ul>
                )}
            </div>
        );
    }

    if (kind === "critique") {
        const issues = Array.isArray(data.issues)
            ? data.issues.filter((v): v is Record<string, unknown> => isRecord(v))
            : [];
        return (
            <div className="trace-summary">
                <p className="trace-summary-meta">Issue count: {issues.length}</p>
                {issues.length > 0 && (
                    <ul className="trace-summary-list trace-issues">
                        {issues.slice(0, 6).map((issue, idx) => (
                            <li key={idx}>
                                <span className="trace-issue-sev">
                                    [{String(issue.severity ?? "-")}]
                                </span>{" "}
                                {String(issue.type ?? "unknown")} —{" "}
                                {String(issue.note ?? "")}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    }

    if (kind === "judgement") {
        const rubric = isRecord(data.rubricScores) ? data.rubricScores : {};
        return (
            <div className="trace-summary">
                <p className="trace-summary-meta">
                    Coherence: {String(rubric.coherence ?? "-")} · Completeness:{" "}
                    {String(rubric.completeness ?? "-")} · Factual risk:{" "}
                    {String(rubric.factualRisk ?? "-")} · Uncertainty:{" "}
                    {String(rubric.uncertaintyHandling ?? "-")}
                </p>
                {data.summary && (
                    <p className="trace-summary-main">{String(data.summary)}</p>
                )}
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
            <div className="trace-summary">
                {riskLevel != null && (
                    <p className="trace-summary-meta">Risk level: {riskLevel}</p>
                )}
                {evidenceRequirements.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">
                            Evidence requirements
                        </span>
                        <ul className="trace-summary-list">
                            {evidenceRequirements.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {verificationChecks.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">
                            Verification checks
                        </span>
                        <ul className="trace-summary-list">
                            {verificationChecks.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {majorUnknowns.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">
                            Major unknowns
                        </span>
                        <ul className="trace-summary-list">
                            {majorUnknowns.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    if (kind === "counterfactual") {
        const failureModes = Array.isArray(data.failureModes)
            ? data.failureModes
                  .filter((v): v is string => typeof v === "string")
                  .slice(0, 5)
            : [];
        const triggerConditions = Array.isArray(data.triggerConditions)
            ? data.triggerConditions
                  .filter((v): v is string => typeof v === "string")
                  .slice(0, 5)
            : [];
        const mitigations = Array.isArray(data.mitigations)
            ? data.mitigations
                  .filter((v): v is string => typeof v === "string")
                  .slice(0, 5)
            : [];
        return (
            <div className="trace-summary">
                {failureModes.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">
                            Failure modes
                        </span>
                        <ul className="trace-summary-list">
                            {failureModes.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {triggerConditions.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">
                            Trigger conditions
                        </span>
                        <ul className="trace-summary-list">
                            {triggerConditions.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {mitigations.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">Mitigations</span>
                        <ul className="trace-summary-list">
                            {mitigations.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    return null;
}

export function TraceStep({
    step,
    index,
    isLast,
}: {
    step: Step;
    index: number;
    isLast: boolean;
}) {
    const [jsonOpen, setJsonOpen] = useState(false);
    const kind = getStepKind(step.output);
    const kindColor = kind ? getKindColor(kind) : "var(--color-text-muted)";

    return (
        <div
            className={`trace-step ${isLast ? "trace-step-last" : ""}`}
            style={{ animationDelay: `${index * 0.04}s` }}
        >
            <div className="trace-step-marker" style={{ "--kind-color": kindColor } as React.CSSProperties}>
                <span className="trace-step-num">{index + 1}</span>
            </div>
            <div className="trace-step-body">
                <header className="trace-step-header">
                    <div className="trace-step-title">
                        <strong>{step.agentName}</strong>
                        {kind && (
                            <span
                                className="trace-step-badge"
                                style={{ background: kindColor }}
                            >
                                {kind}
                            </span>
                        )}
                    </div>
                    <div className="trace-step-meta">
                        <span className="trace-step-role">{step.role}</span>
                        {step.createdAt && (
                            <span className="trace-step-time">
                                {new Date(step.createdAt).toLocaleString()}
                            </span>
                        )}
                        {step.error && (
                            <span className="trace-step-error">{step.error}</span>
                        )}
                    </div>
                </header>

                <div className="trace-step-content">
                    <StructuredSummary output={step.output} />

                    <div className="trace-json-wrap">
                        <button
                            type="button"
                            className="trace-json-toggle"
                            onClick={() => setJsonOpen((o) => !o)}
                            aria-expanded={jsonOpen}
                        >
                            <span className="trace-json-toggle-icon">
                                {jsonOpen ? "▼" : "▶"}
                            </span>
                            Raw JSON output
                        </button>
                        {jsonOpen && (
                            <pre className="trace-json-pre">
                                {JSON.stringify(step.output ?? null, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
