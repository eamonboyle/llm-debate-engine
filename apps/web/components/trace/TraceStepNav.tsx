"use client";

type TraceStepNavItem = {
    id: string;
    agentName: string;
    role: string;
};

export function TraceStepNav({ steps }: { steps: TraceStepNavItem[] }) {
    if (steps.length < 2) return null;

    return (
        <nav className="trace-step-nav" aria-label="Pipeline steps">
            <p className="small muted" style={{ margin: "0 0 0.5rem" }}>
                Jump to step
            </p>
            <ol className="trace-step-nav-list">
                {steps.map((step, index) => (
                    <li key={step.id}>
                        <a
                            href={`#step-${step.id}`}
                            className="trace-step-nav-link"
                        >
                            <span className="trace-step-nav-num">
                                {index + 1}
                            </span>
                            <span className="trace-step-nav-label">
                                {step.agentName}
                            </span>
                            <span className="trace-step-nav-role small muted">
                                {step.role}
                            </span>
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
}
