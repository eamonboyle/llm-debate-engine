import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
    reactStrictMode: true,
    outputFileTracingRoot: path.join(configDir, "../.."),
    outputFileTracingIncludes: {
        "/api/**": ["../../runs/**"],
    },
};

export default nextConfig;
