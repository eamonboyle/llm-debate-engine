"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { getGlossaryEntry } from "../lib/glossary";

type InfoTooltipProps = {
    /** Glossary key to look up explanation */
    helpKey?: string;
    /** Direct content (overrides helpKey if both provided) */
    content?: string;
    /** Accessible label for the trigger */
    "aria-label"?: string;
};

export function InfoTooltip({
    helpKey,
    content,
    "aria-label": ariaLabel = "More information",
}: InfoTooltipProps) {
    const text =
        content ?? (helpKey ? getGlossaryEntry(helpKey) : undefined);
    if (!text) return null;

    return (
        <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger asChild>
                <button
                    type="button"
                    className="info-tooltip-trigger"
                    aria-label={ariaLabel}
                >
                    ?
                </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    className="info-tooltip-content"
                    sideOffset={6}
                    side="top"
                >
                    {text}
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}
