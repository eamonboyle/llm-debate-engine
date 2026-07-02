export type LeaderboardCompareSuggestion = {
    key: string;
    runCount: number;
    href: string;
    reason: string;
};

export type LeaderboardCompareEntry = {
    key: string;
    runCount: number;
};

function buildHref(
    basePath: string,
    left: string,
    right: string,
    extraParams?: Record<string, string>,
): string {
    const params = new URLSearchParams({ left, right });
    if (extraParams) {
        for (const [name, value] of Object.entries(extraParams)) {
            if (value) params.set(name, value);
        }
    }
    return `${basePath}?${params.toString()}`;
}

export function buildLeaderboardCompareSuggestions(
    entries: LeaderboardCompareEntry[],
    selected: {
        left?: string;
        right?: string;
    },
    basePath: string,
    extraParams?: Record<string, string>,
    limit = 6,
): LeaderboardCompareSuggestion[] {
    const leftKey = (selected.left ?? "").trim();
    const rightKey = (selected.right ?? "").trim();
    if (!leftKey && !rightKey) return [];
    if (leftKey && rightKey) return [];

    const anchorKey = leftKey || rightKey;
    const anchor = entries.find((entry) => entry.key === anchorKey);
    if (!anchor) return [];

    const side = leftKey ? "right" : "left";
    const candidates = entries
        .filter((entry) => entry.key !== anchorKey)
        .sort((a, b) => b.runCount - a.runCount);

    const similar = [...candidates].sort(
        (a, b) =>
            Math.abs(a.runCount - anchor.runCount) -
                Math.abs(b.runCount - anchor.runCount) ||
            b.runCount - a.runCount,
    );

    const seen = new Set<string>();
    const suggestions: LeaderboardCompareSuggestion[] = [];

    const push = (entry: LeaderboardCompareEntry, reason: string): void => {
        if (seen.has(entry.key)) return;
        seen.add(entry.key);
        suggestions.push({
            key: entry.key,
            runCount: entry.runCount,
            href:
                side === "right"
                    ? buildHref(basePath, anchorKey, entry.key, extraParams)
                    : buildHref(basePath, entry.key, anchorKey, extraParams),
            reason,
        });
    };

    for (const entry of similar.slice(0, Math.ceil(limit / 2))) {
        const diff = Math.abs(entry.runCount - anchor.runCount);
        const reason =
            diff <= 1 || diff / Math.max(anchor.runCount, 1) <= 0.25
                ? `Similar sample size (${entry.runCount} runs)`
                : `${entry.runCount} indexed runs`;
        push(entry, reason);
        if (suggestions.length >= limit) break;
    }

    for (const entry of candidates) {
        if (suggestions.length >= limit) break;
        push(entry, `Largest sample (${entry.runCount} runs)`);
    }

    return suggestions.slice(0, limit);
}
