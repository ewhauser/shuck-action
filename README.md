# Shuck Action

Install [Shuck](https://github.com/ewhauser/shuck) and lint or format shell scripts in GitHub Actions. Check mode emits native file annotations for every diagnostic.

## Quick start

```yaml
name: Shuck

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  shuck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: ewhauser/shuck-action@v1
```

The default invocation installs the Shuck version tested with the action release and runs:

```console
shuck check --output-format github .
```

## Inputs

| Input               | Default        | Description                                                                                                                           |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`              | `check`        | Operation to perform: `setup`, `check`, or `format`.                                                                                  |
| `shuck-version`     | release-pinned | Exact Shuck version, optionally prefixed with `v`. See `action.yml` for the version tested by a given action release.                 |
| `working-directory` | `.`            | Existing directory resolved relative to `GITHUB_WORKSPACE`.                                                                           |
| `paths`             | `.`            | Newline-delimited paths. Each line is one argument, so spaces are preserved.                                                          |
| `args`              | empty          | Additional shell-style arguments for the selected subcommand. Arguments are parsed into an argv array and never evaluated by a shell. |
| `format-mode`       | `check`        | Formatting behavior: `check`, `diff`, or `write`.                                                                                     |

The action outputs `shuck-version` and the absolute executable location as `shuck-path`.

### Check selected paths

```yaml
- uses: ewhauser/shuck-action@v1
  with:
    paths: |
      scripts
      .github/workflows
    args: --no-cache
```

Check mode reserves `--output-format github`. Use setup mode followed by a normal `run` step if another output format is required.

### Check formatting

```yaml
- uses: ewhauser/shuck-action@v1
  with:
    mode: format
```

Format mode defaults to `shuck format --check`. To print a diff or rewrite the checkout:

```yaml
- uses: ewhauser/shuck-action@v1
  with:
    mode: format
    format-mode: diff # or write
```

`write` changes files but never commits them.

### Setup only

```yaml
- uses: ewhauser/shuck-action@v1
  with:
    mode: setup

- run: shuck --version
```

Setup mode makes the executable available to all later steps in the job.

## Platforms

The action supports every platform for which Shuck currently publishes a native release:

- Linux x64 and ARM64 with glibc or musl
- macOS ARM64
- Windows x64

Intel macOS and Windows ARM64 fail with a message listing the supported targets.

## Versioning and security

Action releases use independent semantic versions such as `v1.0.0`; the movable `v1` tag follows the newest compatible release. Each release pins a tested Shuck version, and callers may override it with another exact release.

The action downloads the selected archive and its matching checksum from the official `ewhauser/shuck` GitHub release, verifies SHA-256 before extraction, and executes the binary without a command shell. For maximum supply-chain stability, pin this action to a full commit SHA.

## Development

```sh
pnpm install --frozen-lockfile
pnpm check
```

`dist/index.js` is committed because GitHub runs the bundled file directly. Pull requests that change source must rebuild it with `pnpm build`; CI rejects stale bundles.

See [the design specification](specs/001-shuck-action.md) for architecture and release details.

## License

MIT
