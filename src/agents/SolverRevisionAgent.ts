import type { LLMClient, ChatMessage } from "../types/llm";
import type {
    AgentResponse,
    AgentRun,
    Critique,
    DebateContext,
} from "../types/agent";
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

const REVISION_SYSTEM_PROMPT = `You are the Solver revising your proposal after critique. Produce a revised AgentResponse that addresses all issues.

Internal reasoning (do not put this in output fields):
- Reference each critique issue in your reasoning before producing output.
- Consider how each issue affects the answer, keyClaims, assumptions, and confidence.

Output requirements:
- Change answer and keyClaims accordingly to address the critique.
- Adjust confidence downward when critique severity is high (4–5).
- Add assumptions when critique indicates ambiguity (type "ambiguity").
- Keep keyClaims clean and non-duplicated.
- Do not include any JSON fragments inside keyClaims. keyClaims must be plain English sentences only.
- Do not reference the critique or revision process in answer, keyClaims, or assumptions—output only the revised content.
- Output ONLY valid JSON matching the schema. No extra keys. No commentary outside JSON.`;

export class SolverRevisionAgent {
    readonly name = "SolverRevisionAgent";

    async run(
        ctx: DebateContext,
        llm: LLMClient,
        opts: {
            model: string;
            verbose?: boolean;
            proposal: AgentResponse;
            critique: Critique;
        },
    ): Promise<AgentRun> {
        const createdAt = nowIso();

        const userContent =
            `Question: ${ctx.question}\n\n` +
            `Original proposal:\n${JSON.stringify(opts.proposal, null, 2)}\n\n` +
            `Critique:\n${JSON.stringify(opts.critique, null, 2)}\n\n` +
            "Revise the proposal to address each issue. Return the revised AgentResponse as valid JSON only.";

        const messages: ChatMessage[] = [
            { role: "system", content: REVISION_SYSTEM_PROMPT },
            { role: "user", content: userContent },
        ];

        const req = {
            model: opts.model,
            temperature: 0.3,
            messages,
            schemaName: "AgentResponse",
            schema: agentResponseSchema,
            ...(opts.verbose && {
                onStream: (chunk: string) => process.stdout.write(chunk),
            }),
        };

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
