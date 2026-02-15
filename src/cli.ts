import "dotenv/config";
import { OpenAICompatibleClient } from "./llm/OpenAiCompatibleClient";
import { validateAgentResponse } from "./validator";

type AgentResponse = {
  answer: string;
  keyClaims: string[];
  assumptions: string[];
  confidence: number;
};

const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.2";
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error(
    "Missing OPENAI_API_KEY. Set it in .env (copy .env.example) or as an environment variable."
  );
  process.exit(1);
}

const agentResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    keyClaims: { type: "array", items: { type: "string" }, minItems: 1 },
    assumptions: { type: "array", items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["answer", "keyClaims", "assumptions", "confidence"],
} as const;

async function main() {
  const cmd = process.argv[2];
  const question = process.argv.slice(3).join(" ").trim();

  if (cmd !== "ask") {
    console.error('Invalid command. Use "ask <question>" to ask a question.');
    process.exit(1);
  }

  if (!question) {
    console.error(
      'No question provided. Use "ask <question>" to ask a question.',
    );
    process.exit(1);
  }

  const llm = new OpenAICompatibleClient({
    baseURL: BASE_URL,
    apiKey: API_KEY,
  });

  const first = await llm.completeStructured<AgentResponse>({
    model: MODEL,
    schemaName: "AgentResponse",
    schema: agentResponseSchema,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "Return ONLY valid JSON that matches the provided schema. Do not include extra keys or commentary.",
      },
      {
        role: "user",
        content: `Question: ${question}`,
      },
    ],
  });

  const v1 = validateAgentResponse(first);

  let final: AgentResponse;

  if (v1.ok) {
    console.log("First response is valid");
    final = v1.data;
  } else {
    const repaired = await llm.completeStructured<AgentResponse>({
      model: MODEL,
      schemaName: "AgentResponse",
      schema: agentResponseSchema,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are a JSON repair function. Output ONLY valid JSON that matches the provided schema exactly. Do not add extra keys.",
        },
        {
          role: "user",
          content: `Fix the following object to match the schema.\n\nInvalid object:\n${JSON.stringify(first, null, 2)}\n\nReturn the corrected JSON only.`,
        },
      ],
    });

    const v2 = validateAgentResponse(repaired);
    if (v2.ok === false) {
      const firstError =
        v1.ok === false ? v1.error : "unknown";
      const repairError = v2.error;
      throw new Error(
        `Structured output invalid after repair. First error: ${firstError}. Repair error: ${repairError}`,
      );
    }
    final = v2.data;
  }

  console.log(JSON.stringify(final, null, 2));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
