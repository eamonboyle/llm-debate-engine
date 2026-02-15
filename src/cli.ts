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
import { SolverRevisionAgent } from "./agents/SolverRevisionAgent";
import { SynthesizerAgent } from "./agents/SynthesizerAgent";

const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.2";

function warnIfOutputMismatch(step: AgentRun): void {
    if (step.output?.kind !== "proposal" || !step.rawAttempts.length) return;
    const data = step.output.data as AgentResponse;
    const first = step.rawAttempts[0] as AgentResponse | undefined;
    if (
        first &&
        typeof first.answer === "string" &&
        data.answer !== first.answer
    ) {
        console.warn(
            "[cli] Output data.answer differs from rawAttempts[0].answer — possible parsing/repair corruption",
        );
    }
}

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

    // Solver revision agent
    console.log("\nSolver revision agent is now revising the proposal...");

    const solverRevision = new SolverRevisionAgent();
    const solverRevisionStep = await solverRevision.run({ question }, llm, {
        model: MODEL,
        proposal: proposal,
        critique: skepticStep.output.data as Critique,
    });

    if (verbose) {
        console.log("Solver revision step:");
        console.log(JSON.stringify(solverRevisionStep, null, 2));
    }

    const solverRevisionProposal = solverRevisionStep.output
        ?.data as AgentResponse;

    if (!solverRevisionProposal) {
        console.error(
            "Solver revision agent did not produce a revised proposal",
        );
        process.exit(1);
    }

    // Synthesizer agent
    console.log("\nSynthesizer agent is now synthesizing the proposal...");

    const synthesizer = new SynthesizerAgent();
    const synthesizerStep = await synthesizer.run({ question }, llm, {
        model: MODEL,
        proposal: proposal,
        critique: skepticStep.output.data as Critique,
        revision: solverRevisionProposal,
    });

    if (verbose) {
        console.log("Synthesizer step:");
        console.log(JSON.stringify(synthesizerStep, null, 2));
    }

    const synthesizedProposal = synthesizerStep.output?.data as AgentResponse;

    if (!synthesizedProposal) {
        console.error(
            "Synthesizer agent did not produce a synthesized proposal",
        );
        process.exit(1);
    }

    if (!verbose) {
        if (
            skepticStep.output?.kind === "critique" &&
            skepticStep.output.data
        ) {
            printSummary(
                question,
                proposal,
                skepticStep.output.data,
                solverRevisionProposal,
                synthesizedProposal,
            );
        } else {
            console.log("\n--- Answer ---\n", proposal.answer);
            if (solverRevisionProposal) {
                console.log(
                    "\n--- Revised Answer ---\n",
                    solverRevisionProposal.answer,
                );
            }
            if (synthesizedProposal) {
                console.log(
                    "\n--- Synthesized Answer ---\n",
                    synthesizedProposal.answer,
                );
            }
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
