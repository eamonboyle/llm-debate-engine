import type { LLMClient } from "../types/llm";
import type { EmbeddingClient } from "../types/embedding";
import type {
    AgentResponse,
    AgentRun,
    DebateContext,
    DebateRun,
    Critique,
} from "../types/agent";
import type { PipelinePreset } from "../types/artifact";
import { SolverAgent } from "../agents/SolverAgent";
import { SkepticAgent } from "../agents/SkepticAgent";
import { SolverRevisionAgent } from "../agents/SolverRevisionAgent";
import { SynthesizerAgent } from "../agents/SynthesizerAgent";
import { QuestionDecomposerAgent } from "../agents/QuestionDecomposerAgent";
import { EvidencePlannerAgent } from "../agents/EvidencePlannerAgent";
import { RedTeamAgent } from "../agents/RedTeamAgent";
import { CalibrationAgent } from "../agents/CalibrationAgent";
import { JudgeAgent } from "../agents/JudgeAgent";
import {
    getCalibration,
    getCritique,
    getEvidencePlan,
    getJudgement,
    getProposal,
} from "../core/extraction";
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
        decomposer?: QuestionDecomposerAgent;
        evidencePlanner?: EvidencePlannerAgent;
        redTeam?: RedTeamAgent;
        calibration?: CalibrationAgent;
        judge?: JudgeAgent;
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
        decomposer: QuestionDecomposerAgent;
        evidencePlanner: EvidencePlannerAgent;
        redTeam: RedTeamAgent;
        calibration: CalibrationAgent;
        judge: JudgeAgent;
    };

    constructor(deps: DebateEngineDeps) {
        this.llm = deps.llm;
        this.embedding = deps.embedding;
        this.agents = {
            solver: deps.agents?.solver ?? new SolverAgent(),
            skeptic: deps.agents?.skeptic ?? new SkepticAgent(),
            solverRevision: deps.agents?.revision ?? new SolverRevisionAgent(),
            synthesizer: deps.agents?.synthesizer ?? new SynthesizerAgent(),
            decomposer: deps.agents?.decomposer ?? new QuestionDecomposerAgent(),
            evidencePlanner:
                deps.agents?.evidencePlanner ?? new EvidencePlannerAgent(),
            redTeam: deps.agents?.redTeam ?? new RedTeamAgent(),
            calibration: deps.agents?.calibration ?? new CalibrationAgent(),
            judge: deps.agents?.judge ?? new JudgeAgent(),
        };
    }

    async run(
        ctx: DebateContext,
        opts: {
            model: string;
            verbose?: boolean;
            quiet?: boolean;
            /** When true, skip revision and synthesizer (Solver → Skeptic → done). ~50% fewer LLM calls. */
            fast?: boolean;
            preset?: PipelinePreset;
        },
    ): Promise<DebateRun> {
        const verbose = opts.verbose ?? false;
        const quiet = opts.quiet ?? false;
        const preset = opts.preset ?? "standard";
        const fast = opts.fast ?? preset === "fast_research";
        const steps: AgentRun[] = [];
        const critiques: Critique[] = [];
        let evidencePlan: ReturnType<typeof getEvidencePlan> = null;

        const pushAndLog = (label: string, step: AgentRun) => {
            steps.push(step);
            if (verbose) {
                console.log(`${label} step:`);
                console.log(JSON.stringify(step, null, 2));
            }
        };

        if (preset !== "standard") {
            if (!quiet)
                console.log(
                    "Question decomposer agent is building research framing...",
                );
            const decomposerStep = await this.agents.decomposer.run(
                ctx,
                this.llm,
                { model: opts.model, verbose },
            );
            pushAndLog("Question decomposer", decomposerStep);

            if (!quiet)
                console.log("Evidence planner agent is mapping evidence checks...");
            const evidencePlannerStep = await this.agents.evidencePlanner.run(
                ctx,
                this.llm,
                { model: opts.model, verbose },
            );
            pushAndLog("Evidence planner", evidencePlannerStep);
            evidencePlan = getEvidencePlan(evidencePlannerStep);
        }

        // Step 1: Solver
        if (!quiet) console.log("Solver agent is now solving the question...");
        const solverStep = await this.agents.solver.run(ctx, this.llm, {
            model: opts.model,
            verbose,
            evidencePlan: evidencePlan ?? undefined,
        });
        pushAndLog("Solver", solverStep);

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
                pipelinePreset: preset,
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
            verbose,
            targetAgentName: this.agents.solver.name,
            proposal,
        });
        pushAndLog("Skeptic", skepticStep);

        const critique = getCritique(skepticStep) ?? undefined;
        if (critique) critiques.push(critique);

        if (!critique) {
            const run: DebateRun = {
                id: makeId("run"),
                createdAt: nowIso(),
                question: ctx.question,
                pipelinePreset: preset,
                steps,
                finalAnswer: proposal.answer,
                metrics: { confidence: {}, critique: {} },
            };
            computeBasicMetrics(run);
            return run;
        }

        if (preset !== "standard") {
            if (!quiet)
                console.log(
                    "\nRed-team agent is stress testing the proposal...",
                );
            const redTeamStep = await this.agents.redTeam.run(ctx, this.llm, {
                model: opts.model,
                verbose,
                proposal,
            });
            pushAndLog("Red-team", redTeamStep);
            const redTeamCritique = getCritique(redTeamStep);
            if (redTeamCritique) critiques.push(redTeamCritique);
        }

        let revision = proposal;
        let synthesized = proposal;

        if (fast) {
            if (preset !== "standard") {
                if (!quiet)
                    console.log(
                        "\nCalibration agent is calibrating fast-mode answer...",
                    );
                const calibrationStep = await this.agents.calibration.run(
                    this.llm,
                    {
                        model: opts.model,
                        verbose,
                        proposal,
                    },
                );
                pushAndLog("Calibration", calibrationStep);

                if (!quiet)
                    console.log("\nJudge agent is scoring fast-mode answer...");
                const judgeStep = await this.agents.judge.run(this.llm, {
                    model: opts.model,
                    verbose,
                    proposal,
                    critiques,
                });
                pushAndLog("Judge", judgeStep);
            }

            const run: DebateRun = {
                id: makeId("run"),
                createdAt: nowIso(),
                question: ctx.question,
                pipelinePreset: preset,
                steps,
                finalAnswer: proposal.answer,
                metrics: { confidence: {}, critique: {} },
            };
            computeBasicMetrics(run);
            await computeConsensusIfPossible(run, this.embedding);
            return run;
        }

        // Step 3: Solver revision
        if (!quiet) console.log("\nSolver revision agent is now revising the proposal...");
        const revisionStep = await this.agents.solverRevision.run(
            ctx,
            this.llm,
            {
                model: opts.model,
                verbose,
                proposal,
                critique,
            },
        );
        pushAndLog("Solver revision", revisionStep);

        const revisedProposal = getProposal(revisionStep) ?? undefined;

        if (!revisedProposal) {
            const run: DebateRun = {
                id: makeId("run"),
                createdAt: nowIso(),
                question: ctx.question,
                pipelinePreset: preset,
                steps,
                finalAnswer: proposal.answer,
                metrics: { confidence: {}, critique: {} },
            };
            computeBasicMetrics(run);
            return run;
        }
        revision = revisedProposal;

        // Step 4: Synthesizer
        if (!quiet) console.log("\nSynthesizer agent is now synthesizing the proposal...");
        const synthesizerStep = await this.agents.synthesizer.run(
            ctx,
            this.llm,
            {
                model: opts.model,
                verbose,
                proposal,
                critique,
                revision,
            },
        );
        pushAndLog("Synthesizer", synthesizerStep);

        const synthesizedProposal = getProposal(synthesizerStep) ?? undefined;
        if (synthesizedProposal) {
            synthesized = synthesizedProposal;
        }

        const finalProposal = synthesized ?? revision;

        if (preset !== "standard") {
            if (!quiet)
                console.log("\nCalibration agent is calibrating final answer...");
            const calibrationStep = await this.agents.calibration.run(this.llm, {
                model: opts.model,
                verbose,
                proposal: finalProposal,
            });
            pushAndLog("Calibration", calibrationStep);
            const calibration = getCalibration(calibrationStep);

            if (!quiet) console.log("\nJudge agent is scoring final answer...");
            const judgeStep = await this.agents.judge.run(this.llm, {
                model: opts.model,
                verbose,
                proposal: finalProposal,
                critiques,
            });
            pushAndLog("Judge", judgeStep);
            const judgement = getJudgement(judgeStep);

            if (calibration?.adjustedConfidence != null) {
                finalProposal.confidence = calibration.adjustedConfidence;
            }
            if (judgement) {
                finalProposal.assumptions = [
                    ...finalProposal.assumptions,
                    `Judge summary: ${judgement.summary}`,
                ];
            }
        }

        const finalAnswer = finalProposal.answer;

        const run: DebateRun = {
            id: makeId("run"),
            createdAt: nowIso(),
            question: ctx.question,
            pipelinePreset: preset,
            steps,
            finalAnswer,
            metrics: { confidence: {}, critique: {} },
        };

        computeBasicMetrics(run);
        await computeConsensusIfPossible(run, this.embedding);

        return run;
    }
}
