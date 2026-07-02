/**
 * Central glossary of metric and term explanations for the LLM Research Dashboard.
 * Used by InfoTooltip to provide contextual help.
 */

export const GLOSSARY: Record<string, string> = {
    // Overview metrics
    runArtifacts:
        "Number of run JSON artifacts loaded from the runs directory.",
    benchmarkArtifacts:
        "Number of benchmark JSON artifacts (grouped runs by question).",
    skippedFiles:
        "Number of files skipped during analysis (e.g. invalid or excluded).",
    solverToRevisionDelta:
        "Confidence change after the skeptic's critique; often negative when the model recalibrates.",
    revisionToSynthesizerDelta:
        "Confidence change from revised proposal to final synthesized answer.",
    calibratedMinusSynthDelta:
        "Difference between calibrated confidence and synthesizer confidence. Positive = calibration raised confidence; negative = calibration tempered optimism.",
    severityVsSolverToRevisionDelta:
        "Correlation: harsher critique drives stronger confidence reductions. Strong negative = good calibration.",
    severityVsRevisionToSynthesizerDelta:
        "Correlation between critique severity and revision-to-synthesizer confidence delta.",
    evidenceRiskLevel:
        "EvidencePlanner risk score (1–5); higher = more uncertain or high-stakes reasoning terrain.",
    counterfactualFailureModeCount:
        "Number of distinct failure modes identified by CounterfactualAgent across runs.",
    uniqueCounterfactualModes:
        "Number of distinct failure modes identified by CounterfactualAgent across runs.",

    // Benchmark metrics
    modeCount:
        "Number of distinct answer clusters discovered from benchmark final-answer embeddings.",
    modeCountClaimCentroid:
        "Number of clusters from claim-centroid embeddings — groups runs by semantic claim structure rather than final-answer wording.",
    divergenceEntropyClaimCentroid:
        "Entropy of run distribution across claim-centroid modes; compare with answer-embedding entropy to see whether divergence is lexical or substantive.",
    stabilityClaimCentroid:
        "Average pairwise similarity of claim-centroid vectors across benchmark runs.",
    claimCentroidComparison:
        "Side-by-side answer-embedding vs claim-centroid clustering. Fewer claim-centroid modes often means answers diverge in wording but share underlying claims.",
    divergenceEntropy:
        "Entropy of run distribution across modes; higher means broader divergence.",
    entropy:
        "Entropy of run distribution across modes; higher means broader divergence.",
    stabilityPairwiseMean:
        "Average pairwise cosine similarity across final answers in a benchmark.",
    runs: "Number of runs in this benchmark.",
    avgSimilarity:
        "Mean cosine similarity of a run to all other runs in the same benchmark.",
    zScore: "How unusual a run is vs peers; more negative = stronger outlier behavior.",
    outlierRuns:
        "Runs ranked by lowest average pairwise similarity within their benchmark — candidates for qualitative review.",
    modeStructure:
        "Distribution of runs across discovered answer modes. Highly skewed (e.g. [n-1, 1]) indicates a single outlier.",
    thresholdSensitivity:
        "Mode count at similarity thresholds 0.8, 0.9, 0.95. Large increase as threshold tightens implies nuanced variation.",
    benchmarkThreshold:
        "Cosine similarity threshold used when clustering final answers into modes during benchmark generation.",
    benchmarkRunAggregates:
        "Aggregate statistics across member runs: mean consensus strength between debate stages, mean max critique severity, and answer-embedding stability distribution.",
    pairwiseSimilarityHeatmap:
        "Similarity between each pair of runs. Darker red = low similarity; green = high. Green blocks indicate consistent sub-clusters.",
    modeExplorer:
        "Each mode's exemplar and inferred label. Useful for qualitatively naming divergence patterns.",

    // Critique & issues
    critiqueIssueTypes:
        "Count of critique issues by type. High 'missing' = weak coverage; high 'overconfidence' = inflated confidence.",
    severityVsConfidenceDelta:
        "Scatter: X = critique max severity, Y = solver→revision confidence delta. Lower points at high severity = model calibrating downward.",
    issueCount: "Number of issues raised by the skeptic's critique.",
    maxSeverity: "Highest severity level among critique issues.",
    issueSeverityByType:
        "Average and maximum skeptic severity per issue type across indexed runs.",

    // Run compare metrics
    stepCount:
        "Number of pipeline steps; reflects pipeline depth and additional critique passes.",
    solverConfidence: "Confidence score from the Solver's initial proposal.",
    revisionConfidence:
        "Confidence score after the SolverRevision step, following skeptic critique.",
    synthConfidence: "Confidence score from the Synthesizer's final answer.",
    calibratedConfidence:
        "Post-calibration confidence score from the Calibration agent.",
    consensusStrength:
        "Mean pairwise cosine similarity across solver, revision, and synthesizer answers. Higher = more agreement between debate stages.",
    consensusIncluded:
        "Which pipeline answers were embedded and compared for consensus.",
    consensusPairs:
        "Number of pairwise similarity comparisons in the consensus metric.",
    factualRisk: "Quality rubric score for factual risk in the answer.",
    coherence: "Quality rubric score for coherence.",
    completeness: "Quality rubric score for completeness.",
    uncertaintyHandling: "Quality rubric score for how uncertainty is handled.",
    cfModeCount:
        "Number of counterfactual failure modes identified for this run.",
    topCounterfactualMode:
        "Most frequent failure mode identified by CounterfactualAgent.",

    // Preset & config
    preset: "Pipeline preset: standard, research_deep, or fast_research. Affects depth and agent usage.",
    model: "LLM model used for this run (e.g. gpt-5-nano).",
    fastMode: "When true, uses a shorter/faster pipeline variant.",

    // Agents (trace steps)
    SolverAgent:
        "Proposes an initial answer and key claims. First step in the debate pipeline.",
    SolverRevisionAgent:
        "Revises the proposal after the skeptic's critique. Incorporates valid feedback.",
    SynthesizerAgent:
        "Produces the final synthesized answer from the debate, combining best elements.",
    EvidencePlannerAgent:
        "Assesses evidence requirements and risk level (1–5) for the question.",
    CounterfactualAgent:
        "Identifies failure modes: scenarios where the answer could fail under different assumptions.",
    EvidencePlanner: "Same as EvidencePlannerAgent.",

    // Step kinds
    proposal: "Initial answer proposal from the Solver.",
    critique: "Skeptic's critique of the proposal, with issues and severity.",
    judgement:
        "Quality judgement with rubric scores (coherence, completeness, factual risk).",
    evidence_plan:
        "Evidence requirements, verification checks, and risk assessment.",
    counterfactual: "Failure modes, trigger conditions, and mitigations.",
    decomposition: "Breakdown of the question or reasoning structure.",
    calibration: "Confidence calibration step.",

    // Chart titles
    agentStats:
        "Aggregate step counts and error rates per debate agent across filtered runs.",
    presetUsageDistribution:
        "Relative usage of pipeline presets (standard, research_deep, fast_research).",
    benchmarkEntropyStabilityTrend:
        "How diversity (entropy) and consistency (stability) evolve over benchmark runs over time.",
    evidencePlannerRiskDistribution:
        "Frequency of EvidencePlanner risk scores (1–5) across runs. Right-skewed = consistently high-risk planning.",
    evidenceRiskTrendByRunTime:
        "Temporal drift in planning risk. Sustained upward movement = progressively harder questions.",
    runMetricDeltas:
        "Difference (right run minus left run) for each metric. Positive = right has higher value.",
    sideBySideMetricComparison:
        "Compare key metrics (mode count, entropy, stability) between two benchmarks.",
    pipelineTiming:
        "Average and median wall-clock duration per agent step, computed from trace timestamps.",
};

export function getGlossaryEntry(key: string): string | undefined {
    return GLOSSARY[key];
}
