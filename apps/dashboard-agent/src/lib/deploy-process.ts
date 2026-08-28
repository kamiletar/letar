/**
 * Обвязка над long-running процессом деплоя (nsenter/docker): жизненный цикл
 * child_process (stdout/stderr/close/error) и обёртка над разовыми docker-командами.
 */

import { type ChildProcess, exec } from 'child_process'
import { promisify } from 'util'
import { appendOutput, type DeployStatus, emitDeployEvent } from './deploy-history'
import { flushPersist } from './deploy-history-redis'
import { releaseHostLock } from './host-lock'

const execAsync = promisify(exec)

// Текущий процесс деплоя (для возможности отмены) — единственный на процесс,
// isDeployRunning() (lib/deploy-history.ts) отклоняет параллельные запуски.
let currentProcess: ChildProcess | null = null

export function getCurrentProcess(): ChildProcess | null {
  return currentProcess
}

export function setCurrentProcess(proc: ChildProcess | null): void {
  currentProcess = proc
}

/** Регистрирует stdout/stderr/close/error обработчики для long-running деплой-процесса
 * (nsenter-спавн на хосте). Общий код для /api/deploy/app и /api/deploy/infra — оба
 * запускают один и тот же жизненный цикл процесса, различается только сама команда. */
export function attachDeployProcessHandlers(deploy: DeployStatus, proc: ChildProcess): void {
  proc.stdout?.on('data', (data: Buffer) => {
    const lines = data
      .toString()
      .split('\n')
      .filter((line) => line.trim())
    for (const line of lines) {
      appendOutput(deploy, line)
    }
  })

  proc.stderr?.on('data', (data: Buffer) => {
    const lines = data
      .toString()
      .split('\n')
      .filter((line) => line.trim())
    for (const line of lines) {
      appendOutput(deploy, `⚠️ ${line}`)
    }
  })

  proc.on('close', (code) => {
    deploy.exitCode = code
    if (code === 0) {
      appendOutput(deploy, `✅ Deploy completed successfully`)
    } else {
      appendOutput(deploy, `❌ Deploy failed with exit code ${code}`)
      deploy.error = `Process exited with code ${code}`
    }
    deploy.running = false
    deploy.endTime = new Date().toISOString()
    currentProcess = null
    releaseHostLock()
    flushPersist(deploy)
    // appendOutput выше уже разбудил ожидающих deploy_wait, но синхронно ДО этой строки —
    // deploy.running там ещё был true. Будим ещё раз теперь, когда running реально false,
    // иначе deploy_wait не отпускается раньше таймаута на терминальном статусе.
    emitDeployEvent(deploy.deployId)
  })

  proc.on('error', (error) => {
    appendOutput(deploy, `❌ Process error: ${error.message}`)
    deploy.error = error.message
    deploy.running = false
    deploy.endTime = new Date().toISOString()
    currentProcess = null
    releaseHostLock()
    flushPersist(deploy)
    emitDeployEvent(deploy.deployId)
  })
}

/**
 * Выполняет docker команду
 */
export async function runDockerCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 120000 })
    return { stdout, stderr }
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; message?: string }
    throw new Error(execError.stderr || execError.message || 'Docker command failed', { cause: error })
  }
}
