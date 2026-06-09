import { buildQueryString } from "../lib/listPagination";

type CompareExportLinkProps = {
    apiPath: string;
    left?: string;
    right?: string;
    extraParams?: Record<string, string | undefined>;
    label?: string;
};

export function CompareExportLink({
    apiPath,
    left,
    right,
    extraParams = {},
    label = "Export compare JSON",
}: CompareExportLinkProps) {
    if (!left || !right) return null;

    const href = `${apiPath}${buildQueryString({ left, right, ...extraParams })}`;

    return (
        <a
            href={href}
            className="button secondary"
            target="_blank"
            rel="noopener noreferrer"
            download
        >
            {label}
        </a>
    );
}
