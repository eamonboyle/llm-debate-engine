import type { ReactNode } from "react";
import { InfoTooltip } from "./InfoTooltip";

export type Column<T> = {
    key: string;
    label: string;
    render?: (row: T) => ReactNode;
    /** Hide on mobile cards (e.g. long preview text) */
    hideOnMobile?: boolean;
    /** Only show on mobile cards, not in table */
    showOnlyOnMobile?: boolean;
    /** CSS class for the table cell (desktop) */
    cellClass?: string;
    /** Glossary key for contextual help tooltip in header */
    helpKey?: string;
};

function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen).trim() + "…";
}

type ResponsiveTableProps<T> = {
    columns: Column<T>[];
    data: T[];
    getRowId: (row: T) => string;
    /** Optional actions to show at bottom of each card */
    renderCardActions?: (row: T) => ReactNode;
};

export function ResponsiveTable<T extends Record<string, unknown>>({
    columns,
    data,
    getRowId,
    renderCardActions,
}: ResponsiveTableProps<T>) {
    const tableColumns = columns.filter((c) => !c.showOnlyOnMobile);
    const visibleColumns = columns.filter(
        (c) => !c.hideOnMobile || c.showOnlyOnMobile,
    );

    return (
        <div className="responsive-table-container">
            <div className="table-wrap table-wrap-swap">
                <table>
                    <thead>
                        <tr>
                            {tableColumns.map((col) => (
                                <th key={col.key} className={col.cellClass}>
                                    <span className="table-header-with-help">
                                        {col.label}
                                        {col.helpKey && (
                                            <InfoTooltip
                                                helpKey={col.helpKey}
                                            />
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={getRowId(row)}>
                                {tableColumns.map((col) => (
                                    <td key={col.key} className={col.cellClass}>
                                        {col.render
                                            ? col.render(row)
                                            : String(
                                                  (row[col.key] as ReactNode) ??
                                                      "",
                                              )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="data-cards">
                {data.map((row) => (
                    <dl key={getRowId(row)} className="data-card">
                        {visibleColumns.map((col) => (
                            <div key={col.key}>
                                <dt>
                                    <span className="table-header-with-help">
                                        {col.label}
                                        {col.helpKey && (
                                            <InfoTooltip
                                                helpKey={col.helpKey}
                                            />
                                        )}
                                    </span>
                                </dt>
                                <dd>
                                    {col.render
                                        ? col.render(row)
                                        : String(
                                              (row[col.key] as ReactNode) ?? "",
                                          )}
                                </dd>
                            </div>
                        ))}
                        {renderCardActions?.(row) ? (
                            <div className="data-card-actions">
                                {renderCardActions(row)}
                            </div>
                        ) : null}
                    </dl>
                ))}
            </div>
        </div>
    );
}

/** Truncates text with ellipsis; use title for full text on hover */
export function TruncateText({
    text,
    maxLength = 100,
    lines,
    className,
}: {
    text: string;
    maxLength?: number;
    lines?: number;
    className?: string;
}) {
    const truncated =
        text.length > maxLength ? truncate(text, maxLength) : text;
    const needsTruncation = text.length > maxLength;

    if (lines && lines > 1) {
        return (
            <span
                className={`cell-truncate-lines ${className ?? ""}`}
                style={{ "--truncate-lines": lines } as React.CSSProperties}
                title={text.length > 60 ? text : undefined}
            >
                {text}
            </span>
        );
    }

    return (
        <span
            className={`cell-truncate ${className ?? ""}`}
            title={needsTruncation ? text : undefined}
        >
            {truncated}
        </span>
    );
}
