import { InfoTooltip } from "./InfoTooltip";

type MetricCardProps = {
    label: string;
    value: string | number;
    helper?: string;
    /** Glossary key for contextual help tooltip */
    helpKey?: string;
};

export function MetricCard({ label, value, helper, helpKey }: MetricCardProps) {
    return (
        <div className="metric-card card">
            <div className="metric-label small muted">
                {label}
                {helpKey && <InfoTooltip helpKey={helpKey} />}
            </div>
            <div className="metric-value">{value}</div>
            {helper ? (
                <div className="small muted" style={{ marginTop: 6 }}>
                    {helper}
                </div>
            ) : null}
        </div>
    );
}
