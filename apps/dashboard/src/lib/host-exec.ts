import { spawn } from 'child_process'

/** Allow-list валидация пути для защиты от command injection */
export const ALLOWED_WORKSPACES = ['/web/letar', '/home/deploy/letar'] as const

export function isAllowedWorkspace(dir: string): dir is (typeof ALLOWED_WORKSPACES)[number] {
  return ALLOWED_WORKSPACES.includes(dir as (typeof ALLOWED_WORKSPACES)[number])
}

export function getWorkspaceDir(): string {
  const dir = process.env.WORKSPACE_DIR || '/web/letar'
  return isAllowedWorkspace(dir) ? dir : '/web/letar'
}

/**
 * Выполняет команду на хосте через nsenter.
 * Контейнер dashboard запущен с `pid: host` + `privileged: true` (см. .claude/rules/dashboard.md),
 * поэтому PID 1 — это init процесс хоста.
 */
export function runOnHost(
  command: string,
  timeoutMs = 30000,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn('nsenter', ['-t', '1', '-m', '-u', '-i', '-n', '-p', '--', 'sh', '-c', command], {
      stdio: 'pipe',
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 0 })
    })

    proc.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, code: 1 })
    })

    setTimeout(() => {
      proc.kill()
      resolve({ stdout, stderr: stderr + '\nTimeout', code: 1 })
    }, timeoutMs)
  })
}
