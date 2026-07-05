import type { RunArtifact } from "./data";

export type EvidenceDetailRow = {
    runId: string;
    question: string;
    model: string;
    pipelinePreset: string;
    riskLevel: number;
    verificationChecks: string[];
    evidenceRequirements: string[];
    majorUnknowns: string[];
    href: string;
};

function pickStrings(value: unknown, limit = 8): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, limit);
}

function extractEvidencePlan(output: unknown): {
    riskLevel: number | null;
    verificationChecks: string[];
    evidenceRequirements: string[];
    majorUnknowns: string[];
} {
    if (!output || typeof output !== "object") {
        return {
            riskLevel: null,
            verificationChecks: [],
            evidenceRequirements: [],
            majorUnknowns: [],
        };
    }
    const data = (output as { data?: unknown }).data ?? output;
    if (!data || typeof data !== "object") {
        return {
            riskLevel: null,
            verificationChecks: [],
            evidenceRequirements: [],
            majorUnknowns: [],
        };
    }

    const riskLevel =
        typeof (data as { riskLevel?: unknown }).riskLevel === "number" &&
        Number.isFinite((data as { riskLevel: number }).riskLevel)
            ? (data as { riskLevel: number }).riskLevel
            : null;

    return {
        riskLevel,
        verificationChecks: pickStrings(
            (data as { verificationChecks?: unknown }).verificationChecks,
        ),
        evidenceRequirements: pickStrings(
            (data as { evidenceRequirements?: unknown }).evidenceRequirements,
        ),
        majorUnknowns: pickStrings(
            (data as { majorUnknowns?: unknown }).majorUnknowns,
        ),
    };
}

export function extractEvidenceDetailsForRuns(
    runs: RunArtifact[],
    opts: {
        riskLevel?: number;
        runIds?: Set<string>;
    } = {},
): EvidenceDetailRow[] {
    const rows: EvidenceDetailRow[] = [];

    for (const run of runs) {
        if (opts.runIds && !opts.runIds.has(run.id)) continue;

        for (const step of run.run.steps) {
            if (step.output?.kind !== "evidence_plan") continue;
            const plan = extractEvidencePlan(step.output);
            if (plan.riskLevel == null) continue;
            if (
                typeof opts.riskLevel === "number" &&
                plan.riskLevel !== opts.riskLevel
            ) {
                continue;
            }

            rows.push({
                runId: run.id,
                question: run.question,
                model: run.metadata.model,
                pipelinePreset: run.metadata.pipelinePreset,
                riskLevel: plan.riskLevel,
                verificationChecks: plan.verificationChecks,
                evidenceRequirements: plan.evidenceRequirements,
                majorUnknowns: plan.majorUnknowns,
                href: `/runs/${run.id}`,
            });
            break;
        }
    }

    return rows.sort(
        (a, b) =>
            b.riskLevel - a.riskLevel || a.runId.localeCompare(b.runId),
    );
}

export function aggregateEvidenceStrings(
    rows: EvidenceDetailRow[],
    field: "verificationChecks" | "evidenceRequirements" | "majorUnknowns",
    limit = 12,
): Array<{ text: string; runCount: number }> {
    const counts = new Map<string, { text: string; runIds: Set<string> }>();

    for (const row of rows) {
        for (const text of row[field]) {
            const key = text.toLowerCase();
            const existing = counts.get(key);
            if (existing) {
                existing.runIds.add(row.runId);
            } else {
                counts.set(key, { text, runIds: new Set([row.runId]) });
            }
        }
    }

    return [...counts.values()]
        .map((entry) => ({
            text: entry.text,
            runCount: entry.runIds.size,
        }))
        .sort(
            (a, b) =>
                b.runCount - a.runCount || a.text.localeCompare(b.text),
        )
        .slice(0, limit);
}
