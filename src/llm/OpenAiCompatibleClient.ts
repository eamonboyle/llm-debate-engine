import { OpenAI } from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";
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

    /**
     * Resolves temperature for the API call.
     * OPENAI_TEMPERATURE in .env overrides per-agent values (use 1 for models that only support default).
     */
    private resolveTemperature(reqTemp?: number): number | undefined {
        const envTemp = process.env.OPENAI_TEMPERATURE;
        if (envTemp !== undefined && envTemp !== "") {
            const n = parseFloat(envTemp);
            if (!Number.isNaN(n)) return n;
        }
        return reqTemp;
    }

    async complete(req: CompletionRequest): Promise<string> {
        const temp = this.resolveTemperature(req.temperature);
        const stream = !!req.onStream;
        const body: Parameters<typeof this.client.chat.completions.create>[0] =
            {
                model: req.model,
                messages: req.messages,
                stream,
            };
        if (temp !== undefined) body.temperature = temp;

        if (stream) {
            const streamRes = await this.client.chat.completions.create({
                ...body,
                stream: true,
            });
            let content = "";
            for await (const chunk of streamRes) {
                const delta = chunk.choices[0]?.delta?.content ?? "";
                if (delta) {
                    content += delta;
                    req.onStream?.(delta);
                }
            }
            return content;
        }

        const res = (await this.client.chat.completions.create(
            body,
        )) as ChatCompletion & { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
        if (req.onUsage && res.usage) {
            req.onUsage({
                promptTokens: res.usage.prompt_tokens ?? 0,
                completionTokens: res.usage.completion_tokens ?? 0,
                totalTokens: res.usage.total_tokens ?? 0,
            });
        }
        return res.choices[0].message.content ?? "";
    }

    async completeStructured<T>(req: StructuredCompletionRequest): Promise<T> {
        const temp = this.resolveTemperature(req.temperature);
        const stream = !!req.onStream;
        const body: Parameters<typeof this.client.chat.completions.create>[0] =
            {
                model: req.model,
                messages: req.messages,
                stream,
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: req.schemaName,
                        strict: true,
                        schema: req.schema as any,
                    },
                } as any,
            };
        if (temp !== undefined) body.temperature = temp;

        if (stream) {
            const streamRes = await this.client.chat.completions.create({
                ...body,
                stream: true,
            });
            let content = "";
            for await (const chunk of streamRes) {
                const delta = chunk.choices[0]?.delta?.content ?? "";
                if (delta) {
                    content += delta;
                    req.onStream?.(delta);
                }
            }
            return parseStructuredContent<T>(content);
        }

        const res = (await this.client.chat.completions.create(
            body,
        )) as ChatCompletion & { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
        if (req.onUsage && res.usage) {
            req.onUsage({
                promptTokens: res.usage.prompt_tokens ?? 0,
                completionTokens: res.usage.completion_tokens ?? 0,
                totalTokens: res.usage.total_tokens ?? 0,
            });
        }
        const raw = res.choices[0].message.content;
        return parseStructuredContent<T>(raw);
    }
}
