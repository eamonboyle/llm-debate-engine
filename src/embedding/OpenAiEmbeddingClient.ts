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

    async embedBatch(texts: string[]): Promise<number[][]> {
        const inputs = texts.map((t) => t.trim());
        if (inputs.some((t) => !t))
            throw new Error("embedBatch() requires all non-empty strings");
        if (inputs.length === 0) return [];

        const res = await this.client.embeddings.create({
            model: this.model,
            input: inputs,
        });

        const data = res.data ?? [];
        const vectors = data
            .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
            .map((d) => d.embedding)
            .filter((v): v is number[] => Array.isArray(v));

        if (vectors.length !== inputs.length)
            throw new Error(
                `Unexpected embedding response: expected ${inputs.length} vectors, got ${vectors.length}`,
            );

        return vectors;
    }
}
