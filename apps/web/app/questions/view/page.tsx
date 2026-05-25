import type { Metadata } from "next";
import Link from "next/link";
import { CopyPageLink } from "../../../components/CopyPageLink";
import {
    ResponsiveTable,
    TruncateText,
} from "../../../components/ResponsiveTable";
import {
    loadBenchmarksByQuestion,
    loadRunsByQuestion,
} from "../../../lib/data";
export const metadata: Metadata = {
    title: "Question hub",
};

type ViewSearchParams = {
    question?: string;
};

export default async function QuestionHubPage({
    searchParams,
}: {
    searchParams: Promise<ViewSearchParams>;
}) {
    const params = await searchParams;
    const question = (params.question ?? "").trim();

    if (!question) {
        return (
            <section className="stack">
                <h1 className="title">Question hub</h1>
                <p className="subtitle">
                    Open this page from the{" "}
                    <Link href="/questions">questions list</Link> to see all
                    runs and benchmarks for one debate question.
                </p>
                <Link href="/questions" className="button">
                    Browse questions
                </Link>
            </section>
        );
    }

    const [runs, benchmarks] = await Promise.all([
        loadRunsByQuestion(question),
        loadBenchmarksByQuestion(question),
    ]);

    const models = [
        ...new Set([
            ...runs.map((r) => r.metadata.model),
            ...benchmarks.map((b) => b.metadata.model),
        ]),
    ].sort();
    const presets = [
        ...new Set([
            ...runs.map((r) => r.metadata.pipelinePreset),
            ...benchmarks.map((b) => b.metadata.pipelinePreset),
        ]),
    ].sort();

    const latestActivity = [
        runs[0]?.metadata.createdAt,
        benchmarks[0]?.metadata.createdAt,
    ]
        .filter(Boolean)
        .sort()
        .reverse()[0];

    const encodedQ = encodeURIComponent(question);

    return (
        <section className="stack">
            <div>
                <h1 className="title">Question hub</h1>
                <p className="subtitle">
                    All experiments for this debate question.
                </p>
                <div
                    className="page-actions"
                    style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 12,
                    }}
                >
                    <CopyPageLink />
                    <Link
                        href={`/runs?q=${encodedQ}`}
                        className="button secondary"
                    >
                        Filter runs
                    </Link>
                    <Link
                        href={`/benchmarks?q=${encodedQ}`}
                        className="button secondary"
                    >
                        Filter benchmarks
                    </Link>
                    {runs.length >= 2 ? (
                        <Link
                            href={`/runs/compare?left=${runs[0].id}&right=${runs[1].id}`}
                            className="button secondary"
                        >
                            Compare latest runs
                        </Link>
                    ) : null}
                    <Link href="/questions" className="button secondary">
                        All questions
                    </Link>
                </div>
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>{question}</h2>
                <div className="grid-4" style={{ marginTop: "1rem" }}>
                    <div>
                        <div className="small muted">Runs</div>
                        <div style={{ marginTop: 6, fontSize: "1.25rem" }}>
                            {runs.length}
                        </div>
                    </div>
                    <div>
                        <div className="small muted">Benchmarks</div>
                        <div style={{ marginTop: 6, fontSize: "1.25rem" }}>
                            {benchmarks.length}
                        </div>
                    </div>
                    <div>
                        <div className="small muted">Models</div>
                        <div style={{ marginTop: 6 }}>
                            {models.length > 0 ? models.join(", ") : "—"}
                        </div>
                    </div>
                    <div>
                        <div className="small muted">Last activity</div>
                        <div style={{ marginTop: 6 }}>
                            {latestActivity
                                ? new Date(latestActivity).toLocaleString()
                                : "—"}
                        </div>
                    </div>
                </div>
                {presets.length > 0 ? (
                    <p className="small muted" style={{ marginTop: "1rem" }}>
                        Presets: {presets.join(", ")}
                    </p>
                ) : null}
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Runs ({runs.length})</h2>
                {runs.length === 0 ? (
                    <p className="muted">No run artifacts for this question.</p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "id", label: "ID" },
                            {
                                key: "createdAt",
                                label: "Created",
                                render: (row) =>
                                    new Date(
                                        (row as { createdAt: string })
                                            .createdAt,
                                    ).toLocaleString(),
                            },
                            { key: "model", label: "Model" },
                            { key: "preset", label: "Preset" },
                            {
                                key: "preview",
                                label: "Answer",
                                hideOnMobile: true,
                                render: (row) => (
                                    <TruncateText
                                        text={
                                            (row as { preview: string }).preview
                                        }
                                        maxLength={80}
                                        className="muted"
                                    />
                                ),
                            },
                            {
                                key: "open",
                                label: "Open",
                                render: (row) => (
                                    <Link
                                        href={`/runs/${(row as { id: string }).id}`}
                                    >
                                        Trace
                                    </Link>
                                ),
                            },
                        ]}
                        data={runs.map((run) => ({
                            id: run.id,
                            createdAt: run.metadata.createdAt,
                            model: run.metadata.model,
                            preset: run.metadata.pipelinePreset,
                            preview: run.run.finalAnswer,
                        }))}
                        getRowId={(row) => (row as { id: string }).id}
                        renderCardActions={(row) => (
                            <Link
                                href={`/runs/${(row as { id: string }).id}`}
                                className="button"
                            >
                                View trace
                            </Link>
                        )}
                    />
                )}
            </div>

            <div className="card">
                <h2 style={{ marginTop: 0 }}>
                    Benchmarks ({benchmarks.length})
                </h2>
                {benchmarks.length === 0 ? (
                    <p className="muted">
                        No benchmark artifacts for this question.
                    </p>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { key: "id", label: "ID" },
                            {
                                key: "createdAt",
                                label: "Created",
                                render: (row) =>
                                    new Date(
                                        (row as { createdAt: string })
                                            .createdAt,
                                    ).toLocaleString(),
                            },
                            { key: "runs", label: "Runs" },
                            { key: "modeCount", label: "Modes" },
                            {
                                key: "entropy",
                                label: "Entropy",
                                helpKey: "divergenceEntropy",
                            },
                            {
                                key: "open",
                                label: "Open",
                                render: (row) => (
                                    <Link
                                        href={`/benchmarks/${(row as { id: string }).id}`}
                                    >
                                        Details
                                    </Link>
                                ),
                            },
                        ]}
                        data={benchmarks.map((bench) => ({
                            id: bench.id,
                            createdAt: bench.metadata.createdAt,
                            runs: bench.payload.runs,
                            modeCount: bench.payload.modeCount,
                            entropy: bench.payload.divergenceEntropy.toFixed(3),
                        }))}
                        getRowId={(row) => (row as { id: string }).id}
                        renderCardActions={(row) => (
                            <Link
                                href={`/benchmarks/${(row as { id: string }).id}`}
                                className="button"
                            >
                                View benchmark
                            </Link>
                        )}
                    />
                )}
            </div>
        </section>
    );
}
