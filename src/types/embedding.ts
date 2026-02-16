export interface EmbeddingClient {
    embed(text: string): Promise<number[]>;
    /** Batch multiple texts in one API call. Returns vectors in same order as input. */
    embedBatch(texts: string[]): Promise<number[][]>;
}
