"use client";

import { useCallback, useState } from "react";

type CopyTextButtonProps = {
    text: string;
    label?: string;
    copiedLabel?: string;
    className?: string;
};

export function CopyTextButton({
    text,
    label = "Copy text",
    copiedLabel = "Copied!",
    className = "button secondary",
}: CopyTextButtonProps) {
    const [copied, setCopied] = useState(false);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }, [text]);

    return (
        <button type="button" className={className} onClick={onCopy}>
            {copied ? copiedLabel : label}
        </button>
    );
}
