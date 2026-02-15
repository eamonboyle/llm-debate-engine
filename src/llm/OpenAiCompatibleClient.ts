import { OpenAI } from "openai";
import type {
    CompletionRequest,
    LLMClient,
    StructuredCompletionRequest,
} from "../types/llm";

/**
 * Parses API content (string or array of blocks) into a typed object.
 * Handles OpenAI-compatible providers that may return different formats.
 */
export function parseStructuredContent<T>(raw: unknown): T {
    if (typeof raw === "string") {
        return JSON.parse(raw || "{}") as T;
    }
    if (Array.isArray(raw) && raw.length > 0) {
        const block = raw[0] as Record<string, unknown>;
        if (block.output_json != null) {
            return block.output_json as T;
        }
        if (typeof block.text === "string") {
            return JSON.parse(block.text || "{}") as T;
        }
    }
    return {} as T;
}

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

        const raw = res.choices[0].message.content;
        return parseStructuredContent<T>(raw);
    }
}
