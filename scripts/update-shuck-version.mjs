/* global URL, console, fetch, process */

import { readFile, writeFile } from 'node:fs/promises';

const repository = 'ewhauser/shuck';
const requiredTargets = [
  ['aarch64-apple-darwin', 'tar.xz'],
  ['aarch64-unknown-linux-gnu', 'tar.xz'],
  ['aarch64-unknown-linux-musl', 'tar.xz'],
  ['x86_64-unknown-linux-gnu', 'tar.xz'],
  ['x86_64-unknown-linux-musl', 'tar.xz'],
  ['x86_64-pc-windows-msvc', 'zip'],
];

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'shuck-action-version-updater',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (process.env.GH_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
}

const response = await fetch(
  `https://api.github.com/repos/${repository}/releases/latest`,
  {
    headers,
  },
);
if (!response.ok) {
  throw new Error(
    `GitHub releases API returned ${response.status}: ${await response.text()}`,
  );
}

const release = await response.json();
if (
  release.draft ||
  release.prerelease ||
  !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(release.tag_name)
) {
  throw new Error(
    `Latest release is not a stable exact version: ${release.tag_name}`,
  );
}

const assetNames = new Set(release.assets.map((asset) => asset.name));
for (const [target, extension] of requiredTargets) {
  const archive = `shuck-cli-${target}.${extension}`;
  for (const required of [archive, `${archive}.sha256`]) {
    if (!assetNames.has(required)) {
      throw new Error(
        `${release.tag_name} is missing required asset ${required}`,
      );
    }
  }
}

const nextVersion = release.tag_name.slice(1);
const actionPath = new URL('../action.yml', import.meta.url);
const action = await readFile(actionPath, 'utf8');
const versionBlock =
  /( {2}shuck-version:\n(?: {4}.*\n)*? {4}default: )([^\n]+)/;
const match = action.match(versionBlock);
if (!match) {
  throw new Error('Could not locate the shuck-version default in action.yml');
}
const currentVersion = match[2].trim().replace(/^['"]|['"]$/g, '');
const changed = currentVersion !== nextVersion;
if (changed) {
  await writeFile(actionPath, action.replace(versionBlock, `$1${nextVersion}`));
}

if (process.env.GITHUB_OUTPUT) {
  await writeFile(
    process.env.GITHUB_OUTPUT,
    `changed=${String(changed)}\ncurrent-version=${currentVersion}\nnext-version=${nextVersion}\n`,
    { flag: 'a' },
  );
}

console.log(
  changed
    ? `Updated Shuck ${currentVersion} -> ${nextVersion}`
    : `Shuck ${currentVersion} is current`,
);
