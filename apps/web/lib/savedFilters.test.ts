import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    clearSavedFilters,
    readSavedFilters,
    saveCurrentFilter,
    SAVED_FILTERS_STORAGE_KEY,
} from "./savedFilters";

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

describe("savedFilters", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            localStorage: createStorageMock(),
            dispatchEvent: vi.fn(),
        });
    });

    afterEach(() => {
        clearSavedFilters();
        vi.unstubAllGlobals();
    });

    it("saves and reads filter bookmarks", () => {
        saveCurrentFilter("/runs?q=climate&preset=research_deep");
        const entries = readSavedFilters();
        expect(entries).toHaveLength(1);
        expect(entries[0].href).toBe("/runs?q=climate&preset=research_deep");
        expect(entries[0].label).toContain("runs");
        expect(entries[0].label).toContain("research_deep");
    });

    it("deduplicates identical hrefs", () => {
        saveCurrentFilter("/quality?model=gpt");
        saveCurrentFilter("/quality?model=gpt", "Custom label");
        expect(readSavedFilters()).toHaveLength(1);
        expect(readSavedFilters()[0].label).toBe("Custom label");
    });

    it("returns empty array when storage is missing", () => {
        window.localStorage.removeItem(SAVED_FILTERS_STORAGE_KEY);
        expect(readSavedFilters()).toEqual([]);
    });
});
