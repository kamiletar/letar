/**
 * Disk Space — утилиты для проверки свободного места на диске
 *
 * Использует Node.js 18.15+ fs.statfs (доступен на Windows в Node 22+).
 * Применяется для защитных остановок длительных операций (регенерация
 * манифестов, импорт) когда свободное место опускается ниже порога.
 */

import { statfs } from 'node:fs/promises'
import os from 'node:os'

import { createModuleLogger } from './logger'

const log = createModuleLogger('DiskSpace')

/** Порог свободного места по умолчанию — 30 ГБ */
export const LOW_DISK_THRESHOLD_GB = 30

/**
 * Получить количество свободных байт на диске, где расположен указанный путь.
 * Возвращает Infinity если statfs недоступен (старый Node) — fail-open.
 */
export async function getDiskFreeBytes(path: string): Promise<number> {
  try {
    const stats = await statfs(path)
    return stats.bfree * stats.bsize
  } catch (error) {
    log.warn('statfs недоступен, считаем диск свободным', { path, error: String(error) })
    return Infinity
  }
}

/**
 * Получить свободное место на диске в ГБ.
 */
export async function getDiskFreeGb(path: string): Promise<number> {
  const bytes = await getDiskFreeBytes(path)
  return bytes / 1024 ** 3
}

/**
 * Проверить что на диске достаточно свободного места.
 *
 * @param path     Любой путь на проверяемом диске (напр. app data dir)
 * @param minGb    Минимально допустимый остаток в ГБ (по умолчанию 30)
 */
export async function hasSufficientDiskSpace(
  path: string = os.homedir(),
  minGb: number = LOW_DISK_THRESHOLD_GB
): Promise<boolean> {
  const freeGb = await getDiskFreeGb(path)
  const ok = freeGb >= minGb
  if (!ok) {
    log.warn('Мало свободного места на диске', {
      path,
      freeGb: freeGb.toFixed(1),
      thresholdGb: minGb,
    })
  }
  return ok
}
