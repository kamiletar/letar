/**
 * Чтение секретов приложений из смонтированных `.env.docker`.
 *
 * Агенту в `docker-compose.production.yml` прокинуты `apps/<app>/.env.docker` как
 * `/secrets/<app>.env` (только чтение) — изначально ради credentials к БД. Здесь тот же
 * источник используется для `CRON_SECRET`.
 *
 * ⚠️ Почему секрет берётся из файла приложения, а не из окружения агента (PLAN-INFRA.md §52):
 * `CRON_SECRET` — **не общий** секрет монорепо. Каждое приложение генерировало свой, и это
 * правильно: периметр доверия у studio и dashboard разный. Агент до 2026-08-07 слал всем один
 * свой секрет, поэтому все задачи к приложениям с несовпавшим секретом молча падали с 401.
 * Единственный источник истины — `.env.docker` самого приложения; дублировать его в конфиг
 * агента нельзя, иначе две копии снова разъедутся, и разъезд снова будет тихим.
 */

import { existsSync, readFileSync } from 'fs'
import path from 'path'

/** Каталог со смонтированными секретами. Переопределяется в тестах. */
function getSecretsDir(): string {
  return process.env.SECRETS_DIR || '/secrets'
}

// Кэш распарсенных файлов: содержимое меняется только при деплое, а он пересоздаёт контейнер
const envCache = new Map<string, Record<string, string>>()

/**
 * Парсит `.env`-файл в объект. Отсутствующий файл — не ошибка: возвращается пустой объект,
 * решение принимает вызывающий код.
 */
export function parseEnvFile(filePath: string): Record<string, string> {
  const cached = envCache.get(filePath)
  if (cached) {
    return cached
  }

  const result: Record<string, string> = {}

  if (!existsSync(filePath)) {
    console.warn(`[AppSecrets] Файл секретов не найден: ${filePath}`)
    return result
  }

  try {
    for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) {
        continue
      }

      const key = trimmed.substring(0, eqIndex).trim()
      let value = trimmed.substring(eqIndex + 1).trim()

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      result[key] = value
    }

    envCache.set(filePath, result)
  } catch (error) {
    console.error(`[AppSecrets] Ошибка чтения ${filePath}:`, error)
  }

  return result
}

/** Сбрасывает кэш. Нужен тестам; в рантайме файлы не меняются без пересоздания контейнера. */
export function clearEnvCache(): void {
  envCache.clear()
}

/**
 * Возвращает `CRON_SECRET` приложения или `null`, если его негде взять.
 *
 * ⛔ Никакого fallback на секрет агента для чужих приложений: подставленный «хоть какой-то»
 * секрет даёт 401, неотличимый от настоящей проблемы авторизации. `null` позволяет вызывающему
 * коду сказать прямо, чего не хватает.
 *
 * Исключение — сам `dashboard-agent`: собственный файл он не монтирует, его секрет живёт в
 * окружении процесса.
 */
export function getAppCronSecret(app: string): string | null {
  if (app === 'dashboard-agent') {
    return process.env.CRON_SECRET || null
  }

  const secret = parseEnvFile(path.join(getSecretsDir(), `${app}.env`))['CRON_SECRET']

  return secret || null
}

/**
 * Публичный `BETTER_AUTH_URL` приложения — из того же смонтированного `.env.docker`.
 *
 * Нужен как значение заголовка `Origin` для серверных вызовов better-auth-эндпоинтов
 * (`login-canary.ts`, `login-canary-setup.ts`): better-auth проверяет `Origin` против
 * `trustedOrigins` на каждом POST (CSRF-защита) и отклоняет запрос без него —
 * `MISSING_OR_NULL_ORIGIN`, а на части приложений (без явно заданного `trustedOrigins`,
 * например mandala) отсутствие заголовка роняет обработчик необработанным исключением
 * (HTTP 500 с пустым телом) вместо чистого 403.
 *
 * ⛔ Намеренно не хардкодится ни в одном приложении: часть из 9 приложений — приватные
 * submodule (aboi, driving-school, dsperevod), их production-домен — коммерческая тайна,
 * писать литералом в публичный `dashboard-agent` нельзя (`public-repo-hygiene.md`).
 */
export function getAppOrigin(app: string): string | null {
  const origin = parseEnvFile(path.join(getSecretsDir(), `${app}.env`))['BETTER_AUTH_URL']

  return origin || null
}
