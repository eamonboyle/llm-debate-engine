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
- `sort` (`newest` default, `oldest`)
- ties on `createdAt` are deterministically ordered by `id`
- `offset` zero-based pagination offset (default `0`)
- `limit` page size (default `100`, max `500`)
- `page` one-based page index alias (used when `offset` is not provided)
- `pageSize` page size alias for `limit`

Example:

```bash
curl "http://localhost:3000/api/runs?model=gpt-5&preset=research_deep&fast=false"
```

Response envelope includes pagination metadata:

- `page`, `totalPages`
- `prevPage`, `nextPage`
- `offset`, `limit`, `hasMore`
- `total`, `filtered`, `items`

## `GET /api/runs/:id`

Returns a single run artifact or 404.

## `GET /api/runs/compare?left=:id&right=:id`

Returns left/right run snapshots and computed deltas:

- `stepCount`
- `confidence` deltas (`solver`, `revision`, `synthesizer`,
  `calibratedAdjusted`, stage deltas)
- `critique` deltas (`issueCount`, `maxSeverity`, `avgSeverity`)
- `quality` deltas (`coherence`, `completeness`, `factualRisk`,
  `uncertaintyHandling`)
- `research` deltas (`evidenceRiskLevel`, `counterfactualFailureModeCount`)

Example:

```bash
curl "http://localhost:3000/api/runs/compare?left=run_a&right=run_b"
```

Error responses:

- `400` when `left` or `right` is missing
- `404` when either run id does not exist

## `GET /api/benchmarks`

Returns benchmark artifact list with same filter params and pagination params as
`/api/runs`.

Example:

```bash
curl "http://localhost:3000/api/benchmarks?q=ai%20safety&from=2025-01-01T00:00:00.000Z"
```

Response envelope matches `/api/runs` pagination fields.

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

Error responses:

- `400` when `left` or `right` is missing
- `404` when either benchmark id does not exist

## `GET /api/benchmarks/:id`

Returns a single benchmark artifact or 404.

## `GET /api/benchmarks/:id/pairs`

Returns benchmark pairwise similarity payload:

```json
{
    "benchmarkId": "benchmark_...",
    "source": "chunk | artifact",
    "runIds": ["run_a", "run_b"],
    "pairs": [{ "i": 0, "j": 1, "similarity": 0.91 }]
}
```

Data source priority:

1. `analysis-benchmark-pairs.json` chunk file
2. `payload.summary.stability.pairs` in benchmark artifact
