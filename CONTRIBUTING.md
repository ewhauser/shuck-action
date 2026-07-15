# Contributing

Contributions are welcome. Use Conventional Commit syntax for pull request titles because Release Please uses the squash-merged title to build releases and the changelog.

## Development

Node.js 24 and pnpm 11 are required.

```sh
pnpm install --frozen-lockfile
pnpm check
```

Source lives under `src/`, unit tests under `test/`, and the generated action bundle under `dist/`. Always include the rebuilt bundle when source or dependencies change.

Integration tests download public Shuck release assets and therefore require network access. Do not add a Shuck executable or downloaded archive to the repository.

## Pull requests

- Keep action permissions minimal.
- Pin third-party workflow actions to full commit SHAs.
- Add tests for input, platform, download, or command behavior changes.
- Update `specs/001-shuck-action.md` when the architecture or public interface changes.
