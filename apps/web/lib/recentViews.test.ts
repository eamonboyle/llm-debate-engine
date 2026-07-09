import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    clearRecentViews,
    readRecentViews,
    recordRecentView,
    RECENT_VIEWS_STORAGE_KEY,
} from "./recentViews";

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

describe("recentViews", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            localStorage: createStorageMock(),
            dispatchEvent: vi.fn(),
        });
    });

    afterEach(() => {
        window.localStorage.removeItem(RECENT_VIEWS_STORAGE_KEY);
        vi.unstubAllGlobals();
    });

    it("records and deduplicates recent views", () => {
        recordRecentView({
            id: "run_a",
            kind: "run",
            href: "/runs/run_a",
            title: "Question A",
        });
        recordRecentView({
            id: "run_b",
            kind: "run",
            href: "/runs/run_b",
            title: "Question B",
        });
        recordRecentView({
            id: "run_a",
            kind: "run",
            href: "/runs/run_a",
            title: "Question A updated",
        });

        const entries = readRecentViews();
        expect(entries).toHaveLength(2);
        expect(entries[0].id).toBe("run_a");
        expect(entries[0].title).toBe("Question A updated");
        expect(entries[1].id).toBe("run_b");
    });

    it("records question hub views", () => {
        recordRecentView({
            id: "Is AI an existential threat?",
            kind: "question",
            href: "/questions/view?question=Is+AI+an+existential+threat%3F",
            title: "Is AI an existential threat?",
        });

        const entries = readRecentViews();
        expect(entries).toHaveLength(1);
        expect(entries[0].kind).toBe("question");
        expect(entries[0].title).toBe("Is AI an existential threat?");
    });

    it("clears stored recent views", () => {
        recordRecentView({
            id: "benchmark_1",
            kind: "benchmark",
            href: "/benchmarks/benchmark_1",
            title: "Benchmark",
        });
        clearRecentViews();
        expect(readRecentViews()).toEqual([]);
    });
});
