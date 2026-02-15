export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type CompletionRequest = {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
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
