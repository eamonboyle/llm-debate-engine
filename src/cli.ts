import "dotenv/config";
import { OpenAICompatibleClient } from "./llm/OpenAiCompatibleClient";
import { SolverAgent } from "./agents/SolverAgent";
import { SkepticAgent } from "./agents/SkepticAgent";
import {
    AgentResponse,
    type AgentRun,
    type Critique,
    type CritiqueIssue,
} from "./types/agent";

const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.2";

function warnIfOutputMismatch(step: AgentRun): void {
    if (step.output?.kind !== "proposal" || !step.rawAttempts.length) return;
    const data = step.output.data as AgentResponse;
    const first = step.rawAttempts[0] as AgentResponse | undefined;
    if (first && typeof first.answer === "string" && data.answer !== first.answer) {
        console.warn(
            "[cli] Output data.answer differs from rawAttempts[0].answer — possible parsing/repair corruption",
        );
    }
}

function printSummary(
    question: string,
    proposal: AgentResponse,
    critique: Critique,
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

    const llm = new OpenAICompatibleClient({
        baseURL: BASE_URL,
        apiKey: API_KEY,
    });

    console.log("Solver agent is now solving the question...");

    // Solver agent
    const solver = new SolverAgent();
    const step = await solver.run({ question }, llm, { model: MODEL });

    if (!step.output?.data) {
        console.error("Solver agent did not produce a proposal");
        process.exit(1);
    }

    warnIfOutputMismatch(step);

    if (verbose) {
        console.log("Solver step:");
        console.log(JSON.stringify(step, null, 2));
    }

    // Skeptic agent
    console.log("\nSkeptic agent is now critiquing the proposal...");

    const skeptic = new SkepticAgent();
    const skepticStep = await skeptic.run({ question }, llm, {
        model: MODEL,
        targetAgentName: solver.name,
        proposal: step.output.data as AgentResponse,
    });

    if (verbose) {
        console.log("Skeptic step:");
        console.log(JSON.stringify(skepticStep, null, 2));
    }

    const proposal = step.output.data as AgentResponse;
    if (
        skepticStep.output?.kind === "critique" &&
        skepticStep.output.data &&
        !verbose
    ) {
        printSummary(question, proposal, skepticStep.output.data);
    } else if (!verbose) {
        console.log("\n--- Answer ---\n", proposal.answer);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
