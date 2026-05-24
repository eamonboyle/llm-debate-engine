"use client";

import { useCallback, useState } from "react";

type CopyPageLinkProps = {
    label?: string;
    className?: string;
};

export function CopyPageLink({
    label = "Copy link",
    className = "button secondary",
}: CopyPageLinkProps) {
    const [copied, setCopied] = useState(false);

    const onCopy = useCallback(async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }, []);

    return (
        <button type="button" className={className} onClick={onCopy}>
            {copied ? "Copied!" : label}
        </button>
    );
}
