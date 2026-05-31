export function filterByQuestionScope<
    T extends { question: string },
>(items: T[], question: string | undefined): T[] {
    const needle = (question ?? "").trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.question.toLowerCase().includes(needle));
}

export function compareScopeQuery(question: string | undefined): {
    question?: string;
} {
    const trimmed = (question ?? "").trim();
    return trimmed ? { question: trimmed } : {};
}
