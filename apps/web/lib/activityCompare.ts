import type { BenchmarkArtifact, RunArtifact } from "./data";
import type { ActivityEntry } from "./activityFeed";

function latestPeerId(
    entries: Array<{ id: string; createdAt: string }>,
    anchorId: string,
): string | null {
    const anchor = entries.find((entry) => entry.id === anchorId);
    if (!anchor) return null;

    const peer = entries
        .filter((entry) => entry.id !== anchorId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    return peer?.id ?? null;
}

export function attachActivityCompareLinks(
    entries: ActivityEntry[],
    runs: RunArtifact[],
    benchmarks: BenchmarkArtifact[],
): ActivityEntry[] {
    const runsByQuestion = new Map<string, RunArtifact[]>();
    for (const run of runs) {
        const bucket = runsByQuestion.get(run.question) ?? [];
        bucket.push(run);
        runsByQuestion.set(run.question, bucket);
    }

    const benchmarksByQuestion = new Map<string, BenchmarkArtifact[]>();
    for (const benchmark of benchmarks) {
        const bucket = benchmarksByQuestion.get(benchmark.question) ?? [];
        bucket.push(benchmark);
        benchmarksByQuestion.set(benchmark.question, bucket);
    }

    return entries.map((entry) => {
        if (entry.kind === "run") {
            const peers = runsByQuestion.get(entry.question) ?? [];
            const peerId = latestPeerId(
                peers.map((run) => ({
                    id: run.id,
                    createdAt: run.metadata.createdAt,
                })),
                entry.id,
            );
            if (!peerId) return entry;
            return {
                ...entry,
                compareHref: `/runs/compare?left=${entry.id}&right=${peerId}`,
            };
        }

        const peers = benchmarksByQuestion.get(entry.question) ?? [];
        const peerId = latestPeerId(
            peers.map((benchmark) => ({
                id: benchmark.id,
                createdAt: benchmark.metadata.createdAt,
            })),
            entry.id,
        );
        if (!peerId) return entry;
        return {
            ...entry,
            compareHref: `/benchmarks/compare?left=${entry.id}&right=${peerId}`,
        };
    });
}
