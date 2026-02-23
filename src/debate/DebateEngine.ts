import type { LLMClient } from "../types/llm";
import type { EmbeddingClient } from "../types/embedding";
import type { DebateContext, DebateRun } from "../types/agent";
import type { PipelinePreset } from "../types/artifact";
import { SolverAgent } from "../agents/SolverAgent";
import { SkepticAgent } from "../agents/SkepticAgent";
import { SolverRevisionAgent } from "../agents/SolverRevisionAgent";
import { SynthesizerAgent } from "../agents/SynthesizerAgent";
import { QuestionDecomposerAgent } from "../agents/QuestionDecomposerAgent";
import { EvidencePlannerAgent } from "../agents/EvidencePlannerAgent";
import { CounterfactualAgent } from "../agents/CounterfactualAgent";
import { RedTeamAgent } from "../agents/RedTeamAgent";
import { CalibrationAgent } from "../agents/CalibrationAgent";
import { JudgeAgent } from "../agents/JudgeAgent";
import { executePipeline } from "./PipelineExecutor";

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
        counterfactual?: CounterfactualAgent;
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
        counterfactual: CounterfactualAgent;
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
            decomposer:
                deps.agents?.decomposer ?? new QuestionDecomposerAgent(),
            evidencePlanner:
                deps.agents?.evidencePlanner ?? new EvidencePlannerAgent(),
            counterfactual:
                deps.agents?.counterfactual ?? new CounterfactualAgent(),
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
        return executePipeline(
            {
                llm: this.llm,
                embedding: this.embedding,
                agents: {
                    ...this.agents,
                    revision: this.agents.solverRevision,
                },
            },
            ctx,
            opts,
        );
    }
}
