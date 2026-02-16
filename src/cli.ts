import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { OpenAICompatibleClient } from "./llm/OpenAiCompatibleClient";
import { OpenAiEmbeddingClient } from "./embedding/OpenAiEmbeddingClient";
import { DebateEngine } from "./debate/DebateEngine";
import { BenchmarkRunner } from "./bench/BenchmarkRunner";
import { makeId } from "./core/id";
import type { AgentResponse, Critique, CritiqueIssue } from "./types/agent";
import type { BenchmarkArtifact } from "./types/benchmark";

const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.2";
const RUNS_DIR = "runs";

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

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
    console.error(
        "Missing OPENAI_API_KEY. Set it in .env (copy .env.example) or as an environment variable.",
    );
    process.exit(1);
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
    },
): Promise<void> {
    const { concurrency, model, fast, threshold } = opts ?? {};
    const llm = new OpenAICompatibleClient({
        baseURL: BASE_URL,
        apiKey: API_KEY,
    });

    const embedding = new OpenAiEmbeddingClient({
        baseURL: BASE_URL,
        apiKey: API_KEY,
    });

    const engine = new DebateEngine({ llm, embedding });
    const runner = new BenchmarkRunner({ engine, embedding });

    console.log(
        `Starting benchmark (${runs} runs, concurrency ${concurrency ?? 3})...`,
    );
    const { result, raw } = await runner.run(question, runs, {
        model: model ?? MODEL,
        verbose,
        quiet: !verbose,
        onProgress: !verbose
            ? (i, total) => console.log(`Run ${i}/${total}...`)
            : undefined,
        concurrency,
        fast,
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
    console.log("modeCount:            ", modeCount);
    console.log("modeCountAt0.8:       ", result.modeCountAt0_8 ?? "-");
    console.log("modeCountAt0.9:       ", result.modeCountAt0_9 ?? "-");
    console.log("modeCountAt0.95:      ", result.modeCountAt0_95 ?? "-");
    console.log("modeSizes:            ", modeSizes);
    console.log("divergenceEntropy:    ", divergenceEntropy);

    const benchmarkId = makeId("benchmark");
    const benchmarkJson: BenchmarkArtifact = {
        id: benchmarkId,
        createdAt: new Date().toISOString(),
        question,
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
        summary: result,
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
        'Usage: pnpm tsx src/cli.ts ask "<question>" [--model M] [--fast] [--verbose]';
    const usageBenchmark =
        'Usage: pnpm tsx src/cli.ts benchmark "<question>" [--runs N] [--concurrency N] [--model M] [--threshold T] [--fast] [--verbose]';

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
    const excludeOptIndices = (indices: number[]): number[] => {
        const set = new Set<number>();
        for (const i of indices) {
            set.add(i);
            set.add(i + 1);
        }
        return Array.from(set);
    };

    if (cmd === "benchmark") {
        let runs = 5;
        const runsVal = parseNumOpt("--runs");
        if (runsVal) runs = runsVal;
        const concurrency = parseNumOpt("--concurrency");
        const model = parseOpt("--model");
        const thresholdVal = parseFloatOpt("--threshold");
        const fast = rest.includes("--fast");
        const excludeIdx = excludeOptIndices([
            rest.indexOf("--runs"),
            rest.indexOf("--concurrency"),
            rest.indexOf("--model"),
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
        });
        return;
    }

    if (cmd !== "ask") {
        console.error(`Unknown command: ${cmd ?? "(none)"}`);
        console.error(usageAsk);
        console.error(usageBenchmark);
        process.exit(1);
    }

    const askModel = parseOpt("--model");
    const askFast = rest.includes("--fast");
    const askExcludeIdx = excludeOptIndices([
        rest.indexOf("--model"),
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

    const runId = makeId("run");

    const llm = new OpenAICompatibleClient({
        baseURL: BASE_URL,
        apiKey: API_KEY,
    });

    const embedding = new OpenAiEmbeddingClient({
        baseURL: BASE_URL,
        apiKey: API_KEY,
    });

    const engine = new DebateEngine({
        llm,
        embedding,
    });

    const result = await engine.run(
        { question },
        { model: askModel ?? MODEL, verbose, fast: askFast },
    );

    const runJson = {
        id: runId,
        question,
        steps: result.steps,
        finalAnswer: result.finalAnswer,
        metrics: result.metrics,
    };

    await mkdir(RUNS_DIR, { recursive: true });
    const outputPath = join(RUNS_DIR, `${runId}.json`);
    await writeFile(outputPath, JSON.stringify(runJson, null, 2), "utf-8");
    console.log(`\nRun saved to ${outputPath}`);

    if (!verbose) {
        const proposal =
            result.steps[0]?.output?.kind === "proposal"
                ? (result.steps[0].output.data as AgentResponse)
                : undefined;
        const critique =
            result.steps[1]?.output?.kind === "critique"
                ? (result.steps[1].output.data as Critique)
                : undefined;
        const revisedProposal =
            result.steps[2]?.output?.kind === "proposal"
                ? (result.steps[2].output.data as AgentResponse)
                : undefined;
        const synthesizedProposal =
            result.steps[3]?.output?.kind === "proposal"
                ? (result.steps[3].output.data as AgentResponse)
                : undefined;

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
