import type { BenchmarkComparePayload } from "./benchmarkCompare";
import type { ModelComparePayload } from "./modelCompare";
import type { PresetComparePayload } from "./presetCompare";
import type { RunComparePayload } from "./runCompare";

function escapeCsv(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function row(values: Array<string | number | boolean>): string {
    return values.map((value) => escapeCsv(String(value))).join(",");
}

function formatCell(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
}

function flattenRecord(
    prefix: string,
    value: unknown,
    out: Record<string, unknown>,
): void {
    if (value === null || value === undefined) {
        if (prefix) out[prefix] = value;
        return;
    }
    if (typeof value !== "object" || Array.isArray(value)) {
        out[prefix] = value;
        return;
    }
    for (const [key, nested] of Object.entries(value)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (
            nested !== null &&
            typeof nested === "object" &&
            !Array.isArray(nested)
        ) {
            flattenRecord(path, nested, out);
        } else {
            out[path] = nested;
        }
    }
}

function resolveDeltaValue(
    deltaFlat: Record<string, unknown>,
    metric: string,
): unknown {
    if (Object.prototype.hasOwnProperty.call(deltaFlat, metric)) {
        return deltaFlat[metric];
    }
    if (metric.startsWith("metrics.")) {
        const stripped = metric.slice("metrics.".length);
        if (Object.prototype.hasOwnProperty.call(deltaFlat, stripped)) {
            return deltaFlat[stripped];
        }
    }
    return "";
}

export function comparePayloadToCsv(
    left: Record<string, unknown>,
    right: Record<string, unknown>,
    delta: Record<string, unknown>,
): string {
    const leftFlat: Record<string, unknown> = {};
    const rightFlat: Record<string, unknown> = {};
    const deltaFlat: Record<string, unknown> = {};

    flattenRecord("", left, leftFlat);
    flattenRecord("", right, rightFlat);
    flattenRecord("", delta, deltaFlat);

    const metrics = [
        ...new Set([
            ...Object.keys(leftFlat),
            ...Object.keys(rightFlat),
            ...Object.keys(deltaFlat),
        ]),
    ].sort();

    const lines = [
        row(["metric", "left", "right", "delta"]),
        ...metrics.map((metric) =>
            row([
                metric,
                formatCell(leftFlat[metric]),
                formatCell(rightFlat[metric]),
                formatCell(resolveDeltaValue(deltaFlat, metric)),
            ]),
        ),
    ];

    return lines.join("\n");
}

export function runCompareToCsv(payload: RunComparePayload): string {
    return comparePayloadToCsv(
        payload.left as unknown as Record<string, unknown>,
        payload.right as unknown as Record<string, unknown>,
        payload.delta as unknown as Record<string, unknown>,
    );
}

export function benchmarkCompareToCsv(
    payload: BenchmarkComparePayload,
): string {
    return comparePayloadToCsv(
        payload.left as unknown as Record<string, unknown>,
        payload.right as unknown as Record<string, unknown>,
        payload.delta as unknown as Record<string, unknown>,
    );
}

export function modelCompareToCsv(payload: ModelComparePayload): string {
    return comparePayloadToCsv(
        payload.left as unknown as Record<string, unknown>,
        payload.right as unknown as Record<string, unknown>,
        payload.delta as unknown as Record<string, unknown>,
    );
}

export function presetCompareToCsv(payload: PresetComparePayload): string {
    return comparePayloadToCsv(
        payload.left as unknown as Record<string, unknown>,
        payload.right as unknown as Record<string, unknown>,
        payload.delta as unknown as Record<string, unknown>,
    );
}

export function csvCompareResponse(csv: string, filename: string): Response {
    return new Response(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "public, max-age=60",
        },
    });
}
