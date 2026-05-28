export type PipelineAgent = {
    name: string;
    role: string;
    description: string;
};

export type PipelinePreset = {
    id: string;
    label: string;
    steps: string[];
    notes?: string;
};

export const PIPELINE_PRESETS: PipelinePreset[] = [
    {
        id: "standard",
        label: "Standard",
        steps: ["Solver", "Skeptic", "SolverRevision", "Synthesizer"],
        notes: "Balanced critique-and-revision loop for everyday questions.",
    },
    {
        id: "research_deep",
        label: "Research deep",
        steps: [
            "QuestionDecomposer",
            "EvidencePlanner",
            "Solver",
            "Skeptic",
            "RedTeam",
            "SolverRevision",
            "Synthesizer",
            "Counterfactual",
            "Calibration",
            "Judge",
        ],
        notes: "Full research stack with evidence planning, red-team stress tests, and calibration.",
    },
    {
        id: "fast_research",
        label: "Fast research",
        steps: [
            "QuestionDecomposer",
            "EvidencePlanner",
            "Solver",
            "Skeptic",
            "RedTeam",
            "Counterfactual",
            "Calibration",
            "Judge",
        ],
        notes: "Skips revision and synthesizer for quicker multi-agent evaluation.",
    },
];

export const PIPELINE_AGENTS: PipelineAgent[] = [
    {
        name: "QuestionDecomposer",
        role: "Decomposition",
        description:
            "Breaks the user question into sub-questions and reasoning structure before solving.",
    },
    {
        name: "EvidencePlanner",
        role: "Evidence planning",
        description:
            "Scores evidence risk (1–5) and outlines verification checks before the solver answers.",
    },
    {
        name: "Solver",
        role: "Proposal",
        description:
            "Produces the initial answer and confidence; anchor for downstream critique.",
    },
    {
        name: "Skeptic",
        role: "Critique",
        description:
            "Raises structured issues (missing evidence, overconfidence, etc.) with severity scores.",
    },
    {
        name: "RedTeam",
        role: "Adversarial review",
        description:
            "Stress-tests the proposal with stronger counter-arguments in deep research presets.",
    },
    {
        name: "SolverRevision",
        role: "Revision",
        description:
            "Revises the proposal after critique; often lowers confidence when issues are valid.",
    },
    {
        name: "Synthesizer",
        role: "Synthesis",
        description:
            "Combines debate outputs into a final answer when the full standard pipeline runs.",
    },
    {
        name: "Counterfactual",
        role: "Failure modes",
        description:
            "Surfaces scenarios where the answer fails under different assumptions.",
    },
    {
        name: "Calibration",
        role: "Calibration",
        description:
            "Adjusts confidence to better match critique severity and uncertainty.",
    },
    {
        name: "Judge",
        role: "Judgement",
        description:
            "Applies rubric scores (coherence, factual risk, completeness) on deep presets.",
    },
];

export function presetById(id: string): PipelinePreset | undefined {
    return PIPELINE_PRESETS.find((preset) => preset.id === id);
}
