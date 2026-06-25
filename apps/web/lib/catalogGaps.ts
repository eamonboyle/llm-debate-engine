import type { CatalogStats } from "./catalogStats";

export type CatalogGapRow = {
    model: string;
    preset: string;
};

export type CatalogGapSummary = {
    gaps: CatalogGapRow[];
    coveredCount: number;
    possibleCount: number;
    coveragePercent: number | null;
    uniqueModels: number;
    uniquePresets: number;
};

function comboKey(model: string, preset: string): string {
    return `${model}\0${preset}`;
}

export function buildCatalogGaps(stats: CatalogStats): CatalogGapSummary {
    const models = stats.models.map((row) => row.model);
    const presets = stats.presets.map((row) => row.preset);
    const existing = new Set(
        stats.combos.map((combo) => comboKey(combo.model, combo.preset)),
    );

    const gaps: CatalogGapRow[] = [];
    for (const model of models) {
        for (const preset of presets) {
            if (!existing.has(comboKey(model, preset))) {
                gaps.push({ model, preset });
            }
        }
    }

    gaps.sort(
        (a, b) =>
            a.model.localeCompare(b.model) || a.preset.localeCompare(b.preset),
    );

    const possibleCount = models.length * presets.length;
    const coveredCount = stats.combos.length;
    const coveragePercent =
        possibleCount > 0
            ? Math.round((coveredCount / possibleCount) * 1000) / 10
            : null;

    return {
        gaps,
        coveredCount,
        possibleCount,
        coveragePercent,
        uniqueModels: models.length,
        uniquePresets: presets.length,
    };
}

export function filterCatalogGaps(
    summary: CatalogGapSummary,
    query: string | undefined,
): CatalogGapRow[] {
    const needle = (query ?? "").trim().toLowerCase();
    if (!needle) return summary.gaps;

    return summary.gaps.filter(
        (gap) =>
            gap.model.toLowerCase().includes(needle) ||
            gap.preset.toLowerCase().includes(needle) ||
            `${gap.model} ${gap.preset}`.toLowerCase().includes(needle),
    );
}
