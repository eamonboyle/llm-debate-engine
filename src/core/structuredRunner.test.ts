import { describe, it, expect, vi } from "vitest";
import { runStructuredWithGuard } from "./structuredRunner";
import type { LLMClient, StructuredCompletionRequest } from "../types/llm";

describe("runStructuredWithGuard", () => {
    const validData = {
        answer: "Yes, Rust is safer.",
        keyClaims: ["Rust enforces memory safety."],
        assumptions: [],
        confidence: 0.9,
    };
    const validate = (v: unknown) => {
        const o = v as { answer?: string; keyClaims?: unknown[] };
        if (
            typeof o?.answer === "string" &&
            o.answer.trim().length >= 5 &&
            Array.isArray(o.keyClaims) &&
            o.keyClaims.length >= 1
        ) {
            return { ok: true as const, data: v as typeof validData };
        }
        return { ok: false as const, error: "answer invalid" };
    };
    const buildRepair = () => [
        { role: "system" as const, content: "Fix it" },
        { role: "user" as const, content: "Fix" },
    ];

    const baseReq: StructuredCompletionRequest = {
        model: "test",
        messages: [{ role: "user", content: "Q" }],
        schemaName: "AgentResponse",
        schema: {},
    };

    it("returns data and single attempt when first validates", async () => {
        const llm: LLMClient = {
            complete: vi.fn(),
            completeStructured: vi.fn().mockResolvedValue(validData),
        };
        const { data, attempts } = await runStructuredWithGuard(
            llm,
            baseReq,
            validate,
            buildRepair,
        );
        expect(data).toEqual(validData);
        expect(attempts).toHaveLength(1);
        expect(llm.completeStructured).toHaveBeenCalledTimes(1);
    });

    it("calls repair when first fails, returns repaired data", async () => {
        const repaired = { ...validData, answer: "Repaired answer here." };
        const llm: LLMClient = {
            complete: vi.fn(),
            completeStructured: vi
                .fn()
                .mockResolvedValueOnce({ answer: "" })
                .mockResolvedValueOnce(repaired),
        };
        const consoleSpy = vi
            .spyOn(console, "warn")
            .mockImplementation(() => {});

        const { data, attempts } = await runStructuredWithGuard(
            llm,
            baseReq,
            validate,
            buildRepair,
        );

        expect(data).toEqual(repaired);
        expect(attempts).toHaveLength(2);
        expect(llm.completeStructured).toHaveBeenCalledTimes(2);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("First attempt failed validation"),
        );
        consoleSpy.mockRestore();
    });

    it("throws when repair also fails", async () => {
        const llm: LLMClient = {
            complete: vi.fn(),
            completeStructured: vi
                .fn()
                .mockResolvedValueOnce({ answer: "" })
                .mockResolvedValueOnce({ answer: "" }),
        };
        vi.spyOn(console, "warn").mockImplementation(() => {});

        await expect(
            runStructuredWithGuard(llm, baseReq, validate, buildRepair),
        ).rejects.toThrow("Structured output invalid after repair");
    });
});
