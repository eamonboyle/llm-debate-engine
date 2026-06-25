import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    clearPinnedArtifacts,
    isArtifactPinned,
    pinArtifact,
    readPinnedArtifacts,
    togglePinnedArtifact,
    unpinArtifact,
    PINNED_ARTIFACTS_STORAGE_KEY,
} from "./pinnedArtifacts";

function createStorageMock(): Storage {
    const store = new Map<string, string>();
    return {
        get length() {
            return store.size;
        },
        clear() {
            store.clear();
        },
        getItem(key: string) {
            return store.has(key) ? store.get(key)! : null;
        },
        key(index: number) {
            return [...store.keys()][index] ?? null;
        },
        removeItem(key: string) {
            store.delete(key);
        },
        setItem(key: string, value: string) {
            store.set(key, value);
        },
    };
}

describe("pinnedArtifacts", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            localStorage: createStorageMock(),
            dispatchEvent: vi.fn(),
        });
    });

    afterEach(() => {
        window.localStorage.removeItem(PINNED_ARTIFACTS_STORAGE_KEY);
        vi.unstubAllGlobals();
    });

    it("pins and reads artifacts", () => {
        pinArtifact({
            id: "run_a",
            kind: "run",
            href: "/runs/run_a",
            title: "Question A",
        });
        expect(readPinnedArtifacts()).toHaveLength(1);
        expect(isArtifactPinned("run", "run_a")).toBe(true);
    });

    it("toggles pin state", () => {
        const entry = {
            id: "bench_1",
            kind: "benchmark" as const,
            href: "/benchmarks/bench_1",
            title: "Benchmark",
        };
        expect(togglePinnedArtifact(entry)).toBe(true);
        expect(togglePinnedArtifact(entry)).toBe(false);
        expect(readPinnedArtifacts()).toEqual([]);
    });

    it("unpins a specific artifact", () => {
        pinArtifact({
            id: "run_a",
            kind: "run",
            href: "/runs/run_a",
            title: "A",
        });
        pinArtifact({
            id: "run_b",
            kind: "run",
            href: "/runs/run_b",
            title: "B",
        });
        unpinArtifact("run", "run_a");
        expect(readPinnedArtifacts().map((entry) => entry.id)).toEqual([
            "run_b",
        ]);
    });

    it("clears all pinned artifacts", () => {
        pinArtifact({
            id: "run_a",
            kind: "run",
            href: "/runs/run_a",
            title: "A",
        });
        clearPinnedArtifacts();
        expect(readPinnedArtifacts()).toEqual([]);
    });
});
