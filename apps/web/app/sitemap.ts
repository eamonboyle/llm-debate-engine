import type { MetadataRoute } from "next";
import { loadBenchmarkArtifacts, loadRunArtifacts } from "../lib/data";

const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://llm-debate-research.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [runs, benchmarks] = await Promise.all([
        loadRunArtifacts(),
        loadBenchmarkArtifacts(),
    ]);

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
        {
            url: `${SITE_URL}/search`,
            changeFrequency: "weekly",
            priority: 0.88,
        },
        {
            url: `${SITE_URL}/questions`,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${SITE_URL}/catalog`,
            changeFrequency: "weekly",
            priority: 0.85,
        },
        { url: `${SITE_URL}/runs`, changeFrequency: "weekly", priority: 0.9 },
        {
            url: `${SITE_URL}/benchmarks`,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        { url: `${SITE_URL}/report`, changeFrequency: "weekly", priority: 0.7 },
        { url: `${SITE_URL}/status`, changeFrequency: "weekly", priority: 0.6 },
        {
            url: `${SITE_URL}/runs/compare`,
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/benchmarks/compare`,
            changeFrequency: "monthly",
            priority: 0.5,
        },
    ];

    const runRoutes: MetadataRoute.Sitemap = runs.map((run) => ({
        url: `${SITE_URL}/runs/${run.id}`,
        lastModified: run.metadata.createdAt,
        changeFrequency: "monthly",
        priority: 0.6,
    }));

    const benchmarkRoutes: MetadataRoute.Sitemap = benchmarks.map(
        (benchmark) => ({
            url: `${SITE_URL}/benchmarks/${benchmark.id}`,
            lastModified: benchmark.metadata.createdAt,
            changeFrequency: "monthly",
            priority: 0.6,
        }),
    );

    return [...staticRoutes, ...runRoutes, ...benchmarkRoutes];
}
