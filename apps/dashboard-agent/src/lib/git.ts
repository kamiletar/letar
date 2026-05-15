/**
 * Git операции для dashboard-agent
 * Работа с git репозиторием через child_process
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Путь к репозиторию (по умолчанию /home/deploy/letar)
const REPO_PATH = process.env.REPO_PATH || '/home/deploy/letar'

/**
 * Выполнить git команду в репозитории
 */
async function gitExec(command: string): Promise<string> {
  // -c safe.directory=* нужен когда git запускается от root, а репозиторий принадлежит другому пользователю
  const { stdout } = await execAsync(`git -c safe.directory='*' -C ${REPO_PATH} ${command}`, {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024, // 10MB для больших diff
  })
  return stdout.trim()
}

// =============================================================================
// Types
// =============================================================================

export interface GitStatus {
  /** Текущая ветка */
  current: string
  /** Репозиторий чистый (нет изменений) */
  isClean: boolean
  /** Изменённые файлы */
  modified: string[]
  /** Новые файлы (untracked) */
  created: string[]
  /** Удалённые файлы */
  deleted: string[]
  /** Коммитов впереди remote */
  ahead: number
  /** Коммитов позади remote */
  behind: number
}

export interface GitCommit {
  /** Полный хеш коммита */
  hash: string
  /** Короткий хеш (7 символов) */
  shortHash: string
  /** Сообщение коммита */
  message: string
  /** Автор */
  author: string
  /** Дата коммита */
  date: string
}

export interface GitStatusResult {
  status: GitStatus
  currentCommit: GitCommit
}

export interface GitIncomingResult {
  count: number
  commits: GitCommit[]
}

export interface GitPullResult {
  success: boolean
  upToDate: boolean
  output: string
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Получить статус репозитория
 */
export async function getGitStatus(): Promise<GitStatusResult> {
  // Получаем текущую ветку
  const current = await gitExec('rev-parse --abbrev-ref HEAD')

  // Получаем статус (porcelain формат для парсинга)
  const statusOutput = await gitExec('status --porcelain')
  const lines = statusOutput.split('\n').filter(Boolean)

  const modified: string[] = []
  const created: string[] = []
  const deleted: string[] = []

  for (const line of lines) {
    const status = line.substring(0, 2)
    const file = line.substring(3)

    if (status.includes('M') || status.includes('U')) {
      modified.push(file)
    } else if (status.includes('?') || status.includes('A')) {
      created.push(file)
    } else if (status.includes('D')) {
      deleted.push(file)
    }
  }

  // Получаем ahead/behind
  let ahead = 0
  let behind = 0
  try {
    const revList = await gitExec(`rev-list --left-right --count origin/${current}...HEAD`)
    const [behindStr, aheadStr] = revList.split('\t')
    behind = parseInt(behindStr, 10) || 0
    ahead = parseInt(aheadStr, 10) || 0
  } catch {
    // Нет remote tracking или ошибка — игнорируем
  }

  // Получаем текущий коммит
  const currentCommit = await getCurrentCommit()

  const isClean = modified.length === 0 && created.length === 0 && deleted.length === 0

  return {
    status: {
      current,
      isClean,
      modified,
      created,
      deleted,
      ahead,
      behind,
    },
    currentCommit,
  }
}

/**
 * Получить текущий коммит
 */
export async function getCurrentCommit(): Promise<GitCommit> {
  const format = '%H%n%h%n%s%n%an%n%ci'
  const output = await gitExec(`log -1 --format="${format}"`)
  const [hash, shortHash, message, author, date] = output.split('\n')

  return { hash, shortHash, message, author, date }
}

/**
 * Получить входящие коммиты (на remote, но не в локальном)
 */
export async function getIncomingCommits(): Promise<GitIncomingResult> {
  // Сначала fetch
  try {
    await gitExec('fetch --quiet')
  } catch {
    // Игнорируем ошибки fetch
  }

  // Получаем текущую ветку
  const current = await gitExec('rev-parse --abbrev-ref HEAD')

  // Получаем список коммитов, которые есть на remote, но нет локально
  let commits: GitCommit[] = []
  try {
    const format = '%H|%h|%s|%an|%ci'
    const output = await gitExec(`log HEAD..origin/${current} --format="${format}"`)

    if (output) {
      commits = output
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, shortHash, message, author, date] = line.split('|')
          return { hash, shortHash, message, author, date }
        })
    }
  } catch {
    // Нет remote tracking — возвращаем пустой список
  }

  return {
    count: commits.length,
    commits,
  }
}

/**
 * Выполнить git pull
 */
export async function gitPull(): Promise<GitPullResult> {
  try {
    const output = await gitExec('pull --ff-only')
    const upToDate = output.includes('Already up to date') || output.includes('Already up-to-date')

    return {
      success: true,
      upToDate,
      output,
    }
  } catch (error) {
    return {
      success: false,
      upToDate: false,
      output: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
