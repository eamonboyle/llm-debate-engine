import type { MetadataRoute } from "next";

const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://llm-debate-research.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
    const base = SITE_URL.replace(/\/$/, "");
    const now = new Date();

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: `${base}/`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: `${base}/questions`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${base}/runs`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${base}/benchmarks`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${base}/report`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.7,
        },
        {
            url: `${base}/status`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${base}/runs/compare`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.6,
        },
        {
            url: `${base}/benchmarks/compare`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.6,
        },
    ];

    return staticRoutes;
}
