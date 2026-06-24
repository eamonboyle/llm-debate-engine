export const SAVED_FILTERS_STORAGE_KEY = "llm-debate-saved-filters";
export const SAVED_FILTERS_MAX = 16;

export type SavedFilterEntry = {
    id: string;
    label: string;
    href: string;
    savedAt: string;
};

function isSavedFilterEntry(value: unknown): value is SavedFilterEntry {
    if (!value || typeof value !== "object") return false;
    const entry = value as SavedFilterEntry;
    return (
        typeof entry.id === "string" &&
        typeof entry.label === "string" &&
        typeof entry.href === "string" &&
        typeof entry.savedAt === "string"
    );
}

export function readSavedFilters(): SavedFilterEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(SAVED_FILTERS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isSavedFilterEntry);
    } catch {
        return [];
    }
}

function buildLabelFromHref(href: string): string {
    const url = new URL(href, "http://local");
    const parts: string[] = [url.pathname.replace(/^\//, "") || "home"];
    const query = url.searchParams;
    const q = query.get("q") ?? query.get("verdictQ");
    if (q) parts.push(`"${q.slice(0, 32)}${q.length > 32 ? "…" : ""}"`);
    if (query.get("model")) parts.push(`model:${query.get("model")}`);
    if (query.get("preset")) parts.push(query.get("preset")!);
    if (query.get("fast") === "true") parts.push("fast");
    if (query.get("fast") === "false") parts.push("non-fast");
    return parts.join(" · ");
}

export function saveCurrentFilter(href: string, label?: string): void {
    if (typeof window === "undefined") return;
    const trimmedHref = href.trim();
    if (!trimmedHref) return;

    const next: SavedFilterEntry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        label: label?.trim() || buildLabelFromHref(trimmedHref),
        href: trimmedHref,
        savedAt: new Date().toISOString(),
    };

    const existing = readSavedFilters().filter(
        (entry) => entry.href !== next.href,
    );
    const merged = [next, ...existing].slice(0, SAVED_FILTERS_MAX);
    window.localStorage.setItem(
        SAVED_FILTERS_STORAGE_KEY,
        JSON.stringify(merged),
    );
    window.dispatchEvent(new CustomEvent("saved-filters-updated"));
}

export function removeSavedFilter(id: string): void {
    if (typeof window === "undefined") return;
    const next = readSavedFilters().filter((entry) => entry.id !== id);
    window.localStorage.setItem(
        SAVED_FILTERS_STORAGE_KEY,
        JSON.stringify(next),
    );
    window.dispatchEvent(new CustomEvent("saved-filters-updated"));
}

export function clearSavedFilters(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(SAVED_FILTERS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("saved-filters-updated"));
}
