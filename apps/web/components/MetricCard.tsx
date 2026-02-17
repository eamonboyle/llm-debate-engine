type MetricCardProps = {
    label: string;
    value: string | number;
    helper?: string;
};

export function MetricCard({ label, value, helper }: MetricCardProps) {
    return (
        <div className="card">
            <div className="small muted">{label.toUpperCase()}</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 600 }}>{value}</div>
            {helper ? (
                <div className="small muted" style={{ marginTop: 6 }}>
                    {helper}
                </div>
            ) : null}
        </div>
    );
}
