import "dotenv/config";
import { OpenAICompatibleClient } from "./llm/OpenAiCompatibleClient";
import { SolverAgent } from "./agents/SolverAgent";

const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.2";
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
    console.error(
        "Missing OPENAI_API_KEY. Set it in .env (copy .env.example) or as an environment variable.",
    );
    process.exit(1);
}

async function main() {
    const cmd = process.argv[2];
    const question = process.argv.slice(3).join(" ").trim();

    if (cmd !== "ask") {
        console.error(`Unknown command: ${cmd}`);
        console.error('Usage: debate ask "<question>"');
        process.exit(1);
    }

    if (!question) {
        console.error('Missing question. Usage: debate ask "<question>"');
        process.exit(1);
    }

    const llm = new OpenAICompatibleClient({
        baseURL: BASE_URL,
        apiKey: API_KEY,
    });
    const solver = new SolverAgent();

    const step = await solver.run({ question }, llm, { model: MODEL });
    console.log(JSON.stringify(step, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
