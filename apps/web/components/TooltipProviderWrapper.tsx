"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

export function TooltipProviderWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Tooltip.Provider delayDuration={300} skipDelayDuration={150}>
            {children}
        </Tooltip.Provider>
    );
}
