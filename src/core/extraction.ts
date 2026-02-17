/* ------------------------- helpers: extraction ------------------------- */
import {
    AgentResponse,
    AgentRun,
    Calibration,
    Critique,
    EvidencePlan,
    Judgement,
    QuestionDecomposition,
} from "../types/agent";

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

export function getDecomposition(step: AgentRun): QuestionDecomposition | null {
    if (!step.output) return null;
    if (step.output.kind !== "decomposition") return null;
    return step.output.data;
}

export function getCalibration(step: AgentRun): Calibration | null {
    if (!step.output) return null;
    if (step.output.kind !== "calibration") return null;
    return step.output.data;
}

export function getEvidencePlan(step: AgentRun): EvidencePlan | null {
    if (!step.output) return null;
    if (step.output.kind !== "evidence_plan") return null;
    return step.output.data;
}

export function getJudgement(step: AgentRun): Judgement | null {
    if (!step.output) return null;
    if (step.output.kind !== "judgement") return null;
    return step.output.data;
}
