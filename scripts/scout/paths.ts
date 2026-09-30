import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Каталог скаута вне репозитория: индекс, состояние сессий, логи справок.
 * `SCOUT_HOME` перекрывает; по умолчанию на Windows — `C:\ai\scout` (рядом с моделями), иначе `~/.cache/letar-scout`.
 */
export function scoutHome(): string {
  if (process.env.SCOUT_HOME) {
    return process.env.SCOUT_HOME
  }
  return process.platform === 'win32' ? 'C:\\ai\\scout' : join(homedir(), '.cache', 'letar-scout')
}

/** Каталог проверочных данных (транскрипты, eval) — тоже вне репозитория */
export function scoutDataDir(): string {
  if (process.env.SCOUT_DATA) {
    return process.env.SCOUT_DATA
  }
  return process.platform === 'win32' ? 'C:\\ai\\data' : join(scoutHome(), 'data')
}
