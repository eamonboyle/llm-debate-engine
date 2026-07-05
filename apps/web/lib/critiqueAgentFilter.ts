export type CritiqueAgentFilter = "all" | "skeptic" | "redteam";

export function parseCritiqueAgentFilter(
    value: string | undefined,
): CritiqueAgentFilter {
    const normalized = (value ?? "").trim().toLowerCase();
    if (normalized === "skeptic" || normalized === "redteam") {
        return normalized;
    }
    return "all";
}

export function matchesCritiqueAgentFilter(
    role: string,
    filter: CritiqueAgentFilter,
): boolean {
    if (filter === "all") return true;
    const normalized = role.trim().toLowerCase();
    if (filter === "skeptic") return normalized === "skeptic";
    if (filter === "redteam") {
        return normalized === "redteam" || normalized === "red_team";
    }
    const _exhaustive: never = filter;
    return _exhaustive;
}

export function critiqueAgentFilterLabel(filter: CritiqueAgentFilter): string {
    switch (filter) {
        case "all":
            return "All critique agents";
        case "skeptic":
            return "Skeptic only";
        case "redteam":
            return "Red team only";
        default: {
            const _exhaustive: never = filter;
            return _exhaustive;
        }
    }
}
