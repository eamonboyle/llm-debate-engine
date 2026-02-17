# Web API Reference

The Next.js app exposes JSON APIs for programmatic analysis access.

Base assumption: API routes read artifacts from local `runs/` (or `RUNS_DIR` override).

## Endpoints

## `GET /api/analysis`

Returns the current analysis index.

- Uses `analysis-index.json` when available.
- Falls back to `analysis-bundle.json` index payload.

Example:

```bash
curl "http://localhost:3000/api/analysis"
```

## `GET /api/runs`

Returns run artifact list with optional filters.

Query params:

- `q` full-text query (`id`, `question`, `finalAnswer`)
- `model` model substring
- `preset` exact preset (`standard`, `research_deep`, `fast_research`)
- `fast` (`true`/`false`)
- `from` datetime lower bound (`datetime-local` or ISO-compatible)
- `to` datetime upper bound

Example:

```bash
curl "http://localhost:3000/api/runs?model=gpt-5&preset=research_deep&fast=false"
```

## `GET /api/runs/:id`

Returns a single run artifact or 404.

## `GET /api/benchmarks`

Returns benchmark artifact list with same filter params as `/api/runs`.

Example:

```bash
curl "http://localhost:3000/api/benchmarks?q=ai%20safety&from=2025-01-01T00:00:00.000Z"
```

## `GET /api/benchmarks/compare?left=:id&right=:id`

Returns left/right benchmark snapshots and computed deltas:

- runs
- modeCount
- divergenceEntropy
- stabilityPairwiseMean (nullable if missing)

Example:

```bash
curl "http://localhost:3000/api/benchmarks/compare?left=benchmark_a&right=benchmark_b"
```

## `GET /api/benchmarks/:id`

Returns a single benchmark artifact or 404.

## `GET /api/benchmarks/:id/pairs`

Returns benchmark pairwise similarity payload:

```json
{
  "benchmarkId": "benchmark_...",
  "runIds": ["run_a", "run_b"],
  "pairs": [{ "i": 0, "j": 1, "similarity": 0.91 }]
}
```

Data source priority:

1. `analysis-benchmark-pairs.json` chunk file
2. `payload.summary.stability.pairs` in benchmark artifact
