import { CollapsibleFilterCard } from "./CollapsibleFilterCard";
import { ModelFilterSelect } from "./ModelFilterSelect";
import { PresetFilterSelect } from "./PresetFilterSelect";
import type { ArtifactFilterParams } from "../lib/data";

type InsightFilterCardProps = {
    action: string;
    models: string[];
    presets: string[];
    params: ArtifactFilterParams & Record<string, string | undefined>;
    totalRuns: number;
    filteredRuns: number;
    preserveKeys?: string[];
    entityLabel?: string;
};

export function InsightFilterCard({
    action,
    models,
    presets,
    params,
    totalRuns,
    filteredRuns,
    preserveKeys = [],
    entityLabel = "runs",
}: InsightFilterCardProps) {
    const clearHref = (() => {
        const query = new URLSearchParams();
        for (const key of preserveKeys) {
            const value = params[key];
            if (typeof value === "string" && value.length > 0) {
                query.set(key, value);
            }
        }
        const suffix = query.toString();
        return suffix ? `${action}?${suffix}` : action;
    })();

    return (
        <CollapsibleFilterCard
            resultsSummary={
                <>
                    {filteredRuns} of {totalRuns} {entityLabel}
                </>
            }
        >
            <form method="get" action={action}>
                {preserveKeys.map((key) => {
                    const value = params[key];
                    if (!value) return null;
                    return (
                        <input
                            key={key}
                            type="hidden"
                            name={key}
                            value={value}
                        />
                    );
                })}
                <div className="filter-grid">
                    <input
                        name="q"
                        placeholder="Search question / answer"
                        defaultValue={params.q ?? ""}
                        className="input"
                    />
                    <ModelFilterSelect
                        models={models}
                        defaultValue={params.model ?? ""}
                    />
                    <PresetFilterSelect
                        presets={presets}
                        defaultValue={params.preset ?? ""}
                    />
                    <select
                        name="fast"
                        defaultValue={params.fast ?? ""}
                        className="input"
                    >
                        <option value="">Fast mode: any</option>
                        <option value="true">Fast only</option>
                        <option value="false">Non-fast only</option>
                    </select>
                    <input
                        type="datetime-local"
                        name="from"
                        defaultValue={params.from ?? ""}
                        className="input"
                        title="Created at or after"
                    />
                    <input
                        type="datetime-local"
                        name="to"
                        defaultValue={params.to ?? ""}
                        className="input"
                        title="Created at or before"
                    />
                </div>
                <div className="filter-actions">
                    <button type="submit" className="button">
                        Apply filters
                    </button>
                    <a href={clearHref} className="button secondary">
                        Clear
                    </a>
                </div>
            </form>
        </CollapsibleFilterCard>
    );
}
