// Сбор ошибок консоли (error/warning) и pageerror со страницы за dev-session — без Claude Browser tool.
//
// Зачем: при разборе ошибок гидратации React (#418) нужен не скриншот, а текст консоли: в dev React
// печатает дифф несовпавшего узла. Логин за admin-гейтом тот же, что у dev-session-screenshot.mjs
// (см. .claude/docs/dev-session-screenshot-bypass.md): программно, внутри отдельного Node/Playwright-
// процесса. Токен читается из apps/<app>/.env.local внутри скрипта — в аргументы командной строки и
// в вывод он не попадает (в тексте сообщений консоли и URL значение маскируется как ***).
//
// Требует: `createDevSessionRoute` из @letar/auth/server в приложении (ALLOW_DEV_SESSION +
// DEV_SESSION_TOKEN в apps/<app>/.env.local) и уже запущенный dev-сервер (preview_start).
//
// ⚠️ Git Bash на Windows (MSYS) подменяет ведущий `/` в аргументе пути: `/admin/...` превращается в
// `C:/Program Files/Git/admin/...`. Запускать с `MSYS_NO_PATHCONV=1` (в PowerShell не нужно).
//
// Запуск из корня репо:
//   MSYS_NO_PATHCONV=1 node .claude/scripts/dev-session-console-check.mjs <app> <port> <path> [email] [--reload-after-fill [--accept-restore]]
// Пример:
//   MSYS_NO_PATHCONV=1 node .claude/scripts/dev-session-console-check.mjs domwellbes 3025 /admin/materials/new admin@domwellbes.local --reload-after-fill
//
// --reload-after-fill: ввести текст в первые видимые текстовые поля открытого шага, подождать
// автосохранение черновика, перезагрузить страницу (проверка черновика формы из localStorage) и
// собрать консоль ещё раз. Диалог «Восстановить черновик» скрипт лишь фиксирует; --accept-restore
// (вместе с --reload-after-fill) ещё и нажимает «Восстановить» — проверить гидратацию восстановленных
// значений. Код возврата: 1 — есть error/pageerror, 0 — только warning или тишина.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const FILL_FIELDS_COUNT = 3
const DRAFT_SAVE_WAIT_MS = 1500
const RESTORE_WAIT_MS = 3000
const MAX_MESSAGE_LENGTH = 4000

const args = process.argv.slice(2)
const reloadAfterFill = args.includes('--reload-after-fill')
const acceptRestore = args.includes('--accept-restore')
const [app, port, targetPath, email = `admin@${app}.local`] = args.filter((a) => !a.startsWith('--'))
if (!app || !port || !targetPath) {
  console.error(
    'Usage: MSYS_NO_PATHCONV=1 node dev-session-console-check.mjs <app> <port> <path> [email] [--reload-after-fill [--accept-restore]]',
  )
  process.exit(1)
}
// Признак подмены пути Git Bash: вместо `/admin/...` пришёл Windows-путь
if (!targetPath.startsWith('/') || /^[A-Za-z]:/.test(targetPath)) {
  console.error(
    `Путь «${targetPath}» не похож на URL-путь. В Git Bash ведущий / подменяется на C:/Program Files/Git/… — `
      + 'запусти с MSYS_NO_PATHCONV=1 (в PowerShell не нужно).',
  )
  process.exit(1)
}

const BASE_URL = `http://localhost:${port}`
const envPath = fileURLToPath(new URL(`../../apps/${app}/.env.local`, import.meta.url))
const tokenMatch = readFileSync(envPath, 'utf8').match(/^DEV_SESSION_TOKEN=(?:"([^"]+)"|(\S+))$/m)
if (!tokenMatch) {
  throw new Error(`DEV_SESSION_TOKEN не найден в apps/${app}/.env.local — см. .claude/docs/verification-pitfalls.md`)
}
const token = tokenMatch[1] ?? tokenMatch[2]

// Маскировка секрета в любом тексте, который уйдёт в вывод (сырой и URL-кодированный вид)
const secretForms = [...new Set([token, encodeURIComponent(token)])]
const mask = (text) => secretForms.reduce((acc, form) => acc.split(form).join('***'), text)
const clip = (text) => text.length > MAX_MESSAGE_LENGTH ? `${text.slice(0, MAX_MESSAGE_LENGTH)}… [обрезано]` : text

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()

// Программная авторизация — секрет не покидает этот процесс. + в токене кодируется через encodeURIComponent
await page.goto(
  `${BASE_URL}/api/auth/dev-session?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
)

// Слушатели — после логина: шум самого dev-session-запроса в отчёт не нужен
let phase = 'load'
const collected = []
page.on('console', (msg) => {
  const type = msg.type()
  if (type !== 'error' && type !== 'warning') {
    return
  }
  collected.push({ phase, kind: type, text: msg.text(), where: msg.location().url })
})
page.on('pageerror', (error) => {
  collected.push({ phase, kind: 'pageerror', text: error.stack ?? String(error), where: '' })
})

const settle = async () => {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500) // дать догрузиться lazy-контенту и отработать гидратации
}

// Первые видимые редактируемые текстовые поля открытого шага
const textFields = () =>
  page.locator('input:not([type]), input[type="text"], input[type="search"], textarea').and(
    page.locator(':visible:not([readonly]):not([disabled])'),
  )

const fillValues = []
const readValues = async () => {
  const fields = textFields()
  const count = Math.min(await fields.count(), FILL_FIELDS_COUNT)
  return Promise.all(Array.from({ length: count }, (_, i) => fields.nth(i).inputValue()))
}

await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: 'networkidle' })
await settle()

if (reloadAfterFill) {
  const fields = textFields()
  const count = Math.min(await fields.count(), FILL_FIELDS_COUNT)
  for (let i = 0; i < count; i++) {
    const value = `Проверка черновика ${i + 1}`
    await fields.nth(i).fill(value)
    fillValues.push(value)
  }
  await page.waitForTimeout(DRAFT_SAVE_WAIT_MS) // автосохранение черновика обычно с debounce
  // Только имена ключей и размер значения — содержимое localStorage в вывод не выносим
  const draftKeys = await page.evaluate(() =>
    Object.keys(localStorage).map((key) => `${key} (${localStorage.getItem(key)?.length ?? 0} симв.)`)
  )

  phase = 'after-reload'
  await page.reload({ waitUntil: 'networkidle' })
  await settle()
  // @letar/forms предлагает черновик диалогом («Восстановить» / отклонить) — поля остаются пустыми,
  // пока диалог не принят. Сообщаем, показан ли он; --accept-restore нажимает «Восстановить».
  const dialog = page.getByRole('dialog').first()
  const dialogShown = await dialog.waitFor({ state: 'visible', timeout: RESTORE_WAIT_MS }).then(() => true, () => false)
  console.log(`Диалог восстановления черновика после перезагрузки: ${dialogShown ? 'показан' : 'не показан'}`)
  if (dialogShown && acceptRestore) {
    await dialog.getByRole('button', { name: /Восстановить|Restore/i }).click()
    await settle()
  }
  let restored = await readValues()
  for (let waited = 0; waited < RESTORE_WAIT_MS && restored.every((v) => v === ''); waited += 250) {
    await page.waitForTimeout(250)
    restored = await readValues()
  }

  console.log(`Заполнено полей: ${count}; ключи localStorage: ${draftKeys.join(', ') || '(пусто)'}`)
  fillValues.forEach((value, i) => {
    console.log(`  поле ${i + 1}: «${value}» → после перезагрузки «${restored[i] ?? '(поля нет)'}»`)
  })
}

await browser.close()

const errors = collected.filter((m) => m.kind !== 'warning')
console.log(`\nСообщений консоли: ${collected.length} (error/pageerror: ${errors.length})`)
for (const m of collected) {
  console.log(`\n[${m.phase}] ${m.kind}${m.where ? ` @ ${mask(m.where)}` : ''}\n${clip(mask(m.text))}`)
}
process.exit(errors.length > 0 ? 1 : 0)
