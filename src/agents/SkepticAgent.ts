import type {
    LLMClient,
    ChatMessage,
    StructuredCompletionRequest,
} from "../types/llm";
import type {
    AgentRun,
    DebateContext,
    AgentResponse,
    Critique,
} from "../types/agent";
import { runStructuredWithGuard } from "../core/structuredRunner";
import { validateCritique } from "../validator";

const critiqueSchema = {
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

function stepId() {
    return `step_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class SkepticAgent {
    readonly name = "SkepticAgent";

    async run(
        ctx: DebateContext,
        llm: LLMClient,
        opts: {
            model: string;
            verbose?: boolean;
            targetAgentName: string;
            proposal: AgentResponse;
        },
    ): Promise<AgentRun> {
        const createdAt = nowIso();

        const messages: ChatMessage[] = [
            {
                role: "system",
                content:
                    "You are the Skeptic. Critique the proposal rigorously. Output ONLY valid JSON matching the schema. No extra keys. No commentary outside JSON.",
            },
            {
                role: "user",
                content:
                    `Question: ${ctx.question}\n\n` +
                    `Target agent: ${opts.targetAgentName}\n\n` +
                    `Proposal JSON:\n${JSON.stringify(opts.proposal, null, 2)}\n\n` +
                    "Find issues. Prefer factual risk, missing edge cases, ambiguity, and overconfidence.",
            },
        ];

        const req: StructuredCompletionRequest = {
            model: opts.model,
            temperature: 0.3,
            messages,
            schemaName: "Critique",
            schema: critiqueSchema,
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
                            "You are a JSON repair function. Output ONLY valid JSON matching the schema exactly. No extra keys.",
                    },
                    {
                        role: "user",
                        content: `The previous output did not validate: ${error}\n\nInvalid object:\n${JSON.stringify(bad, null, 2)}\n\nReturn corrected JSON only.`,
                    },
                ],
            );

            return {
                id: stepId(),
                agentName: this.name,
                role: "skeptic",
                createdAt,
                request: req,
                rawAttempts: attempts,
                output: { kind: "critique", data },
                completedAt: nowIso(),
            };
        } catch (e: any) {
            return {
                id: stepId(),
                agentName: this.name,
                role: "skeptic",
                createdAt,
                request: req,
                rawAttempts: [],
                error: e?.message ?? String(e),
                completedAt: nowIso(),
            };
        }
    }
}
