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

const SYNTHESIZER_SYSTEM_PROMPT = `You are the Synthesizer. Given the question, the solver's original proposal, the skeptic's critique, and the solver's revision, produce a final synthesized AgentResponse.

Internal reasoning (do not put this in output fields):
- Consider how the critique and revision improved or changed the proposal.
- Synthesize the best elements into a coherent final answer.

Output requirements:
- Produce a clear, well-supported answer that incorporates valid points from the debate.
- keyClaims must be plain English sentences only. No JSON fragments.
- Set confidence appropriately based on the debate outcome.
- Output ONLY valid JSON matching the schema. No extra keys. No commentary outside JSON.`;

export class SynthesizerAgent {
    readonly name = "SynthesizerAgent";

    async run(
        ctx: DebateContext,
        llm: LLMClient,
        opts: {
            model: string;
            proposal: AgentResponse;
            critique: Critique;
            revision: AgentResponse;
        },
    ): Promise<AgentRun> {
        const createdAt = nowIso();

        const userContent =
            `Question: ${ctx.question}\n\n` +
            `Solver proposal:\n${JSON.stringify(opts.proposal, null, 2)}\n\n` +
            `Skeptic critique:\n${JSON.stringify(opts.critique, null, 2)}\n\n` +
            `Solver revision:\n${JSON.stringify(opts.revision, null, 2)}\n\n` +
            "Synthesize a final AgentResponse from the debate. Return valid JSON only.";

        const messages: ChatMessage[] = [
            { role: "system", content: SYNTHESIZER_SYSTEM_PROMPT },
            { role: "user", content: userContent },
        ];

        const req = {
            model: opts.model,
            temperature: 0.3,
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
                role: "synthesizer",
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
                role: "synthesizer",
                createdAt,
                request: req,
                rawAttempts: [],
                error: e?.message ?? String(e),
                completedAt: nowIso(),
            };
        }
    }
}
