import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@actions/core', () => ({ addPath: vi.fn(), info: vi.fn() }));
vi.mock('@actions/exec', () => ({ getExecOutput: vi.fn() }));
vi.mock('@actions/tool-cache', () => ({
  cacheDir: vi.fn(),
  downloadTool: vi.fn(),
  extractTar: vi.fn(),
  extractZip: vi.fn(),
  find: vi.fn(),
}));
vi.mock('../src/platform', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    currentPlatformInfo: () => ({
      platform: 'linux',
      arch: 'x64',
      linuxLibc: 'glibc',
    }),
  };
});

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as toolCache from '@actions/tool-cache';

import {
  findBinary,
  installShuck,
  parseChecksum,
  releaseAssetUrl,
  verifyChecksum,
} from '../src/install';

let tempRoot: string;

beforeEach(async () => {
  vi.resetAllMocks();
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'shuck-action-install-'));
});

afterEach(async () => {
  await fs.rm(tempRoot, { force: true, recursive: true });
});

describe('release downloads', () => {
  it('builds an exact tagged release URL', () => {
    expect(releaseAssetUrl('0.0.43', 'archive.tar.xz')).toBe(
      'https://github.com/ewhauser/shuck/releases/download/v0.0.43/archive.tar.xz',
    );
  });

  it('parses cargo-dist checksum files', () => {
    expect(
      parseChecksum(`${'ab'.repeat(32)} *archive.tar.xz\n`, 'archive.tar.xz'),
    ).toBe('ab'.repeat(32));
    expect(() => parseChecksum('bad', 'archive.tar.xz')).toThrow('Malformed');
    expect(() =>
      parseChecksum(`${'ab'.repeat(32)} *other.tar.xz`, 'archive.tar.xz'),
    ).toThrow('instead of');
  });

  it('verifies and rejects archive checksums', async () => {
    const archive = path.join(tempRoot, 'archive.tar.xz');
    const checksum = `${archive}.sha256`;
    const bytes = Buffer.from('verified archive');
    await fs.writeFile(archive, bytes);
    await fs.writeFile(
      checksum,
      `${createHash('sha256').update(bytes).digest('hex')} *archive.tar.xz\n`,
    );
    await expect(
      verifyChecksum(archive, checksum, 'archive.tar.xz'),
    ).resolves.toBeUndefined();
    await fs.writeFile(archive, 'tampered');
    await expect(
      verifyChecksum(archive, checksum, 'archive.tar.xz'),
    ).rejects.toThrow('checksum mismatch');
  });
});

describe('binary discovery and installation', () => {
  it('finds a binary in a nested cargo-dist archive', async () => {
    const nested = path.join(tempRoot, 'archive');
    await fs.mkdir(nested);
    const binary = path.join(nested, 'shuck');
    await fs.writeFile(binary, 'binary');
    await expect(findBinary(tempRoot, 'shuck')).resolves.toBe(binary);
  });

  it('uses a tool-cache hit without downloading', async () => {
    const binary = path.join(tempRoot, 'shuck');
    await fs.writeFile(binary, 'binary');
    vi.mocked(toolCache.find).mockReturnValue(tempRoot);
    vi.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stderr: '',
      stdout: 'shuck 0.0.43\n',
    });

    await expect(installShuck('0.0.43')).resolves.toEqual({
      binaryPath: binary,
      target: 'x86_64-unknown-linux-gnu',
      version: '0.0.43',
    });
    expect(toolCache.downloadTool).not.toHaveBeenCalled();
    expect(core.addPath).toHaveBeenCalledWith(tempRoot);
  });

  it('downloads, verifies, extracts, and caches a miss', async () => {
    const archive = path.join(tempRoot, 'archive.tar.xz');
    const checksum = `${archive}.sha256`;
    const extracted = path.join(tempRoot, 'extracted');
    const bytes = Buffer.from('archive bytes');
    await fs.writeFile(archive, bytes);
    await fs.writeFile(
      checksum,
      `${createHash('sha256').update(bytes).digest('hex')} *shuck-cli-x86_64-unknown-linux-gnu.tar.xz\n`,
    );
    await fs.mkdir(extracted);
    const binary = path.join(extracted, 'shuck');
    await fs.writeFile(binary, 'binary');

    vi.mocked(toolCache.find).mockReturnValue('');
    vi.mocked(toolCache.downloadTool)
      .mockResolvedValueOnce(archive)
      .mockResolvedValueOnce(checksum);
    vi.mocked(toolCache.extractTar).mockResolvedValue(extracted);
    vi.mocked(toolCache.cacheDir).mockResolvedValue(extracted);
    vi.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stderr: '',
      stdout: 'shuck 0.0.43\n',
    });

    await expect(installShuck('0.0.43')).resolves.toMatchObject({
      binaryPath: binary,
    });
    expect(toolCache.downloadTool).toHaveBeenCalledTimes(2);
    expect(toolCache.extractTar).toHaveBeenCalledWith(archive, undefined, 'xJ');
    expect(toolCache.cacheDir).toHaveBeenCalledWith(
      extracted,
      'shuck',
      '0.0.43',
      'x86_64-unknown-linux-gnu',
    );
  });

  it('propagates installed-version validation failures', async () => {
    await fs.writeFile(path.join(tempRoot, 'shuck'), 'binary');
    vi.mocked(toolCache.find).mockReturnValue(tempRoot);
    vi.mocked(exec.getExecOutput).mockResolvedValue({
      exitCode: 0,
      stderr: '',
      stdout: 'shuck 0.0.42\n',
    });

    await expect(installShuck('0.0.43')).rejects.toThrow(
      'failed version validation',
    );
  });
});
