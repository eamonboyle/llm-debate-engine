import type { LLMClient } from "../types/llm";
import type { EmbeddingClient } from "../types/embedding";
import type {
    AgentResponse,
    AgentRun,
    DebateContext,
    DebateRun,
} from "../types/agent";
import { SolverAgent } from "../agents/SolverAgent";
import { SkepticAgent } from "../agents/SkepticAgent";
import { SolverRevisionAgent } from "../agents/SolverRevisionAgent";
import { SynthesizerAgent } from "../agents/SynthesizerAgent";
import { getProposal, getCritique } from "../core/extraction";
import {
    computeBasicMetrics,
    computeConsensusIfPossible,
} from "../core/metrics";
import { makeId } from "../core/id";

function nowIso() {
    return new Date().toISOString();
}

export type DebateEngineDeps = {
    llm: LLMClient;
    /** Optional. If not provided, consensus metric is skipped. */
    embedding?: EmbeddingClient;
    agents?: {
        solver?: SolverAgent;
        skeptic?: SkepticAgent;
        revision?: SolverRevisionAgent;
        synthesizer?: SynthesizerAgent;
    };
};

export class DebateEngine {
    readonly name = "DebateEngine";

    private readonly llm: LLMClient;
    private readonly embedding: EmbeddingClient | undefined;
    private readonly agents: {
        solver: SolverAgent;
        skeptic: SkepticAgent;
        solverRevision: SolverRevisionAgent;
        synthesizer: SynthesizerAgent;
    };

    constructor(deps: DebateEngineDeps) {
        this.llm = deps.llm;
        this.embedding = deps.embedding;
        this.agents = {
            solver: deps.agents?.solver ?? new SolverAgent(),
            skeptic: deps.agents?.skeptic ?? new SkepticAgent(),
            solverRevision: deps.agents?.revision ?? new SolverRevisionAgent(),
            synthesizer: deps.agents?.synthesizer ?? new SynthesizerAgent(),
        };
    }

    async run(
        ctx: DebateContext,
        opts: { model: string; verbose?: boolean; quiet?: boolean },
    ): Promise<DebateRun> {
        const verbose = opts.verbose ?? false;
        const quiet = opts.quiet ?? false;
        const steps: AgentRun[] = [];

        // Step 1: Solver
        if (!quiet) console.log("Solver agent is now solving the question...");
        const solverStep = await this.agents.solver.run(ctx, this.llm, {
            model: opts.model,
        });
        steps.push(solverStep);

        if (verbose) {
            console.log("Solver step:");
            console.log(JSON.stringify(solverStep, null, 2));
        }

        const proposal = getProposal(solverStep) ?? undefined;

        if (!proposal) {
            const fallback =
                (solverStep.rawAttempts[0] as AgentResponse)?.answer ??
                solverStep.error ??
                "Solver failed to produce a proposal.";
            const run: DebateRun = {
                id: makeId("run"),
                createdAt: nowIso(),
                question: ctx.question,
                steps,
                finalAnswer: String(fallback),
                metrics: { confidence: {}, critique: {} },
            };
            computeBasicMetrics(run);
            return run;
        }

        // Step 2: Skeptic
        if (!quiet) console.log("\nSkeptic agent is now critiquing the proposal...");
        const skepticStep = await this.agents.skeptic.run(ctx, this.llm, {
            model: opts.model,
            targetAgentName: this.agents.solver.name,
            proposal,
        });
        steps.push(skepticStep);

        if (verbose) {
            console.log("Skeptic step:");
            console.log(JSON.stringify(skepticStep, null, 2));
        }

        const critique = getCritique(skepticStep) ?? undefined;

        if (!critique) {
            const run: DebateRun = {
                id: makeId("run"),
                createdAt: nowIso(),
                question: ctx.question,
                steps,
                finalAnswer: proposal.answer,
                metrics: { confidence: {}, critique: {} },
            };
            computeBasicMetrics(run);
            return run;
        }

        // Step 3: Solver revision
        if (!quiet) console.log("\nSolver revision agent is now revising the proposal...");
        const revisionStep = await this.agents.solverRevision.run(
            ctx,
            this.llm,
            {
                model: opts.model,
                proposal,
                critique,
            },
        );
        steps.push(revisionStep);

        if (verbose) {
            console.log("Solver revision step:");
            console.log(JSON.stringify(revisionStep, null, 2));
        }

        const revision = getProposal(revisionStep) ?? undefined;

        if (!revision) {
            const run: DebateRun = {
                id: makeId("run"),
                createdAt: nowIso(),
                question: ctx.question,
                steps,
                finalAnswer: proposal.answer,
                metrics: { confidence: {}, critique: {} },
            };
            computeBasicMetrics(run);
            return run;
        }

        // Step 4: Synthesizer
        if (!quiet) console.log("\nSynthesizer agent is now synthesizing the proposal...");
        const synthesizerStep = await this.agents.synthesizer.run(
            ctx,
            this.llm,
            {
                model: opts.model,
                proposal,
                critique,
                revision,
            },
        );
        steps.push(synthesizerStep);

        if (verbose) {
            console.log("Synthesizer step:");
            console.log(JSON.stringify(synthesizerStep, null, 2));
        }

        const synthesized = getProposal(synthesizerStep) ?? undefined;

        const finalAnswer = synthesized?.answer ?? revision.answer;

        const run: DebateRun = {
            id: makeId("run"),
            createdAt: nowIso(),
            question: ctx.question,
            steps,
            finalAnswer,
            metrics: { confidence: {}, critique: {} },
        };

        computeBasicMetrics(run);
        await computeConsensusIfPossible(run, this.embedding);

        return run;
    }
}
