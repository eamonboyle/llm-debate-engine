# Contributing to LLM Debate Engine

Thanks for your interest in contributing! This document covers how to get set up and submit contributions.

## Development setup

1. **Clone and install**

    ```bash
    git clone https://github.com/eamonboyle/llm-debate-engine.git
    cd llm-debate-engine
    pnpm install
    ```

2. **Environment**

    ```bash
    cp .env.example .env
    # Set OPENAI_API_KEY in .env (required for ask/benchmark commands)
    ```

3. **Verify setup**

    ```bash
    pnpm typecheck
    pnpm test
    pnpm web:typecheck
    pnpm web:build
    ```

## Code style

- Use Prettier (config in `.prettierrc`). Run `pnpm exec prettier --write .` to format.
- TypeScript strict mode. Ensure `pnpm typecheck` passes.

## Submitting changes

1. **Fork** the repository and create a branch from `main`.
2. **Make your changes** with clear, focused commits.
3. **Run checks** before opening a PR:

    ```bash
    pnpm typecheck
    pnpm test
    pnpm web:typecheck
    pnpm web:build
    ```

4. **Open a pull request** against `main`. Use the PR template and describe your changes clearly.
5. **Address review feedback** if requested.

## Reporting issues

- **Bugs:** Use the [bug report template](https://github.com/eamonboyle/llm-debate-engine/issues/new?template=bug_report.md).
- **Features:** Use the [feature request template](https://github.com/eamonboyle/llm-debate-engine/issues/new?template=feature_request.md).

## Project structure

- `src/` — CLI engine, agents, pipelines, artifact handling
- `apps/web/` — Next.js research dashboard
- `docs/` — Architecture, API reference, workflows
- `runs/` — Artifact storage (gitignored in practice; analysis outputs may be committed)

For adding new agents or understanding the pipeline, see `docs/adding-agents.md`.
