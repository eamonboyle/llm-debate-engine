import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    outputFileTracingIncludes: {
        "/api/**": ["../../runs/**"],
    },
};

export default nextConfig;
