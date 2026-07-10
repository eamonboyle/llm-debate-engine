import { describe, expect, it } from "vitest";
import {
    buildLeaderboardSideCompareHref,
    indexFilterExtraParams,
    pickIndexFilterParams,
} from "./compareFilterParams";

describe("compareFilterParams", () => {
    it("picks index filter fields from search params", () => {
        expect(
            pickIndexFilterParams({
                left: "gpt-4",
                q: "threat",
                model: "gpt",
                preset: "standard",
                fast: "true",
                from: "2026-01-01",
            }),
        ).toEqual({
            q: "threat",
            model: "gpt",
            preset: "standard",
            fast: "true",
            from: "2026-01-01",
            to: undefined,
        });
    });

    it("builds compare href with filters and side", () => {
        expect(
            buildLeaderboardSideCompareHref(
                "/leaderboard/compare",
                "left",
                "gpt-a",
                { q: "risk", fast: "false" },
            ),
        ).toBe("/leaderboard/compare?q=risk&fast=false&left=gpt-a");
    });

    it("omits empty filter values from extra params", () => {
        expect(
            indexFilterExtraParams({
                q: "ai",
                model: "",
                preset: "standard",
            }),
        ).toEqual({
            q: "ai",
            preset: "standard",
        });
    });
});
