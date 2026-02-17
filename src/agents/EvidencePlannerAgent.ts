import type { ChatMessage, LLMClient } from "../types/llm";
import type { AgentRun, DebateContext, EvidencePlan } from "../types/agent";
import { runStructuredWithGuard } from "../core/structuredRunner";
import { validateEvidencePlan } from "../validator";

const evidencePlanSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        evidenceRequirements: {
            type: "array",
            minItems: 2,
            items: { type: "string" },
        },
        verificationChecks: {
            type: "array",
            minItems: 2,
            items: { type: "string" },
        },
        majorUnknowns: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
        },
        riskLevel: { type: "integer", minimum: 1, maximum: 5 },
    },
    required: [
        "evidenceRequirements",
        "verificationChecks",
        "majorUnknowns",
        "riskLevel",
    ],
} as const;

function nowIso() {
    return new Date().toISOString();
}

function runId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class EvidencePlannerAgent {
    readonly name = "EvidencePlannerAgent";

    async run(
        ctx: DebateContext,
        llm: LLMClient,
        opts: { model: string; verbose?: boolean },
    ): Promise<AgentRun> {
        const createdAt = nowIso();
        const messages: ChatMessage[] = [
            {
                role: "system",
                content:
                    "You are an evidence planning specialist. Produce a compact evidence and verification plan for the question. Output only valid JSON matching the schema.",
            },
            {
                role: "user",
                content: `Question: ${ctx.question}`,
            },
        ];

        const req = {
            model: opts.model,
            temperature: 0.2,
            messages,
            schemaName: "EvidencePlan",
            schema: evidencePlanSchema,
            ...(opts.verbose && {
                onStream: (chunk: string) => process.stdout.write(chunk),
            }),
        };

        try {
            const { data, attempts } =
                await runStructuredWithGuard<EvidencePlan>(
                    llm,
                    req,
                    validateEvidencePlan,
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
                output: { kind: "evidence_plan", data },
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
