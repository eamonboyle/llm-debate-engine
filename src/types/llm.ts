export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type TokenUsage = {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
};

export type CompletionRequest = {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    /** When set, stream tokens to this callback and use stream: true. Improves perceived responsiveness. */
    onStream?: (chunk: string) => void;
    /** Optional callback for token usage after completion. */
    onUsage?: (usage: TokenUsage) => void;
};

export type StructuredCompletionRequest<TSchema = unknown> =
    CompletionRequest & {
        schemaName: string;
        schema: TSchema;
    };

export interface LLMClient {
    complete(req: CompletionRequest): Promise<string>;
    completeStructured<T>(req: StructuredCompletionRequest): Promise<T>;
}
