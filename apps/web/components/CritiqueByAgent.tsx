import { ResponsiveTable } from "./ResponsiveTable";
import type { CritiqueAgentSummary } from "../lib/critiqueByAgent";

type CritiqueByAgentProps = {
    entries: CritiqueAgentSummary[];
};

function formatAgentLabel(entry: CritiqueAgentSummary): string {
    if (entry.role.toLowerCase() === "skeptic") return "Skeptic";
    if (entry.role.toLowerCase() === "redteam") return "Red team";
    return entry.agentName;
}

export function CritiqueByAgent({ entries }: CritiqueByAgentProps) {
    if (entries.length === 0) {
        return (
            <p className="muted">
                No per-agent critique steps in this trace (standard preset runs
                may only include Skeptic).
            </p>
        );
    }

    return (
        <ResponsiveTable
            columns={[
                {
                    key: "agent",
                    label: "Agent",
                    render: (row) =>
                        formatAgentLabel(row as CritiqueAgentSummary),
                },
                {
                    key: "issueCount",
                    label: "Issues",
                },
                {
                    key: "maxSeverity",
                    label: "Max severity",
                    hideOnMobile: true,
                    render: (row) => {
                        const value = (row as CritiqueAgentSummary).maxSeverity;
                        return typeof value === "number"
                            ? value.toFixed(1)
                            : "—";
                    },
                },
                {
                    key: "avgSeverity",
                    label: "Avg severity",
                    hideOnMobile: true,
                    render: (row) => {
                        const value = (row as CritiqueAgentSummary).avgSeverity;
                        return typeof value === "number"
                            ? value.toFixed(2)
                            : "—";
                    },
                },
                {
                    key: "topTypes",
                    label: "Top issue types",
                    hideOnMobile: true,
                    render: (row) => {
                        const byType = (row as CritiqueAgentSummary).byType;
                        const top = Object.entries(byType)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([type, count]) => `${type} (${count})`)
                            .join(", ");
                        return top || "—";
                    },
                },
            ]}
            data={entries}
            getRowId={(row) =>
                `${(row as CritiqueAgentSummary).agentName}-${(row as CritiqueAgentSummary).role}`
            }
        />
    );
}
