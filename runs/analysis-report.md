# Analysis Report

Generated: 2026-02-17T15:51:24.322Z

## Filter context

- questionContains: (none)
- modelContains: (none)
- presetEquals: (none)
- fastMode: (none)
- createdAfter: (none)
- createdBefore: (none)

## Totals

- Runs: 16
- Benchmarks: 6
- Skipped files: 0

## Confidence drift

- Solver -> Revision mean delta: -0.238
- Revision -> Synthesizer mean delta: 0.288
- Calibrated - Synthesizer mean delta: 0
- Evidence planner risk mean: 3.688
- Severity vs Solver -> Revision correlation: 0.342
- Severity vs Revision -> Synthesizer correlation: 0.236

## Top issue types

- missing: 132
- ambiguity: 62
- factual: 42
- overconfidence: 25
- logic: 24

## Most divergent benchmarks (by entropy)

- benchmark_1771322068310_3aa3bf8e08c788: entropy=2.321928094887362, modes=5, runs=5
- benchmark_1771341288792_0922b306e9b72: entropy=2.321928094887362, modes=5, runs=5
- benchmark_1771342676099_703f78c9eaf418: entropy=2.321928094887362, modes=5, runs=5
- benchmark_1771339872755_5450882533c458: entropy=1.9219280948873623, modes=4, runs=5
- benchmark_1771340556245_a400d11985986: entropy=1.9219280948873623, modes=4, runs=5

## Outlier runs (lowest average similarity)

- run_1771341109637_c59eba19fe3388 (benchmark benchmark_1771341288792_0922b306e9b72): avgSimilarity=0.695, zScore=-1.21
- run_1771342478982_595a4ece0e5858 (benchmark benchmark_1771342676099_703f78c9eaf418): avgSimilarity=0.75, zScore=-1.402
- run_1771340320577_2dbd209ed89498 (benchmark benchmark_1771340556245_a400d11985986): avgSimilarity=0.755, zScore=-1.512
- run_1771321850044_96309600733f5 (benchmark benchmark_1771322068310_3aa3bf8e08c788): avgSimilarity=0.811, zScore=-1.134
- run_1771339870601_367300aa6ecc7 (benchmark benchmark_1771339872755_5450882533c458): avgSimilarity=0.829, zScore=-1.542

## Top counterfactual failure modes

- Misinterpretation of existential risk as a binary or imminent threat, leading to either paralysis or alarmism without acknowledging uncertainties and timelines.: 1
- Overreliance on governance and international cooperation to mitigate risk, underestimating incentives for a race-to-deploy and enforcement challenges across jurisdictions.: 1
- Neglect of inner alignment, mesa-optimizer risks, and unanticipated objective optimizations that can derail intended behavior even with good outer alignment.: 1
- Underestimation of non-AGI or non-hierarchical risks (data poisoning, prompt injections, cybersecurity failures) as existential rather than systemic or near-term.: 1
- Inappropriate probabilistic framing (fixed-point probabilities or timelines) due to deep uncertainty, leading to misinformed policy or resource allocation.: 1
