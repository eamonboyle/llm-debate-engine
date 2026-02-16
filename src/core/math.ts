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
