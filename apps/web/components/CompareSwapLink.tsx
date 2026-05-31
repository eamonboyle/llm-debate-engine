type CompareSwapLinkProps = {
    basePath: string;
    left?: string;
    right?: string;
    extraParams?: Record<string, string | undefined>;
};

export function CompareSwapLink({
    basePath,
    left,
    right,
    extraParams,
}: CompareSwapLinkProps) {
    if (!left && !right) return null;

    const params = new URLSearchParams();
    if (right) params.set("left", right);
    if (left) params.set("right", left);
    for (const [key, value] of Object.entries(extraParams ?? {})) {
        if (value) params.set(key, value);
    }
    const href = params.toString()
        ? `${basePath}?${params.toString()}`
        : basePath;

    return (
        <a href={href} className="button secondary">
            Swap sides
        </a>
    );
}
