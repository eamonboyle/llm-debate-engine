import { describe, expect, it, vi } from "vitest";
import { SkepticAgent } from "./SkepticAgent";
import type { LLMClient } from "../types/llm";

function createMockLLMClient(response: unknown): LLMClient {
    return {
        complete: vi.fn().mockResolvedValue(""),
        completeStructured: vi.fn().mockResolvedValue(response),
    };
}

describe("SkepticAgent", () => {
    it("produces AgentRun with critique output when LLM returns valid response", async () => {
        const validCritique = {
            targetAgent: "SolverAgent",
            issues: [
                {
                    severity: 2 as const,
                    type: "logic" as const,
                    note: "Potential flaw in reasoning.",
                },
            ],
        };
        const llm = createMockLLMClient(validCritique);
        const agent = new SkepticAgent();

        const result = await agent.run({ question: "Is X true?" }, llm, {
            model: "gpt-test",
            targetAgentName: "SolverAgent",
            proposal: {
                answer: "Yes",
                keyClaims: ["C1"],
                assumptions: [],
                confidence: 0.9,
            },
        });

        expect(result.agentName).toBe("SkepticAgent");
        expect(result.role).toBe("skeptic");
        expect(result.output?.kind).toBe("critique");
        expect(
            result.output?.kind === "critique" && result.output.data,
        ).toEqual(validCritique);
    });
});
