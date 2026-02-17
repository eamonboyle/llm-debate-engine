export type ArtifactSortOrder = "newest" | "oldest";

type ArtifactLike = {
    id: string;
    metadata: {
        createdAt: string;
    };
};

function toTimestamp(value: string): number | null {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function sortArtifactsByCreatedAt<T extends ArtifactLike>(
    items: T[],
    order: ArtifactSortOrder,
): T[] {
    return items.slice().sort((a, b) => {
        const aTime = toTimestamp(a.metadata.createdAt);
        const bTime = toTimestamp(b.metadata.createdAt);

        if (aTime != null && bTime != null && aTime !== bTime) {
            return order === "newest" ? bTime - aTime : aTime - bTime;
        }

        if (a.metadata.createdAt !== b.metadata.createdAt) {
            return order === "newest"
                ? b.metadata.createdAt.localeCompare(a.metadata.createdAt)
                : a.metadata.createdAt.localeCompare(b.metadata.createdAt);
        }

        return a.id.localeCompare(b.id);
    });
}
