import { ClamAvScanner } from './scanner-clamav'
import { FakeCleanScanner } from './scanner-fake'
import type { FileScanner, ScanResult } from './types'

/**
 * Выбор сканера по окружению. Правило одно: **не настроен — значит не пропускаем.**
 *
 * ⚠️ Намеренно НЕ смотрит на `NODE_ENV`. `next build`/`next start` выставляют его в
 * `production` всегда — и на staging, и на локальной сборке разработчика, поэтому решение
 * «здесь можно заглушку» по нему принимать нельзя (`.claude/rules/env-files.md`). Признак
 * ровно один: задан ли адрес настоящего сканера.
 */

/**
 * Сканер, который не сканирует. Отдаёт `SCAN_FAILED`, поэтому файл остаётся в карантине и
 * не считается проверенным. Загрузки из доверенных источников (собственный рендер PDF и т.п.),
 * для которых `scan()` вовсе не вызывается, эту заглушку не задевают.
 */
class UnavailableScanner implements FileScanner {
  readonly name = 'unavailable'
  readonly version = 'none'

  async scan(): Promise<ScanResult> {
    return { status: 'SCAN_FAILED', resultCode: 'SCANNER_NOT_CONFIGURED' }
  }
}

let cached: FileScanner | undefined

export function resolveFileScanner(): FileScanner {
  cached ??= createScanner()
  return cached
}

function createScanner(): FileScanner {
  const host = process.env.CLAMAV_HOST?.trim()
  if (host) {
    const port = Number(process.env.CLAMAV_PORT)
    return new ClamAvScanner({ host, port: Number.isFinite(port) && port > 0 ? port : undefined })
  }

  // Строгое сравнение со 'true': значения вроде '1'/'yes' не включают заглушку, чтобы
  // случайная переменная в чужом окружении не отключила проверку молча
  if (process.env.ALLOW_FAKE_FILE_SCANNER === 'true') {
    return new FakeCleanScanner()
  }

  return new UnavailableScanner()
}

/** Только для тестов: сбросить закешированный инстанс между наборами переменных окружения */
export function resetFileScannerCache(): void {
  cached = undefined
}
