import { describe, expect, it } from 'vitest';

import { buildInvocation } from '../src/command';
import type { ActionInputs } from '../src/types';

function inputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    mode: 'check',
    version: '0.0.43',
    workingDirectory: '/workspace',
    paths: ['scripts', 'path with spaces/file.sh'],
    extraArgs: ['--no-cache'],
    formatMode: 'check',
    ...overrides,
  };
}

describe('buildInvocation', () => {
  it('builds an annotated check command', () => {
    expect(buildInvocation(inputs())).toEqual({
      args: [
        'check',
        '--output-format',
        'github',
        '--no-cache',
        'scripts',
        'path with spaces/file.sh',
      ],
      cwd: '/workspace',
      env: undefined,
    });
  });

  it.each([
    ['check', '--check'],
    ['diff', '--diff'],
    ['write', undefined],
  ] as const)('maps format-mode %s', (formatMode, expectedFlag) => {
    const invocation = buildInvocation(
      inputs({ mode: 'format', formatMode, extraArgs: [], paths: ['.'] }),
    );
    expect(invocation?.args[0]).toBe('format');
    if (expectedFlag === undefined) {
      expect(invocation?.args).not.toContain('--check');
      expect(invocation?.args).not.toContain('--diff');
    } else {
      expect(invocation?.args).toContain(expectedFlag);
    }
    expect(invocation?.env?.SHUCK_EXPERIMENTAL).toBe('1');
  });

  it('does not run a command in setup mode', () => {
    expect(buildInvocation(inputs({ mode: 'setup', paths: [] }))).toBeNull();
  });
});
