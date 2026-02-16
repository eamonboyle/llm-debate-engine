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
): Promise<void> {
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

    console.log(`Starting benchmark (${runs} runs)...`);
    const { result, raw } = await runner.run(question, runs, {
        model: MODEL,
        verbose,
        quiet: !verbose,
        onProgress: !verbose
            ? (i, total) => console.log(`Run ${i}/${total}...`)
            : undefined,
        clusteringThreshold: 0.9,
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
    console.log("modeCount:            ", modeCount);
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

    const usageAsk = 'Usage: pnpm tsx src/cli.ts ask "<question>" [--verbose]';
    const usageBenchmark =
        'Usage: pnpm tsx src/cli.ts benchmark "<question>" [--runs N] [--verbose]';

    if (cmd === "benchmark") {
        let runs = 5;
        const runsIdx = rest.indexOf("--runs");
        if (runsIdx >= 0 && rest[runsIdx + 1]) {
            const parsed = parseInt(rest[runsIdx + 1], 10);
            if (!Number.isNaN(parsed) && parsed > 0) runs = parsed;
        }
        const questionParts = rest
            .filter((_, i) => i !== runsIdx && i !== runsIdx + 1)
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

        await runBenchmark(question, runs, verbose);
        return;
    }

    if (cmd !== "ask") {
        console.error(`Unknown command: ${cmd ?? "(none)"}`);
        console.error(usageAsk);
        console.error(usageBenchmark);
        process.exit(1);
    }

    const question = rest.slice(1).join(" ").trim();

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

    const result = await engine.run({ question }, { model: MODEL, verbose });

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
