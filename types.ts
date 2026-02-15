// // AGENT TYPES

// type AgentResponse = {
//   answer: string
//   keyClaims: string[]
//   assumptions: string[]
//   confidence: number
// }

// type Proposal = {
//   response: AgentResponse
// }

// type CritiqueIssue = {
//   // only allow 1-5 for severity
//   severity: 1 | 2 | 3 | 4 | 5
//   type: "factual" | "logic" | "missing" | "ambiguity" | "overconfidence"
//   note: string
// }

// type Critique = {
//   response: AgentResponse
//   issues: CritiqueIssue[]
// }

// type AgentOutput =
//   | { kind: "proposal"; data: Proposal }
//   | { kind: "critique"; data: Critique }

// type AgentRun = {
//   id: string
//   agentName: string
//   role: string
//   timestamp: string
//   output: AgentOutput
// }

// type LLMModel = {
//   name: string
//   type: "openai" | "anthropic" | "google" | "azure" | "cohere" | "huggingface" | "mistral" | "ollama" | "perplexity" | "qwen" | "replicate" | "runway" | "xai"
//   apiKey: string
//   apiUrl: string
//   apiVersion: string
//   apiModel: string
// }

// // type ChatMessage = {
// //   role: "user" | "system" | "assistant"
// //   content: string
// // }

// // type CompletionRequest = {
// //   model: string
// //   messages: ChatMessage[]
// //   temperature?: number
// // }

// // type StructuredCompletionRequest<TSchema> = CompletionRequest & {
// //   schema: TSchema
// // }

// // type CompletionResponse = {
// //   text: string
// // }

// // class LLMClient {
// //   constructor(private readonly model: LLMModel) {}

// //   async complete(request: CompletionRequest): Promise<CompletionResponse> {
// //     // this would do the following:
// //     // 1. call the model's API with the request
// //     // 2. return the response
// //     return { text: "response" };
// //   }

// //   async completeStructured<T>(request: CompletionRequest): Promise<T> {
// //     return { text: "response" } as T;
// //   }
// // }

// class OpenAILLMClient extends LLMClient {
//   constructor(apiKey: string, apiUrl: string, apiVersion: string, apiModel: string) {
//     super({
//       name: "openai",
//       type: "openai",
//       apiKey: apiKey,
//       apiUrl: apiUrl,
//       apiVersion: apiVersion,
//       apiModel: apiModel
//     });
//   }

//   async complete(request: CompletionRequest): Promise<CompletionResponse> {
//     return super.complete(request);
//   }

//   async completeStructured<T>(request: CompletionRequest): Promise<T> {
//     return super.completeStructured<T>(request);
//   }
// }

// // DEBATE SYSTEM TYPES

// type DebateContext = {
//     question: string
//     solverProposal: Proposal
//     skepticCritique: Critique
// }

// type Agent = {
//     name: string
//     run(context: DebateContext, llm: LLMClient): Promise<AgentOutput>
// }

// type DebateRun = {
//   id: string
//   createdAt: string
//   question: string
//   steps: AgentRun[]
//   final?: AgentOutput
// }
