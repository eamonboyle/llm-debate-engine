export function parseNumberParam(
    value: string | null,
    opts: { fallback: number; min: number; max: number },
) {
    if (value == null || value.trim() === "") return opts.fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return opts.fallback;
    return Math.max(opts.min, Math.min(opts.max, Math.floor(parsed)));
}

export function parseListPagination(searchParams: URLSearchParams) {
    const limit = parseNumberParam(
        searchParams.get("limit") ?? searchParams.get("pageSize"),
        {
            fallback: 100,
            min: 1,
            max: 500,
        },
    );
    const hasExplicitOffset =
        searchParams.get("offset") != null &&
        searchParams.get("offset")?.trim() !== "";
    const offset = hasExplicitOffset
        ? parseNumberParam(searchParams.get("offset"), {
              fallback: 0,
              min: 0,
              max: Number.MAX_SAFE_INTEGER,
          })
        : (parseNumberParam(searchParams.get("page"), {
              fallback: 1,
              min: 1,
              max: 1000000,
          }) -
              1) *
          limit;
    const page = Math.floor(offset / limit) + 1;
    return { offset, limit, page };
}
