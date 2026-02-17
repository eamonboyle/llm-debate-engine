# Chart Interpretation Guide

This document explains how to read the current research dashboard.

## Overview page

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

## 4) Outlier runs table

Derived from benchmark pairwise similarity matrices.

- `avgSimilarity`: mean similarity of a run to all peer runs in benchmark
- `zScore`: standardized value relative to same-benchmark averages

More negative z-score means stronger outlier behavior.

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

## 4) Mode explorer table

- Presents each mode exemplar and inferred label.
- Useful for qualitatively naming divergence patterns.

## Compare page

Compare two benchmark artifacts quickly:

- mode count delta
- entropy delta
- stability mean delta

Use compare view before drilling into raw run traces.

## Practical workflow

1. Start at overview for broad anomalies.
2. Open outlier runs to inspect trace-level causality.
3. Use benchmark detail heatmap + mode explorer to classify divergence.
4. Use compare page to validate whether changes improved stability/diversity as expected.
