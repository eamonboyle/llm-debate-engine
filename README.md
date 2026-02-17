# LLM Debate Research Platform

**Live dashboard:** [llm-debate-research.vercel.app](https://llm-debate-research.vercel.app/) — explore runs, benchmarks, and metrics without installing anything.

A multi-agent system for running structured LLM debates, analyzing outputs, and comparing results over time. The platform comprises:

- **CLI debate engine** — Multi-agent pipelines for single runs and benchmarks
- **Artifact storage** — Versioned run and benchmark artifacts in `runs/`
- **Analysis indexer** — `analyze-runs` for aggregating metrics and building searchable indexes
- **Research UI** — Next.js dashboard (`apps/web`) for exploration, comparison, and visualization

Designed for research, policy analysis, and model evaluation where measurable uncertainty and critique quality matter.

## Debate pipeline presets

### `standard`

Solver -> Skeptic -> SolverRevision -> Synthesizer

### `research_deep`

QuestionDecomposer -> EvidencePlanner -> Solver -> Skeptic -> RedTeam -> SolverRevision -> Synthesizer -> Counterfactual -> Calibration -> Judge

### `fast_research`

QuestionDecomposer -> EvidencePlanner -> Solver -> Skeptic -> RedTeam -> Counterfactual -> Calibration -> Judge

The `--fast` flag skips revision and synthesizer steps in compatible flows.

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

All-in-one export (CSV, markdown, bundle, chunks):

```bash
pnpm analyze:full
```

### Start research UI (local)

```bash
pnpm web:dev
```

Production build:

```bash
pnpm web:build
```

The web app reads from `runs/` — run `pnpm analyze` first so `analysis-index.json` (or `analysis-bundle.json`) exists.

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

Filter options:

- `--question "text"` — Include only artifacts whose question contains the given text
- `--model "text"` — Include only artifacts whose model contains the given text
- `--preset standard|research_deep|fast_research` — Restrict to a single preset
- `--fast-mode true|false` — Restrict to fast or non-fast artifacts
- `--created-after ISO` — Include artifacts at or after the given timestamp
- `--created-before ISO` — Include artifacts at or before the given timestamp

## Artifact model

Artifacts use schema versioning (`schemaVersion: 1`) and include metadata:

- `model`
- `fastMode`
- `pipelinePreset`
- `pipelineVersion`
- `createdAt`

Type definitions:

- `src/types/artifact.ts`
- `src/types/benchmark.ts`
- `src/types/analysis.ts`

The compatibility loader (`src/artifacts/loader.ts`) supports legacy artifact formats.

## Research analytics

The `analyze-runs` command computes an analysis index containing:

- Filter context metadata for reproducibility
- Issue type counts and severity statistics
- Confidence drift (solver→revision, revision→synthesizer, calibrated→synthesizer)
- Evidence-planning risk aggregates (mean and distribution)
- Counterfactual failure mode frequency aggregates
- Severity–confidence Pearson correlations for stage deltas
- Critique severity vs. confidence movement records
- Benchmark mode labels inferred from exemplar previews

Use `--question "text"` to build a focused index over matching artifacts. The resulting index powers the web dashboard.

## Next.js research UI

The `apps/web` dashboard provides:

**Overview (`/`)** — KPIs, metric glossary, preset distribution, benchmark entropy and stability trends, evidence planner risk distribution, evidence risk trends, top counterfactual failure modes, outlier run surfacing from pairwise similarity analysis, and analysis filter context when the index is built with CLI filters.

**Runs** — `/runs` artifact table; `/runs/[id]` trace viewer with step-by-step summaries and raw JSON; `/runs/compare` side-by-side comparison with confidence, quality, and research deltas.

**Benchmarks** — `/benchmarks` artifact table; `/benchmarks/[id]` deep-dive; `/benchmarks/compare` side-by-side comparison with charted metric deltas.

**Filters** — Query parameters for runs and benchmarks:

- full-text question/answer search
- model filter
- preset filter
- fast-mode filter
- sort order (newest/oldest)
- pagination controls (page + page size)

Data is loaded from local filesystem artifacts in `runs/`. If `analysis-index.json` is missing, the UI falls back to `analysis-bundle.json`. The [live dashboard](https://llm-debate-research.vercel.app/) uses pre-built analysis from the repository.

**REST API** — Endpoints exposed by the web app:

- `GET /api/analysis`
- `GET /api/runs`
- `GET /api/runs/:id`
- `GET /api/runs/compare?left=:id&right=:id`
- `GET /api/benchmarks`
- `GET /api/benchmarks/compare?left=:id&right=:id`
- `GET /api/benchmarks/:id`
- `GET /api/benchmarks/:id/pairs`

List routes support query filters (`q`, `model`, `preset`, `fast`, `from`, `to`) and pagination/sort parameters (`sort`, `offset`, `limit`, `page`, `pageSize`). Responses include pagination metadata (`page`, `totalPages`, `prevPage`, `nextPage`, `offset`, `limit`, `hasMore`). The benchmark pairs endpoint prefers `analysis-benchmark-pairs.json` when available.

## Deployment

The web app deploys to [Vercel](https://vercel.com) via `apps/web/vercel.json`. Deploy your own instance to explore your own `runs/` artifacts: run `pnpm analyze` (or `pnpm analyze:full`) locally, commit the generated `runs/analysis-*.json` files, then connect the repo to Vercel.

## Testing

```bash
pnpm test
pnpm typecheck
pnpm web:typecheck
pnpm web:build
```

## Documentation

- Architecture decision record: `docs/architecture-decision-record.md`
- Web API reference: `docs/api-reference.md`
- Experiment workflow: `docs/experiment-workflow.md`
- Artifact schema reference: `docs/artifact-schema.md`
- Adding new agents: `docs/adding-agents.md`
- Chart interpretation guide: `docs/chart-interpretation.md`

## Environment

| Variable             | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| `OPENAI_API_KEY`     | Required for `ask` / `benchmark`. Not required for `analyze-runs`. |
| `OPENAI_BASE_URL`    | OpenAI-compatible API base URL                                     |
| `OPENAI_MODEL`       | Default model                                                      |
| `OPENAI_TEMPERATURE` | Optional global temperature override                               |
| `RUNS_DIR`           | Optional override used by web app data loader                      |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and how to submit changes.

## License

ISC — see [LICENSE](LICENSE) for details.
