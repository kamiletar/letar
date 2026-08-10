---
description: Генерация каркаса Electron-приложения — протокол, ассоциации файлов, грабли платформы
allowed-tools: Bash, Read, Grep, Glob
---

# New Electron App — создание десктопного приложения

Создай новое Electron-приложение (Electron main + Next.js renderer).

**Имя приложения:** $ARGUMENTS

Для веб-приложений эта инструкция не подходит — там `/create:new-app`. Общие грабли платформы —
[.claude/rules/electron.md](/.claude/rules/electron.md), они обязательны к прочтению до первого
коммита.

## Electron-приложения монорепо (что копировать)

| Приложение                 | Чем полезно как образец                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `poster-microtext-desktop` | минимальный каркас + бизнес-логика: статический экспорт, `file://`, внешний exe                                                  |
| `label-printer-desktop`    | сложное приложение: Prisma/ZenStack, автообновление, аппаратная периферия                                                        |
| `animatrona`               | максимальная сложность: Next standalone-сервер внутри приложения, свои протоколы, БД через sql.js, deep links, e2e на Playwright |

## Шаг 1 — Генерация каркаса

```bash
nx g @letar/generators:electron-app <name>
```

С явными метаданными (`displayName` идёт в заголовок окна, `productName` и ярлыки инсталлятора):

```bash
nx g @letar/generators:electron-app <name> --displayName="Моё приложение" --description="Что делает" --private
```

Генератор раскладывает: `main/` (`background.ts`, `preload.ts`, `ipc/`), `renderer/` (Next.js
`output: 'export'` + Chakra UI v3), `nextron.config.js`, `main/webpack.config.js`,
`electron-builder.yml`, `project.json` (`dev`, `build:win`, `lint`, `typecheck:tsgo`, `format`),
`scripts/dev.js` + `scripts/generate-icons.mjs`, `resources/icon.svg`, `PLAN.md`,
`PLAN_TESTING.md`, `.gitignore`. Версия `electron`/`electron-builder` берётся из корневого
`package.json` и пиннится до точной (диапазон `^x.y.z` electron-builder не умеет).

Не перезаписывает существующее `apps/<name>` — падает с понятной ошибкой. Детали:
[libs/generators/README.md § electron-app](/libs/generators/README.md).

```bash
nx dev <name>              # каркас должен открыться и показать версию Electron
nx typecheck:tsgo <name>
nx lint <name>
```

## Шаг 2 — Решить главное: `file://` или `app://`

Генератор отдаёт renderer через `loadFile()` (`file://`) — самый дешёвый вариант. **Он не
подойдёт, если приложению нужен Web Worker или WASM:** под `file://` origin равен `null`, и
Chromium блокирует и Worker, и `fetch` к соседним файлам. Ловится только на живом запуске — сборка
и типы зелёные.

Задай себе вопрос **до** написания кода:

- [ ] Нужны Worker / WASM / secure context (`crypto.subtle`, Service Worker)? — например
      SubtitlesOctopus для ASS-субтитров, ffmpeg.wasm, любой парсер на WASM
- [ ] Нужно больше одной страницы (вложенные роуты)?

Хотя бы одно «да» → переходи на `app://`: `protocol.registerSchemesAsPrivileged` **до**
`app.whenReady()` + `protocol.handle` после, вместо `loadFile()` — `loadURL('app://bundle/')`.
Заодно снимается хак `assetPrefix: './'` и ограничение «одна страница на корне».

Готовый код, таблица выбора между `file://` / `app://` / localhost-сервером и способ проверить,
что дело именно в origin — [electron-app-protocol.md](/.claude/docs/electron-app-protocol.md).

Третий вариант (Next standalone-сервер внутри приложения, как в `animatrona`) нужен только когда
renderer'у требуются серверные возможности Next.js: API-роуты, server actions, ORM в рантайме.

## Шаг 3 — Открытие файлов: ассоциации + single instance lock

Нужно, если приложение открывает файлы (плеер, просмотрщик, редактор). Главный вход в такое
приложение — **двойной щелчок по файлу**, а не иконка, поэтому это не «потом», а часть первой
версии.

**1. Ассоциации в `electron-builder.yml`:**

```yaml
fileAssociations:
  - ext: [mkv, mp4]
    name: Video
    description: Видеофайл
    role: Viewer # macOS
    icon: resources/icon.ico
```

**2. Приём пути к файлу в main-процессе — три разных канала:**

```typescript
// Windows/Linux: путь приходит в argv при холодном старте.
// В dev первый аргумент — путь к скрипту, поэтому срезаем его через process.defaultApp
function fileFromArgv(argv: string[]): string | undefined {
  const args = process.defaultApp ? argv.slice(2) : argv.slice(1)
  return args.find((arg) => !arg.startsWith('--'))
}

// macOS: только событие, argv пустой. Вешать ДО whenReady — иначе событие потеряется
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  openFile(filePath)
})

// Приложение уже запущено — второй экземпляр не нужен, путь передаём первому
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const filePath = fileFromArgv(argv)
    if (filePath) {
      openFile(filePath)
    }
    // Развернуть и сфокусировать окно — иначе клик по файлу выглядит как «ничего не произошло»
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) {
        win.restore()
      }
      win.show()
      win.focus()
    }
  })
}
```

⚠️ **Путь может прийти раньше, чем renderer готов его принять.** Складывай его в переменную
(`pendingFile`) и отдавай renderer'у, когда тот сам запросит через IPC — иначе первый файл при
холодном старте молча теряется. Рабочий образец этого паттерна (для deep links, но логика та же) —
`apps/animatrona/main/services/deep-link.ts`: `pendingAction` + отдача по запросу renderer'а.

Если нужен ещё и свой URL-протокол (`myapp://...`) — `app.setAsDefaultProtocolClient` из того же
файла, там же различие dev/prod.

## Шаг 4 — Грабли, на которых спотыкались все три приложения

Полный список — [.claude/rules/electron.md](/.claude/rules/electron.md) § «Грабли». Минимум, что
нужно знать до первого билда:

- **Статический экспорт + `file://`** — нужен `assetPrefix: './'`, иначе JS не грузится и
  интерактивность мертва при внешне нормальной странице (или сразу `app://`, см. Шаг 2).
- **Native-модули под Bun + electron-builder** — транзитивные зависимости (`sharp` →
  `detect-libc`/`semver`) не резолвятся после упаковки. Предпочитай портативный exe через
  `child_process` вместо npm-пакета с нативным биндингом. Внешние бинарники — в `extraResources`,
  не в `files`.
- **Electron ≥32: `File.path` у drag&drop больше нет** — только `webUtils.getPathForFile(file)`
  через `contextBridge`.
- **Точная версия electron** в `devDependencies` (`"42.6.1"`, не `"^42.6.1"`) и `publish: null` в
  `electron-builder.yml`, если нет provider'а.
- **Вывод сторонних CLI парси с оглядкой на локаль** — на русской Windows проценты приходят как
  `0,00%`, регулярка на `\d+\.\d+%` молча не совпадает.

## Шаг 5 — Как проверять то, что нельзя проверить в песочнице

**GUI-уровень (клики, диалоги, drag&drop) в песочнице Claude Code не проверяется** — Chromium
network service падает даже с `--no-sandbox`. Не считай «собралось и алгоритм проверен» равным
«протестировано»: настоящие GUI-баги вылезают на первом живом запуске.

**Main-процесс проверяется headless, окно создавать не нужно:**

```bash
bun build main/services/<сервис>.ts --target=node --format=cjs \
  --external electron --outfile scripts/.bundle.cjs
npx electron scripts/verify-<что-проверяем>.cjs <аргументы>
```

Скрипт доходит до `app.whenReady()` и гоняет любые сервисы main-процесса — Chromium при этом не
поднимается, падать нечему. Так проверен весь пайплайн `poster-microtext-desktop` на реальной
картинке, без единого клика.

**Для GUI — e2e через Playwright + `electron.launch()`** (образец: `apps/animatrona-e2e`,
`helpers/electron.helpers.ts` — изолированный `--user-data-dir`, стабы `dialog.showOpenDialog`,
ожидание main-окна после splash). Заводится генератором:

```bash
nx g @letar/generators:e2e-suite <name>
```

⚠️ **E2E-тест, который «проходит», может ничего не проверять.** Прецедент в `animatrona-e2e`: все
тесты плеера искали `getByRole('link', { name: /плеер/i })`, а пункты сайдбара — `Box as="button"`.
Локатор не находился, тесты уходили в `test.skip()` и репорт был зелёным. Правила, чтобы не
повторить:

- скипать только по одной причине — отсутствие production-билда; всё остальное — провал теста;
- не использовать `isVisible()` для ожидания (возвращает результат немедленно) — только
  `expect(...).toBeVisible()` / `waitFor`;
- новый тест сначала прогнать на **старом** билде и убедиться, что он **падает** — иначе он не
  доказывает ничего.

## Шаг 6 — Дальнейшие шаги

- [ ] Иконка: заменить `resources/icon.svg` → `node scripts/generate-icons.mjs`
- [ ] `PLAN.md` приложения: занести реальные фазы вместо шаблонных
- [ ] `.claude/commands/<name>.md` — команда воркфлоу (шаблон в `/create:new-app`)
- [ ] Приватное приложение → git submodule `kamiletar/letar-private-<name>` (пошагово — в
      `/create:new-app` § «Приватные приложения»; `.gitignore` положить **до** первого `git add`)
- [ ] Обновить `paths:` в [.claude/rules/electron.md](/.claude/rules/electron.md) — добавить
      `apps/<name>/**`, иначе правила платформы не подхватятся в этой папке
- [ ] Сборка: `nx build:win <name>` (в генераторе только Windows-таргет — mac/linux дописывать
      руками по образцу `apps/animatrona/project.json`)
- [ ] Релизы десктопных приложений собираются из монорепо `letar` — отдельного репозитория не
      заводить

⛔ Деплой десктопных приложений через BlackCove не идёт — это не серверное приложение. Публикация
релиза (GitHub Releases, автообновление) — отдельная задача, образец — `label-printer-desktop`.
