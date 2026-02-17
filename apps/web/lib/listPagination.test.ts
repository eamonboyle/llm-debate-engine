import { describe, expect, it } from "vitest";
import {
    buildQueryString,
    paginateItems,
    resolveSortOrder,
} from "./listPagination";

describe("list pagination helpers", () => {
    it("resolves sort order with newest default", () => {
        expect(resolveSortOrder(undefined)).toBe("newest");
        expect(resolveSortOrder("oldest")).toBe("oldest");
        expect(resolveSortOrder("something_else")).toBe("newest");
    });

    it("paginates item arrays", () => {
        const result = paginateItems(
            ["a", "b", "c"],
            { sort: "oldest", page: "2", pageSize: "1" },
            {
                defaultPageSize: 25,
                maxPageSize: 200,
            },
        );
        expect(result.page).toBe(2);
        expect(result.totalPages).toBe(3);
        expect(result.paged).toEqual(["b"]);
        expect(result.startDisplay).toBe(2);
        expect(result.endDisplay).toBe(2);
        expect(result.hasPrev).toBe(true);
        expect(result.hasNext).toBe(true);
    });

    it("builds query strings while skipping empty values", () => {
        const query = buildQueryString(
            { q: "alpha", page: "2", pageSize: "", sort: undefined },
            { page: "3", pageSize: "25" },
        );
        expect(query).toBe("?q=alpha&page=3&pageSize=25");
    });
});
