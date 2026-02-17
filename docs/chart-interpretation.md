# Chart Interpretation Guide

This document explains how to read the current research dashboard.

## Overview page

If the index was generated with CLI filters, the overview now includes an
**Analysis filter context** table. Treat all aggregate metrics and trends on that
page as applying only to that filtered subset.

## Preset usage + benchmark trend charts

- **Preset usage distribution** shows relative usage of `standard`, `research_deep`, and `fast_research`.
- **Benchmark entropy & stability trend** shows how diversity and consistency evolve over benchmark runs over time.

Interpretation:

- Rising entropy with falling stability can indicate drift or broader reasoning spread.
- Stable entropy with rising stability can indicate robust convergence under consistent prompts/settings.

## 1) Critique issue types (bar chart)

- Shows count of critique issues by type.
- High `missing` often indicates weak coverage.
- High `overconfidence` often tracks inflated confidence fields.

## 2) Severity vs confidence delta (scatter)

- X-axis: critique max severity
- Y-axis: solver->revision confidence delta

Interpretation:

- Lower points at high severity = model is calibrating downward.
- Flat/non-negative slope may indicate weak self-correction behavior.

## 3) Severity-confidence correlation cards

- `corr(severity, solver->revision Δ)`
- `corr(severity, revision->synth Δ)`

Interpretation:

- Strong negative first correlation: harsher critique drives stronger confidence reductions.
- Near-zero correlation: critique severity and confidence adjustments are weakly coupled.
- Positive correlation can indicate overconfident or unstable calibration behavior (context-dependent).

## 3b) Evidence planner risk mean

- `evidencePlanning.riskLevelMean` is the average EvidencePlanner risk score
  (1=low risk, 5=high risk) across included runs.
- Higher values suggest question sets or prompt setups are pushing the system
  into higher-uncertainty / higher-stakes reasoning terrain.
- The **Evidence planner risk distribution** bar chart shows score frequency.
  A right-skewed distribution (more 4/5 scores) indicates consistently
  high-risk planning conditions across runs.
- The **Evidence risk trend by run time** line chart highlights temporal drift in
  planning risk. Sustained upward movement can indicate progressively harder or
  less-grounded question cohorts over time.

## 4) Outlier runs table

Derived from benchmark pairwise similarity matrices.

- `avgSimilarity`: mean similarity of a run to all peer runs in benchmark
- `zScore`: standardized value relative to same-benchmark averages

More negative z-score means stronger outlier behavior.

## 5) Top counterfactual failure modes

- Aggregates the most frequent failure modes emitted by CounterfactualAgent.
- High counts for a specific mode suggest a recurring fragility pattern that should
  be prioritized for mitigation experiments.

## Benchmark detail page

## 1) Mode size distribution

- Number of runs in each discovered mode.
- Highly skewed distribution (`[n-1, 1]`) indicates a single outlier.

## 2) Threshold sensitivity

- Shows mode count at thresholds 0.8 / 0.9 / 0.95.
- Large increase as threshold tightens implies nuanced variation.

## 3) Pairwise similarity heatmap

- Darker red cells indicate low similarity pairs.
- Green blocks indicate internally consistent sub-clusters.
- Heatmap source badge indicates whether pair data came from artifact payload or chunk API.

## 4) Mode explorer table

- Presents each mode exemplar and inferred label.
- Useful for qualitatively naming divergence patterns.

## Benchmark compare page

Compare two benchmark artifacts quickly:

- mode count delta
- entropy delta
- stability mean delta
- side-by-side bar chart for these key metrics

Use compare view before drilling into raw run traces.

## Run compare page

Use `/runs/compare` when you want trace-level metric deltas between two specific runs:

- step count delta (pipeline depth / additional critique passes)
- confidence deltas (solver/synthesizer)
- critique pressure deltas (issue count + severity)
- quality rubric deltas (coherence/completeness/factual risk)
- evidence risk deltas (EvidencePlanner risk level)
- counterfactual mode-count deltas + top mode snapshots

If a metric is absent in either run, the delta chart omits that metric rather than
treating missing values as zero.

## Practical workflow

1. Start at overview for broad anomalies.
2. Open outlier runs to inspect trace-level causality.
3. Use benchmark detail heatmap + mode explorer to classify divergence.
4. Use compare page to validate whether changes improved stability/diversity as expected.
