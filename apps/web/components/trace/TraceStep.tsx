"use client";

import { useState, type ReactNode } from "react";
import { InfoTooltip } from "../InfoTooltip";

type StepRequest = {
    model?: string;
    temperature?: number;
    schemaName?: string;
    messages?: Array<{ role?: string; content?: string }>;
};

type Step = {
    id: string;
    agentName: string;
    role: string;
    output?: unknown;
    request?: StepRequest;
    rawAttempts?: unknown[];
    error?: string;
    createdAt?: string;
    completedAt?: string;
};

function formatMessageContent(content: string | undefined, max = 280): string {
    if (!content) return "";
    const normalized = content.replace(/\s+/g, " ").trim();
    if (normalized.length <= max) return normalized;
    return `${normalized.slice(0, max)}…`;
}

function RequestSummary({ request }: { request: StepRequest }) {
    const messages = request.messages ?? [];
    const metaParts = [
        request.model ? `model: ${request.model}` : null,
        request.temperature != null
            ? `temperature: ${request.temperature}`
            : null,
        request.schemaName ? `schema: ${request.schemaName}` : null,
    ].filter(Boolean);

    return (
        <div className="trace-summary">
            {metaParts.length > 0 ? (
                <p className="trace-summary-meta">{metaParts.join(" · ")}</p>
            ) : null}
            {messages.length > 0 ? (
                <div className="trace-summary-block">
                    <span className="trace-summary-label">
                        Messages ({messages.length})
                    </span>
                    <ul className="trace-summary-list">
                        {messages.map((message, idx) => (
                            <li key={idx}>
                                <strong>{message.role ?? "unknown"}:</strong>{" "}
                                {formatMessageContent(message.content)}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}

function CollapsibleTracePanel({
    label,
    children,
    defaultOpen = false,
}: {
    label: string;
    children: ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="trace-json-wrap">
            <button
                type="button"
                className="trace-json-toggle"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
            >
                <span className="trace-json-toggle-icon">
                    {open ? "▼" : "▶"}
                </span>
                {label}
            </button>
            {open ? children : null}
        </div>
    );
}

function formatStepDuration(
    createdAt: string | undefined,
    completedAt: string | undefined,
): string | null {
    if (!createdAt || !completedAt) return null;
    const start = Date.parse(createdAt);
    const end = Date.parse(completedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        return null;
    }
    const ms = end - start;
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return `${minutes}m ${remainder}s`;
}

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
        const assumptions = Array.isArray(data.assumptions)
            ? data.assumptions.filter((v): v is string => typeof v === "string")
            : [];
        return (
            <div className="trace-summary">
                <p className="trace-summary-main">{answer}</p>
                {confidence != null && (
                    <p className="trace-summary-meta">
                        confidence: {confidence}
                    </p>
                )}
                {keyClaims.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">Key claims</span>
                        <ul className="trace-summary-list">
                            {keyClaims.slice(0, 6).map((claim, idx) => (
                                <li key={idx}>{claim}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {assumptions.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">Assumptions</span>
                        <ul className="trace-summary-list">
                            {assumptions.slice(0, 6).map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    if (kind === "critique") {
        const issues = Array.isArray(data.issues)
            ? data.issues.filter((v): v is Record<string, unknown> =>
                  isRecord(v),
              )
            : [];
        return (
            <div className="trace-summary">
                <p className="trace-summary-meta">
                    Issue count: {issues.length}
                </p>
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
        const strengths = Array.isArray(data.strengths)
            ? data.strengths.filter((v): v is string => typeof v === "string")
            : [];
        const weaknesses = Array.isArray(data.weaknesses)
            ? data.weaknesses.filter((v): v is string => typeof v === "string")
            : [];
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
                {strengths.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">Strengths</span>
                        <ul className="trace-summary-list">
                            {strengths.slice(0, 5).map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {weaknesses.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">Weaknesses</span>
                        <ul className="trace-summary-list">
                            {weaknesses.slice(0, 5).map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
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
                    <p className="trace-summary-meta">
                        Risk level: {riskLevel}
                    </p>
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

    if (kind === "decomposition") {
        const framing =
            typeof data.framing === "string" ? data.framing : undefined;
        const subQuestions = Array.isArray(data.subQuestions)
            ? data.subQuestions
                  .filter((v): v is string => typeof v === "string")
                  .slice(0, 6)
            : [];
        const hypotheses = Array.isArray(data.hypotheses)
            ? data.hypotheses
                  .filter((v): v is string => typeof v === "string")
                  .slice(0, 6)
            : [];
        return (
            <div className="trace-summary">
                {framing && <p className="trace-summary-main">{framing}</p>}
                {subQuestions.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">
                            Sub-questions
                        </span>
                        <ul className="trace-summary-list">
                            {subQuestions.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {hypotheses.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">Hypotheses</span>
                        <ul className="trace-summary-list">
                            {hypotheses.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    if (kind === "calibration") {
        const adjustedConfidence =
            typeof data.adjustedConfidence === "number"
                ? data.adjustedConfidence
                : undefined;
        const rationale =
            typeof data.rationale === "string" ? data.rationale : undefined;
        const claimConfidences = Array.isArray(data.claimConfidences)
            ? data.claimConfidences
                  .filter((v): v is Record<string, unknown> => isRecord(v))
                  .slice(0, 6)
            : [];
        return (
            <div className="trace-summary">
                {adjustedConfidence != null && (
                    <p className="trace-summary-meta">
                        Adjusted confidence: {adjustedConfidence}
                    </p>
                )}
                {rationale && <p className="trace-summary-main">{rationale}</p>}
                {claimConfidences.length > 0 && (
                    <div className="trace-summary-block">
                        <span className="trace-summary-label">
                            Claim confidences
                        </span>
                        <ul className="trace-summary-list">
                            {claimConfidences.map((item, idx) => (
                                <li key={idx}>
                                    {String(item.claim ?? "claim")} —{" "}
                                    {String(item.confidence ?? "-")}
                                </li>
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
    const duration = formatStepDuration(step.createdAt, step.completedAt);

    return (
        <div
            id={`step-${step.id}`}
            className={`trace-step ${isLast ? "trace-step-last" : ""}`}
            style={{ animationDelay: `${index * 0.04}s` }}
        >
            <div
                className="trace-step-marker"
                style={{ "--kind-color": kindColor } as React.CSSProperties}
            >
                <span className="trace-step-num">{index + 1}</span>
            </div>
            <div className="trace-step-body">
                <header className="trace-step-header">
                    <div className="trace-step-title">
                        <strong>
                            {step.agentName}
                            <InfoTooltip
                                helpKey={
                                    step.agentName in
                                    {
                                        SolverAgent: 1,
                                        SolverRevisionAgent: 1,
                                        SynthesizerAgent: 1,
                                        EvidencePlannerAgent: 1,
                                        CounterfactualAgent: 1,
                                    }
                                        ? step.agentName
                                        : undefined
                                }
                            />
                        </strong>
                        {kind && (
                            <span className="trace-step-badge-wrap">
                                <span
                                    className="trace-step-badge"
                                    style={{ background: kindColor }}
                                >
                                    {kind}
                                </span>
                                <InfoTooltip
                                    helpKey={
                                        [
                                            "proposal",
                                            "critique",
                                            "judgement",
                                            "evidence_plan",
                                            "counterfactual",
                                            "decomposition",
                                            "calibration",
                                        ].includes(kind)
                                            ? kind
                                            : undefined
                                    }
                                />
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
                        {duration ? (
                            <span className="trace-step-duration">
                                {duration}
                            </span>
                        ) : null}
                        {step.error && (
                            <span className="trace-step-error">
                                {step.error}
                            </span>
                        )}
                    </div>
                </header>

                <div className="trace-step-content">
                    <StructuredSummary output={step.output} />

                    {step.request ? (
                        <CollapsibleTracePanel label="LLM request (prompt)">
                            <RequestSummary request={step.request} />
                            <pre className="trace-json-pre">
                                {JSON.stringify(step.request, null, 2)}
                            </pre>
                        </CollapsibleTracePanel>
                    ) : null}

                    {step.rawAttempts && step.rawAttempts.length > 0 ? (
                        <CollapsibleTracePanel
                            label={`Parse retries (${step.rawAttempts.length})`}
                        >
                            <p className="trace-summary-meta">
                                Structured output attempts before the final
                                parsed response.
                            </p>
                            <pre className="trace-json-pre">
                                {JSON.stringify(step.rawAttempts, null, 2)}
                            </pre>
                        </CollapsibleTracePanel>
                    ) : null}

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
