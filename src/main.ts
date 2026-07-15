import * as core from '@actions/core';
import * as exec from '@actions/exec';

import { buildInvocation } from './command';
import { readInputs } from './inputs';
import { installShuck } from './install';

export async function run(): Promise<void> {
  try {
    const inputs = readInputs();
    const installed = await installShuck(inputs.version);
    core.setOutput('shuck-version', installed.version);
    core.setOutput('shuck-path', installed.binaryPath);

    const invocation = buildInvocation(inputs);
    if (invocation === null) {
      core.info(`Shuck ${installed.version} is available on PATH`);
      return;
    }

    const exitCode = await exec.exec(installed.binaryPath, invocation.args, {
      cwd: invocation.cwd,
      env: invocation.env,
      ignoreReturnCode: true,
    });
    if (exitCode !== 0) {
      core.setFailed(`Shuck exited with status ${exitCode}`);
      process.exitCode = exitCode;
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error : String(error));
  }
}

void run();
