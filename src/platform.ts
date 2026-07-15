import { familySync } from 'detect-libc';

export const SUPPORTED_TARGETS = [
  'aarch64-apple-darwin',
  'aarch64-unknown-linux-gnu',
  'aarch64-unknown-linux-musl',
  'x86_64-unknown-linux-gnu',
  'x86_64-unknown-linux-musl',
  'x86_64-pc-windows-msvc',
] as const;

export type ShuckTarget = (typeof SUPPORTED_TARGETS)[number];
export type LinuxLibc = 'glibc' | 'musl';

export interface PlatformInfo {
  platform: NodeJS.Platform;
  arch: string;
  linuxLibc?: LinuxLibc | null;
}

export function currentPlatformInfo(): PlatformInfo {
  const detectedFamily =
    process.platform === 'linux' ? familySync() : undefined;
  const linuxLibc: LinuxLibc | null | undefined =
    detectedFamily === 'glibc' || detectedFamily === 'musl'
      ? detectedFamily
      : detectedFamily === undefined
        ? undefined
        : null;
  return {
    platform: process.platform,
    arch: process.arch,
    linuxLibc,
  };
}

export function resolveTarget(info: PlatformInfo): ShuckTarget {
  const { platform, arch } = info;

  if (platform === 'darwin' && arch === 'arm64') {
    return 'aarch64-apple-darwin';
  }

  if (platform === 'win32' && arch === 'x64') {
    return 'x86_64-pc-windows-msvc';
  }

  if (platform === 'linux' && (arch === 'x64' || arch === 'arm64')) {
    if (info.linuxLibc !== 'glibc' && info.linuxLibc !== 'musl') {
      throw new Error(
        `Unable to determine the Linux C library for ${arch}; expected glibc or musl`,
      );
    }

    const cpu = arch === 'x64' ? 'x86_64' : 'aarch64';
    const abi = info.linuxLibc === 'glibc' ? 'gnu' : 'musl';
    return `${cpu}-unknown-linux-${abi}` as ShuckTarget;
  }

  throw new Error(
    `Shuck does not publish an artifact for ${platform}/${arch}. Supported targets: ${SUPPORTED_TARGETS.join(', ')}`,
  );
}

export function archiveExtension(target: ShuckTarget): 'zip' | 'tar.xz' {
  return target === 'x86_64-pc-windows-msvc' ? 'zip' : 'tar.xz';
}

export function assetName(target: ShuckTarget): string {
  return `shuck-cli-${target}.${archiveExtension(target)}`;
}
