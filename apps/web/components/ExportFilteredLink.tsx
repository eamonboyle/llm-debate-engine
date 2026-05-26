import { buildQueryString } from "../lib/listPagination";

type ExportFilteredLinkProps = {
    apiPath: string;
    params: Record<string, string | undefined>;
    label?: string;
};

export function ExportFilteredLink({
    apiPath,
    params,
    label = "Export filtered JSON",
}: ExportFilteredLinkProps) {
    const href = `${apiPath}${buildQueryString(params, {
        limit: "500",
        page: "1",
    })}`;

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
