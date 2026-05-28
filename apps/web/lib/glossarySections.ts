import { GLOSSARY } from "./glossary";

export type GlossarySection = {
    id: string;
    title: string;
    keys: string[];
};

/** Curated sections for the full glossary page; keys not listed appear in "Other". */
export const GLOSSARY_SECTIONS: GlossarySection[] = [
    {
        id: "overview",
        title: "Overview & index metrics",
        keys: [
            "runArtifacts",
            "benchmarkArtifacts",
            "skippedFiles",
            "solverToRevisionDelta",
            "revisionToSynthesizerDelta",
            "severityVsSolverToRevisionDelta",
            "severityVsRevisionToSynthesizerDelta",
            "evidenceRiskLevel",
            "counterfactualFailureModeCount",
            "uniqueCounterfactualModes",
        ],
    },
    {
        id: "benchmark",
        title: "Benchmark metrics",
        keys: [
            "modeCount",
            "divergenceEntropy",
            "entropy",
            "stabilityPairwiseMean",
            "runs",
            "avgSimilarity",
            "zScore",
            "modeStructure",
            "thresholdSensitivity",
            "pairwiseSimilarityHeatmap",
            "modeExplorer",
        ],
    },
    {
        id: "critique",
        title: "Critique & quality",
        keys: [
            "critiqueIssueTypes",
            "severityVsConfidenceDelta",
            "issueCount",
            "maxSeverity",
            "factualRisk",
            "coherence",
            "completeness",
            "uncertaintyHandling",
        ],
    },
    {
        id: "run-compare",
        title: "Run comparison",
        keys: [
            "stepCount",
            "solverConfidence",
            "revisionConfidence",
            "synthConfidence",
            "calibratedConfidence",
            "cfModeCount",
            "topCounterfactualMode",
        ],
    },
    {
        id: "config",
        title: "Configuration",
        keys: ["preset", "model", "fastMode"],
    },
    {
        id: "agents",
        title: "Pipeline agents",
        keys: [
            "SolverAgent",
            "SolverRevisionAgent",
            "SynthesizerAgent",
            "EvidencePlannerAgent",
            "CounterfactualAgent",
            "EvidencePlanner",
        ],
    },
    {
        id: "steps",
        title: "Trace step kinds",
        keys: [
            "proposal",
            "critique",
            "judgement",
            "evidence_plan",
            "counterfactual",
            "decomposition",
            "calibration",
        ],
    },
    {
        id: "charts",
        title: "Charts",
        keys: [
            "presetUsageDistribution",
            "benchmarkEntropyStabilityTrend",
            "evidencePlannerRiskDistribution",
            "evidenceRiskTrendByRunTime",
            "runMetricDeltas",
            "sideBySideMetricComparison",
        ],
    },
];

export function buildGlossarySections(): Array<{
    id: string;
    title: string;
    entries: Array<{ key: string; description: string }>;
}> {
    const used = new Set<string>();
    const sections = GLOSSARY_SECTIONS.map((section) => {
        const entries = section.keys
            .filter((key) => GLOSSARY[key])
            .map((key) => {
                used.add(key);
                return { key, description: GLOSSARY[key] };
            });
        return { id: section.id, title: section.title, entries };
    }).filter((section) => section.entries.length > 0);

    const otherKeys = Object.keys(GLOSSARY)
        .filter((key) => !used.has(key))
        .sort();

    if (otherKeys.length > 0) {
        sections.push({
            id: "other",
            title: "Other terms",
            entries: otherKeys.map((key) => ({
                key,
                description: GLOSSARY[key],
            })),
        });
    }

    return sections;
}

export function filterGlossarySections(
    sections: ReturnType<typeof buildGlossarySections>,
    query: string,
): ReturnType<typeof buildGlossarySections> {
    const q = query.trim().toLowerCase();
    if (!q) return sections;

    return sections
        .map((section) => ({
            ...section,
            entries: section.entries.filter(
                (entry) =>
                    entry.key.toLowerCase().includes(q) ||
                    entry.description.toLowerCase().includes(q),
            ),
        }))
        .filter((section) => section.entries.length > 0);
}
