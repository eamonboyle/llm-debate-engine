# Research Experiment Workflow

This is the recommended end-to-end loop for running and inspecting experiments.

## 1) Generate debate artifacts

Single run:

```bash
pnpm ask "Is AI an existential threat?" --preset research_deep
```

Benchmark:

```bash
pnpm benchmark "Is AI an existential threat?" --runs 7 --preset research_deep
```

## 2) Build analysis outputs

Core index:

```bash
pnpm analyze
```

Extended outputs:

```bash
pnpm analyze -- --csv --markdown --bundle
```

This writes:

- `analysis-index.json`
- `analysis-runs.csv`
- `analysis-benchmarks.csv`
- `analysis-report.md`
- `analysis-bundle.json`

## 3) Explore in the UI

```bash
pnpm web:dev
```

Then inspect:

- Overview dashboard for KPI and trend triage
- Outlier run table -> run trace page
- Benchmark detail heatmap and mode explorer
- Compare page for side-by-side benchmark deltas

## 4) Interpret and iterate

Suggested rhythm:

1. Start with overview anomalies (entropy spikes, outliers, correlation shifts)
2. Open related run traces to inspect agent-level behavior
3. Compare benchmark versions after prompt/model/preset changes
4. Document conclusions in `analysis-report.md` snapshots

## 5) Optional regression checks

Before shipping code changes:

```bash
pnpm test
pnpm typecheck
pnpm web:typecheck
pnpm web:build
```
