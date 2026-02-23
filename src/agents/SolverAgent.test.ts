import { describe, expect, it, vi } from "vitest";
import { SolverAgent } from "./SolverAgent";
import type { LLMClient } from "../types/llm";

function createMockLLMClient(response: unknown): LLMClient {
    return {
        complete: vi.fn().mockResolvedValue(""),
        completeStructured: vi.fn().mockResolvedValue(response),
    };
}

describe("SolverAgent", () => {
    it("produces AgentRun with proposal output when LLM returns valid response", async () => {
        const validResponse = {
            answer: "Yes, with caveats.",
            keyClaims: ["Claim 1", "Claim 2"],
            assumptions: ["Assumption 1"],
            confidence: 0.8,
        };
        const llm = createMockLLMClient(validResponse);
        const agent = new SolverAgent();

        const result = await agent.run(
            { question: "Is X true?" },
            llm,
            { model: "gpt-test" },
        );

        expect(result.agentName).toBe("SolverAgent");
        expect(result.role).toBe("solver");
        expect(result.output?.kind).toBe("proposal");
        expect(result.output?.kind === "proposal" && result.output.data).toEqual(
            validResponse,
        );
        expect(result.error).toBeUndefined();
    });

    it("includes evidencePlan in request when provided", async () => {
        const validResponse = {
            answer: "Test",
            keyClaims: ["C1"],
            assumptions: [],
            confidence: 0.5,
        };
        const llm = createMockLLMClient(validResponse);
        const agent = new SolverAgent();
        const evidencePlan = {
            evidenceRequirements: ["Req1"],
            verificationChecks: ["Check1"],
            majorUnknowns: ["Unknown1"],
            riskLevel: 2 as const,
        };

        await agent.run(
            { question: "Q?" },
            llm,
            { model: "gpt-test", evidencePlan },
        );

        expect(llm.completeStructured).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        content: expect.stringContaining("Evidence plan:"),
                    }),
                ]),
            }),
        );
    });
});
