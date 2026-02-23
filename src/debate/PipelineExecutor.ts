import { logger } from "../core/logger";
import type { LLMClient } from "../types/llm";
import type {
    AgentRun,
    DebateContext,
    DebateRun,
    AgentResponse,
    Critique,
} from "../types/agent";
import type { PipelinePreset } from "../types/artifact";
import {
    getCalibration,
    getCounterfactual,
    getCritique,
    getEvidencePlan,
    getJudgement,
    getProposal,
} from "../core/extraction";
import { computeBasicMetrics, computeConsensusIfPossible } from "../core/metrics";
import { makeId } from "../core/id";
import type { DebateEngineDeps } from "./DebateEngine";

function nowIso() {
    return new Date().toISOString();
}

export type PipelineContext = {
    ctx: DebateContext;
    model: string;
    verbose: boolean;
    quiet: boolean;
    preset: PipelinePreset;
    fast: boolean;
    steps: AgentRun[];
    critiques: Critique[];
    critique: Critique | undefined;
    evidencePlan: ReturnType<typeof getEvidencePlan>;
    proposal: AgentResponse | undefined;
    revision: AgentResponse | undefined;
    synthesized: AgentResponse | undefined;
};

export type PipelineStepResult =
    | { done: true; run: DebateRun }
    | { done: false; continue: true };

export type PipelineStep = (
    deps: PipelineExecutorDeps,
    pipelineCtx: PipelineContext,
) => Promise<PipelineStepResult>;

function assertAgents(
    deps: DebateEngineDeps,
): asserts deps is PipelineExecutorDeps {
    if (deps.agents == null) {
        throw new Error("PipelineExecutor requires agents to be provided");
    }
}

/** Standard pipeline: Solver -> Skeptic -> (optional Revision) -> (optional Synthesizer) */
export function createStandardPipeline(): PipelineStep[] {
    return [
        runDecomposerAndEvidencePlanner,
        runSolver,
        runSkeptic,
        runRedTeam,
        runFastPath,
        runRevision,
        runSynthesizer,
        runResearchTail,
        finalizeRun,
    ];
}

async function runDecomposerAndEvidencePlanner(
    deps: DebateEngineDeps,
    pipelineCtx: PipelineContext,
): Promise<PipelineStepResult> {
    const { ctx, preset, quiet, steps } = pipelineCtx;
    if (preset === "standard") return { done: false, continue: true };

    if (!quiet)
        logger.info("Question decomposer agent is building research framing");
    const decomposerStep = await deps.agents.decomposer!.run(
        ctx,
        deps.llm,
        { model: pipelineCtx.model, verbose: pipelineCtx.verbose },
    );
    steps.push(decomposerStep);
    if (pipelineCtx.verbose) {
        logger.debug({ step: decomposerStep }, "Question decomposer step");
    }

    if (!quiet)
        logger.info("Evidence planner agent is mapping evidence checks");
    const evidencePlannerStep = await deps.agents.evidencePlanner!.run(
        ctx,
        deps.llm,
        { model: pipelineCtx.model, verbose: pipelineCtx.verbose },
    );
    steps.push(evidencePlannerStep);
    if (pipelineCtx.verbose) {
        logger.debug({ step: evidencePlannerStep }, "Evidence planner step");
    }
    pipelineCtx.evidencePlan = getEvidencePlan(evidencePlannerStep);

    return { done: false, continue: true };
}

async function runSolver(
    deps: DebateEngineDeps,
    pipelineCtx: PipelineContext,
): Promise<PipelineStepResult> {
    const { ctx, quiet, steps } = pipelineCtx;

    if (!quiet) logger.info("Solver agent is now solving the question");
    const solverStep = await deps.agents.solver!.run(ctx, deps.llm, {
        model: pipelineCtx.model,
        verbose: pipelineCtx.verbose,
        evidencePlan: pipelineCtx.evidencePlan ?? undefined,
    });
    steps.push(solverStep);
    if (pipelineCtx.verbose) {
        logger.debug({ step: solverStep }, "Solver step");
    }

    const proposal = getProposal(solverStep) ?? undefined;
    pipelineCtx.proposal = proposal;

    if (!proposal) {
        const fallback =
            (solverStep.rawAttempts[0] as AgentResponse)?.answer ??
            solverStep.error ??
            "Solver failed to produce a proposal.";
        const run: DebateRun = {
            id: makeId("run"),
            createdAt: nowIso(),
            question: ctx.question,
            pipelinePreset: pipelineCtx.preset,
            steps,
            finalAnswer: String(fallback),
            metrics: { confidence: {}, critique: {} },
        };
        computeBasicMetrics(run);
        return { done: true, run };
    }

    return { done: false, continue: true };
}

async function runSkeptic(
    deps: DebateEngineDeps,
    pipelineCtx: PipelineContext,
): Promise<PipelineStepResult> {
    const { ctx, proposal, quiet, steps, critiques } = pipelineCtx;
    if (!proposal) return { done: false, continue: true };

    if (!quiet)
        logger.info("Skeptic agent is now critiquing the proposal");
    const skepticStep = await deps.agents.skeptic!.run(ctx, deps.llm, {
        model: pipelineCtx.model,
        verbose: pipelineCtx.verbose,
        targetAgentName: deps.agents.solver!.name,
        proposal,
    });
    steps.push(skepticStep);
    if (pipelineCtx.verbose) {
        logger.debug({ step: skepticStep }, "Skeptic step");
    }

    const critique = getCritique(skepticStep) ?? undefined;
    if (critique) {
        critiques.push(critique);
        pipelineCtx.critique = critique;
    }

    if (!critique) {
        const run: DebateRun = {
            id: makeId("run"),
            createdAt: nowIso(),
            question: ctx.question,
            pipelinePreset: pipelineCtx.preset,
            steps,
            finalAnswer: proposal.answer,
            metrics: { confidence: {}, critique: {} },
        };
        computeBasicMetrics(run);
        return { done: true, run };
    }

    return { done: false, continue: true };
}

async function runRedTeam(
    deps: DebateEngineDeps,
    pipelineCtx: PipelineContext,
): Promise<PipelineStepResult> {
    const { ctx, proposal, preset, quiet, steps, critiques } = pipelineCtx;
    if (preset === "standard" || !proposal) return { done: false, continue: true };

    if (!quiet)
        logger.info("Red-team agent is stress testing the proposal");
    const redTeamStep = await deps.agents.redTeam!.run(ctx, deps.llm, {
        model: pipelineCtx.model,
        verbose: pipelineCtx.verbose,
        proposal,
    });
    steps.push(redTeamStep);
    if (pipelineCtx.verbose) {
        logger.debug({ step: redTeamStep }, "Red-team step");
    }
    const redTeamCritique = getCritique(redTeamStep);
    if (redTeamCritique) critiques.push(redTeamCritique);

    return { done: false, continue: true };
}

async function runFastPath(
    deps: DebateEngineDeps,
    pipelineCtx: PipelineContext,
): Promise<PipelineStepResult> {
    const { ctx, proposal, preset, fast, quiet, steps, critiques } =
        pipelineCtx;
    if (!fast || !proposal) return { done: false, continue: true };

    if (preset !== "standard") {
        if (!quiet)
            logger.info("Counterfactual agent is probing failure conditions");
        const counterfactualStep = await deps.agents.counterfactual!.run(
            ctx,
            deps.llm,
            {
                model: pipelineCtx.model,
                verbose: pipelineCtx.verbose,
                proposal,
            },
        );
        steps.push(counterfactualStep);
        if (pipelineCtx.verbose) {
            logger.debug({ step: counterfactualStep }, "Counterfactual step");
        }

        if (!quiet)
            logger.info("Calibration agent is calibrating fast-mode answer");
        const calibrationStep = await deps.agents.calibration!.run(
            deps.llm,
            {
                model: pipelineCtx.model,
                verbose: pipelineCtx.verbose,
                proposal,
            },
        );
        steps.push(calibrationStep);
        if (pipelineCtx.verbose) {
            logger.debug({ step: calibrationStep }, "Calibration step");
        }

        if (!quiet)
            logger.info("Judge agent is scoring fast-mode answer");
        const judgeStep = await deps.agents.judge!.run(deps.llm, {
            model: pipelineCtx.model,
            verbose: pipelineCtx.verbose,
            proposal,
            critiques,
        });
        steps.push(judgeStep);
        if (pipelineCtx.verbose) {
            logger.debug({ step: judgeStep }, "Judge step");
        }
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
    await computeConsensusIfPossible(run, deps.embedding);
    return { done: true, run };
}

async function runRevision(
    deps: DebateEngineDeps,
    pipelineCtx: PipelineContext,
): Promise<PipelineStepResult> {
    const { ctx, proposal, quiet, steps } = pipelineCtx;
    const critique = pipelineCtx.critique;
    if (!proposal || !critique) return { done: false, continue: true };

    if (!quiet)
        logger.info("Solver revision agent is now revising the proposal");
    const revisionStep = await deps.agents.revision!.run(
        ctx,
        deps.llm,
        {
            model: pipelineCtx.model,
            verbose: pipelineCtx.verbose,
            proposal,
            critique,
        },
    );
    steps.push(revisionStep);
    if (pipelineCtx.verbose) {
        logger.debug({ step: revisionStep }, "Solver revision step");
    }

    const revisedProposal = getProposal(revisionStep) ?? undefined;
    pipelineCtx.revision = revisedProposal;

    if (!revisedProposal) {
        const run: DebateRun = {
            id: makeId("run"),
            createdAt: nowIso(),
            question: ctx.question,
            pipelinePreset: pipelineCtx.preset,
            steps,
            finalAnswer: proposal.answer,
            metrics: { confidence: {}, critique: {} },
        };
        computeBasicMetrics(run);
        return { done: true, run };
    }

    return { done: false, continue: true };
}

async function runSynthesizer(
    deps: DebateEngineDeps,
    pipelineCtx: PipelineContext,
): Promise<PipelineStepResult> {
    const { ctx, proposal, revision, quiet, steps } = pipelineCtx;
    const critique = pipelineCtx.critique;
    if (!proposal || !critique || !revision) return { done: false, continue: true };

    if (!quiet)
        logger.info("Synthesizer agent is now synthesizing the proposal");
    const synthesizerStep = await deps.agents.synthesizer!.run(
        ctx,
        deps.llm,
        {
            model: pipelineCtx.model,
            verbose: pipelineCtx.verbose,
            proposal,
            critique,
            revision,
        },
    );
    steps.push(synthesizerStep);
    if (pipelineCtx.verbose) {
        logger.debug({ step: synthesizerStep }, "Synthesizer step");
    }

    const synthesizedProposal = getProposal(synthesizerStep) ?? undefined;
    pipelineCtx.synthesized = synthesizedProposal ?? revision;

    return { done: false, continue: true };
}

async function runResearchTail(
    deps: DebateEngineDeps,
    pipelineCtx: PipelineContext,
): Promise<PipelineStepResult> {
    const { ctx, preset, quiet, steps, critiques } = pipelineCtx;
    const finalProposal =
        pipelineCtx.synthesized ?? pipelineCtx.revision ?? pipelineCtx.proposal;
    if (preset === "standard" || !finalProposal) return { done: false, continue: true };

    if (!quiet)
        logger.info("Counterfactual agent is probing failure conditions");
    const counterfactualStep = await deps.agents.counterfactual!.run(
        ctx,
        deps.llm,
        {
            model: pipelineCtx.model,
            verbose: pipelineCtx.verbose,
            proposal: finalProposal,
        },
    );
    steps.push(counterfactualStep);
    if (pipelineCtx.verbose) {
        logger.info("Counterfactual step:");
        logger.info(JSON.stringify(counterfactualStep, null, 2));
    }
    const counterfactual = getCounterfactual(counterfactualStep);
    if (counterfactual?.failureModes?.length) {
        finalProposal.assumptions = [
            ...finalProposal.assumptions,
            `Counterfactual risk: ${counterfactual.failureModes[0]}`,
        ];
    }

    if (!quiet)
        logger.info("\nCalibration agent is calibrating final answer...");
    const calibrationStep = await deps.agents.calibration!.run(deps.llm, {
        model: pipelineCtx.model,
        verbose: pipelineCtx.verbose,
        proposal: finalProposal,
    });
    steps.push(calibrationStep);
    const calibration = getCalibration(calibrationStep);

    if (!quiet)
        logger.info("Judge agent is scoring final answer");
    const judgeStep = await deps.agents.judge!.run(deps.llm, {
        model: pipelineCtx.model,
        verbose: pipelineCtx.verbose,
        proposal: finalProposal,
        critiques,
    });
    steps.push(judgeStep);
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

    return { done: false, continue: true };
}

async function finalizeRun(
    deps: DebateEngineDeps,
    pipelineCtx: PipelineContext,
): Promise<PipelineStepResult> {
    const finalProposal =
        pipelineCtx.synthesized ?? pipelineCtx.revision ?? pipelineCtx.proposal;
    if (!finalProposal) {
        throw new Error("Pipeline completed without a proposal");
    }

    const run: DebateRun = {
        id: makeId("run"),
        createdAt: nowIso(),
        question: pipelineCtx.ctx.question,
        pipelinePreset: pipelineCtx.preset,
        steps: pipelineCtx.steps,
        finalAnswer: finalProposal.answer,
        metrics: { confidence: {}, critique: {} },
    };
    computeBasicMetrics(run);
    await computeConsensusIfPossible(run, deps.embedding);
    return { done: true, run };
}

export type PipelineExecutorDeps = DebateEngineDeps & {
    agents: NonNullable<DebateEngineDeps["agents"]>;
};

export async function executePipeline(
    deps: PipelineExecutorDeps,
    ctx: DebateContext,
    opts: {
        model: string;
        verbose?: boolean;
        quiet?: boolean;
        fast?: boolean;
        preset?: PipelinePreset;
    },
): Promise<DebateRun> {
    assertAgents(deps);
    const verbose = opts.verbose ?? false;
    const quiet = opts.quiet ?? false;
    const preset = opts.preset ?? "standard";
    const fast = opts.fast ?? preset === "fast_research";

    const pipelineCtx: PipelineContext = {
        ctx,
        model: opts.model,
        verbose,
        quiet,
        preset,
        fast,
        steps: [],
        critiques: [],
        critique: undefined,
        evidencePlan: null,
        proposal: undefined,
        revision: undefined,
        synthesized: undefined,
    };

    const steps = createStandardPipeline();
    for (const step of steps) {
        const result = await step(deps, pipelineCtx);
        if (result.done) return result.run;
    }

    throw new Error("Pipeline did not produce a result");
}
