# LLM Debate Research Platform

This repository now includes:

1. A multi-agent CLI debate engine
2. Versioned run/benchmark artifacts in `runs/`
3. An analysis indexer (`analyze-runs`)
4. A Next.js research UI (`apps/web`) with charts and drilldowns

The goal is to make repeated LLM debates measurable, explorable, and easy to compare over time.

## Debate pipeline presets

### `standard`

Solver -> Skeptic -> SolverRevision -> Synthesizer

### `research_deep`

QuestionDecomposer -> EvidencePlanner -> Solver -> Skeptic -> RedTeam -> SolverRevision -> Synthesizer -> Calibration -> Judge

### `fast_research`

QuestionDecomposer -> EvidencePlanner -> Solver -> Skeptic -> RedTeam -> Calibration -> Judge

`--fast` can also be used to skip revision+synthesizer in compatible flows.

## Quick start

```bash
pnpm install
cp .env.example .env
# set OPENAI_API_KEY in .env
```

### Single run

```bash
pnpm ask "Is AI an existential threat?" --preset research_deep
```

### Benchmark

```bash
pnpm benchmark "Is AI an existential threat?" --runs 7 --preset research_deep
```

### Build analysis index from `runs/`

```bash
pnpm analyze
```

Writes `runs/analysis-index.json`.

Optional CSV summaries:

```bash
pnpm analyze -- --csv
```

Writes:

- `runs/analysis-runs.csv`
- `runs/analysis-benchmarks.csv`

Optional markdown report:

```bash
pnpm analyze -- --markdown
```

Writes:

- `runs/analysis-report.md`

Optional share bundle:

```bash
pnpm analyze -- --bundle
```

Writes:

- `runs/analysis-bundle.json` (index + parsed run/benchmark artifacts)

Optional pairwise chunk export:

```bash
pnpm analyze -- --chunks
```

Writes:

- `runs/analysis-benchmark-pairs.json`

Convenience script for all optional exports:

```bash
pnpm analyze:full
```

### Open research UI

```bash
pnpm web:dev
```

Or verify production build:

```bash
pnpm web:build
```

## CLI reference

### `ask`

```bash
pnpm tsx src/cli.ts ask "<question>" [--model M] [--preset standard|research_deep|fast_research] [--fast] [--verbose]
```

### `benchmark`

```bash
pnpm tsx src/cli.ts benchmark "<question>" [--runs N] [--concurrency N] [--model M] [--preset standard|research_deep|fast_research] [--threshold T] [--fast] [--verbose]
```

### `analyze-runs`

```bash
pnpm tsx src/cli.ts analyze-runs [--runs-dir path] [--output filename] [--question text] [--model text] [--preset standard|research_deep|fast_research] [--fast-mode true|false] [--created-after ISO] [--created-before ISO] [--csv] [--markdown] [--markdown-file filename] [--bundle] [--bundle-file filename] [--chunks] [--chunks-file filename]
```

Useful focus flags:

- `--question "text"`: include only artifacts whose question contains text
- `--model "text"`: include only artifacts whose model contains text
- `--preset standard|research_deep|fast_research`: include only one preset
- `--fast-mode true|false`: include only fast/non-fast artifacts
- `--created-after ISO`: include artifacts at/after timestamp
- `--created-before ISO`: include artifacts at/before timestamp

## Artifact model

Artifacts are schema-versioned (`schemaVersion: 1`) and include metadata:

- `model`
- `fastMode`
- `pipelinePreset`
- `pipelineVersion`
- `createdAt`

Types live in:

- `src/types/artifact.ts`
- `src/types/benchmark.ts`
- `src/types/analysis.ts`

Legacy artifacts are still supported by the compatibility loader (`src/artifacts/loader.ts`).

## Research analytics

`analyze-runs` computes an index with:

- filter context metadata for reproducibility
- issue type counts
- severity statistics by issue type
- confidence drift (solver->revision, revision->synth, calibrated->synth delta)
- evidence-planning risk aggregates (mean + distribution)
- severity-confidence Pearson correlations for stage deltas
- critique severity vs confidence movement records
- benchmark mode labels inferred from exemplar previews

Use `--question "text"` to build a focused index over matching artifacts only.

This derived index powers the web dashboard.

## Next.js research UI

`apps/web` includes:

- `/` Overview dashboard (KPIs + charts)
- `/` includes metric glossary for interpretation context
- `/` includes outlier run surfacing from pairwise similarity analysis
- `/` includes preset distribution + benchmark entropy/stability trend charts
- `/` includes evidence planner risk distribution chart
- `/` shows analysis filter context when index is built with CLI filters
- `/runs` Run artifact table
- `/runs/[id]` Run trace viewer (step-by-step structured summaries + raw JSON)
- `/runs/compare` Side-by-side run comparison + metric deltas
- `/benchmarks` Benchmark artifact table
- `/benchmarks/[id]` Benchmark deep-dive
- `/benchmarks/compare` Side-by-side benchmark comparison + charted metric deltas

UI supports query-param filters for runs and benchmarks:

- full-text question/answer search
- model filter
- preset filter
- fast-mode filter
- sort order (newest/oldest)
- pagination controls (page + page size)

Data is loaded directly from local filesystem artifacts in `runs/`.
If `analysis-index.json` is missing, UI can fall back to `analysis-bundle.json`.

API endpoints are also available in the web app:

- `GET /api/analysis`
- `GET /api/runs`
- `GET /api/runs/:id`
- `GET /api/runs/compare?left=:id&right=:id`
- `GET /api/benchmarks`
- `GET /api/benchmarks/compare?left=:id&right=:id`
- `GET /api/benchmarks/:id`
- `GET /api/benchmarks/:id/pairs`

List routes support query filters: `q`, `model`, `preset`, `fast`, `from`, `to`,
plus pagination/sort params: `sort`, `offset`, `limit`, `page`, `pageSize`.
List API responses include pagination metadata (`page`, `totalPages`, `prevPage`,
`nextPage`, `offset`, `limit`, `hasMore`).

The benchmark pairs endpoint prefers `analysis-benchmark-pairs.json` when available.

## Testing

```bash
pnpm test
pnpm typecheck
pnpm web:typecheck
pnpm web:build
```

## Additional documentation

- Architecture decision record: `docs/architecture-decision-record.md`
- Web API reference: `docs/api-reference.md`
- Experiment workflow: `docs/experiment-workflow.md`
- Artifact schema reference: `docs/artifact-schema.md`
- Adding new agents: `docs/adding-agents.md`
- Chart interpretation guide: `docs/chart-interpretation.md`

## Environment

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required for `ask` / `benchmark`. Not required for `analyze-runs`. |
| `OPENAI_BASE_URL` | OpenAI-compatible API base URL |
| `OPENAI_MODEL` | Default model |
| `OPENAI_TEMPERATURE` | Optional global temperature override |
| `RUNS_DIR` | Optional override used by web app data loader |

## License

ISC
