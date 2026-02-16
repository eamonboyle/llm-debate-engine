import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { OpenAICompatibleClient } from "./llm/OpenAiCompatibleClient";
import { OpenAiEmbeddingClient } from "./embedding/OpenAiEmbeddingClient";
import { DebateEngine } from "./debate/DebateEngine";
import { makeId } from "./core/id";
import type { AgentResponse, Critique, CritiqueIssue } from "./types/agent";

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

async function main() {
    const args = process.argv.slice(2);
    const verbose = args.includes("--verbose") || args.includes("-v");
    const rest = args.filter((a) => a !== "--verbose" && a !== "-v");
    const cmd = rest[0];
    const question = rest.slice(1).join(" ").trim();

    const usage = 'Usage: pnpm tsx src/cli.ts ask "<question>" [--verbose]';

    if (cmd !== "ask") {
        console.error(`Unknown command: ${cmd ?? "(none)"}`);
        console.error(usage);
        process.exit(1);
    }

    if (!question) {
        console.error("Missing question.");
        console.error(usage);
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
