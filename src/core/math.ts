/**
 * Element-wise mean of vectors. All vectors must have the same length.
 */
export function vectorMean(vectors: number[][]): number[] {
    if (!vectors.length) return [];
    const dim = vectors[0].length;
    for (const v of vectors) {
        if (v.length !== dim) {
            throw new Error(
                `vectorMean: length mismatch ${v.length} vs ${dim}`,
            );
        }
    }
    const result: number[] = [];
    for (let i = 0; i < dim; i++) {
        let sum = 0;
        for (const v of vectors) sum += v[i];
        result.push(sum / vectors.length);
    }
    return result;
}

export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error(
            `cosineSimilarity: length mismatch ${a.length} vs ${b.length}`,
        );
    }

    let dot = 0;
    let a2 = 0;
    let b2 = 0;

    for (let i = 0; i < a.length; i++) {
        const av = a[i];
        const bv = b[i];
        dot += av * bv;
        a2 += av * av;
        b2 += bv * bv;
    }

    const denom = Math.sqrt(a2) * Math.sqrt(b2);
    if (denom === 0) return 0;
    return dot / denom;
}
