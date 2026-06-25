export type PinnedArtifactKind = "run" | "benchmark";

export type PinnedArtifactEntry = {
    id: string;
    kind: PinnedArtifactKind;
    href: string;
    title: string;
    pinnedAt: string;
};

export const PINNED_ARTIFACTS_STORAGE_KEY = "llm-debate-pinned-artifacts";
export const PINNED_ARTIFACTS_MAX = 24;

export function readPinnedArtifacts(): PinnedArtifactEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(PINNED_ARTIFACTS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as PinnedArtifactEntry[];
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

export function isArtifactPinned(
    kind: PinnedArtifactKind,
    id: string,
): boolean {
    return readPinnedArtifacts().some(
        (entry) => entry.kind === kind && entry.id === id,
    );
}

export function pinArtifact(
    entry: Omit<PinnedArtifactEntry, "pinnedAt">,
): void {
    if (typeof window === "undefined") return;
    const next: PinnedArtifactEntry = {
        ...entry,
        pinnedAt: new Date().toISOString(),
    };
    const existing = readPinnedArtifacts().filter(
        (item) => !(item.kind === next.kind && item.id === next.id),
    );
    const merged = [next, ...existing].slice(0, PINNED_ARTIFACTS_MAX);
    window.localStorage.setItem(
        PINNED_ARTIFACTS_STORAGE_KEY,
        JSON.stringify(merged),
    );
    window.dispatchEvent(new CustomEvent("pinned-artifacts-updated"));
}

export function unpinArtifact(kind: PinnedArtifactKind, id: string): void {
    if (typeof window === "undefined") return;
    const merged = readPinnedArtifacts().filter(
        (item) => !(item.kind === kind && item.id === id),
    );
    window.localStorage.setItem(
        PINNED_ARTIFACTS_STORAGE_KEY,
        JSON.stringify(merged),
    );
    window.dispatchEvent(new CustomEvent("pinned-artifacts-updated"));
}

export function togglePinnedArtifact(
    entry: Omit<PinnedArtifactEntry, "pinnedAt">,
): boolean {
    if (isArtifactPinned(entry.kind, entry.id)) {
        unpinArtifact(entry.kind, entry.id);
        return false;
    }
    pinArtifact(entry);
    return true;
}

export function clearPinnedArtifacts(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(PINNED_ARTIFACTS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("pinned-artifacts-updated"));
}
