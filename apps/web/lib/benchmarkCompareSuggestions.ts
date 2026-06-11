import type { BenchmarkArtifact } from "./data";

export type BenchmarkCompareSuggestion = {
    id: string;
    question: string;
    model: string;
    pipelinePreset: string;
    createdAt: string;
    href: string;
    reason: string;
};

export function buildBenchmarkCompareSuggestions(
    benchmarks: BenchmarkArtifact[],
    selected: {
        left?: string;
        right?: string;
        question?: string;
    },
    limit = 6,
): BenchmarkCompareSuggestion[] {
    const leftId = (selected.left ?? "").trim();
    const rightId = (selected.right ?? "").trim();
    if (!leftId && !rightId) return [];
    if (leftId && rightId) return [];

    const anchorId = leftId || rightId;
    const anchor = benchmarks.find((benchmark) => benchmark.id === anchorId);
    if (!anchor) return [];

    const side = leftId ? "right" : "left";
    const questionNeedle = (selected.question ?? anchor.question)
        .trim()
        .toLowerCase();
    const scopeQuery = selected.question
        ? `&question=${encodeURIComponent(selected.question)}`
        : "";

    const candidates = benchmarks
        .filter((benchmark) => benchmark.id !== anchorId)
        .filter((benchmark) => {
            if (!questionNeedle) return true;
            return benchmark.question.toLowerCase().includes(questionNeedle);
        })
        .sort((a, b) =>
            b.metadata.createdAt.localeCompare(a.metadata.createdAt),
        );

    const sameQuestion = candidates.filter(
        (benchmark) => benchmark.question === anchor.question,
    );
    const sameModel = candidates.filter(
        (benchmark) =>
            benchmark.metadata.model === anchor.metadata.model &&
            benchmark.question !== anchor.question,
    );
    const ordered = [...sameQuestion, ...sameModel];
    const seen = new Set<string>();
    const suggestions: BenchmarkCompareSuggestion[] = [];

    for (const benchmark of ordered) {
        if (seen.has(benchmark.id)) continue;
        seen.add(benchmark.id);

        const sameQ = benchmark.question === anchor.question;
        suggestions.push({
            id: benchmark.id,
            question: benchmark.question,
            model: benchmark.metadata.model,
            pipelinePreset: benchmark.metadata.pipelinePreset,
            createdAt: benchmark.metadata.createdAt,
            href:
                side === "right"
                    ? `/benchmarks/compare?left=${anchorId}&right=${benchmark.id}${scopeQuery}`
                    : `/benchmarks/compare?left=${benchmark.id}&right=${anchorId}${scopeQuery}`,
            reason: sameQ
                ? "Same research question"
                : `Same model (${benchmark.metadata.model})`,
        });

        if (suggestions.length >= limit) break;
    }

    return suggestions;
}
