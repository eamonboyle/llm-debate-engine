import type { RunArtifact } from "./data";

export type CompareSuggestion = {
    id: string;
    question: string;
    model: string;
    pipelinePreset: string;
    createdAt: string;
    href: string;
    reason: string;
};

export function buildCompareSuggestions(
    runs: RunArtifact[],
    selected: {
        left?: string;
        right?: string;
        question?: string;
    },
    limit = 6,
): CompareSuggestion[] {
    const leftId = (selected.left ?? "").trim();
    const rightId = (selected.right ?? "").trim();
    if (!leftId && !rightId) return [];
    if (leftId && rightId) return [];

    const anchorId = leftId || rightId;
    const anchor = runs.find((run) => run.id === anchorId);
    if (!anchor) return [];

    const side = leftId ? "right" : "left";
    const questionNeedle = (selected.question ?? anchor.question)
        .trim()
        .toLowerCase();

    const candidates = runs
        .filter((run) => run.id !== anchorId)
        .filter((run) => {
            if (!questionNeedle) return true;
            return run.question.toLowerCase().includes(questionNeedle);
        })
        .sort((a, b) =>
            b.metadata.createdAt.localeCompare(a.metadata.createdAt),
        );

    const sameQuestion = candidates.filter(
        (run) => run.question === anchor.question,
    );
    const sameModel = candidates.filter(
        (run) =>
            run.metadata.model === anchor.metadata.model &&
            run.question !== anchor.question,
    );
    const ordered = [...sameQuestion, ...sameModel];
    const seen = new Set<string>();
    const suggestions: CompareSuggestion[] = [];

    for (const run of ordered) {
        if (seen.has(run.id)) continue;
        seen.add(run.id);

        const sameQ = run.question === anchor.question;
        suggestions.push({
            id: run.id,
            question: run.question,
            model: run.metadata.model,
            pipelinePreset: run.metadata.pipelinePreset,
            createdAt: run.metadata.createdAt,
            href:
                side === "right"
                    ? `/runs/compare?left=${anchorId}&right=${run.id}${selected.question ? `&question=${encodeURIComponent(selected.question)}` : ""}`
                    : `/runs/compare?left=${run.id}&right=${anchorId}${selected.question ? `&question=${encodeURIComponent(selected.question)}` : ""}`,
            reason: sameQ
                ? "Same research question"
                : `Same model (${run.metadata.model})`,
        });

        if (suggestions.length >= limit) break;
    }

    return suggestions;
}
