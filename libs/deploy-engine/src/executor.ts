/**
 * Инжектируемый исполнитель shell/docker/файловых операций.
 *
 * `runDoctor`/`readManifest`/будущие `rollout`/`rollback` (§18.6 сессии G–H) принимают
 * `DeployEngineExecutor`, а не дёргают `node:child_process`/`node:fs` напрямую — так вся
 * логика движка тестируется без живого Docker/хоста (in-memory executor в спеках).
 *
 * Команды запускаются через `execFile` (аргументы отдельным массивом, без shell) —
 * не через `child_process.exec` со строковой интерполяцией.
 */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface DeployEngineExecutor {
  /** Запускает команду (docker/git/compose и т.п.) и возвращает результат без throw на ненулевой код. */
  runCommand(command: string, args: string[], opts?: { cwd?: string }): Promise<CommandResult>
  /** Читает файл относительно корня репозитория; `null`, если файла нет. */
  readFile(path: string): Promise<string | null>
  /** Пишет файл относительно корня репозитория, создавая недостающие директории. */
  writeFile(path: string, content: string): Promise<void>
  /** Проверяет существование файла относительно корня репозитория. */
  fileExists(path: string): Promise<boolean>
}

/**
 * Реальный executor поверх `node:child_process`/`node:fs`. `rootDir` — корень репозитория
 * (по умолчанию `process.cwd()`, переопределяется `DEPLOY_ENGINE_REPO_ROOT` — тот же паттерн,
 * что `DEPLOY_MCP_REPO_ROOT` в `libs/deploy-mcp/src/config.ts`).
 */
export function createNodeExecutor(rootDir?: string): DeployEngineExecutor {
  const root = rootDir ?? process.env['DEPLOY_ENGINE_REPO_ROOT'] ?? process.cwd()

  return {
    runCommand(command, args, opts) {
      return new Promise((resolvePromise) => {
        execFile(
          command,
          args,
          { cwd: opts?.cwd ?? root, maxBuffer: 10 * 1024 * 1024 },
          (error, stdout, stderr) => {
            const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0
            resolvePromise({ stdout: stdout.toString(), stderr: stderr.toString(), exitCode })
          },
        )
      })
    },
    async readFile(path) {
      try {
        return await readFile(resolve(root, path), 'utf8')
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          return null
        }
        throw err
      }
    },
    async writeFile(path, content) {
      const full = resolve(root, path)
      await mkdir(dirname(full), { recursive: true })
      await writeFile(full, content, 'utf8')
    },
    async fileExists(path) {
      return existsSync(resolve(root, path))
    },
  }
}
