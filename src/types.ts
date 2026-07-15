export type Mode = 'setup' | 'check' | 'format';
export type FormatMode = 'check' | 'diff' | 'write';

export interface ActionInputs {
  mode: Mode;
  version: string;
  workingDirectory: string;
  paths: string[];
  extraArgs: string[];
  formatMode: FormatMode;
}

export interface Invocation {
  args: string[];
  cwd: string;
  env?: Record<string, string>;
}
