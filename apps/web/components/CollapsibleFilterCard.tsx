"use client";

import { useState, useEffect, type ReactNode } from "react";

const MOBILE_BREAKPOINT = 900;

export function CollapsibleFilterCard({
    children,
    summaryLabel = "Filters",
    resultsSummary,
}: {
    children: ReactNode;
    summaryLabel?: string;
    resultsSummary?: ReactNode;
}) {
    const [isMobile, setIsMobile] = useState(true);

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    return (
        <details
            className="filter-card-collapsible"
            open={!isMobile}
        >
            <summary className="filter-card-summary">
                <span className="filter-card-summary-label">{summaryLabel}</span>
                {resultsSummary ? (
                    <span className="filter-card-summary-results">{resultsSummary}</span>
                ) : null}
            </summary>
            <div className="filter-card-content">{children}</div>
        </details>
    );
}
