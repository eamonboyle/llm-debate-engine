# Architecture Decision Record (Research Platform Baseline)

Status: accepted  
Date: 2026-02-17

## Context

We needed to evolve a CLI-only debate engine into a research platform that supports:

- repeatable run artifacts
- deeper post-run analysis
- exploration UI with drilldown
- extensibility for additional research agents

Without an explicit architecture decision, feature work risked creating schema churn and UI/data coupling.

## Decision

## 1) Repository layout

- Keep debate engine and CLI at repository root.
- Add web UI as separate workspace app under `apps/web`.
- Use pnpm workspace for shared dependency management.

## 2) Artifact contract

- Use versioned artifact model (`schemaVersion: 1`) for run and benchmark artifacts.
- Include metadata required for longitudinal analysis:
    - model
    - fast mode
    - pipeline preset
    - pipeline version
    - createdAt
- Maintain compatibility with legacy artifact format via loader migration.

## 3) Analysis flow

- Keep artifacts file-based in `runs/` for transparency and portability.
- Generate derived analytics index (`analysis-index.json`) from artifacts.
- Support optional CSV exports for external analysis workflows.

## 4) Agent architecture

- Extend orchestration with preset-driven multi-agent execution.
- Support research presets in addition to standard baseline:
    - `standard`
    - `research_deep`
    - `fast_research`
- New agent outputs are persisted in run steps for downstream analytics.

## 5) UI data strategy

- UI reads local artifact/index files directly on the server.
- No DB dependency for baseline.
- Add query-param filtering and drilldown pages to support iterative research triage.

## Consequences

### Positive

- Fast iteration loop (run -> analyze -> inspect) with minimal infra.
- Strong backward compatibility for older artifacts.
- Extensible to richer analysis without reworking storage model.

### Trade-offs

- File-based reads are eventually less scalable than DB-backed querying.
- Type duplication between engine and web can drift if not maintained.
- Large artifact sets may require future indexing/partitioning optimization.

## Follow-ups

- Add optional SQLite backend for larger datasets (future).
- Consider generated shared type package for web + engine consumption.
- Add date-range filtering and preset trend charts in UI.
