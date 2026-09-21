// Общие функции скриптов dev-session-screenshot.mjs и dev-session-console-check.mjs.
// Логика входа за admin-гейт без Claude Browser tool — см. .claude/docs/dev-session-screenshot-bypass.md.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

/**
 * Читает DEV_SESSION_TOKEN из apps/<app>/.env.local. Путь считается от расположения этого файла,
 * а не от cwd — скрипт работает из любого каталога.
 */
export function readDevSessionToken(app) {
  const envPath = fileURLToPath(new URL(`../../../apps/${app}/.env.local`, import.meta.url))
  const tokenMatch = readFileSync(envPath, 'utf8').match(/^DEV_SESSION_TOKEN=(?:"([^"]+)"|(\S+))$/m)
  if (!tokenMatch) {
    throw new Error(`DEV_SESSION_TOKEN не найден в apps/${app}/.env.local — см. .claude/docs/verification-pitfalls.md`)
  }
  return tokenMatch[1] ?? tokenMatch[2]
}

/**
 * Проверяет, что аргумент похож на URL-путь. Признак подмены Git Bash (MSYS): вместо `/admin/...`
 * приходит Windows-путь `C:/Program Files/Git/admin/...`. При неудаче печатает подсказку и
 * завершает процесс с кодом 1.
 */
export function assertUrlPath(path) {
  if (!path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    console.error(
      `Путь «${path}» не похож на URL-путь. В Git Bash ведущий / подменяется на C:/Program Files/Git/… — `
        + 'запусти с MSYS_NO_PATHCONV=1 (в PowerShell не нужно).',
    )
    process.exit(1)
  }
}

/** Запускает chromium и открывает страницу в новом контексте с заданным viewport. */
export async function launchPage(viewport) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  return { browser, page }
}

/**
 * Программная авторизация через /api/auth/dev-session — секрет не покидает процесс.
 * Токен кодируется через encodeURIComponent: иначе `+` из base64 декодируется на сервере в пробел
 * (см. .claude/docs/dev-session-token-plus-char-query-corruption.md).
 */
export async function loginWithDevSession(page, baseUrl, email, token) {
  await page.goto(
    `${baseUrl}/api/auth/dev-session?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
  )
}
