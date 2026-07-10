import type { ArtifactFilterParams } from "./data";
import { hasActiveIndexFilters } from "./indexFilters";
import { buildQueryString } from "./listPagination";

export function pickIndexFilterParams(
    params: Record<string, string | undefined>,
): ArtifactFilterParams {
    return {
        q: params.q,
        model: params.model,
        preset: params.preset,
        fast: params.fast,
        from: params.from,
        to: params.to,
    };
}

export function indexFilterExtraParams(
    filters: ArtifactFilterParams,
): Record<string, string> {
    const extra: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
        if (typeof value === "string" && value.length > 0) {
            extra[key] = value;
        }
    }
    return extra;
}

export function buildLeaderboardSideCompareHref(
    basePath: "/leaderboard/compare" | "/presets/compare",
    side: "left" | "right",
    key: string,
    filters: ArtifactFilterParams = {},
): string {
    return `${basePath}${buildQueryString(
        {
            ...filters,
            [side]: key,
        },
        {},
    )}`;
}

export function hasCompareFilterContext(
    filters: ArtifactFilterParams,
): boolean {
    return hasActiveIndexFilters(filters);
}
