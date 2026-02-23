import type {
    CompletionRequest,
    LLMClient,
    StructuredCompletionRequest,
    TokenUsage,
} from "../types/llm";

export type UsageAccumulator = {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    callCount: number;
};

export function createUsageAccumulator(): UsageAccumulator {
    return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        callCount: 0,
    };
}

/**
 * Wraps an LLM client to accumulate token usage across all completions.
 */
export function withUsageTracking(
    client: LLMClient,
    accumulator: UsageAccumulator,
): LLMClient {
    return {
        async complete(req: CompletionRequest): Promise<string> {
            const wrappedReq: CompletionRequest = {
                ...req,
                onUsage: (usage: TokenUsage) => {
                    accumulator.promptTokens += usage.promptTokens;
                    accumulator.completionTokens += usage.completionTokens;
                    accumulator.totalTokens += usage.totalTokens;
                    accumulator.callCount += 1;
                    req.onUsage?.(usage);
                },
            };
            return client.complete(wrappedReq);
        },
        async completeStructured<T>(
            req: StructuredCompletionRequest,
        ): Promise<T> {
            const wrappedReq: StructuredCompletionRequest = {
                ...req,
                onUsage: (usage: TokenUsage) => {
                    accumulator.promptTokens += usage.promptTokens;
                    accumulator.completionTokens += usage.completionTokens;
                    accumulator.totalTokens += usage.totalTokens;
                    accumulator.callCount += 1;
                    req.onUsage?.(usage);
                },
            };
            return client.completeStructured(wrappedReq);
        },
    };
}
