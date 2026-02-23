export function mean(values: number[]): number {
    if (!values.length) return 0;
    return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function stddev(values: number[]): number {
    if (values.length < 2) return 0;
    const m = mean(values);
    const variance =
        values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
}

export function pearsonCorrelation(xs: number[], ys: number[]): number {
    if (xs.length !== ys.length || xs.length < 2) return 0;
    const xMean = mean(xs);
    const yMean = mean(ys);
    let num = 0;
    let xDen = 0;
    let yDen = 0;
    for (let i = 0; i < xs.length; i++) {
        const x = xs[i] - xMean;
        const y = ys[i] - yMean;
        num += x * y;
        xDen += x * x;
        yDen += y * y;
    }
    const den = Math.sqrt(xDen * yDen);
    if (den === 0) return 0;
    return num / den;
}

export function round3(value: number): number {
    return Math.round(value * 1000) / 1000;
}

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
