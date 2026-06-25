"use client";

import { useEffect, useState } from "react";
import {
    isArtifactPinned,
    togglePinnedArtifact,
    type PinnedArtifactKind,
} from "../lib/pinnedArtifacts";

type PinArtifactButtonProps = {
    id: string;
    kind: PinnedArtifactKind;
    href: string;
    title: string;
};

export function PinArtifactButton({
    id,
    kind,
    href,
    title,
}: PinArtifactButtonProps) {
    const [pinned, setPinned] = useState(false);

    useEffect(() => {
        const refresh = () => setPinned(isArtifactPinned(kind, id));
        refresh();
        window.addEventListener("pinned-artifacts-updated", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("pinned-artifacts-updated", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, [id, kind]);

    return (
        <button
            type="button"
            className={`button secondary pin-artifact-button ${pinned ? "pin-artifact-button-active" : ""}`}
            aria-pressed={pinned}
            onClick={() => {
                const next = togglePinnedArtifact({ id, kind, href, title });
                setPinned(next);
            }}
        >
            {pinned ? "Pinned" : "Pin"}
        </button>
    );
}
