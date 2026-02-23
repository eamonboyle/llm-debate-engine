export type PipelinePreset = "standard" | "research_deep" | "fast_research";

export type RunArtifact = {
    kind: "run";
    id: string;
    question: string;
    metadata: {
        createdAt: string;
        model: string;
        pipelinePreset: string;
        fastMode: boolean;
    };
    run: {
        id: string;
        createdAt?: string;
        question?: string;
        finalAnswer: string;
        steps: Array<{
            id: string;
            agentName: string;
            role: string;
            output?: { kind: string; data: unknown };
            error?: string;
            createdAt?: string;
            completedAt?: string;
        }>;
        metrics: {
            confidence?: Record<string, number | undefined>;
            critique?: Record<string, unknown>;
            quality?: Record<string, number | undefined>;
            research?: Record<string, number | string | undefined>;
            consensus?: Record<string, unknown>;
        };
    };
};

export type BenchmarkArtifact = {
    kind: "benchmark";
    id: string;
    question: string;
    metadata: {
        createdAt: string;
        model: string;
        pipelinePreset: string;
        fastMode: boolean;
    };
    payload: {
        runs: number;
        runIds?: string[];
        modeCount: number;
        modeSizes: number[];
        divergenceEntropy: number;
        threshold?: number;
        modeCountAt0_8?: number;
        modeCountAt0_9?: number;
        modeCountAt0_95?: number;
        modes?: Array<{
            size: number;
            members: number[];
            exemplarIndex: number;
            exemplarPreview: string;
        }>;
        summary?: {
            stability?: {
                pairwiseMean?: number;
                pairs?: Array<{ i: number; j: number; similarity: number }>;
            };
        };
    };
};

export type ArtifactFilterParams = {
    q?: string;
    model?: string;
    preset?: string;
    fast?: string;
    from?: string;
    to?: string;
};
