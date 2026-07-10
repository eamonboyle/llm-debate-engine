import type { ArtifactFilterParams } from "../lib/data";

type CompareFormFilterFieldsProps = {
    filters: ArtifactFilterParams;
};

export function CompareFormFilterFields({
    filters,
}: CompareFormFilterFieldsProps) {
    const entries = Object.entries(filters).filter(
        (entry): entry is [string, string] =>
            typeof entry[1] === "string" && entry[1].length > 0,
    );

    if (entries.length === 0) return null;

    return (
        <>
            {entries.map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
            ))}
        </>
    );
}
