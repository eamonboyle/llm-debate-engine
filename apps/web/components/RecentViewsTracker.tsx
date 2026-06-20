"use client";

import { useEffect } from "react";
import { recordRecentView, type RecentViewKind } from "../lib/recentViews";

type RecentViewsTrackerProps = {
    id: string;
    kind: RecentViewKind;
    href: string;
    title: string;
};

export function RecentViewsTracker({
    id,
    kind,
    href,
    title,
}: RecentViewsTrackerProps) {
    useEffect(() => {
        recordRecentView({ id, kind, href, title });
    }, [id, kind, href, title]);

    return null;
}
