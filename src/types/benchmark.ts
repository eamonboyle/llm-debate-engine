import type { BenchmarkResult } from "../bench/BenchmarkRunner";

export type BenchmarkArtifact = {
    id: string;
    createdAt: string;
    question: string;
    runs: number;
    runIds: string[];
    modeCount: number;
    modeSizes: number[];
    divergenceEntropy: number;
    threshold?: number;
    modeCountAt0_8?: number;
    modeCountAt0_9?: number;
    modeCountAt0_95?: number;
    modes?: Array<{
        size: number;
        members: number[];
        exemplarIndex: number;
        exemplarPreview: string;
    }>;
    /** Claim-centroid mode detection (undefined when fast or no keyClaims). */
    modeCountClaimCentroid?: number;
    modeSizesClaimCentroid?: number[];
    divergenceEntropyClaimCentroid?: number;
    modeCountClaimCentroidAt0_8?: number;
    modeCountClaimCentroidAt0_9?: number;
    modeCountClaimCentroidAt0_95?: number;
    stabilityClaimCentroid?: {
        pairwiseMean: number;
        pairwiseStddev: number;
        minPairwiseSimilarity: number;
        maxPairwiseSimilarity: number;
    };
    summary: BenchmarkResult;
};
