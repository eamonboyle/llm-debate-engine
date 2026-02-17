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

QuestionDecomposer -> Solver -> Skeptic -> RedTeam -> SolverRevision -> Synthesizer -> Calibration -> Judge

### `fast_research`

QuestionDecomposer -> Solver -> Skeptic -> RedTeam -> Calibration -> Judge

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
pnpm tsx src/cli.ts analyze-runs [--runs-dir path] [--output filename] [--csv] [--markdown] [--markdown-file filename] [--bundle] [--bundle-file filename]
```

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

- issue type counts
- severity statistics by issue type
- confidence drift (solver->revision, revision->synth, calibrated->synth delta)
- severity-confidence Pearson correlations for stage deltas
- critique severity vs confidence movement records
- benchmark mode labels inferred from exemplar previews

This derived index powers the web dashboard.

## Next.js research UI

`apps/web` includes:

- `/` Overview dashboard (KPIs + charts)
- `/` includes metric glossary for interpretation context
- `/` includes outlier run surfacing from pairwise similarity analysis
- `/` includes preset distribution + benchmark entropy/stability trend charts
- `/runs` Run artifact table
- `/runs/[id]` Run trace viewer (step-by-step structured summaries + raw JSON)
- `/benchmarks` Benchmark artifact table
- `/benchmarks/[id]` Benchmark deep-dive
- `/benchmarks/compare` Side-by-side benchmark comparison

UI supports query-param filters for runs and benchmarks:

- full-text question/answer search
- model filter
- preset filter
- fast-mode filter

Data is loaded directly from local filesystem artifacts in `runs/`.

## Testing

```bash
pnpm test
pnpm typecheck
pnpm web:typecheck
pnpm web:build
```

## Additional documentation

- Architecture decision record: `docs/architecture-decision-record.md`
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
