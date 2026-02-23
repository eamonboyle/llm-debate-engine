import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_KEY_HEADER = "x-api-key";
const API_KEY_ENV = "API_KEY";

/**
 * When API_KEY is set, protects /api/* routes with API key auth.
 * Pass x-api-key header with the value to authenticate.
 */
export function middleware(request: NextRequest) {
    const apiKey = process.env[API_KEY_ENV];
    if (!apiKey || apiKey.trim() === "") {
        return NextResponse.next();
    }

    const pathname = request.nextUrl.pathname;
    if (!pathname.startsWith("/api/")) {
        return NextResponse.next();
    }

    const providedKey = request.headers.get(API_KEY_HEADER);
    if (providedKey !== apiKey) {
        return NextResponse.json(
            { error: "Unauthorized", message: "API key required" },
            { status: 401 },
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: "/api/:path*",
};
