import type { ChatMessage, LLMClient } from "../types/llm";
import type { AgentResponse, AgentRun, Calibration } from "../types/agent";
import { runStructuredWithGuard } from "../core/structuredRunner";
import { validateCalibration } from "../validator";

const calibrationSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        adjustedConfidence: { type: "number", minimum: 0, maximum: 1 },
        rationale: { type: "string" },
        claimConfidences: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    claim: { type: "string" },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                },
                required: ["claim", "confidence"],
            },
        },
    },
    required: ["adjustedConfidence", "rationale", "claimConfidences"],
} as const;

function nowIso() {
    return new Date().toISOString();
}

function runId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class CalibrationAgent {
    readonly name = "CalibrationAgent";

    async run(
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
                    "You are a calibration auditor. Set adjusted confidence and claim-level confidences from the proposed answer. Output only valid JSON matching the schema.",
            },
            {
                role: "user",
                content: `Proposal JSON:\n${JSON.stringify(opts.proposal, null, 2)}`,
            },
        ];

        const req = {
            model: opts.model,
            temperature: 0.1,
            messages,
            schemaName: "Calibration",
            schema: calibrationSchema,
            ...(opts.verbose && {
                onStream: (chunk: string) => process.stdout.write(chunk),
            }),
        };

        try {
            const { data, attempts } =
                await runStructuredWithGuard<Calibration>(
                    llm,
                    req,
                    validateCalibration,
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
                output: { kind: "calibration", data },
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
