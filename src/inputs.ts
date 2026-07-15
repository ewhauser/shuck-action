import * as fs from 'node:fs';
import * as path from 'node:path';

import * as core from '@actions/core';
import semver from 'semver';
import { parseArgsStringToArgv } from 'string-argv';

import type { ActionInputs, FormatMode, Mode } from './types';

const MODES = new Set<Mode>(['setup', 'check', 'format']);
const FORMAT_MODES = new Set<FormatMode>(['check', 'diff', 'write']);

export function normalizeVersion(raw: string): string {
  const normalized = raw.trim().replace(/^v/, '');
  const valid = semver.valid(normalized);
  if (valid === null || valid !== normalized) {
    throw new Error(
      `shuck-version must be an exact semantic version such as 0.0.43; received ${JSON.stringify(raw)}`,
    );
  }
  return valid;
}

export function parseMode(raw: string): Mode {
  const value = raw.trim().toLowerCase() as Mode;
  if (!MODES.has(value)) {
    throw new Error(
      `mode must be setup, check, or format; received ${JSON.stringify(raw)}`,
    );
  }
  return value;
}

export function parseFormatMode(raw: string): FormatMode {
  const value = raw.trim().toLowerCase() as FormatMode;
  if (!FORMAT_MODES.has(value)) {
    throw new Error(
      `format-mode must be check, diff, or write; received ${JSON.stringify(raw)}`,
    );
  }
  return value;
}

export function parseExtraArgs(raw: string): string[] {
  if (raw.trim() === '') {
    return [];
  }

  try {
    return parseArgsStringToArgv(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to parse args: ${message}`, { cause: error });
  }
}

function hasOption(args: string[], option: string): boolean {
  return args.some(
    (argument) => argument === option || argument.startsWith(`${option}=`),
  );
}

export function validateExtraArgs(mode: Mode, extraArgs: string[]): void {
  if (mode === 'setup' && extraArgs.length > 0) {
    throw new Error('args cannot be used when mode is setup');
  }

  if (mode === 'check' && hasOption(extraArgs, '--output-format')) {
    throw new Error(
      'args cannot override --output-format in check mode; the action reserves GitHub annotations',
    );
  }

  if (mode === 'format') {
    for (const option of ['--check', '--diff']) {
      if (hasOption(extraArgs, option)) {
        throw new Error(
          `args cannot include ${option}; use the format-mode input instead`,
        );
      }
    }
  }
}

export function resolveWorkingDirectory(
  raw: string,
  workspace: string,
): string {
  const workingDirectory = path.resolve(workspace, raw.trim() || '.');
  let stat: fs.Stats;
  try {
    stat = fs.statSync(workingDirectory);
  } catch (error) {
    throw new Error(`working-directory does not exist: ${workingDirectory}`, {
      cause: error,
    });
  }
  if (!stat.isDirectory()) {
    throw new Error(
      `working-directory is not a directory: ${workingDirectory}`,
    );
  }
  return workingDirectory;
}

export function readInputs(): ActionInputs {
  const mode = parseMode(core.getInput('mode', { required: true }));
  const version = normalizeVersion(
    core.getInput('shuck-version', { required: true }),
  );
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const workingDirectory = resolveWorkingDirectory(
    core.getInput('working-directory', { required: true }),
    workspace,
  );
  const paths = core
    .getMultilineInput('paths', { required: true })
    .map((value) => value.trim())
    .filter(Boolean);
  const extraArgs = parseExtraArgs(core.getInput('args'));
  const formatMode = parseFormatMode(
    core.getInput('format-mode', { required: true }),
  );

  if (mode !== 'setup' && paths.length === 0) {
    throw new Error('paths must contain at least one file or directory');
  }
  validateExtraArgs(mode, extraArgs);

  return { mode, version, workingDirectory, paths, extraArgs, formatMode };
}
