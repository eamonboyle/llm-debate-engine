import { resolve } from "path";
import { buildAndWriteAnalysisIndex } from "../../../src/artifacts/indexer";

function getRunsDir(): string {
    if (process.env.RUNS_DIR) {
        return resolve(process.env.RUNS_DIR);
    }
    return resolve(process.cwd(), "../../runs");
}

export function isAnalysisRebuildEnabled(): boolean {
    if (process.env.ANALYSIS_REBUILD_ENABLED === "false") {
        return false;
    }
    if (process.env.ANALYSIS_REBUILD_ENABLED === "true") {
        return true;
    }
    return process.env.VERCEL !== "1";
}

export type AnalysisRebuildResult = {
    path: string;
    generatedAt: string;
    totals: {
        runs: number;
        benchmarks: number;
        skippedFiles: number;
    };
    csvPaths?: { runs: string; benchmarks: string };
    markdownPath?: string;
    bundlePath?: string;
    chunkPath?: string;
};

export async function rebuildAnalysisArtifacts(): Promise<AnalysisRebuildResult> {
    const result = await buildAndWriteAnalysisIndex({
        runsDir: getRunsDir(),
        writeCsv: true,
        writeMarkdown: true,
        writeBundle: true,
        writeChunks: true,
    });

    return {
        path: result.path,
        generatedAt: result.index.generatedAt,
        totals: result.index.totals,
        csvPaths: result.csvPaths,
        markdownPath: result.markdownPath,
        bundlePath: result.bundlePath,
        chunkPath: result.chunkPath,
    };
}
