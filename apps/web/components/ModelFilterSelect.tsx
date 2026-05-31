type ModelFilterSelectProps = {
    models: string[];
    name?: string;
    defaultValue?: string;
    className?: string;
    listId?: string;
};

export function ModelFilterSelect({
    models,
    name = "model",
    defaultValue = "",
    className = "input",
    listId = "model-filter-options",
}: ModelFilterSelectProps) {
    return (
        <>
            <input
                name={name}
                list={listId}
                defaultValue={defaultValue}
                placeholder="Model contains..."
                className={className}
                autoComplete="off"
            />
            <datalist id={listId}>
                {models.map((model) => (
                    <option key={model} value={model} />
                ))}
            </datalist>
        </>
    );
}
