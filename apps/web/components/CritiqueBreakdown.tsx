import { ResponsiveTable } from "./ResponsiveTable";
import type { CritiqueTypeCount } from "../lib/critiqueBreakdown";

type CritiqueBreakdownProps = {
    entries: CritiqueTypeCount[];
};

export function CritiqueBreakdown({ entries }: CritiqueBreakdownProps) {
    if (entries.length === 0) {
        return (
            <p className="muted">
                No per-type critique breakdown in this artifact.
            </p>
        );
    }

    const total = entries.reduce((sum, entry) => sum + entry.count, 0);

    return (
        <ResponsiveTable
            columns={[
                { key: "type", label: "Issue type" },
                { key: "count", label: "Count" },
                {
                    key: "share",
                    label: "Share",
                    render: (row) => {
                        const count = (row as { count: number }).count;
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return `${pct.toFixed(0)}%`;
                    },
                },
            ]}
            data={entries}
            getRowId={(row) => (row as { type: string }).type}
        />
    );
}
