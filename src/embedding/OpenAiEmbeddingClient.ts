import { EmbeddingClient } from "../types/embedding";
import OpenAI from "openai";

export class OpenAiEmbeddingClient implements EmbeddingClient {
    private client: OpenAI;
    private model: string;

    constructor(opts: { baseURL: string; apiKey: string; model?: string }) {
        this.client = new OpenAI({
            baseURL: opts.baseURL,
            apiKey: opts.apiKey,
        });
        this.model = opts.model ?? "text-embedding-3-small";
    }

    async embed(text: string): Promise<number[]> {
        const input = text.trim();
        if (!input)
            throw new Error("embed() requires a non-empty string input");

        const res = await this.client.embeddings.create({
            model: this.model,
            input,
        });

        const vec = res.data?.[0]?.embedding;

        if (!vec || !Array.isArray(vec))
            throw new Error("Unexpected embedding response format");

        return vec;
    }
}
