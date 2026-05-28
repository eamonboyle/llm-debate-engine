"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
    }
    return target.isContentEditable;
}

/** Press `/` anywhere (outside inputs) to open global search. */
export function SearchKeyboardShortcut() {
    const router = useRouter();

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (
                event.key !== "/" ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey
            ) {
                return;
            }
            if (isEditableTarget(event.target)) return;
            event.preventDefault();
            router.push("/search");
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [router]);

    return null;
}
