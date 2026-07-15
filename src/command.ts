import type { ActionInputs, Invocation } from './types';

export function buildInvocation(inputs: ActionInputs): Invocation | null {
  if (inputs.mode === 'setup') {
    return null;
  }

  const args: string[] = [inputs.mode];
  let env: Record<string, string> | undefined;

  if (inputs.mode === 'check') {
    args.push('--output-format', 'github');
  } else {
    env = Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    );
    env.SHUCK_EXPERIMENTAL = '1';
    if (inputs.formatMode === 'check') {
      args.push('--check');
    } else if (inputs.formatMode === 'diff') {
      args.push('--diff');
    }
  }

  args.push(...inputs.extraArgs, ...inputs.paths);
  return { args, cwd: inputs.workingDirectory, env };
}
