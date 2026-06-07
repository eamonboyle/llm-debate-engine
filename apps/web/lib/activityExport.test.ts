import { describe, expect, it } from "vitest";
import { activityEntriesToCsv } from "./activityExport";
import type { ActivityEntry } from "./activityFeed";

describe("activityExport", () => {
    it("serializes activity entries to CSV", () => {
        const entries: ActivityEntry[] = [
            {
                id: "run_1",
                kind: "run",
                createdAt: "2026-01-01T00:00:00.000Z",
                question: 'Say "hello"',
                model: "gpt-test",
                pipelinePreset: "standard",
                fastMode: false,
                href: "/runs/run_1",
                detail: "2 critique issues",
            },
        ];

        const csv = activityEntriesToCsv(entries);
        expect(csv.split("\n")).toHaveLength(2);
        expect(csv).toContain('"Say ""hello"""');
        expect(csv).toContain("run_1");
    });
});
