import type { ChatMessage, LLMClient } from "../types/llm";
import type {
    AgentResponse,
    AgentRun,
    Counterfactual,
    DebateContext,
} from "../types/agent";
import { runStructuredWithGuard } from "../core/structuredRunner";
import { validateCounterfactual } from "../validator";

const counterfactualSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        failureModes: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
        },
        triggerConditions: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
        },
        mitigations: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
        },
    },
    required: ["failureModes", "triggerConditions", "mitigations"],
} as const;

function nowIso() {
    return new Date().toISOString();
}

function runId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class CounterfactualAgent {
    readonly name = "CounterfactualAgent";

    async run(
        ctx: DebateContext,
        llm: LLMClient,
        opts: { model: string; verbose?: boolean; proposal: AgentResponse },
    ): Promise<AgentRun> {
        const createdAt = nowIso();
        const messages: ChatMessage[] = [
            {
                role: "system",
                content:
                    "You are a counterfactual analyst. Identify plausible failure modes, trigger conditions, and mitigations for the proposal. Output only valid JSON matching the schema.",
            },
            {
                role: "user",
                content: `Question: ${ctx.question}\n\nProposal:\n${JSON.stringify(
                    opts.proposal,
                    null,
                    2,
                )}`,
            },
        ];

        const req = {
            model: opts.model,
            temperature: 0.2,
            messages,
            schemaName: "Counterfactual",
            schema: counterfactualSchema,
            ...(opts.verbose && {
                onStream: (chunk: string) => process.stdout.write(chunk),
            }),
        };

        try {
            const { data, attempts } =
                await runStructuredWithGuard<Counterfactual>(
                    llm,
                    req,
                    validateCounterfactual,
                    (bad, error): ChatMessage[] => [
                        {
                            role: "system",
                            content:
                                "You are a JSON repair function. Return only JSON matching the schema.",
                        },
                        {
                            role: "user",
                            content: `Validation failed: ${error}\n\nBad object:\n${JSON.stringify(
                                bad,
                                null,
                                2,
                            )}`,
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
                output: { kind: "counterfactual", data },
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
