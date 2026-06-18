export const OPEN_SEARCH_EVENT = "llm-research:open-search";

export function openGlobalSearch(): void {
    window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}
