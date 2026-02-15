import type {
    LLMClient,
    StructuredCompletionRequest,
    ChatMessage,
} from "../types/llm";

export async function runStructuredWithGuard<T>(
    llm: LLMClient,
    req: StructuredCompletionRequest,
    validate: (
        v: unknown,
    ) => { ok: true; data: T } | { ok: false; error: string },
    buildRepairMessages: (bad: unknown, error: string) => ChatMessage[],
): Promise<{ data: T; attempts: unknown[] }> {
    // attempt 1
    const first = await llm.completeStructured<T>(req);
    const attempts: unknown[] = [first];

    const v1 = validate(first);
    if (v1.ok) {
        return { data: v1.data, attempts };
    }

    // attempt 2 (repair)
    console.warn(
        `[structuredRunner] First attempt failed validation: ${v1.ok === false ? v1.error : "unknown"}. Attempting repair...`,
    );
    const v1Error = v1.ok === false ? v1.error : "unknown";
    const repairReq: StructuredCompletionRequest = {
        ...req,
        temperature: 0.1,
        messages: buildRepairMessages(first, v1Error),
    };

    const repaired = await llm.completeStructured<T>(repairReq);
    attempts.push(repaired);

    const v2 = validate(repaired);

    if (!v2.ok) {
        const firstError = v1.ok === false ? v1.error : "unknown";
        const repairError = v2.ok === false ? v2.error : "unknown";
        throw new Error(
            `Structured output invalid after repair. First error: ${firstError}. Repair error: ${repairError}`,
        );
    }

    return { data: v2.data, attempts };
}
