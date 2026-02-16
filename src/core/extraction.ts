/* ------------------------- helpers: extraction ------------------------- */
import { AgentResponse, AgentRun, Critique } from "../types/agent";

export function getProposal(step: AgentRun): AgentResponse | null {
    if (!step.output) return null;
    if (step.output.kind !== "proposal") return null;
    return step.output.data;
}

export function getCritique(step: AgentRun): Critique | null {
    if (!step.output) return null;
    if (step.output.kind !== "critique") return null;
    return step.output.data;
}
