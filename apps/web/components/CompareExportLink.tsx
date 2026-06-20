import { buildQueryString } from "../lib/listPagination";

type CompareExportLinkProps = {
    apiPath: string;
    left?: string;
    right?: string;
    extraParams?: Record<string, string | undefined>;
    jsonLabel?: string;
    csvLabel?: string;
    csvFilename?: string;
};

export function CompareExportLink({
    apiPath,
    left,
    right,
    extraParams = {},
    jsonLabel = "Export compare JSON",
    csvLabel = "Export compare CSV",
    csvFilename,
}: CompareExportLinkProps) {
    if (!left || !right) return null;

    const baseQuery = buildQueryString({ left, right, ...extraParams }, {});
    const csvQuery = buildQueryString(
        { left, right, format: "csv", ...extraParams },
        {},
    );

    return (
        <>
            <a
                href={`${apiPath}${baseQuery}`}
                className="button secondary"
                target="_blank"
                rel="noopener noreferrer"
                download
            >
                {jsonLabel}
            </a>
            <a
                href={`${apiPath}${csvQuery}`}
                className="button secondary"
                download={csvFilename ?? "compare.csv"}
            >
                {csvLabel}
            </a>
        </>
    );
}
