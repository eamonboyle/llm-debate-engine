# LLM Debate Engine

A research and analysis tool for studying how LLMs reason and produce answers based on prompts and questions. By running multiple debate-style agents (Solver, Skeptic, Revision, Synthesizer) and repeating the same question across many runs, you can measure answer consistency, stability, and divergence—helping understand how models arrive at their conclusions.

## What It Does

The engine runs a **multi-agent debate pipeline** on a given question:

1. **Solver** — Produces an initial answer with key claims, assumptions, and confidence.

2. **Skeptic** — Critiques the proposal, identifying weaknesses and gaps.

3. **Solver Revision** — Revises the proposal in light of the critique.

4. **Synthesizer** — Produces a final synthesized answer from proposal, critique, and revision.

Each run is saved to `./runs/` as JSON. You can run a single question once (`ask`) or run multiple times (`benchmark`) to analyze how answers vary across runs.

## Benchmark Metrics

From the benchmark logs in `./runs/`, the tool computes:

| Metric | Description |
|--------|-------------|
| **consensus** | Mean/stddev of agreement strength between proposal and critique. |
| **critiqueMaxSeverity** | How harsh the skeptic was (1–5 scale). |
| **stability** | Pairwise cosine similarity of final answers across runs. Higher = more consistent answers. |
| **modeCount** | Number of distinct answer clusters (greedy clustering by embedding similarity). |
| **modeSizes** | Size of each cluster (e.g. `[6, 1]` = 6 answers in one cluster, 1 outlier). |
| **divergenceEntropy** | Entropy of the distribution across modes. Higher = more diverse answers. |
| **modeCountAt0.8 / 0.9 / 0.95** | Sensitivity to similarity threshold—how many modes at different thresholds. |

### Example from `./runs/`

Benchmark run on `"Is AI an existential threat?"`:

- **High consistency** (`modeCount=1`, `divergenceEntropy=0`): All 7 runs clustered together; answers were similar.
- **Moderate divergence** (`modeCount=2`, `modeSizes=[6,1]`): 6 runs clustered together, 1 outlier with a different framing.
- **High divergence** (`modeCount=6`, `modeSizes=[2,1,1,1,1,1]`): 6 distinct answer clusters; similar question but very different reasoning paths.

This helps distinguish:
- **Style/calibration** vs **substantive claims** — when `modeCountClaimCentroid` < `modeCount`, answers differ more in style than in underlying claims.
- **Stability** — how much the model’s answer changes when you re-run the same question.

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy env and fill in your API key
cp .env.example .env

# Set OPENAI_API_KEY (and optionally OPENAI_BASE_URL, OPENAI_MODEL)
```

### Single question (one run)

```bash
pnpm tsx src/cli.ts ask "Is AI an existential threat?"
```

Run saved to `./runs/run_<id>.json`.

### Benchmark (multiple runs)

```bash
pnpm tsx src/cli.ts benchmark "Is AI an existential threat?" --runs 7
```

Results saved to `./runs/benchmark_<id>.json` with full metrics and mode exemplars.

### Options

| Flag | Description |
|------|-------------|
| `--runs N` | Number of runs (default: 5). |
| `--concurrency N` | Max concurrent runs (default: 3). |
| `--model M` | Model name (override `OPENAI_MODEL`). |
| `--threshold T` | Clustering threshold 0–1 (default: 0.9). |
| `--fast` | Skip revision and synthesizer (~50% fewer LLM calls). |
| `--verbose` / `-v` | Verbose output. |

## Environment

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required. API key for LLM. |
| `OPENAI_BASE_URL` | Base URL (default: `https://api.openai.com/v1`). |
| `OPENAI_MODEL` | Model name (default: `gpt-5.2`). |

## Project Structure

```
src/
├── cli.ts              # CLI entry (ask, benchmark)
├── debate/
│   └── DebateEngine.ts # Orchestrates Solver → Skeptic → Revision → Synthesizer
├── agents/
│   ├── SolverAgent.ts
│   ├── SkepticAgent.ts
│   ├── SolverRevisionAgent.ts
│   └── SynthesizerAgent.ts
├── bench/
│   └── BenchmarkRunner.ts  # Runs N debates, computes metrics, clustering
├── llm/
│   └── OpenAiCompatibleClient.ts
├── embedding/
│   └── OpenAiEmbeddingClient.ts
├── core/
│   ├── metrics.ts
│   ├── math.ts
│   └── extraction.ts
└── types/
runs/                   # Run and benchmark JSON artifacts
```

## Research Use

This tool is designed for:

- **Answer consistency** — How often does the same model produce similar answers to the same question?
- **Reasoning divergence** — Do different runs lead to different reasoning paths or conclusions?
- **Prompt sensitivity** — How do changes in prompts or questions affect answer quality and stability?
- **Model comparison** — How do different models (e.g. via `--model`) compare on stability and consistency?

Use the benchmark JSON files in `./runs/` for further analysis, visualization, or integration with other research pipelines.

## License

ISC
