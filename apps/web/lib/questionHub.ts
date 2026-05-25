/** Build the question hub URL for a debate question string. */
export function questionHubHref(question: string): string {
    return `/questions/view?question=${encodeURIComponent(question)}`;
}
