import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  normalizeVersion,
  parseExtraArgs,
  parseFormatMode,
  parseMode,
  resolveWorkingDirectory,
  validateExtraArgs,
} from '../src/inputs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'shuck-action-inputs-'));

afterAll(() => {
  fs.rmSync(tempRoot, { force: true, recursive: true });
});

describe('input parsing', () => {
  it('normalizes exact versions', () => {
    expect(normalizeVersion('v0.0.43')).toBe('0.0.43');
    expect(normalizeVersion(' 1.2.3-rc.1 ')).toBe('1.2.3-rc.1');
  });

  it.each(['latest', '^1.2.3', 'v1', '1.2'])(
    'rejects version %s',
    (version) => {
      expect(() => normalizeVersion(version)).toThrow('exact semantic version');
    },
  );

  it('parses modes case-insensitively', () => {
    expect(parseMode(' CHECK ')).toBe('check');
    expect(parseFormatMode('write')).toBe('write');
    expect(() => parseMode('lint')).toThrow('setup, check, or format');
  });

  it('tokenizes quotes without invoking a shell', () => {
    expect(
      parseExtraArgs('--select C001 --exclude "path with spaces"'),
    ).toEqual(['--select', 'C001', '--exclude', 'path with spaces']);
    expect(parseExtraArgs('; touch /tmp/not-executed')).toEqual([
      ';',
      'touch',
      '/tmp/not-executed',
    ]);
  });

  it('rejects reserved arguments', () => {
    expect(() => validateExtraArgs('check', ['--output-format=json'])).toThrow(
      'reserves GitHub annotations',
    );
    expect(() => validateExtraArgs('format', ['--diff'])).toThrow(
      'format-mode',
    );
    expect(() => validateExtraArgs('setup', ['--help'])).toThrow(
      'mode is setup',
    );
  });

  it('resolves an existing working directory', () => {
    const nested = path.join(tempRoot, 'nested');
    fs.mkdirSync(nested);
    expect(resolveWorkingDirectory('nested', tempRoot)).toBe(nested);
    expect(() => resolveWorkingDirectory('missing', tempRoot)).toThrow(
      'does not exist',
    );
  });
});
