"use client";

import { useCallback, useState } from "react";

type CopyPageLinkProps = {
    label?: string;
    className?: string;
    /** Relative path; copies origin + path as the full URL. Omit to copy the current page URL. */
    path?: string;
};

export function CopyPageLink({
    label = "Copy link",
    className = "button secondary",
    path,
}: CopyPageLinkProps) {
    const [copied, setCopied] = useState(false);

    const onCopy = useCallback(async () => {
        const url = path
            ? new URL(path, window.location.origin).href
            : window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }, [path]);

    return (
        <button type="button" className={className} onClick={onCopy}>
            {copied ? "Copied!" : label}
        </button>
    );
}
