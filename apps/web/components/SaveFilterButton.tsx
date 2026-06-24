"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { saveCurrentFilter } from "../lib/savedFilters";

export function SaveFilterButton() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"idle" | "saved">("idle");

    function handleSave() {
        const query = searchParams.toString();
        const href = query ? `${pathname}?${query}` : pathname;
        saveCurrentFilter(href);
        setStatus("saved");
        window.setTimeout(() => setStatus("idle"), 2000);
    }

    const hasQuery = searchParams.toString().length > 0;

    return (
        <button
            type="button"
            className="button secondary"
            onClick={handleSave}
            disabled={!hasQuery}
            title={
                hasQuery
                    ? "Save current filters to your bookmarks"
                    : "Apply filters first to save a bookmark"
            }
        >
            {status === "saved" ? "Saved" : "Save filters"}
        </button>
    );
}
