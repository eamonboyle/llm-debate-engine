import type { LLMClient } from "../types/llm";
import type {
    AgentResponse,
    AgentRun,
    Critique,
    DebateContext,
    DebateRun,
} from "../types/agent";
import type { SolverAgent } from "../agents/SolverAgent";
import type { SkepticAgent } from "../agents/SkepticAgent";
import type { SolverRevisionAgent } from "../agents/SolverRevisionAgent";
import type { SynthesizerAgent } from "../agents/SynthesizerAgent";

export type DebateAgents = {
    solver: SolverAgent;
    skeptic: SkepticAgent;
    solverRevision: SolverRevisionAgent;
    synthesizer: SynthesizerAgent;
};

export class DebateEngine {
    readonly name = "DebateEngine";

    constructor(
        private readonly agents: DebateAgents,
        private readonly llm: LLMClient,
    ) {}

    async run(
        ctx: DebateContext,
        opts: { model: string; verbose?: boolean },
    ): Promise<DebateRun> {
        const verbose = opts.verbose ?? false;
        const steps: AgentRun[] = [];

        // Step 1: Solver
        console.log("Solver agent is now solving the question...");
        const solverStep = await this.agents.solver.run(ctx, this.llm, {
            model: opts.model,
        });
        steps.push(solverStep);

        if (verbose) {
            console.log("Solver step:");
            console.log(JSON.stringify(solverStep, null, 2));
        }

        const proposal =
            solverStep.output?.kind === "proposal"
                ? (solverStep.output.data as AgentResponse)
                : undefined;

        if (!proposal) {
            const fallback =
                (solverStep.rawAttempts[0] as AgentResponse)?.answer ??
                solverStep.error ??
                "Solver failed to produce a proposal.";
            return {
                steps,
                finalAnswer: String(fallback),
                metrics: { confidence: {}, critique: {} },
            };
        }

        // Step 2: Skeptic
        console.log("\nSkeptic agent is now critiquing the proposal...");
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

        const critique =
            skepticStep.output?.kind === "critique"
                ? (skepticStep.output.data as Critique)
                : undefined;

        if (!critique) {
            return {
                steps,
                finalAnswer: proposal.answer,
                metrics: { confidence: {}, critique: {} },
            };
        }

        // Step 3: Solver revision
        console.log("\nSolver revision agent is now revising the proposal...");
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

        const revision =
            revisionStep.output?.kind === "proposal"
                ? (revisionStep.output.data as AgentResponse)
                : undefined;

        if (!revision) {
            return {
                steps,
                finalAnswer: proposal.answer,
                metrics: { confidence: {}, critique: {} },
            };
        }

        // Step 4: Synthesizer
        console.log("\nSynthesizer agent is now synthesizing the proposal...");
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

        const synthesized =
            synthesizerStep.output?.kind === "proposal"
                ? (synthesizerStep.output.data as AgentResponse)
                : undefined;

        const finalAnswer = synthesized?.answer ?? revision.answer;

        const round2 = (n: number) => Math.round(n * 100) / 100;

        return {
            steps,
            finalAnswer,
            metrics: {
                confidence: (() => {
                    const solver =
                        solverStep.output?.kind === "proposal"
                            ? (solverStep.output.data as AgentResponse)
                                  .confidence
                            : undefined;
                    const revision =
                        revisionStep.output?.kind === "proposal"
                            ? (revisionStep.output.data as AgentResponse)
                                  .confidence
                            : undefined;
                    const synthesizer =
                        synthesizerStep.output?.kind === "proposal"
                            ? (synthesizerStep.output.data as AgentResponse)
                                  .confidence
                            : undefined;
                    return {
                        solver: solver !== undefined ? round2(solver) : undefined,
                        revision:
                            revision !== undefined ? round2(revision) : undefined,
                        synthesizer:
                            synthesizer !== undefined
                                ? round2(synthesizer)
                                : undefined,
                        solverToRevisionDelta:
                            solver !== undefined && revision !== undefined
                                ? round2(revision - solver)
                                : undefined,
                        revisionToSynthesizerDelta:
                            revision !== undefined && synthesizer !== undefined
                                ? round2(synthesizer - revision)
                                : undefined,
                    };
                })(),
                critique: {
                    maxSeverity:
                        critique.issues.length > 0
                            ? Math.max(
                                  ...critique.issues.map((i) => i.severity),
                              )
                            : undefined,
                    avgSeverity:
                        critique.issues.length > 0
                            ? round2(
                                  critique.issues.reduce(
                                      (sum, i) => sum + i.severity,
                                      0,
                                  ) / critique.issues.length,
                              )
                            : undefined,
                    byType:
                        critique.issues.length > 0
                            ? Object.fromEntries(
                                  critique.issues.map((i) => [
                                      i.type,
                                      i.severity,
                                  ]),
                              )
                            : undefined,
                },
            },
        };
    }
}
