# 001: Shuck GitHub Action

## Status

Implemented

## Summary

`ewhauser/shuck-action` is a public JavaScript action that installs a verified Shuck release and optionally runs linting or formatting. It is a separate repository so the action can use stable `v1.x.y` releases independently of the pre-1.0 Shuck CLI.

## Motivation

Shuck already emits GitHub workflow commands and publishes native archives, but users otherwise need to reproduce platform selection, installation, and invocation in every workflow. A Marketplace action provides a one-step default with native annotations while retaining setup-only and formatting modes.

## Design

### Interface

The root `action.yml` exposes:

| Input               | Values                            | Default  |
| ------------------- | --------------------------------- | -------- |
| `mode`              | `setup`, `check`, `format`        | `check`  |
| `shuck-version`     | Exact SemVer, optional `v` prefix | `0.0.43` |
| `working-directory` | Existing directory                | `.`      |
| `paths`             | Newline-delimited paths           | `.`      |
| `args`              | Shell-style argument string       | empty    |
| `format-mode`       | `check`, `diff`, `write`          | `check`  |

Outputs are the normalized `shuck-version` and absolute `shuck-path`.

Check mode forces `--output-format github`. Format mode sets `SHUCK_EXPERIMENTAL=1` and selects `--check`, `--diff`, or the formatter's default write behavior. Setup mode only installs the executable and adds its directory to `GITHUB_PATH`.

### Runtime and installation

The TypeScript implementation is bundled into `dist/index.js` and runs on GitHub's Node 24 action runtime. It maps the runner to one of Shuck's published targets:

- `aarch64-apple-darwin`
- `aarch64-unknown-linux-gnu`
- `aarch64-unknown-linux-musl`
- `x86_64-unknown-linux-gnu`
- `x86_64-unknown-linux-musl`
- `x86_64-pc-windows-msvc`

Linux libc is detected at runtime. The action downloads the exact tagged archive and adjacent `.sha256` file from `ewhauser/shuck`, verifies the archive, extracts it, marks Unix binaries executable, and stores the directory with `@actions/tool-cache`. It validates `shuck --version` before exposing the executable.

### Command execution

Paths are newline-delimited so each remains a single argv entry. Additional arguments use a quoting-aware argv parser. Commands are passed directly to `@actions/exec` and never to a command shell. Mode-owned flags are rejected from `args` to avoid ambiguous behavior.

### Releases

Release Please maintains independent action versions and draft GitHub releases. Publishing a draft through the Marketplace UI creates the immutable `v1.x.y` release; a release workflow advances the movable `v1` compatibility tag. A scheduled updater opens a tested dependency PR when a newer stable Shuck release has all required assets.

## Alternatives Considered

### Composite action

Rejected because cross-platform platform/libc detection, checksums, extraction, caching, and safe argv handling are substantially clearer in JavaScript.

### Docker action

Rejected because Docker actions are Linux-only and add image startup and distribution overhead.

### Multiple setup, check, and format actions

Rejected to keep one Marketplace entry and one stable public interface. The `mode` input keeps the behaviors explicit without maintaining multiple metadata files.

### Action in the Shuck repository

Rejected because Shuck's CLI releases are pre-1.0 and frequent. A separate action repository supports a stable `v1` interface and focused Marketplace documentation.

## Security Considerations

- Versions must be exact; `latest` and ranges are rejected.
- Archives are verified against their release checksum before extraction.
- Arguments are never passed through a shell.
- Workflows use minimal permissions and pin third-party actions by full SHA.
- No Shuck binary or archive is committed to the repository.
- Checksums share the release's trust boundary; callers seeking maximum stability should pin both the action and Shuck versions.

## Verification

Run `pnpm check` to format-check, lint, type-check, unit-test, rebuild the bundle, and verify that the committed bundle is current.

CI additionally runs the packaged action on Linux x64, Linux ARM64, macOS ARM64, and Windows x64; exercises setup, successful and failing checks, and all formatter modes; and smoke-tests both musl archives in Alpine containers.
