import Link from "next/link";
import type { ArtifactFilterParams } from "../lib/data";
import { hasActiveIndexFilters } from "../lib/indexFilters";

type ActiveIndexFiltersNoticeProps = {
    filters: ArtifactFilterParams;
    filteredRunCount: number;
    totalRunCount: number;
    clearHref: string;
};

export function ActiveIndexFiltersNotice({
    filters,
    filteredRunCount,
    totalRunCount,
    clearHref,
}: ActiveIndexFiltersNoticeProps) {
    if (!hasActiveIndexFilters(filters)) {
        return null;
    }

    return (
        <div className="card">
            <p className="muted" style={{ margin: 0 }}>
                Comparing within a filtered index — {filteredRunCount} of{" "}
                {totalRunCount} indexed run{totalRunCount === 1 ? "" : "s"}.
                Metrics reflect only runs matching the active filters.{" "}
                <Link href={clearHref}>Clear filters</Link>
            </p>
        </div>
    );
}
