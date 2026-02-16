import type { ChatMessage, StructuredCompletionRequest } from "./llm";

export type AgentResponse = {
    answer: string;
    keyClaims: string[];
    assumptions: string[];
    confidence: number;
};

export type CritiqueIssue = {
    severity: 1 | 2 | 3 | 4 | 5;
    type: "factual" | "logic" | "missing" | "ambiguity" | "overconfidence";
    note: string;
};

export type Critique = {
    targetAgent: string;
    issues: CritiqueIssue[];
};

export type AgentOutput =
    | { kind: "proposal"; data: AgentResponse }
    | { kind: "critique"; data: Critique };

export type AgentRun = {
    id: string;
    agentName: string;
    role: "solver" | "skeptic" | "synthesizer";
    request: Pick<
        StructuredCompletionRequest,
        "model" | "temperature" | "messages" | "schemaName" | "schema"
    >;
    rawAttempts: unknown[];
    output?: AgentOutput;
    error?: string;
    createdAt: string;
    completedAt?: string;
};

export type DebateContext = {
    question: string;
};

export type DebateRun = {
    id: string;
    createdAt: string;
    question: string;
    steps: AgentRun[];
    finalAnswer: string;

    metrics: {
        confidence: {
            solver?: number;
            revision?: number;
            synthesizer?: number;
            solverToRevisionDelta?: number;
            revisionToSynthesizerDelta?: number;
        };
        critique: {
            maxSeverity?: number;
            avgSeverity?: number;
            byType?: Record<string, number>;
        };
        consensus?: {
            // average pairwise cosine similarity across available answers
            strength?: number;
            // which answers were included
            included?: Array<"solver" | "revision" | "synthesizer">;
            // pairwise sims for debugging
            pairs?: Array<{ a: string; b: string; similarity: number }>;
        };
    };
};
