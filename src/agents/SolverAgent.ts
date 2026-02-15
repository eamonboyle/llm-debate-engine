import type { LLMClient, ChatMessage } from "../types/llm";
import type { AgentResponse, AgentRun, DebateContext } from "../types/agent";
import { runStructuredWithGuard } from "../core/structuredRunner";
import { validateAgentResponse } from "../validator";

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

function nowIso() {
    return new Date().toISOString();
}

function runId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class SolverAgent {
    readonly name = "SolverAgent";

    async run(
        ctx: DebateContext,
        llm: LLMClient,
        opts: { model: string },
    ): Promise<AgentRun> {
        const createdAt = nowIso();

        const messages: ChatMessage[] = [
            {
                role: "system",
                content:
                    "You are the Solver. Produce a direct, helpful answer. Output ONLY valid JSON matching the schema. No extra keys. No commentary outside JSON.",
            },
            { role: "user", content: `Question: ${ctx.question}` },
        ];

        const req = {
            model: opts.model,
            temperature: 0.4,
            messages,
            schemaName: "AgentResponse",
            schema: agentResponseSchema,
        } as const;

        try {
            const { data, attempts } =
                await runStructuredWithGuard<AgentResponse>(
                    llm,
                    req,
                    validateAgentResponse,
                    (bad, error): ChatMessage[] => [
                        {
                            role: "system",
                            content:
                                "You are a JSON repair function. Output ONLY valid JSON matching the schema exactly. No extra keys.",
                        },
                        {
                            role: "user",
                            content: `The previous output did not validate: ${error}\n\nInvalid object:\n${JSON.stringify(bad, null, 2)}\n\nReturn corrected JSON only.`,
                        },
                    ],
                );

            return {
                id: runId("step"),
                agentName: this.name,
                role: "solver",
                createdAt,
                request: req,
                rawAttempts: attempts,
                output: { kind: "proposal", data },
                completedAt: nowIso(),
            };
        } catch (e: any) {
            return {
                id: runId("step"),
                agentName: this.name,
                role: "solver",
                createdAt,
                request: req,
                rawAttempts: [],
                error: e?.message ?? String(e),
                completedAt: nowIso(),
            };
        }
    }
}
