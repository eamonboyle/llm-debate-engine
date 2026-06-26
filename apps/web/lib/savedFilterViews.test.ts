import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    buildFilterViewHref,
    deleteSavedFilterView,
    readSavedFilterViews,
    saveFilterView,
    SAVED_FILTER_VIEWS_STORAGE_KEY,
} from "./savedFilterViews";

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

describe("savedFilterViews", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            localStorage: createStorageMock(),
            dispatchEvent: vi.fn(),
        });
    });

    afterEach(() => {
        window.localStorage.removeItem(SAVED_FILTER_VIEWS_STORAGE_KEY);
        vi.unstubAllGlobals();
    });

    it("saves and reads scoped filter views", () => {
        saveFilterView("runs", "High issues", {
            q: "policy",
            sort: "issues_desc",
        });

        const runs = readSavedFilterViews("runs");
        expect(runs).toHaveLength(1);
        expect(runs[0].name).toBe("High issues");
        expect(runs[0].params).toEqual({
            q: "policy",
            sort: "issues_desc",
        });
    });

    it("replaces same-named views within a scope", () => {
        saveFilterView("benchmarks", "Entropy", { q: "alpha" });
        saveFilterView("benchmarks", "Entropy", { q: "beta" });

        const views = readSavedFilterViews("benchmarks");
        expect(views).toHaveLength(1);
        expect(views[0].params.q).toBe("beta");
    });

    it("deletes a saved view by id", () => {
        const saved = saveFilterView("runs", "Temp", { model: "gpt" });
        deleteSavedFilterView(saved.id);
        expect(readSavedFilterViews("runs")).toHaveLength(0);
    });

    it("builds hrefs from saved params", () => {
        expect(
            buildFilterViewHref("/runs", {
                q: "climate",
                sort: "newest",
            }),
        ).toBe("/runs?q=climate&sort=newest");
    });
});
