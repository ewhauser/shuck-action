import { createHash, timingSafeEqual } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as toolCache from '@actions/tool-cache';

import {
  archiveExtension,
  assetName,
  currentPlatformInfo,
  resolveTarget,
  type ShuckTarget,
} from './platform';

const RELEASE_BASE_URL = 'https://github.com/ewhauser/shuck/releases/download';

export interface InstalledShuck {
  binaryPath: string;
  target: ShuckTarget;
  version: string;
}

export function releaseAssetUrl(version: string, asset: string): string {
  return `${RELEASE_BASE_URL}/v${version}/${asset}`;
}

export function parseChecksum(content: string, expectedAsset: string): string {
  const line = content
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .find(Boolean);
  const match = line?.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/u);
  if (match === null || match === undefined) {
    throw new Error(`Malformed checksum file for ${expectedAsset}`);
  }
  const [, checksum, filename] = match;
  if (path.basename(filename ?? '') !== expectedAsset) {
    throw new Error(
      `Checksum file names ${JSON.stringify(filename)} instead of ${JSON.stringify(expectedAsset)}`,
    );
  }
  return checksum?.toLowerCase() ?? '';
}

export async function verifyChecksum(
  archivePath: string,
  checksumPath: string,
  expectedAsset: string,
): Promise<void> {
  const [archive, checksumFile] = await Promise.all([
    fs.readFile(archivePath),
    fs.readFile(checksumPath, 'utf8'),
  ]);
  const expected = Buffer.from(
    parseChecksum(checksumFile, expectedAsset),
    'hex',
  );
  const actual = createHash('sha256').update(archive).digest();
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error(`SHA-256 checksum mismatch for ${expectedAsset}`);
  }
}

export async function findBinary(
  root: string,
  executableName: string,
): Promise<string> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const candidate = path.join(root, entry.name);
    if (entry.isFile() && entry.name === executableName) {
      return candidate;
    }
    if (entry.isDirectory()) {
      try {
        return await findBinary(candidate, executableName);
      } catch (error) {
        if (!(error instanceof BinaryNotFoundError)) {
          throw error;
        }
      }
    }
  }
  throw new BinaryNotFoundError(executableName, root);
}

class BinaryNotFoundError extends Error {
  constructor(executableName: string, root: string) {
    super(`Could not find ${executableName} below ${root}`);
    this.name = 'BinaryNotFoundError';
  }
}

async function prepareBinary(
  cacheRoot: string,
  target: ShuckTarget,
): Promise<string> {
  const executableName =
    target === 'x86_64-pc-windows-msvc' ? 'shuck.exe' : 'shuck';
  const binaryPath = await findBinary(cacheRoot, executableName);
  if (executableName === 'shuck') {
    await fs.chmod(binaryPath, 0o755);
  }
  return binaryPath;
}

async function validateVersion(
  binaryPath: string,
  version: string,
): Promise<void> {
  const result = await exec.getExecOutput(binaryPath, ['--version'], {
    ignoreReturnCode: true,
    silent: true,
  });
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.exitCode !== 0 || !output.split(/\s+/u).includes(version)) {
    throw new Error(
      `Installed Shuck failed version validation: expected ${version}, received ${output.trim() || `exit code ${result.exitCode}`}`,
    );
  }
}

export async function installShuck(version: string): Promise<InstalledShuck> {
  const target = resolveTarget(currentPlatformInfo());
  let cacheRoot = toolCache.find('shuck', version, target);

  if (cacheRoot === '') {
    const asset = assetName(target);
    const checksumAsset = `${asset}.sha256`;
    core.info(`Downloading Shuck ${version} for ${target}`);
    const [archivePath, checksumPath] = await Promise.all([
      toolCache.downloadTool(releaseAssetUrl(version, asset)),
      toolCache.downloadTool(releaseAssetUrl(version, checksumAsset)),
    ]);
    await verifyChecksum(archivePath, checksumPath, asset);

    const extracted =
      archiveExtension(target) === 'zip'
        ? await toolCache.extractZip(archivePath)
        : await toolCache.extractTar(archivePath, undefined, 'xJ');
    await prepareBinary(extracted, target);
    cacheRoot = await toolCache.cacheDir(extracted, 'shuck', version, target);
  } else {
    core.info(`Using cached Shuck ${version} for ${target}`);
  }

  const binaryPath = await prepareBinary(cacheRoot, target);
  await validateVersion(binaryPath, version);
  core.addPath(path.dirname(binaryPath));

  return { binaryPath, target, version };
}
