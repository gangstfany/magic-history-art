import { spawn } from 'node:child_process';

export const RELEASE_STAGE_TIMEOUT_MS = 12 * 60 * 1000;
export const RELEASE_STAGE_FORCE_KILL_MS = 5_000;

export function runReleaseStage({
  label,
  args,
  cwd,
  command = process.execPath,
  timeoutMs = RELEASE_STAGE_TIMEOUT_MS,
  forceKillMs = RELEASE_STAGE_FORCE_KILL_MS,
  stdio = 'inherit',
}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio });
    let timedOut = false;
    let settled = false;
    let forceKillTimer;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      forceKillTimer = setTimeout(() => child.kill('SIGKILL'), forceKillMs);
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timeout);
      clearTimeout(forceKillTimer);
    };
    const settle = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    child.once('error', (error) => {
      settle(new Error(`Release stage failed during ${label}: ${error.message}`));
    });
    child.once('close', (code, signal) => {
      if (timedOut) {
        settle(new Error(`Release stage timed out during ${label} after ${timeoutMs} ms`));
      } else if (code !== 0) {
        settle(new Error(
          `Release stage failed during ${label}: `
            + (signal ? `signal ${signal}` : `exit code ${code}`),
        ));
      } else {
        settle();
      }
    });
  });
}
