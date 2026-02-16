/* ------------------------- helpers: metrics --------------------------- */

import type { EmbeddingClient } from "../types/embedding";
import { DebateRun } from "../types/agent";
import { cosineSimilarity, vectorMean } from "./math";

export function computeBasicMetrics(run: DebateRun) {
    const solverStep = run.steps.find(
        (s) => s.role === "solver" && s.output?.kind === "proposal",
    );
    const revisionStep = run.steps.find(
        (s) =>
            s.role === "solver" &&
            s.agentName.toLowerCase().includes("revision") &&
            s.output?.kind === "proposal",
    );
    const synthStep = run.steps.find(
        (s) => s.role === "synthesizer" && s.output?.kind === "proposal",
    );
    const skepticStep = run.steps.find(
        (s) => s.role === "skeptic" && s.output?.kind === "critique",
    );

    const solver =
        solverStep?.output?.kind === "proposal"
            ? solverStep.output.data
            : undefined;
    const revision =
        revisionStep?.output?.kind === "proposal"
            ? revisionStep.output.data
            : undefined;
    const synth =
        synthStep?.output?.kind === "proposal"
            ? synthStep.output.data
            : undefined;

    if (solver) run.metrics.confidence.solver = solver.confidence;
    if (revision) run.metrics.confidence.revision = revision.confidence;
    if (synth) run.metrics.confidence.synthesizer = synth.confidence;

    if (solver && revision) {
        run.metrics.confidence.solverToRevisionDelta = round3(
            revision.confidence - solver.confidence,
        );
    }
    if (revision && synth) {
        run.metrics.confidence.revisionToSynthesizerDelta = round3(
            synth.confidence - revision.confidence,
        );
    }

    const critique =
        skepticStep?.output?.kind === "critique"
            ? skepticStep.output.data
            : undefined;
    if (critique?.issues?.length) {
        const severities = critique.issues.map((i) => i.severity);
        run.metrics.critique.maxSeverity = Math.max(...severities);
        run.metrics.critique.avgSeverity = round3(avg(severities));

        const byType: Record<string, number> = {};
        for (const issue of critique.issues) {
            byType[issue.type] = (byType[issue.type] ?? 0) + 1;
        }
        run.metrics.critique.byType = byType;
    }
}

export async function computeConsensusIfPossible(
    run: DebateRun,
    embedding?: EmbeddingClient,
) {
    if (!embedding) return;

    const items: Array<{
        key: "solver" | "revision" | "synthesizer";
        text: string;
    }> = [];

    const solver = run.steps.find(
        (s) => s.role === "solver" && s.output?.kind === "proposal",
    );
    if (solver?.output?.kind === "proposal")
        items.push({ key: "solver", text: solver.output.data.answer });

    const revision = run.steps.find(
        (s) =>
            s.role === "solver" &&
            s.agentName.toLowerCase().includes("revision") &&
            s.output?.kind === "proposal",
    );
    if (revision?.output?.kind === "proposal")
        items.push({ key: "revision", text: revision.output.data.answer });

    const synth = run.steps.find(
        (s) => s.role === "synthesizer" && s.output?.kind === "proposal",
    );
    if (synth?.output?.kind === "proposal")
        items.push({ key: "synthesizer", text: synth.output.data.answer });

    if (items.length < 2) return;

    const vectors = await embedding.embedBatch(items.map((i) => i.text));

    const pairs: Array<{ a: string; b: string; similarity: number }> = [];
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            const sim = cosineSimilarity(vectors[i], vectors[j]);
            pairs.push({
                a: items[i].key,
                b: items[j].key,
                similarity: round3(sim),
            });
        }
    }

    run.metrics.consensus = {
        included: items.map((i) => i.key),
        pairs,
        strength: round3(avg(pairs.map((p) => p.similarity))),
    };
}

/**
 * Computes stability score across K runs: average cosine similarity of each
 * final answer to the centroid of all embedded answers. Higher = more stable.
 */
export async function computeStabilityScore(
    runs: DebateRun[],
    embedding: EmbeddingClient,
): Promise<number> {
    if (!runs.length) return 0;
    const texts = runs.map((r) => r.finalAnswer).filter((t) => t?.trim());
    if (!texts.length) return 0;
    if (texts.length === 1) return 1;

    const vectors = await embedding.embedBatch(texts);
    const centroid = vectorMean(vectors);
    const similarities = vectors.map((v) => cosineSimilarity(v, centroid));
    return round3(avg(similarities));
}

/* ------------------------- tiny math utils ---------------------------- */

function avg(nums: number[]) {
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round3(n: number) {
    return Math.round(n * 1000) / 1000;
}
