type MetricCardProps = {
    label: string;
    value: string | number;
    helper?: string;
};

export function MetricCard({ label, value, helper }: MetricCardProps) {
    return (
        <div className="metric-card card">
            <div className="metric-label small muted">{label}</div>
            <div className="metric-value">{value}</div>
            {helper ? (
                <div className="small muted" style={{ marginTop: 6 }}>
                    {helper}
                </div>
            ) : null}
        </div>
    );
}
