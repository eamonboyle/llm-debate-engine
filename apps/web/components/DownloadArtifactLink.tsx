type DownloadArtifactLinkProps = {
    href: string;
    filename: string;
    label?: string;
};

export function DownloadArtifactLink({
    href,
    filename,
    label = "Download JSON",
}: DownloadArtifactLinkProps) {
    return (
        <a
            href={href}
            download={filename}
            className="button secondary"
            rel="noopener"
        >
            {label}
        </a>
    );
}
