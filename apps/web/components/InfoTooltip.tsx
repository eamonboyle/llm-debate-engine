"use client";

import * as Popover from "@radix-ui/react-popover";
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
    const text = content ?? (helpKey ? getGlossaryEntry(helpKey) : undefined);
    if (!text) return null;

    const triggerProps = {
        type: "button" as const,
        className: "info-tooltip-trigger",
        "aria-label": ariaLabel,
        children: "?",
    };

    return (
        <span className="info-tooltip-wrapper">
            <span className="info-tooltip-desktop">
                <Tooltip.Root delayDuration={300}>
                    <Tooltip.Trigger asChild>
                        <button {...triggerProps} />
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
            </span>
            <span className="info-tooltip-mobile">
                <Popover.Root>
                    <Popover.Trigger asChild>
                        <button {...triggerProps} />
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content
                            className="info-tooltip-content"
                            sideOffset={6}
                            side="top"
                        >
                            {text}
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            </span>
        </span>
    );
}
