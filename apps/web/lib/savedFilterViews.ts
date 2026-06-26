export type SavedFilterViewScope = "runs" | "benchmarks";

export type SavedFilterView = {
    id: string;
    scope: SavedFilterViewScope;
    name: string;
    params: Record<string, string>;
    savedAt: string;
};

export const SAVED_FILTER_VIEWS_STORAGE_KEY = "llm-debate-saved-filter-views";
export const SAVED_FILTER_VIEWS_MAX = 12;

function isRecord(value: unknown): value is Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    return Object.values(value).every((entry) => typeof entry === "string");
}

export function readSavedFilterViews(
    scope?: SavedFilterViewScope,
): SavedFilterView[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(SAVED_FILTER_VIEWS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as SavedFilterView[];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (entry) =>
                entry &&
                typeof entry.id === "string" &&
                (entry.scope === "runs" || entry.scope === "benchmarks") &&
                typeof entry.name === "string" &&
                isRecord(entry.params) &&
                typeof entry.savedAt === "string" &&
                (!scope || entry.scope === scope),
        );
    } catch {
        return [];
    }
}

export function saveFilterView(
    scope: SavedFilterViewScope,
    name: string,
    params: Record<string, string>,
): SavedFilterView {
    if (typeof window === "undefined") {
        throw new Error("Filter views can only be saved in the browser");
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
        throw new Error("Filter view name is required");
    }

    const cleanedParams = Object.fromEntries(
        Object.entries(params).filter(
            ([, value]) => typeof value === "string" && value.length > 0,
        ),
    );

    const entry: SavedFilterView = {
        id: `${scope}:${trimmedName.toLowerCase().replace(/\s+/g, "-")}:${Date.now()}`,
        scope,
        name: trimmedName,
        params: cleanedParams,
        savedAt: new Date().toISOString(),
    };

    const existing = readSavedFilterViews().filter(
        (item) =>
            !(
                item.scope === scope &&
                item.name.toLowerCase() === trimmedName.toLowerCase()
            ),
    );
    const merged = [entry, ...existing].slice(0, SAVED_FILTER_VIEWS_MAX);
    window.localStorage.setItem(
        SAVED_FILTER_VIEWS_STORAGE_KEY,
        JSON.stringify(merged),
    );
    window.dispatchEvent(new CustomEvent("saved-filter-views-updated"));
    return entry;
}

export function deleteSavedFilterView(id: string): void {
    if (typeof window === "undefined") return;
    const next = readSavedFilterViews().filter((entry) => entry.id !== id);
    window.localStorage.setItem(
        SAVED_FILTER_VIEWS_STORAGE_KEY,
        JSON.stringify(next),
    );
    window.dispatchEvent(new CustomEvent("saved-filter-views-updated"));
}

export function buildFilterViewHref(
    basePath: string,
    params: Record<string, string>,
): string {
    const query = new URLSearchParams(params).toString();
    return query ? `${basePath}?${query}` : basePath;
}
