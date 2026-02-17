import type { ChatMessage, LLMClient } from "../types/llm";
import type {
    AgentRun,
    DebateContext,
    QuestionDecomposition,
} from "../types/agent";
import { runStructuredWithGuard } from "../core/structuredRunner";
import { validateQuestionDecomposition } from "../validator";

const decompositionSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        framing: { type: "string" },
        subQuestions: {
            type: "array",
            minItems: 2,
            items: { type: "string" },
        },
        hypotheses: {
            type: "array",
            minItems: 2,
            items: { type: "string" },
        },
    },
    required: ["framing", "subQuestions", "hypotheses"],
} as const;

function nowIso() {
    return new Date().toISOString();
}

function runId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class QuestionDecomposerAgent {
    readonly name = "QuestionDecomposerAgent";

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
                    "You are a research planner. Decompose the question into sub-questions and hypotheses. Output only valid JSON matching the schema.",
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
            schemaName: "QuestionDecomposition",
            schema: decompositionSchema,
            ...(opts.verbose && {
                onStream: (chunk: string) => process.stdout.write(chunk),
            }),
        };

        try {
            const { data, attempts } =
                await runStructuredWithGuard<QuestionDecomposition>(
                    llm,
                    req,
                    validateQuestionDecomposition,
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
                output: { kind: "decomposition", data },
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
