const MODE_COLORS = [
    "var(--color-data-cyan)",
    "var(--color-data-violet)",
    "var(--color-accent)",
    "var(--color-data-teal)",
    "var(--color-data-coral)",
];

export function ModeSizeBar({ modeSizes }: { modeSizes: number[] }) {
    const total = modeSizes.reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    return (
        <div className="mode-size-bar">
            <div className="mode-size-bar-track">
                {modeSizes.map((size, idx) => (
                    <div
                        key={idx}
                        className="mode-size-bar-segment"
                        style={{
                            width: `${(size / total) * 100}%`,
                            background: MODE_COLORS[idx % MODE_COLORS.length],
                        }}
                        title={`Mode ${idx + 1}: ${size} run${size === 1 ? "" : "s"}`}
                    />
                ))}
            </div>
            <div className="mode-size-bar-legend">
                {modeSizes.map((size, idx) => (
                    <span key={idx} className="mode-size-bar-legend-item">
                        <span
                            className="mode-size-bar-legend-dot"
                            style={{
                                background:
                                    MODE_COLORS[idx % MODE_COLORS.length],
                            }}
                        />
                        Mode {idx + 1}: {size}
                    </span>
                ))}
            </div>
        </div>
    );
}
