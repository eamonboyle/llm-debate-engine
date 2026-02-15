import { OpenAI } from "openai";
import type {
    CompletionRequest,
    LLMClient,
    StructuredCompletionRequest,
} from "../types/llm";

export class OpenAICompatibleClient implements LLMClient {
    private client: OpenAI;

    constructor(opts: { baseURL: string; apiKey: string }) {
        this.client = new OpenAI({
            baseURL: opts.baseURL,
            apiKey: opts.apiKey,
        });
    }

    async complete(req: CompletionRequest): Promise<string> {
        const res = await this.client.chat.completions.create({
            model: req.model,
            messages: req.messages,
            temperature: req.temperature,
        });

        return res.choices[0].message.content ?? "";
    }

    async completeStructured<T>(req: StructuredCompletionRequest): Promise<T> {
        const res = await this.client.chat.completions.create({
            model: req.model,
            messages: req.messages,
            temperature: req.temperature,
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: req.schemaName,
                    strict: true,
                    schema: req.schema as any,
                },
            } as any,
        });

        const text = res.choices[0].message.content ?? "";
        return JSON.parse(text) as T;
    }
}
