import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { OpenAICompatibleClient } from "./llm/OpenAiCompatibleClient";
import { OpenAiEmbeddingClient } from "./embedding/OpenAiEmbeddingClient";
import { DebateEngine } from "./debate/DebateEngine";
import { BenchmarkRunner } from "./bench/BenchmarkRunner";
import { buildAndWriteAnalysisIndex } from "./artifacts/indexer";
import { makeId } from "./core/id";
import type { AgentResponse, Critique, CritiqueIssue } from "./types/agent";
import type { BenchmarkArtifactPayload } from "./types/benchmark";
import {
    ARTIFACT_SCHEMA_VERSION,
    PIPELINE_VERSION,
    type BenchmarkArtifactV1,
    type PipelinePreset,
    type RunArtifactV1,
} from "./types/artifact";

const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.2";
const RUNS_DIR = "runs";
const DEFAULT_PRESET: PipelinePreset = "standard";

function printSummary(
    question: string,
    proposal: AgentResponse,
    critique: Critique,
    revisedProposal?: AgentResponse,
    synthesizedProposal?: AgentResponse,
): void {
    const final = synthesizedProposal ?? revisedProposal ?? proposal;
    const issueCount = (critique.issues as CritiqueIssue[]).length;

    console.log("\n--- Summary ---\n");
    console.log("Question:", question);
    console.log("\nAnswer:\n", final.answer);
    console.log("\nKey claims:");
    for (const c of final.keyClaims) console.log("  -", c);
    console.log("\nConfidence:", final.confidence);
    if (issueCount > 0) {
        console.log(
            "\nCritique:",
            `${issueCount} issue${issueCount === 1 ? "" : "s"} raised and addressed in revision`,
        );
    }
    console.log("\n(Full run details saved in the JSON file.)");
}

function requireApiKey(): string {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error(
            "Missing OPENAI_API_KEY. Set it in .env (copy .env.example) or as an environment variable.",
        );
        process.exit(1);
    }
    return apiKey;
}

function buildMetadata(opts: {
    createdAt: string;
    model: string;
    fastMode: boolean;
    pipelinePreset?: PipelinePreset;
}) {
    return {
        schemaVersion: ARTIFACT_SCHEMA_VERSION,
        createdAt: opts.createdAt,
        model: opts.model,
        fastMode: opts.fastMode,
        pipelinePreset: opts.pipelinePreset ?? DEFAULT_PRESET,
        pipelineVersion: PIPELINE_VERSION,
        source: "cli" as const,
    };
}

async function runBenchmark(
    question: string,
    runs: number,
    verbose: boolean,
    opts?: {
        concurrency?: number;
        model?: string;
        fast?: boolean;
        threshold?: number;
        pipelinePreset?: PipelinePreset;
    },
): Promise<void> {
    const { concurrency, model, fast, threshold, pipelinePreset } = opts ?? {};
    const apiKey = requireApiKey();
    const llm = new OpenAICompatibleClient({
        baseURL: BASE_URL,
        apiKey,
    });

    const embedding = new OpenAiEmbeddingClient({
        baseURL: BASE_URL,
        apiKey,
    });

    const engine = new DebateEngine({ llm, embedding });
    const runner = new BenchmarkRunner({ engine, embedding });

    console.log(
        `Starting benchmark (${runs} runs, concurrency ${concurrency ?? 3})...`,
    );
    const { result } = await runner.run(question, runs, {
        model: model ?? MODEL,
        verbose,
        quiet: !verbose,
        onProgress: !verbose
            ? (i, total) => console.log(`Run ${i}/${total}...`)
            : undefined,
        concurrency,
        fast,
        preset: pipelinePreset,
        clusteringThreshold: threshold ?? 0.9,
    });

    const cs = result.consensus;
    const cm = result.critiqueMaxSeverity;
    const stab = result.stability;
    const modeCount = result.modeCount;
    const modeSizes = result.modeSizes;
    const divergenceEntropy = result.divergenceEntropy;

    console.log("\n--- Benchmark (" + runs + " runs) ---");
    console.log("Question:", question);
    console.log("");
    console.log("consensus.strength:    mean", cs.mean, " stddev", cs.stddev);
    console.log("critique.maxSeverity: mean", cm.mean, " stddev", cm.stddev);
    console.log(
        "stability:            ",
        stab.pairwiseMean,
        "(avg pairwise similarity of final answers)",
    );
    console.log("threshold:            ", result.threshold ?? "(default)");
    console.log("modeCount (full-answer):     ", modeCount);
    console.log("modeCountClaimCentroid:      ", result.modeCountClaimCentroid ?? "-");
    if (
        result.modeCountClaimCentroid != null &&
        modeCount > result.modeCountClaimCentroid
    ) {
        console.log(
            "  (claim-centroid lower -> supports style/calibration hypothesis)",
        );
    }
    if (result.modeCountClaimCentroid == null && fast) {
        console.log("  (claim-centroid skipped: fast mode has no synthesizer)");
    }
    console.log("modeCountAt0.8:       ", result.modeCountAt0_8 ?? "-");
    console.log("modeCountAt0.9:       ", result.modeCountAt0_9 ?? "-");
    console.log("modeCountAt0.95:      ", result.modeCountAt0_95 ?? "-");
    console.log("modeSizes:            ", modeSizes);
    console.log("divergenceEntropy:    ", divergenceEntropy);

    const benchmarkId = makeId("benchmark");
    const createdAt = new Date().toISOString();
    const payload: BenchmarkArtifactPayload = {
        runs,
        runIds: result.runIds,
        modeCount,
        modeSizes,
        divergenceEntropy,
        threshold: result.threshold,
        modeCountAt0_8: result.modeCountAt0_8,
        modeCountAt0_9: result.modeCountAt0_9,
        modeCountAt0_95: result.modeCountAt0_95,
        modes: result.modes,
        modeCountClaimCentroid: result.modeCountClaimCentroid,
        modeSizesClaimCentroid: result.modeSizesClaimCentroid,
        divergenceEntropyClaimCentroid: result.divergenceEntropyClaimCentroid,
        modeCountClaimCentroidAt0_8: result.modeCountClaimCentroidAt0_8,
        modeCountClaimCentroidAt0_9: result.modeCountClaimCentroidAt0_9,
        modeCountClaimCentroidAt0_95: result.modeCountClaimCentroidAt0_95,
        stabilityClaimCentroid: result.stabilityClaimCentroid,
        summary: result,
    };

    const benchmarkJson: BenchmarkArtifactV1 = {
        kind: "benchmark",
        id: benchmarkId,
        question,
        metadata: buildMetadata({
            createdAt,
            model: model ?? MODEL,
            fastMode: !!fast,
            pipelinePreset,
        }),
        payload,
    };

    await mkdir(RUNS_DIR, { recursive: true });
    const outputPath = join(RUNS_DIR, `${benchmarkId}.json`);
    await writeFile(
        outputPath,
        JSON.stringify(benchmarkJson, null, 2),
        "utf-8",
    );
    console.log("\n(Run details saved to " + outputPath + ")");
}

async function main() {
    const args = process.argv.slice(2);
    const verbose = args.includes("--verbose") || args.includes("-v");
    const rest = args.filter((a) => a !== "--verbose" && a !== "-v");
    const cmd = rest[0];

    const usageAsk =
        'Usage: pnpm tsx src/cli.ts ask "<question>" [--model M] [--preset standard|research_deep|fast_research] [--fast] [--verbose]';
    const usageBenchmark =
        'Usage: pnpm tsx src/cli.ts benchmark "<question>" [--runs N] [--concurrency N] [--model M] [--preset standard|research_deep|fast_research] [--threshold T] [--fast] [--verbose]';
    const usageAnalyze =
        'Usage: pnpm tsx src/cli.ts analyze-runs [--runs-dir path] [--output filename] [--csv]';

    const parseOpt = (flag: string): string | undefined => {
        const idx = rest.indexOf(flag);
        return idx >= 0 && rest[idx + 1] ? rest[idx + 1] : undefined;
    };
    const parseNumOpt = (flag: string): number | undefined => {
        const v = parseOpt(flag);
        if (!v) return undefined;
        const n = parseInt(v, 10);
        return !Number.isNaN(n) && n > 0 ? n : undefined;
    };
    const parseFloatOpt = (flag: string): number | undefined => {
        const v = parseOpt(flag);
        if (!v) return undefined;
        const n = parseFloat(v);
        return !Number.isNaN(n) && n > 0 && n <= 1 ? n : undefined;
    };
    const parsePresetOpt = (): PipelinePreset | undefined => {
        const preset = parseOpt("--preset");
        if (
            preset === "standard" ||
            preset === "research_deep" ||
            preset === "fast_research"
        ) {
            return preset;
        }
        return undefined;
    };
    const excludeOptIndices = (indices: number[]): number[] => {
        const set = new Set<number>();
        for (const i of indices) {
            set.add(i);
            set.add(i + 1);
        }
        return Array.from(set);
    };

    if (cmd === "analyze-runs") {
        const runsDir = parseOpt("--runs-dir") ?? RUNS_DIR;
        const output = parseOpt("--output") ?? "analysis-index.json";
        const writeCsv = rest.includes("--csv");
        const { path, index, csvPaths } = await buildAndWriteAnalysisIndex({
            runsDir,
            outputFileName: output,
            writeCsv,
        });
        console.log(
            `Analysis index saved to ${path} (${index.totals.runs} runs, ${index.totals.benchmarks} benchmarks)`,
        );
        if (csvPaths) {
            console.log(`CSV exports: ${csvPaths.runs}, ${csvPaths.benchmarks}`);
        }
        if (index.skipped.length > 0) {
            console.log(`Skipped ${index.skipped.length} file(s):`);
            for (const skipped of index.skipped) {
                console.log(`- ${skipped.file}: ${skipped.error}`);
            }
        }
        return;
    }

    if (cmd === "benchmark") {
        let runs = 5;
        const runsVal = parseNumOpt("--runs");
        if (runsVal) runs = runsVal;
        const concurrency = parseNumOpt("--concurrency");
        const model = parseOpt("--model");
        const preset = parsePresetOpt();
        const thresholdVal = parseFloatOpt("--threshold");
        const fast = rest.includes("--fast");
        const excludeIdx = excludeOptIndices([
            rest.indexOf("--runs"),
            rest.indexOf("--concurrency"),
            rest.indexOf("--model"),
            rest.indexOf("--preset"),
            rest.indexOf("--threshold"),
            ...(fast ? [rest.indexOf("--fast")] : []),
        ].filter((i) => i >= 0));
        const questionParts = rest
            .filter((_, i) => !excludeIdx.includes(i))
            .slice(1);
        const question = questionParts.join(" ").trim();

        if (!question) {
            console.error("Missing question.");
            console.error(usageBenchmark);
            process.exit(1);
        }
        if (runs === 1) {
            console.warn(
                "Warning: K=1 yields trivial stddev (0) and stability (1.0).",
            );
        }

        await runBenchmark(question, runs, verbose, {
            concurrency,
            model,
            fast,
            threshold: thresholdVal,
            pipelinePreset: preset,
        });
        return;
    }

    if (cmd !== "ask") {
        console.error(`Unknown command: ${cmd ?? "(none)"}`);
        console.error(usageAsk);
        console.error(usageBenchmark);
        console.error(usageAnalyze);
        process.exit(1);
    }

    const askModel = parseOpt("--model");
    const askPreset = parsePresetOpt();
    const askFast = rest.includes("--fast");
    const askExcludeIdx = excludeOptIndices([
        rest.indexOf("--model"),
        rest.indexOf("--preset"),
        ...(askFast ? [rest.indexOf("--fast")] : []),
    ].filter((i) => i >= 0));
    const askQuestionParts = rest
        .filter((_, i) => !askExcludeIdx.includes(i))
        .slice(1);
    const question = askQuestionParts.join(" ").trim();

    if (!question) {
        console.error("Missing question.");
        console.error(usageAsk);
        process.exit(1);
    }

    const llm = new OpenAICompatibleClient({
        baseURL: BASE_URL,
        apiKey: requireApiKey(),
    });

    const embedding = new OpenAiEmbeddingClient({
        baseURL: BASE_URL,
        apiKey: requireApiKey(),
    });

    const engine = new DebateEngine({
        llm,
        embedding,
    });

    const result = await engine.run(
        { question },
        {
            model: askModel ?? MODEL,
            verbose,
            fast: askFast,
            preset: askPreset,
        },
    );
    const runId = result.id;

    const runJson: RunArtifactV1 = {
        kind: "run",
        id: runId,
        question,
        run: {
            id: result.id,
            createdAt: result.createdAt,
            question,
            steps: result.steps,
            finalAnswer: result.finalAnswer,
            metrics: result.metrics,
        },
        metadata: buildMetadata({
            createdAt: result.createdAt,
            model: askModel ?? MODEL,
            fastMode: askFast,
            pipelinePreset: askPreset,
        }),
    };

    await mkdir(RUNS_DIR, { recursive: true });
    const outputPath = join(RUNS_DIR, `${runId}.json`);
    await writeFile(outputPath, JSON.stringify(runJson, null, 2), "utf-8");
    console.log(`\nRun saved to ${outputPath}`);

    if (!verbose) {
        const proposal = result.steps.find(
            (s) => s.agentName === "SolverAgent" && s.output?.kind === "proposal",
        )?.output?.data as AgentResponse | undefined;
        const critique = result.steps.find(
            (s) => s.role === "skeptic" && s.output?.kind === "critique",
        )?.output?.data as Critique | undefined;
        const revisedProposal = result.steps.find(
            (s) =>
                s.agentName.toLowerCase().includes("revision") &&
                s.output?.kind === "proposal",
        )?.output?.data as AgentResponse | undefined;
        const synthesizedProposal = result.steps.find(
            (s) => s.role === "synthesizer" && s.output?.kind === "proposal",
        )?.output?.data as AgentResponse | undefined;

        if (proposal && critique) {
            printSummary(
                question,
                proposal,
                critique,
                revisedProposal,
                synthesizedProposal,
            );
        } else {
            console.log("\n--- Answer ---\n", result.finalAnswer);
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
