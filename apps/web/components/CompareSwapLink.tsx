type CompareSwapLinkProps = {
    basePath: string;
    left?: string;
    right?: string;
};

export function CompareSwapLink({
    basePath,
    left,
    right,
}: CompareSwapLinkProps) {
    if (!left && !right) return null;

    const params = new URLSearchParams();
    if (right) params.set("left", right);
    if (left) params.set("right", left);
    const href = params.toString()
        ? `${basePath}?${params.toString()}`
        : basePath;

    return (
        <a href={href} className="button secondary">
            Swap sides
        </a>
    );
}
