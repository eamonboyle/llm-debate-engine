import { ResponsiveTable } from "./ResponsiveTable";
import type { AnalysisIndex } from "../lib/data";

const FILTER_LABELS: Record<string, string> = {
    questionContains: "Question contains",
    modelContains: "Model contains",
    presetEquals: "Preset",
    fastMode: "Fast mode",
    createdAfter: "Created after",
    createdBefore: "Created before",
};

function formatFilterValue(key: string, value: unknown): string {
    if (key === "fastMode") {
        return value === true
            ? "true"
            : value === false
              ? "false"
              : String(value);
    }
    return String(value);
}

export function AnalysisFilterContextCard({
    filterContext,
}: {
    filterContext: AnalysisIndex["filterContext"];
}) {
    const filterEntries = Object.entries(filterContext ?? {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
    );

    if (filterEntries.length === 0) {
        return null;
    }

    return (
        <div className="card">
            <h2 style={{ marginTop: 0 }}>Analysis filter context</h2>
            <p className="small muted">
                This index was generated from a filtered artifact subset. KPIs
                and tables on this page reflect that scope, not the full
                repository.
            </p>
            <ResponsiveTable
                columns={[
                    {
                        key: "key",
                        label: "Filter",
                        render: (row) =>
                            FILTER_LABELS[(row as { key: string }).key] ??
                            (row as { key: string }).key,
                    },
                    { key: "value", label: "Value" },
                ]}
                data={filterEntries.map(([key, value]) => ({
                    key,
                    value: formatFilterValue(key, value),
                }))}
                getRowId={(row) => (row as { key: string }).key}
            />
        </div>
    );
}
