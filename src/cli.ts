import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { OpenAICompatibleClient } from "./llm/OpenAiCompatibleClient";
import { SolverAgent } from "./agents/SolverAgent";
import { SkepticAgent } from "./agents/SkepticAgent";
import { SolverRevisionAgent } from "./agents/SolverRevisionAgent";
import { SynthesizerAgent } from "./agents/SynthesizerAgent";
import { DebateEngine } from "./debate/DebateEngine";
import { makeId } from "./core/id";
import type {
    AgentResponse,
    Critique,
    CritiqueIssue,
} from "./types/agent";

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
    console.log("\n--- Summary ---\n");
    console.log("Question:", question);
    console.log("\nAnswer:\n", proposal.answer);
    console.log("\nKey claims:");
    for (const c of proposal.keyClaims) console.log("  -", c);
    console.log("\nConfidence:", proposal.confidence);
    console.log("\nSkeptic issues:");
    for (const i of critique.issues as CritiqueIssue[]) {
        console.log(`  [${i.severity}] ${i.type}: ${i.note}`);
    }
    if (revisedProposal) {
        console.log("\nRevised answer:\n", revisedProposal.answer);
    }
    if (synthesizedProposal) {
        console.log("\nSynthesized answer:\n", synthesizedProposal.answer);
        console.log("\nSynthesized key claims:");
        for (const c of synthesizedProposal.keyClaims) console.log("  -", c);
        console.log(
            "\nSynthesized confidence:",
            synthesizedProposal.confidence,
        );
    }
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

    const engine = new DebateEngine(
        {
            solver: new SolverAgent(),
            skeptic: new SkepticAgent(),
            solverRevision: new SolverRevisionAgent(),
            synthesizer: new SynthesizerAgent(),
        },
        llm,
    );

    const result = await engine.run(
        { question },
        { model: MODEL, verbose },
    );

    const runJson = {
        id: runId,
        question,
        steps: result.steps,
        finalAnswer: result.finalAnswer,
    };

    await mkdir(RUNS_DIR, { recursive: true });
    const outputPath = join(RUNS_DIR, `${runId}.json`);
    await writeFile(outputPath, JSON.stringify(runJson, null, 2), "utf-8");
    console.log(`\nRun saved to ${outputPath}`);

    if (!verbose) {
        const proposal = result.steps[0]?.output?.kind === "proposal"
            ? (result.steps[0].output.data as AgentResponse)
            : undefined;
        const critique = result.steps[1]?.output?.kind === "critique"
            ? (result.steps[1].output.data as Critique)
            : undefined;
        const revisedProposal = result.steps[2]?.output?.kind === "proposal"
            ? (result.steps[2].output.data as AgentResponse)
            : undefined;
        const synthesizedProposal = result.steps[3]?.output?.kind === "proposal"
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
