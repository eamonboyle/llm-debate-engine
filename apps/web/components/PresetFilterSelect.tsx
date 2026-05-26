type PresetFilterSelectProps = {
    presets: string[];
    name?: string;
    defaultValue?: string;
    className?: string;
};

export function PresetFilterSelect({
    presets,
    name = "preset",
    defaultValue = "",
    className = "input",
}: PresetFilterSelectProps) {
    return (
        <select name={name} defaultValue={defaultValue} className={className}>
            <option value="">Preset: any</option>
            {presets.map((preset) => (
                <option key={preset} value={preset}>
                    {preset}
                </option>
            ))}
        </select>
    );
}
