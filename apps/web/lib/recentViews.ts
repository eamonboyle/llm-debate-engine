export type RecentViewKind = "run" | "benchmark";

export type RecentViewEntry = {
    id: string;
    kind: RecentViewKind;
    href: string;
    title: string;
    viewedAt: string;
};

export const RECENT_VIEWS_STORAGE_KEY = "llm-debate-recent-views";
export const RECENT_VIEWS_MAX = 12;

export function readRecentViews(): RecentViewEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(RECENT_VIEWS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as RecentViewEntry[];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (entry) =>
                entry &&
                typeof entry.id === "string" &&
                typeof entry.href === "string" &&
                typeof entry.title === "string" &&
                (entry.kind === "run" || entry.kind === "benchmark"),
        );
    } catch {
        return [];
    }
}

export function recordRecentView(
    entry: Omit<RecentViewEntry, "viewedAt">,
): void {
    if (typeof window === "undefined") return;
    const next: RecentViewEntry = {
        ...entry,
        viewedAt: new Date().toISOString(),
    };
    const existing = readRecentViews().filter(
        (item) => !(item.kind === next.kind && item.id === next.id),
    );
    const merged = [next, ...existing].slice(0, RECENT_VIEWS_MAX);
    window.localStorage.setItem(
        RECENT_VIEWS_STORAGE_KEY,
        JSON.stringify(merged),
    );
    window.dispatchEvent(new CustomEvent("recent-views-updated"));
}

export function clearRecentViews(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(RECENT_VIEWS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("recent-views-updated"));
}
