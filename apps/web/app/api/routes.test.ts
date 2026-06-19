import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { GET as getStatus } from "./status/route";
import { GET as getAnalysis } from "./analysis/route";
import { GET as getAnalysisBundle } from "./analysis/bundle/route";
import { GET as getAnalysisReport } from "./analysis/report/route";
import { GET as getAnalysisCsv } from "./analysis/csv/[kind]/route";
import { GET as getAnalysisPairs } from "./analysis/pairs/route";
import { GET as getActivity } from "./activity/route";
import { GET as getBenchmarks } from "./benchmarks/route";
import { GET as getBenchmarksCompare } from "./benchmarks/compare/route";
import { GET as getRunById } from "./runs/[id]/route";
import { GET as getRunsCompare } from "./runs/compare/route";
import { GET as getRuns } from "./runs/route";
import { GET as getBenchmarkById } from "./benchmarks/[id]/route";
import { GET as getBenchmarkPairsById } from "./benchmarks/[id]/pairs/route";
import { GET as getSearch } from "./search/route";
import { GET as getLeaderboard } from "./leaderboard/route";
import { GET as getLeaderboardCompare } from "./leaderboard/compare/route";
import { GET as getPresets } from "./presets/route";
import { GET as getPresetsCompare } from "./presets/compare/route";
import { GET as getQuality } from "./quality/route";
import { GET as getAgents } from "./agents/route";
import { GET as getTiming } from "./timing/route";
import { GET as getDrift } from "./drift/route";
import { GET as getIssues } from "./issues/route";
import { GET as getCounterfactual } from "./counterfactual/route";
import { GET as getEvidence } from "./evidence/route";
import { GET as getOutliers } from "./outliers/route";
import { GET as getCatalog } from "./catalog/route";
import { POST as postAnalysisRebuild } from "./analysis/rebuild/route";
import { GET as getQuestions } from "./questions/route";

const tempDirs: string[] = [];
const originalRunsDir = process.env.RUNS_DIR;
const originalRebuildEnabled = process.env.ANALYSIS_REBUILD_ENABLED;

async function makeTempDir() {
    const dir = await mkdtemp(join(tmpdir(), "api-route-test-"));
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    process.env.RUNS_DIR = originalRunsDir;
    process.env.ANALYSIS_REBUILD_ENABLED = originalRebuildEnabled;
    await Promise.all(
        tempDirs
            .splice(0)
            .map((dir) => rm(dir, { recursive: true, force: true })),
    );
});

describe("web api routes", () => {
    it("returns data status payload", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_1.json"),
            JSON.stringify({
                kind: "run",
                id: "run_1",
                question: "Q",
                metadata: {
                    createdAt: new Date().toISOString(),
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_1", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );

        const response = await getStatus();
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            artifactCounts: { runs: number };
            readiness: { artifacts: boolean };
        };
        expect(json.artifactCounts.runs).toBe(1);
        expect(json.readiness.artifacts).toBe(true);
    });

    it("returns 404 when analysis index is missing", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        const response = await getAnalysis();
        expect(response.status).toBe(404);
    });

    it("returns analysis index payload", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 0, benchmarks: 0, skippedFiles: 0 },
                runs: [],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    confidenceCorrelation: {
                        severityVsSolverToRevisionDelta: 0,
                        severityVsRevisionToSynthesizerDelta: 0,
                    },
                    outlierRuns: [],
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const response = await getAnalysis();
        expect(response.status).toBe(200);
        const json = (await response.json()) as { totals: { runs: number } };
        expect(json.totals.runs).toBe(0);
    });

    it("returns 404 when analysis bundle is missing", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        const response = await getAnalysisBundle();
        expect(response.status).toBe(404);
    });

    it("returns analysis bundle payload and supports download", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        const bundle = {
            index: {
                generatedAt: new Date().toISOString(),
                totals: { runs: 1, benchmarks: 0, skippedFiles: 0 },
                runs: [],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            },
            runs: [],
        };
        await writeFile(
            join(dir, "analysis-bundle.json"),
            JSON.stringify(bundle),
            "utf-8",
        );

        const jsonResponse = await getAnalysisBundle();
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            index: { totals: { runs: number } };
        };
        expect(json.index.totals.runs).toBe(1);

        const downloadResponse = await getAnalysisBundle(
            new Request("http://localhost/api/analysis/bundle?download=1"),
        );
        expect(downloadResponse.status).toBe(200);
        expect(downloadResponse.headers.get("Content-Disposition")).toContain(
            "analysis-bundle.json",
        );
    });

    it("returns analysis report markdown or json", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-report.md"),
            "# Summary\n\nHello",
            "utf-8",
        );

        const markdownResponse = await getAnalysisReport(
            new Request("http://localhost/api/analysis/report"),
        );
        expect(markdownResponse.status).toBe(200);
        expect(markdownResponse.headers.get("content-type")).toContain(
            "text/markdown",
        );
        expect(await markdownResponse.text()).toContain("# Summary");

        const jsonResponse = await getAnalysisReport(
            new Request("http://localhost/api/analysis/report?format=json"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as { markdown: string };
        expect(json.markdown).toContain("Hello");
    });

    it("returns 404 when analysis report is missing", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        const response = await getAnalysisReport(
            new Request("http://localhost/api/analysis/report"),
        );
        expect(response.status).toBe(404);
    });

    it("returns global search results", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_1.json"),
            JSON.stringify({
                kind: "run",
                id: "run_1",
                question: "Climate policy tradeoffs",
                metadata: {
                    createdAt: new Date().toISOString(),
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: {
                    id: "run_1",
                    finalAnswer: "Balanced growth",
                    steps: [],
                    metrics: {},
                },
            }),
            "utf-8",
        );

        const response = await getSearch(
            new Request("http://localhost/api/search?q=climate&limit=5"),
        );
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            query: string;
            totals: { runs: number };
            runs: Array<{ id: string }>;
            storeTotals: { runs: number };
        };
        expect(json.query).toBe("climate");
        expect(json.totals.runs).toBe(1);
        expect(json.runs[0].id).toBe("run_1");
        expect(json.storeTotals.runs).toBe(1);
    });

    it("filters global search results by model and preset", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_match.json"),
            JSON.stringify({
                kind: "run",
                id: "run_match",
                question: "Climate policy tradeoffs",
                metadata: {
                    createdAt: new Date().toISOString(),
                    model: "gpt-alpha",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: {
                    id: "run_match",
                    finalAnswer: "Balanced growth",
                    steps: [],
                    metrics: {},
                },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_other.json"),
            JSON.stringify({
                kind: "run",
                id: "run_other",
                question: "Climate policy tradeoffs",
                metadata: {
                    createdAt: new Date().toISOString(),
                    model: "gpt-beta",
                    pipelinePreset: "research_deep",
                    fastMode: true,
                },
                run: {
                    id: "run_other",
                    finalAnswer: "Other answer",
                    steps: [],
                    metrics: {},
                },
            }),
            "utf-8",
        );

        const response = await getSearch(
            new Request(
                "http://localhost/api/search?q=climate&model=gpt-alpha&preset=standard&fast=false",
            ),
        );
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            totals: { runs: number };
            runs: Array<{ id: string }>;
            filters: { model?: string; preset?: string; fast?: string };
        };
        expect(json.totals.runs).toBe(1);
        expect(json.runs[0].id).toBe("run_match");
        expect(json.filters.model).toBe("gpt-alpha");
        expect(json.filters.preset).toBe("standard");
        expect(json.filters.fast).toBe("false");
    });

    it("returns search results as CSV", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_1.json"),
            JSON.stringify({
                kind: "run",
                id: "run_1",
                question: "Climate policy",
                metadata: {
                    createdAt: new Date().toISOString(),
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: {
                    id: "run_1",
                    finalAnswer: "Answer",
                    steps: [],
                    metrics: {},
                },
            }),
            "utf-8",
        );

        const response = await getSearch(
            new Request("http://localhost/api/search?q=climate&format=csv"),
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toContain("text/csv");
        expect(await response.text()).toContain("run_1");
    });

    it("returns model leaderboard JSON and CSV from analysis index", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 1, benchmarks: 0, skippedFiles: 0 },
                runs: [
                    {
                        id: "run_1",
                        question: "Q",
                        createdAt: "2026-01-01T00:00:00.000Z",
                        model: "gpt-alpha",
                        pipelinePreset: "standard",
                        fastMode: false,
                        finalAnswerPreview: "A",
                        confidence: {
                            solver: 0.8,
                            solverToRevisionDelta: -0.1,
                        },
                        critique: { issueCount: 2, maxSeverity: 4 },
                    },
                ],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const jsonResponse = await getLeaderboard(
            new Request("http://localhost/api/leaderboard"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            rows: Array<{ model: string }>;
        };
        expect(json.rows[0].model).toBe("gpt-alpha");

        const csvResponse = await getLeaderboard(
            new Request("http://localhost/api/leaderboard?format=csv"),
        );
        expect(csvResponse.status).toBe(200);
        expect(csvResponse.headers.get("Content-Type")).toContain("text/csv");
        expect(await csvResponse.text()).toContain("gpt-alpha");
    });

    it("returns preset leaderboard JSON and CSV from analysis index", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 1, benchmarks: 0, skippedFiles: 0 },
                runs: [
                    {
                        id: "run_1",
                        question: "Q",
                        createdAt: "2026-01-01T00:00:00.000Z",
                        model: "gpt-alpha",
                        pipelinePreset: "research_deep",
                        fastMode: false,
                        finalAnswerPreview: "A",
                        confidence: {
                            solver: 0.8,
                            solverToRevisionDelta: -0.1,
                        },
                        critique: { issueCount: 2, maxSeverity: 4 },
                        quality: {
                            coherence: 4.5,
                            completeness: 4.0,
                            factualRisk: 2.0,
                            uncertaintyHandling: 3.5,
                        },
                    },
                ],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const jsonResponse = await getPresets(
            new Request("http://localhost/api/presets"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            rows: Array<{ preset: string }>;
        };
        expect(json.rows[0].preset).toBe("research_deep");

        const csvResponse = await getPresets(
            new Request("http://localhost/api/presets?format=csv"),
        );
        expect(csvResponse.status).toBe(200);
        expect(csvResponse.headers.get("Content-Type")).toContain("text/csv");
        expect(await csvResponse.text()).toContain("research_deep");
    });

    it("returns quality insights JSON and CSV from analysis index", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 1, benchmarks: 0, skippedFiles: 0 },
                runs: [
                    {
                        id: "run_1",
                        question: "Q",
                        createdAt: "2026-01-01T00:00:00.000Z",
                        model: "gpt-alpha",
                        pipelinePreset: "research_deep",
                        fastMode: false,
                        finalAnswerPreview: "A",
                        confidence: {
                            solver: 0.8,
                            solverToRevisionDelta: -0.1,
                        },
                        critique: { issueCount: 2, maxSeverity: 4 },
                        quality: {
                            coherence: 4.5,
                            completeness: 4.0,
                            factualRisk: 2.0,
                            uncertaintyHandling: 3.5,
                        },
                    },
                ],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const jsonResponse = await getQuality(
            new Request("http://localhost/api/quality"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            rows: Array<{ id: string; coherence: number | null }>;
            summary: { withQualityScores: number };
        };
        expect(json.rows[0].id).toBe("run_1");
        expect(json.rows[0].coherence).toBe(4.5);
        expect(json.summary.withQualityScores).toBe(1);

        const csvResponse = await getQuality(
            new Request("http://localhost/api/quality?format=csv"),
        );
        expect(csvResponse.status).toBe(200);
        expect(csvResponse.headers.get("Content-Type")).toContain("text/csv");
        expect(await csvResponse.text()).toContain("run_1");
    });

    it("returns agent stats JSON and CSV from run artifacts", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_1.json"),
            JSON.stringify({
                kind: "run",
                id: "run_1",
                question: "Q",
                metadata: {
                    createdAt: "2026-01-01T00:00:00.000Z",
                    model: "gpt-alpha",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: {
                    id: "run_1",
                    finalAnswer: "A",
                    steps: [
                        {
                            agentName: "SolverAgent",
                            role: "solver",
                            createdAt: "2026-01-01T00:00:00.000Z",
                            completedAt: "2026-01-01T00:00:01.000Z",
                        },
                    ],
                    metrics: {},
                },
            }),
            "utf-8",
        );

        const jsonResponse = await getAgents(
            new Request("http://localhost/api/agents"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            rows: Array<{ agentName: string; stepCount: number }>;
        };
        expect(json.rows[0].agentName).toBe("SolverAgent");
        expect(json.rows[0].stepCount).toBe(1);

        const csvResponse = await getAgents(
            new Request("http://localhost/api/agents?format=csv"),
        );
        expect(csvResponse.status).toBe(200);
        expect(csvResponse.headers.get("Content-Type")).toContain("text/csv");
        expect(await csvResponse.text()).toContain("SolverAgent");

        const timingResponse = await getTiming(
            new Request("http://localhost/api/timing"),
        );
        expect(timingResponse.status).toBe(200);
        const timingJson = (await timingResponse.json()) as {
            rows: Array<{ agentName: string; sampleCount: number }>;
        };
        expect(timingJson.rows[0].agentName).toBe("SolverAgent");
        expect(timingJson.rows[0].sampleCount).toBe(1);
    });

    it("returns confidence drift JSON and CSV from analysis index", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 1, benchmarks: 0, skippedFiles: 0 },
                runs: [
                    {
                        id: "run_1",
                        question: "Q",
                        createdAt: "2026-01-01T00:00:00.000Z",
                        model: "gpt-alpha",
                        pipelinePreset: "research_deep",
                        fastMode: false,
                        finalAnswerPreview: "A",
                        confidence: {
                            solver: 0.8,
                            solverToRevisionDelta: -0.15,
                            revisionToSynthesizerDelta: 0.05,
                        },
                        critique: { issueCount: 2, maxSeverity: 4 },
                    },
                ],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: -0.15,
                        revisionToSynthesizerMean: 0.05,
                        calibratedMinusSynthMean: 0,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const jsonResponse = await getDrift(
            new Request("http://localhost/api/drift"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            rows: Array<{ runId: string; driftMagnitude: number | null }>;
        };
        expect(json.rows[0].runId).toBe("run_1");
        expect(json.rows[0].driftMagnitude).toBeCloseTo(0.2, 3);

        const csvResponse = await getDrift(
            new Request("http://localhost/api/drift?format=csv"),
        );
        expect(csvResponse.status).toBe(200);
        expect(await csvResponse.text()).toContain("run_1");
    });

    it("returns critique issues JSON and CSV from analysis index", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 1, benchmarks: 0, skippedFiles: 0 },
                runs: [
                    {
                        id: "run_1",
                        question: "Q",
                        createdAt: "2026-01-01T00:00:00.000Z",
                        model: "gpt-alpha",
                        pipelinePreset: "research_deep",
                        fastMode: false,
                        finalAnswerPreview: "A",
                        confidence: { solver: 0.8 },
                        critique: {
                            issueCount: 2,
                            maxSeverity: 4,
                            byType: { unsupported_claim: 2 },
                        },
                    },
                ],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: { unsupported_claim: 2 },
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const jsonResponse = await getIssues(
            new Request("http://localhost/api/issues?type=unsupported_claim"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            summaries: Array<{ type: string; totalCount: number }>;
            selectedRuns: Array<{ runId: string; countForType: number }>;
        };
        expect(json.summaries[0].type).toBe("unsupported_claim");
        expect(json.selectedRuns[0].runId).toBe("run_1");
        expect(json.selectedRuns[0].countForType).toBe(2);

        const csvResponse = await getIssues(
            new Request(
                "http://localhost/api/issues?type=unsupported_claim&format=csv",
            ),
        );
        expect(csvResponse.status).toBe(200);
        expect(await csvResponse.text()).toContain("unsupported_claim");
    });

    it("returns outlier runs JSON and CSV from analysis index", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 1, benchmarks: 1, skippedFiles: 0 },
                runs: [
                    {
                        id: "run_1",
                        question: "Q",
                        createdAt: "2026-01-01T00:00:00.000Z",
                        model: "gpt-alpha",
                        pipelinePreset: "standard",
                        fastMode: false,
                        finalAnswerPreview: "A",
                    },
                ],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                    outlierRuns: [
                        {
                            benchmarkId: "bench_1",
                            runId: "run_1",
                            avgSimilarity: 0.35,
                            zScore: -2.1,
                        },
                    ],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const jsonResponse = await getOutliers(
            new Request("http://localhost/api/outliers"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            rows: Array<{ runId: string; avgSimilarity: number }>;
        };
        expect(json.rows[0].runId).toBe("run_1");
        expect(json.rows[0].avgSimilarity).toBe(0.35);

        const csvResponse = await getOutliers(
            new Request("http://localhost/api/outliers?format=csv"),
        );
        expect(csvResponse.status).toBe(200);
        expect(await csvResponse.text()).toContain("run_1");
    });

    it("returns evidence planning JSON and CSV from analysis index", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 1, benchmarks: 0, skippedFiles: 0 },
                runs: [
                    {
                        id: "run_1",
                        question: "Q",
                        createdAt: "2026-01-01T00:00:00.000Z",
                        model: "gpt-alpha",
                        pipelinePreset: "research_deep",
                        fastMode: false,
                        finalAnswerPreview: "A",
                        research: { evidenceRiskLevel: 4 },
                    },
                ],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    evidencePlanning: {
                        riskLevelMean: 4,
                        riskLevelDistribution: { "4": 1 },
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const jsonResponse = await getEvidence(
            new Request("http://localhost/api/evidence?level=4"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            selectedLevel: number;
            selectedRuns: Array<{ runId: string }>;
        };
        expect(json.selectedLevel).toBe(4);
        expect(json.selectedRuns[0].runId).toBe("run_1");

        const csvResponse = await getEvidence(
            new Request("http://localhost/api/evidence?level=4&format=csv"),
        );
        expect(csvResponse.status).toBe(200);
        expect(await csvResponse.text()).toContain("run_1");
    });

    it("returns counterfactual modes JSON and CSV from analysis index", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 1, benchmarks: 0, skippedFiles: 0 },
                runs: [
                    {
                        id: "run_1",
                        question: "Q",
                        createdAt: "2026-01-01T00:00:00.000Z",
                        model: "gpt-alpha",
                        pipelinePreset: "research_deep",
                        fastMode: false,
                        finalAnswerPreview: "A",
                        research: {
                            topCounterfactualFailureMode: "missing evidence",
                            counterfactualFailureModeCount: 2,
                        },
                    },
                ],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    counterfactualFailureModeCounts: {
                        "missing evidence": 1,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const jsonResponse = await getCounterfactual(
            new Request(
                "http://localhost/api/counterfactual?mode=missing%20evidence",
            ),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            selectedMode: string;
            selectedRuns: Array<{ runId: string }>;
        };
        expect(json.selectedMode).toBe("missing evidence");
        expect(json.selectedRuns[0].runId).toBe("run_1");

        const csvResponse = await getCounterfactual(
            new Request(
                "http://localhost/api/counterfactual?mode=missing%20evidence&format=csv",
            ),
        );
        expect(csvResponse.status).toBe(200);
        expect(await csvResponse.text()).toContain("missing evidence");
    });

    it("returns model compare deltas from analysis index", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 2, benchmarks: 0, skippedFiles: 0 },
                runs: [
                    {
                        id: "run_1",
                        question: "Q",
                        createdAt: "2026-01-01T00:00:00.000Z",
                        model: "gpt-alpha",
                        pipelinePreset: "standard",
                        fastMode: false,
                        finalAnswerPreview: "A",
                        confidence: {
                            solver: 0.8,
                            solverToRevisionDelta: -0.1,
                        },
                        critique: { issueCount: 2, maxSeverity: 4 },
                    },
                    {
                        id: "run_2",
                        question: "Q",
                        createdAt: "2026-01-02T00:00:00.000Z",
                        model: "gpt-beta",
                        pipelinePreset: "standard",
                        fastMode: false,
                        finalAnswerPreview: "B",
                        confidence: {
                            solver: 0.6,
                            solverToRevisionDelta: 0.05,
                        },
                        critique: { issueCount: 4, maxSeverity: 5 },
                    },
                ],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const response = await getLeaderboardCompare(
            new Request(
                "http://localhost/api/leaderboard/compare?left=gpt-alpha&right=gpt-beta",
            ),
        );
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            left: { model: string };
            right: { model: string };
            delta: { runCount: number; avgIssueCount: number | null };
        };
        expect(json.left.model).toBe("gpt-alpha");
        expect(json.right.model).toBe("gpt-beta");
        expect(json.delta.runCount).toBe(0);
        expect(json.delta.avgIssueCount).toBe(2);
    });

    it("returns preset compare deltas from analysis index", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 2, benchmarks: 0, skippedFiles: 0 },
                runs: [
                    {
                        id: "run_1",
                        question: "Q",
                        createdAt: "2026-01-01T00:00:00.000Z",
                        model: "gpt-alpha",
                        pipelinePreset: "standard",
                        fastMode: false,
                        finalAnswerPreview: "A",
                        confidence: {
                            solver: 0.8,
                            solverToRevisionDelta: -0.1,
                        },
                        critique: { issueCount: 2, maxSeverity: 4 },
                        quality: { coherence: 3.5 },
                    },
                    {
                        id: "run_2",
                        question: "Q",
                        createdAt: "2026-01-02T00:00:00.000Z",
                        model: "gpt-alpha",
                        pipelinePreset: "research_deep",
                        fastMode: false,
                        finalAnswerPreview: "B",
                        confidence: {
                            solver: 0.6,
                            solverToRevisionDelta: 0.05,
                        },
                        critique: { issueCount: 4, maxSeverity: 5 },
                        quality: { coherence: 4.5 },
                    },
                ],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const response = await getPresetsCompare(
            new Request(
                "http://localhost/api/presets/compare?left=standard&right=research_deep",
            ),
        );
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            left: { preset: string };
            right: { preset: string };
            delta: {
                avgIssueCount: number | null;
                avgCoherence: number | null;
            };
        };
        expect(json.left.preset).toBe("standard");
        expect(json.right.preset).toBe("research_deep");
        expect(json.delta.avgIssueCount).toBe(2);
        expect(json.delta.avgCoherence).toBe(1);
    });

    it("returns 400/404 for invalid model and preset compare requests", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;

        const missingModelParams = await getLeaderboardCompare(
            new Request("http://localhost/api/leaderboard/compare"),
        );
        expect(missingModelParams.status).toBe(400);

        const missingPresetParams = await getPresetsCompare(
            new Request("http://localhost/api/presets/compare"),
        );
        expect(missingPresetParams.status).toBe(400);

        await writeFile(
            join(dir, "analysis-index.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                totals: { runs: 0, benchmarks: 0, skippedFiles: 0 },
                runs: [],
                benchmarks: [],
                aggregates: {
                    issueTypeCounts: {},
                    confidenceDrift: {
                        solverToRevisionMean: 0,
                        revisionToSynthesizerMean: 0,
                        calibratedMinusSynthMean: 0,
                    },
                    presets: {},
                    critiqueVsConfidence: [],
                },
                skipped: [],
            }),
            "utf-8",
        );

        const notFoundModel = await getLeaderboardCompare(
            new Request(
                "http://localhost/api/leaderboard/compare?left=a&right=b",
            ),
        );
        expect(notFoundModel.status).toBe(404);

        const notFoundPreset = await getPresetsCompare(
            new Request("http://localhost/api/presets/compare?left=a&right=b"),
        );
        expect(notFoundPreset.status).toBe(404);
    });

    it("returns analysis CSV exports", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-runs.csv"),
            "id,question\nrun_1,Q\n",
            "utf-8",
        );

        const response = await getAnalysisCsv(new Request("http://x"), {
            params: Promise.resolve({ kind: "runs" }),
        });
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/csv");
        expect(await response.text()).toContain("run_1");

        const badKind = await getAnalysisCsv(new Request("http://x"), {
            params: Promise.resolve({ kind: "invalid" }),
        });
        expect(badKind.status).toBe(400);
    });

    it("returns run and benchmark resources by id", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_1.json"),
            JSON.stringify({
                kind: "run",
                id: "run_1",
                question: "Q",
                metadata: {
                    createdAt: new Date().toISOString(),
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_1", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_1.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_1",
                question: "Q",
                metadata: {
                    createdAt: new Date().toISOString(),
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 1,
                    modeCount: 1,
                    modeSizes: [1],
                    divergenceEntropy: 0,
                    summary: { stability: { pairwiseMean: 1, pairs: [] } },
                },
            }),
            "utf-8",
        );

        const runResponse = await getRunById(new Request("http://localhost"), {
            params: Promise.resolve({ id: "run_1" }),
        });
        expect(runResponse.status).toBe(200);
        const runJson = (await runResponse.json()) as { id: string };
        expect(runJson.id).toBe("run_1");

        const benchmarkResponse = await getBenchmarkById(
            new Request("http://localhost"),
            {
                params: Promise.resolve({ id: "benchmark_1" }),
            },
        );
        expect(benchmarkResponse.status).toBe(200);
        const benchmarkJson = (await benchmarkResponse.json()) as {
            id: string;
        };
        expect(benchmarkJson.id).toBe("benchmark_1");
    });

    it("returns benchmark pairwise data from chunk file", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-benchmark-pairs.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                pairwise: [
                    {
                        benchmarkId: "benchmark_2",
                        runIds: ["r1", "r2"],
                        pairs: [{ i: 0, j: 1, similarity: 0.88 }],
                    },
                ],
            }),
            "utf-8",
        );

        const response = await getBenchmarkPairsById(
            new Request("http://localhost"),
            {
                params: Promise.resolve({ id: "benchmark_2" }),
            },
        );
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            benchmarkId: string;
            source: string;
            runIds: string[];
            pairs: Array<{ similarity: number }>;
        };
        expect(json.benchmarkId).toBe("benchmark_2");
        expect(json.source).toBe("chunk");
        expect(json.runIds).toEqual(["r1", "r2"]);
        expect(json.pairs[0].similarity).toBe(0.88);
    });

    it("filters run and benchmark list endpoints by query params", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "Alpha question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt-alpha",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_b.json"),
            JSON.stringify({
                kind: "run",
                id: "run_b",
                question: "Beta question",
                metadata: {
                    createdAt: "2025-02-01T00:00:00.000Z",
                    model: "gpt-beta",
                    pipelinePreset: "research_deep",
                    fastMode: true,
                },
                run: { id: "run_b", finalAnswer: "B", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_a.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_a",
                question: "Alpha question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt-alpha",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 1,
                    modeCount: 1,
                    modeSizes: [1],
                    divergenceEntropy: 0,
                    summary: { stability: { pairwiseMean: 1, pairs: [] } },
                },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_b.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_b",
                question: "Beta benchmark",
                metadata: {
                    createdAt: "2025-02-01T00:00:00.000Z",
                    model: "gpt-beta",
                    pipelinePreset: "research_deep",
                    fastMode: true,
                },
                payload: {
                    runs: 1,
                    modeCount: 1,
                    modeSizes: [1],
                    divergenceEntropy: 0,
                    summary: { stability: { pairwiseMean: 1, pairs: [] } },
                },
            }),
            "utf-8",
        );

        const runResponse = await getRuns(
            new Request("http://localhost/api/runs?model=beta&fast=true"),
        );
        expect(runResponse.status).toBe(200);
        const runJson = (await runResponse.json()) as {
            filtered: number;
            items: Array<{ id: string }>;
        };
        expect(runJson.filtered).toBe(1);
        expect(runJson.items[0].id).toBe("run_b");

        const benchmarkResponse = await getBenchmarks(
            new Request(
                "http://localhost/api/benchmarks?q=alpha&preset=standard",
            ),
        );
        expect(benchmarkResponse.status).toBe(200);
        const benchmarkJson = (await benchmarkResponse.json()) as {
            filtered: number;
            items: Array<{ id: string }>;
        };
        expect(benchmarkJson.filtered).toBe(1);
        expect(benchmarkJson.items[0].id).toBe("benchmark_a");
    });

    it("supports runs and benchmarks pagination and oldest sort", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "A question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_b.json"),
            JSON.stringify({
                kind: "run",
                id: "run_b",
                question: "B question",
                metadata: {
                    createdAt: "2025-02-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_b", finalAnswer: "B", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_a.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_a",
                question: "A benchmark",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 1,
                    modeCount: 1,
                    modeSizes: [1],
                    divergenceEntropy: 0,
                    summary: { stability: { pairwiseMean: 1, pairs: [] } },
                },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_b.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_b",
                question: "B benchmark",
                metadata: {
                    createdAt: "2025-02-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 1,
                    modeCount: 1,
                    modeSizes: [1],
                    divergenceEntropy: 0,
                    summary: { stability: { pairwiseMean: 1, pairs: [] } },
                },
            }),
            "utf-8",
        );

        const runsResponse = await getRuns(
            new Request(
                "http://localhost/api/runs?sort=oldest&offset=0&limit=1",
            ),
        );
        expect(runsResponse.status).toBe(200);
        const runsJson = (await runsResponse.json()) as {
            offset: number;
            limit: number;
            totalPages: number;
            prevPage: number | null;
            nextPage: number | null;
            hasMore: boolean;
            items: Array<{ id: string }>;
        };
        expect(runsJson.offset).toBe(0);
        expect(runsJson.limit).toBe(1);
        expect(runsJson.totalPages).toBe(2);
        expect(runsJson.prevPage).toBeNull();
        expect(runsJson.nextPage).toBe(2);
        expect(runsJson.hasMore).toBe(true);
        expect(runsJson.items[0].id).toBe("run_a");

        const benchmarksResponse = await getBenchmarks(
            new Request(
                "http://localhost/api/benchmarks?sort=oldest&offset=1&limit=1",
            ),
        );
        expect(benchmarksResponse.status).toBe(200);
        const benchmarksJson = (await benchmarksResponse.json()) as {
            offset: number;
            limit: number;
            totalPages: number;
            prevPage: number | null;
            nextPage: number | null;
            hasMore: boolean;
            items: Array<{ id: string }>;
        };
        expect(benchmarksJson.offset).toBe(1);
        expect(benchmarksJson.limit).toBe(1);
        expect(benchmarksJson.totalPages).toBe(2);
        expect(benchmarksJson.prevPage).toBe(1);
        expect(benchmarksJson.nextPage).toBeNull();
        expect(benchmarksJson.hasMore).toBe(false);
        expect(benchmarksJson.items[0].id).toBe("benchmark_b");
    });

    it("uses fallback pagination defaults when params are missing or blank", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "A question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_a.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_a",
                question: "A benchmark",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 1,
                    modeCount: 1,
                    modeSizes: [1],
                    divergenceEntropy: 0,
                    summary: { stability: { pairwiseMean: 1, pairs: [] } },
                },
            }),
            "utf-8",
        );

        const runsResponse = await getRuns(
            new Request("http://localhost/api/runs"),
        );
        const runsJson = (await runsResponse.json()) as {
            page: number;
            totalPages: number;
            prevPage: number | null;
            nextPage: number | null;
            limit: number;
            offset: number;
        };
        expect(runsJson.page).toBe(1);
        expect(runsJson.totalPages).toBe(1);
        expect(runsJson.prevPage).toBeNull();
        expect(runsJson.nextPage).toBeNull();
        expect(runsJson.offset).toBe(0);
        expect(runsJson.limit).toBe(100);

        const benchmarksResponse = await getBenchmarks(
            new Request("http://localhost/api/benchmarks?limit=&offset="),
        );
        const benchmarksJson = (await benchmarksResponse.json()) as {
            page: number;
            totalPages: number;
            prevPage: number | null;
            nextPage: number | null;
            limit: number;
            offset: number;
        };
        expect(benchmarksJson.page).toBe(1);
        expect(benchmarksJson.totalPages).toBe(1);
        expect(benchmarksJson.prevPage).toBeNull();
        expect(benchmarksJson.nextPage).toBeNull();
        expect(benchmarksJson.offset).toBe(0);
        expect(benchmarksJson.limit).toBe(100);
    });

    it("supports page/pageSize aliases for list pagination", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "A question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_b.json"),
            JSON.stringify({
                kind: "run",
                id: "run_b",
                question: "B question",
                metadata: {
                    createdAt: "2025-02-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_b", finalAnswer: "B", steps: [], metrics: {} },
            }),
            "utf-8",
        );

        const runsResponse = await getRuns(
            new Request(
                "http://localhost/api/runs?sort=oldest&page=2&pageSize=1",
            ),
        );
        expect(runsResponse.status).toBe(200);
        const runsJson = (await runsResponse.json()) as {
            page: number;
            totalPages: number;
            prevPage: number | null;
            nextPage: number | null;
            offset: number;
            limit: number;
            items: Array<{ id: string }>;
        };
        expect(runsJson.page).toBe(2);
        expect(runsJson.totalPages).toBe(2);
        expect(runsJson.prevPage).toBe(1);
        expect(runsJson.nextPage).toBeNull();
        expect(runsJson.offset).toBe(1);
        expect(runsJson.limit).toBe(1);
        expect(runsJson.items[0].id).toBe("run_b");
    });

    it("uses deterministic id tie-break for same createdAt sorting", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_b.json"),
            JSON.stringify({
                kind: "run",
                id: "run_b",
                question: "B question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_b", finalAnswer: "B", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "A question",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );

        const newest = await getRuns(
            new Request("http://localhost/api/runs?sort=newest&limit=2"),
        );
        const newestJson = (await newest.json()) as {
            items: Array<{ id: string }>;
        };
        expect(newestJson.items.map((item) => item.id)).toEqual([
            "run_a",
            "run_b",
        ]);

        const oldest = await getRuns(
            new Request("http://localhost/api/runs?sort=oldest&limit=2"),
        );
        const oldestJson = (await oldest.json()) as {
            items: Array<{ id: string }>;
        };
        expect(oldestJson.items.map((item) => item.id)).toEqual([
            "run_a",
            "run_b",
        ]);
    });

    it("returns benchmark compare deltas", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "benchmark_left.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_left",
                question: "Q left",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 2,
                    modeCount: 1,
                    modeSizes: [2],
                    divergenceEntropy: 0.1,
                    summary: { stability: { pairwiseMean: 0.9, pairs: [] } },
                },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_right.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_right",
                question: "Q right",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 4,
                    modeCount: 3,
                    modeSizes: [2, 1, 1],
                    divergenceEntropy: 0.8,
                    summary: { stability: { pairwiseMean: 0.6, pairs: [] } },
                },
            }),
            "utf-8",
        );

        const response = await getBenchmarksCompare(
            new Request(
                "http://localhost/api/benchmarks/compare?left=benchmark_left&right=benchmark_right",
            ),
        );
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            delta: {
                runs: number;
                modeCount: number;
                divergenceEntropy: number;
                stabilityPairwiseMean: number | null;
            };
        };
        expect(json.delta.runs).toBe(2);
        expect(json.delta.modeCount).toBe(2);
        expect(json.delta.divergenceEntropy).toBeCloseTo(0.7, 3);
        expect(json.delta.stabilityPairwiseMean).toBeCloseTo(-0.3, 3);
    });

    it("returns 400/404 for invalid benchmark compare requests", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        const missingParams = await getBenchmarksCompare(
            new Request("http://localhost/api/benchmarks/compare"),
        );
        expect(missingParams.status).toBe(400);

        const notFound = await getBenchmarksCompare(
            new Request(
                "http://localhost/api/benchmarks/compare?left=a&right=b",
            ),
        );
        expect(notFound.status).toBe(404);
    });

    it("returns run compare deltas", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_left.json"),
            JSON.stringify({
                kind: "run",
                id: "run_left",
                question: "Q left",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: {
                    id: "run_left",
                    finalAnswer: "A",
                    steps: [{ id: "s1", agentName: "Solver", role: "solver" }],
                    metrics: {
                        confidence: {
                            solver: 0.3,
                            revision: 0.5,
                            synthesizer: 0.6,
                            solverToRevisionDelta: 0.2,
                            revisionToSynthesizerDelta: 0.1,
                        },
                        critique: {
                            byType: { factual_error: 1, omission: 1 },
                            maxSeverity: 3,
                            avgSeverity: 2.5,
                        },
                        quality: {
                            coherence: 0.7,
                            completeness: 0.6,
                            factualRisk: 0.4,
                            uncertaintyHandling: 0.5,
                        },
                        research: {
                            evidenceRiskLevel: 2,
                            counterfactualFailureModeCount: 1,
                            topCounterfactualFailureMode: "Mode A",
                        },
                    },
                },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "run_right.json"),
            JSON.stringify({
                kind: "run",
                id: "run_right",
                question: "Q right",
                metadata: {
                    createdAt: "2025-01-01T00:00:00.000Z",
                    model: "gpt",
                    pipelinePreset: "research_deep",
                    fastMode: false,
                },
                run: {
                    id: "run_right",
                    finalAnswer: "B",
                    steps: [
                        { id: "s1", agentName: "Solver", role: "solver" },
                        { id: "s2", agentName: "Skeptic", role: "skeptic" },
                    ],
                    metrics: {
                        confidence: {
                            solver: 0.6,
                            revision: 0.7,
                            synthesizer: 0.8,
                            calibratedAdjusted: 0.75,
                            solverToRevisionDelta: 0.1,
                            revisionToSynthesizerDelta: 0.1,
                        },
                        critique: {
                            byType: { factual_error: 3 },
                            maxSeverity: 4,
                            avgSeverity: 3.2,
                        },
                        quality: {
                            coherence: 0.8,
                            completeness: 0.9,
                            factualRisk: 0.3,
                            uncertaintyHandling: 0.8,
                        },
                        research: {
                            evidenceRiskLevel: 5,
                            counterfactualFailureModeCount: 3,
                            topCounterfactualFailureMode: "Mode B",
                        },
                    },
                },
            }),
            "utf-8",
        );

        const response = await getRunsCompare(
            new Request(
                "http://localhost/api/runs/compare?left=run_left&right=run_right",
            ),
        );
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            left: { id: string };
            right: { id: string };
            delta: {
                stepCount: number;
                confidence: {
                    solver: number | null;
                    calibratedAdjusted: number | null;
                };
                critique: {
                    issueCount: number;
                    maxSeverity: number | null;
                };
                quality: {
                    completeness: number | null;
                    factualRisk: number | null;
                };
                research: {
                    evidenceRiskLevel: number | null;
                    counterfactualFailureModeCount: number | null;
                };
            };
        };
        expect(json.left.id).toBe("run_left");
        expect(json.right.id).toBe("run_right");
        expect(json.delta.stepCount).toBe(1);
        expect(json.delta.confidence.solver).toBeCloseTo(0.3, 3);
        expect(json.delta.confidence.calibratedAdjusted).toBeNull();
        expect(json.delta.critique.issueCount).toBe(1);
        expect(json.delta.critique.maxSeverity).toBe(1);
        expect(json.delta.quality.completeness).toBeCloseTo(0.3, 3);
        expect(json.delta.quality.factualRisk).toBeCloseTo(-0.1, 3);
        expect(json.delta.research.evidenceRiskLevel).toBe(3);
        expect(json.delta.research.counterfactualFailureModeCount).toBe(2);
    });

    it("returns 400/404 for invalid run compare requests", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        const missingParams = await getRunsCompare(
            new Request("http://localhost/api/runs/compare"),
        );
        expect(missingParams.status).toBe(400);

        const notFound = await getRunsCompare(
            new Request("http://localhost/api/runs/compare?left=a&right=b"),
        );
        expect(notFound.status).toBe(404);
    });

    it("returns benchmark pairs export payload", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "analysis-benchmark-pairs.json"),
            JSON.stringify({
                generatedAt: new Date().toISOString(),
                pairwise: [
                    {
                        benchmarkId: "benchmark_1",
                        runIds: ["r1", "r2"],
                        pairs: [{ i: 0, j: 1, similarity: 0.9 }],
                    },
                ],
            }),
            "utf-8",
        );

        const response = await getAnalysisPairs(
            new Request("http://localhost/api/analysis/pairs"),
        );
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            pairwise: Array<{ benchmarkId: string }>;
        };
        expect(json.pairwise[0].benchmarkId).toBe("benchmark_1");
    });

    it("returns filtered runs as CSV", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "Alpha",
                metadata: {
                    createdAt: "2026-01-01T00:00:00.000Z",
                    model: "gpt-a",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );

        const response = await getRuns(
            new Request("http://localhost/api/runs?format=csv"),
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toContain("text/csv");
        expect(await response.text()).toContain("run_a");
    });

    it("returns filtered benchmarks as CSV", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "benchmark_a.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_a",
                question: "Alpha benchmark",
                metadata: {
                    createdAt: "2026-01-01T00:00:00.000Z",
                    model: "gpt-a",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 2,
                    modeCount: 1,
                    modeSizes: [2],
                    divergenceEntropy: 0.2,
                    summary: { stability: { pairwiseMean: 0.9, pairs: [] } },
                },
            }),
            "utf-8",
        );

        const response = await getBenchmarks(
            new Request("http://localhost/api/benchmarks?format=csv"),
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toContain("text/csv");
        expect(await response.text()).toContain("benchmark_a");
    });

    it("returns question groups as JSON and CSV", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "Shared topic",
                metadata: {
                    createdAt: "2026-01-02T00:00:00.000Z",
                    model: "gpt-a",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );
        await writeFile(
            join(dir, "benchmark_a.json"),
            JSON.stringify({
                kind: "benchmark",
                id: "benchmark_a",
                question: "Shared topic",
                metadata: {
                    createdAt: "2026-01-01T00:00:00.000Z",
                    model: "gpt-a",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                payload: {
                    runs: 2,
                    modeCount: 1,
                    modeSizes: [2],
                    divergenceEntropy: 0.2,
                    summary: { stability: { pairwiseMean: 0.9, pairs: [] } },
                },
            }),
            "utf-8",
        );

        const jsonResponse = await getQuestions(
            new Request("http://localhost/api/questions?q=shared"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            filtered: number;
            items: Array<{ question: string; runCount: number }>;
        };
        expect(json.filtered).toBe(1);
        expect(json.items[0].question).toBe("Shared topic");
        expect(json.items[0].runCount).toBe(1);

        const csvResponse = await getQuestions(
            new Request("http://localhost/api/questions?format=csv"),
        );
        expect(csvResponse.status).toBe(200);
        expect(csvResponse.headers.get("Content-Type")).toContain("text/csv");
        expect(await csvResponse.text()).toContain("Shared topic");
    });

    it("returns filtered activity feed as JSON and CSV", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_a.json"),
            JSON.stringify({
                kind: "run",
                id: "run_a",
                question: "Alpha",
                metadata: {
                    createdAt: "2026-01-02T00:00:00.000Z",
                    model: "gpt-a",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: { id: "run_a", finalAnswer: "A", steps: [], metrics: {} },
            }),
            "utf-8",
        );

        const jsonResponse = await getActivity(
            new Request("http://localhost/api/activity?kind=run"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            total: number;
            items: Array<{ id: string }>;
        };
        expect(json.total).toBe(1);
        expect(json.items[0].id).toBe("run_a");

        const csvResponse = await getActivity(
            new Request("http://localhost/api/activity?format=csv"),
        );
        expect(csvResponse.status).toBe(200);
        expect(csvResponse.headers.get("Content-Type")).toContain("text/csv");
        const csv = await csvResponse.text();
        expect(csv).toContain("run_a");
    });

    it("returns catalog JSON and CSV from artifacts", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        await writeFile(
            join(dir, "run_cat.json"),
            JSON.stringify({
                kind: "run",
                id: "run_cat",
                question: "Catalog Q",
                metadata: {
                    createdAt: "2026-01-01T00:00:00.000Z",
                    model: "gpt-catalog",
                    pipelinePreset: "standard",
                    fastMode: false,
                },
                run: {
                    id: "run_cat",
                    finalAnswer: "A",
                    steps: [],
                    metrics: {},
                },
            }),
            "utf-8",
        );

        const jsonResponse = await getCatalog(
            new Request("http://localhost/api/catalog"),
        );
        expect(jsonResponse.status).toBe(200);
        const json = (await jsonResponse.json()) as {
            models: Array<{ model: string }>;
        };
        expect(json.models[0].model).toBe("gpt-catalog");

        const csvResponse = await getCatalog(
            new Request("http://localhost/api/catalog?format=csv"),
        );
        expect(csvResponse.status).toBe(200);
        expect(await csvResponse.text()).toContain("gpt-catalog");
    });

    it("rebuilds analysis index from artifacts when enabled", async () => {
        const dir = await makeTempDir();
        process.env.RUNS_DIR = dir;
        process.env.ANALYSIS_REBUILD_ENABLED = "true";
        await writeFile(
            join(dir, "run_rebuild.json"),
            JSON.stringify({
                kind: "run",
                id: "run_rebuild",
                question: "Rebuild Q",
                metadata: {
                    schemaVersion: 1,
                    createdAt: "2026-01-01T00:00:00.000Z",
                    model: "gpt-rebuild",
                    pipelinePreset: "standard",
                    fastMode: false,
                    pipelineVersion: "1.0.0",
                    source: "cli",
                },
                run: {
                    id: "run_rebuild",
                    finalAnswer: "Answer",
                    steps: [],
                    metrics: {},
                },
            }),
            "utf-8",
        );

        const response = await postAnalysisRebuild();
        expect(response.status).toBe(200);
        const json = (await response.json()) as {
            ok: boolean;
            totals: { runs: number };
        };
        expect(json.ok).toBe(true);
        expect(json.totals.runs).toBeGreaterThanOrEqual(1);
    });
});
