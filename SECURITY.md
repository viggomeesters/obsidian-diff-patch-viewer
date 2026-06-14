# Security Policy

## Supported versions

Only the latest release is actively supported.

## Reporting a vulnerability

Please report security issues privately by emailing the maintainer or opening a minimal GitHub security advisory if available.

Do not include sensitive vault content in public issues. Reduce reproductions to minimal synthetic fixtures.

## Security posture

Diff and Patch Viewer is read-only. It reads `.diff` and `.patch` files through the vault API and renders a local inspection view. It does not apply patches, call git, modify files, send vault content to external services, use runtime network APIs, or access the clipboard.
