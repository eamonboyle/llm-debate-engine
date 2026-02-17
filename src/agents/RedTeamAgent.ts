import type { ChatMessage, LLMClient } from "../types/llm";
import type {
    AgentResponse,
    AgentRun,
    Critique,
    DebateContext,
} from "../types/agent";
import { runStructuredWithGuard } from "../core/structuredRunner";
import { validateCritique } from "../validator";

const redTeamCritiqueSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        targetAgent: { type: "string" },
        issues: {
            type: "array",
            minItems: 1,
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    severity: { type: "number", minimum: 1, maximum: 5 },
                    type: {
                        type: "string",
                        enum: [
                            "factual",
                            "logic",
                            "missing",
                            "ambiguity",
                            "overconfidence",
                        ],
                    },
                    note: { type: "string" },
                },
                required: ["severity", "type", "note"],
            },
        },
    },
    required: ["targetAgent", "issues"],
} as const;

function nowIso() {
    return new Date().toISOString();
}

function runId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class RedTeamAgent {
    readonly name = "RedTeamAgent";

    async run(
        ctx: DebateContext,
        llm: LLMClient,
        opts: {
            model: string;
            verbose?: boolean;
            proposal: AgentResponse;
        },
    ): Promise<AgentRun> {
        const createdAt = nowIso();

        const messages: ChatMessage[] = [
            {
                role: "system",
                content:
                    "You are a red-team analyst. Find high-risk failure modes and adversarial weaknesses in the answer. Output only valid JSON matching the schema.",
            },
            {
                role: "user",
                content:
                    `Question: ${ctx.question}\n\n` +
                    `Candidate answer JSON:\n${JSON.stringify(opts.proposal, null, 2)}\n\n` +
                    "Return a rigorous critique with severe issues when justified.",
            },
        ];

        const req = {
            model: opts.model,
            temperature: 0.3,
            messages,
            schemaName: "Critique",
            schema: redTeamCritiqueSchema,
            ...(opts.verbose && {
                onStream: (chunk: string) => process.stdout.write(chunk),
            }),
        };

        try {
            const { data, attempts } = await runStructuredWithGuard<Critique>(
                llm,
                req,
                validateCritique,
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
                output: { kind: "critique", data },
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
