import { OpenAICompatibleClient } from "./llm/OpenAiCompatibleClient";

type AgentResponse = {
    answer: string
    keyClaims: string[]
    assumptions: string[]
    confidence: number
}

const BASE_URL = 'http://localhost:1234/v1'
const MODEL = 'openai/gpt-oss-20b'
const API_KEY = 'lm-studio'

const agentResponseSchema  = {
    type: "object",
    additionalProperties: false,
    properties: {
        answer: { type: "string" },
        keyClaims: { type: "array", items: { type: "string" }, minItems: 1 },
        assumptions: { type: "array", items: { type: "string" }},
        confidence: { type: "number", minimum: 0, maximum: 1 },
    },
    required: ["answer", "keyClaims", "assumptions", "confidence"],
} as const;

async function main() {
    const cmd = process.argv[2];
    const question = process.argv.slice(3).join(" ").trim();

    if (cmd !== 'ask') {
        console.error('Invalid command. Use "ask <question>" to ask a question.');
        process.exit(1);
    }

    if (!question) {
        console.error('No question provided. Use "ask <question>" to ask a question.');
        process.exit(1);
    }

    const llm = new OpenAICompatibleClient({
        baseURL: BASE_URL,
        apiKey: API_KEY
    })

    const result = await llm.completeStructured<AgentResponse>({
        model: MODEL,
        schemaName: 'AgentResponse',
        schema: agentResponseSchema,
        temperature: 0.4,
        messages: [
            {
                role: 'system',
                content: 'Return ONLY valid JSON that matches the provided schema. Do not include extra keys or commentary.'
            },
            {
                role: 'user',
                content: `Question: ${question}`
            }
        ]
    })

    console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
})