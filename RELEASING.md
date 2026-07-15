# Releasing

Release Please maintains the action's semantic version independently from Shuck.

## Repository setup

Add a `RELEASE_PAT` Actions secret containing a fine-grained token with Contents and Pull requests write access to this repository. Workflows fall back to `GITHUB_TOKEN`, but pull requests created with that token do not trigger normal pull-request workflows.

Enable private vulnerability reporting and require the `Unit and package`, platform integration, behavior, and musl checks on `main`.

## Release flow

1. Merge conventional commits to `main`.
2. Review and merge the Release Please pull request.
3. Open the resulting draft `v1.x.y` release in GitHub.
4. Select **Publish this Action to the GitHub Marketplace**, choose **Code quality**, and publish the release.
5. Confirm the `Advance major tag` workflow moved `v1` to the published release.

Full `v1.x.y` release tags are never moved. Only the compatibility tag `v1` advances.

The first publication also requires the repository owner to accept the GitHub Marketplace Developer Agreement. After the listing exists, add the action example to the main Shuck README.

## Shuck dependency updates

The weekly `Update Shuck` workflow checks the newest stable Shuck release for all six archives and checksums. It updates the default only after `pnpm check` succeeds, then opens a `fix(deps):` pull request. Merging that pull request produces a patch action release through the normal Release Please flow.
