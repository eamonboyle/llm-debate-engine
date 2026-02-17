import type { ChatMessage, LLMClient } from "../types/llm";
import type { AgentResponse, AgentRun, Critique, Judgement } from "../types/agent";
import { runStructuredWithGuard } from "../core/structuredRunner";
import { validateJudgement } from "../validator";

const judgementSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        rubricScores: {
            type: "object",
            additionalProperties: false,
            properties: {
                coherence: { type: "number", minimum: 1, maximum: 5 },
                completeness: { type: "number", minimum: 1, maximum: 5 },
                factualRisk: { type: "number", minimum: 1, maximum: 5 },
                uncertaintyHandling: { type: "number", minimum: 1, maximum: 5 },
            },
            required: [
                "coherence",
                "completeness",
                "factualRisk",
                "uncertaintyHandling",
            ],
        },
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
    },
    required: ["rubricScores", "strengths", "weaknesses", "summary"],
} as const;

function nowIso() {
    return new Date().toISOString();
}

function runId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class JudgeAgent {
    readonly name = "JudgeAgent";

    async run(
        llm: LLMClient,
        opts: {
            model: string;
            verbose?: boolean;
            proposal: AgentResponse;
            critiques: Critique[];
        },
    ): Promise<AgentRun> {
        const createdAt = nowIso();
        const messages: ChatMessage[] = [
            {
                role: "system",
                content:
                    "You are a strict research judge. Score answer quality with rubric scores 1-5. Output only valid JSON matching schema.",
            },
            {
                role: "user",
                content:
                    `Final proposal JSON:\n${JSON.stringify(opts.proposal, null, 2)}\n\n` +
                    `Critiques:\n${JSON.stringify(opts.critiques, null, 2)}`,
            },
        ];

        const req = {
            model: opts.model,
            temperature: 0.1,
            messages,
            schemaName: "Judgement",
            schema: judgementSchema,
            ...(opts.verbose && {
                onStream: (chunk: string) => process.stdout.write(chunk),
            }),
        };

        try {
            const { data, attempts } = await runStructuredWithGuard<Judgement>(
                llm,
                req,
                validateJudgement,
                (bad, error): ChatMessage[] => [
                    {
                        role: "system",
                        content:
                            "You are a JSON repair function. Return only JSON matching the schema exactly.",
                    },
                    {
                        role: "user",
                        content: `Validation failed: ${error}\n\nBad object:\n${JSON.stringify(bad, null, 2)}`,
                    },
                ],
            );

            return {
                id: runId("step"),
                agentName: this.name,
                role: "research",
                createdAt,
                request: req,
                rawAttempts: attempts,
                output: { kind: "judgement", data },
                completedAt: nowIso(),
            };
        } catch (e: any) {
            return {
                id: runId("step"),
                agentName: this.name,
                role: "research",
                createdAt,
                request: req,
                rawAttempts: [],
                error: e?.message ?? String(e),
                completedAt: nowIso(),
            };
        }
    }
}
