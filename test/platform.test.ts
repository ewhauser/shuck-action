import { describe, expect, it } from 'vitest';

import { archiveExtension, assetName, resolveTarget } from '../src/platform';

describe('resolveTarget', () => {
  it.each([
    [{ platform: 'darwin', arch: 'arm64' }, 'aarch64-apple-darwin'],
    [{ platform: 'win32', arch: 'x64' }, 'x86_64-pc-windows-msvc'],
    [
      { platform: 'linux', arch: 'x64', linuxLibc: 'glibc' },
      'x86_64-unknown-linux-gnu',
    ],
    [
      { platform: 'linux', arch: 'x64', linuxLibc: 'musl' },
      'x86_64-unknown-linux-musl',
    ],
    [
      { platform: 'linux', arch: 'arm64', linuxLibc: 'glibc' },
      'aarch64-unknown-linux-gnu',
    ],
    [
      { platform: 'linux', arch: 'arm64', linuxLibc: 'musl' },
      'aarch64-unknown-linux-musl',
    ],
  ] as const)('maps %o to %s', (info, expected) => {
    expect(resolveTarget(info)).toBe(expected);
  });

  it('rejects unsupported architectures', () => {
    expect(() => resolveTarget({ platform: 'darwin', arch: 'x64' })).toThrow(
      'does not publish an artifact',
    );
  });

  it('rejects Linux when libc cannot be detected', () => {
    expect(() =>
      resolveTarget({ platform: 'linux', arch: 'x64', linuxLibc: null }),
    ).toThrow('Unable to determine the Linux C library');
  });
});

describe('release asset metadata', () => {
  it('uses zip for Windows and tar.xz elsewhere', () => {
    expect(archiveExtension('x86_64-pc-windows-msvc')).toBe('zip');
    expect(archiveExtension('aarch64-apple-darwin')).toBe('tar.xz');
    expect(assetName('x86_64-unknown-linux-gnu')).toBe(
      'shuck-cli-x86_64-unknown-linux-gnu.tar.xz',
    );
  });
});
