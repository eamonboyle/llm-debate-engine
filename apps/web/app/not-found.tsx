export default function NotFound() {
    return (
        <section className="stack">
            <h1 className="title">Not found</h1>
            <p className="subtitle">The requested benchmark or run does not exist.</p>
            <a href="/" className="button">
                Back to overview
            </a>
        </section>
    );
}
