export type SortOrder = "newest" | "oldest";

export function parsePositiveInt(
    value: string | undefined,
    opts: { fallback: number; max: number },
) {
    if (!value || value.trim() === "") return opts.fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return opts.fallback;
    return Math.max(1, Math.min(opts.max, Math.floor(parsed)));
}

export function resolveSortOrder(value: string | undefined): SortOrder {
    return value === "oldest" ? "oldest" : "newest";
}

export function paginateItems<T>(
    items: T[],
    params: { sort?: string; page?: string; pageSize?: string },
    opts: { defaultPageSize: number; maxPageSize: number },
) {
    const pageSize = parsePositiveInt(params.pageSize, {
        fallback: opts.defaultPageSize,
        max: opts.maxPageSize,
    });
    const requestedPage = parsePositiveInt(params.page, {
        fallback: 1,
        max: 100000,
    });
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);
    const startDisplay = paged.length === 0 ? 0 : start + 1;
    const endDisplay = start + paged.length;

    return {
        pageSize,
        page,
        totalPages,
        paged,
        startDisplay,
        endDisplay,
        hasPrev: page > 1,
        hasNext: page < totalPages,
    };
}

export function buildQueryString<
    TParams extends Record<string, string | undefined>,
>(
    params: TParams,
    overrides: Partial<TParams>,
) {
    const merged: Record<string, string | undefined> = {
        ...params,
        ...overrides,
    };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
        if (typeof value === "string" && value.length > 0) {
            query.set(key, value);
        }
    }
    const result = query.toString();
    return result ? `?${result}` : "";
}
