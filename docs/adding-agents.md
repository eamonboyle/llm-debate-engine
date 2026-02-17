# How to Add a New Research Agent

This guide describes the current extension pattern for adding an agent and wiring it into debate presets.

## 1) Add output type

Update `src/types/agent.ts`:

1. Add a strongly-typed output payload (e.g., `EvidencePlan`)
2. Extend `AgentOutput` union with a new variant
3. Add any metrics fields needed downstream

## 2) Add validator

In `src/validator.ts`:

1. Add `validateYourType(value: unknown)`
2. Keep validation strict and explicit
3. Add tests in `src/validator.test.ts`

## 3) Implement agent class

Create `src/agents/YourAgent.ts`:

Pattern to follow:

- Define JSON schema object for structured output
- Build deterministic system/user messages
- Execute via `runStructuredWithGuard`
- Return `AgentRun` with
  - `request`
  - `rawAttempts`
  - typed `output`

## 4) Expose extraction helper (optional but recommended)

If you need to consume this output in orchestration/metrics:

- add helper in `src/core/extraction.ts`
- e.g. `getEvidencePlan(step)`

## 5) Wire into engine

Update `src/debate/DebateEngine.ts`:

1. Add agent dependency override in `DebateEngineDeps`
2. Instantiate default in constructor
3. Call agent in selected preset flow(s)
4. Add fallback/error behavior for missing output

## 6) Persist in artifacts

No special persistence code is needed if output appears in `run.steps`.
The CLI artifact writer serializes full `DebateRun`.

## 7) Add/adjust metrics

If the new agent creates measurable outputs:

- update `src/core/metrics.ts`
- update indexer (`src/artifacts/indexer.ts`)
- update analysis type definitions (`src/types/analysis.ts`)

## 8) Update docs + UI

- Add docs explaining the new output semantics
- Add visualizations or table columns in `apps/web` if useful
- Validate by:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm web:typecheck`
  - `pnpm web:build`

## Example candidates

- Evidence planner
- Counterfactual scenario generator
- Mode labeler (benchmark-level post-process agent)

Note: there is already a rule-based benchmark mode labeler utility:

- `src/analysis/modeLabeler.ts`
