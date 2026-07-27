---
paths: apps/label-printer-desktop/**, apps/poster-microtext-desktop/**
---

# Правила для Electron приложений

## Архитектура Nextron

```
apps/label-printer-desktop/
├── main/                    # Electron main process
│   ├── background.ts        # Entry point
│   ├── preload.ts           # IPC bridge
│   └── ipc/                 # IPC handlers
├── renderer/                # Next.js (UI)
│   ├── app/                 # Страницы
│   └── lib/                 # Утилиты
└── src/generated/           # ZenStack/Prisma
```

Второй пример — `apps/poster-microtext-desktop` (приватный submodule): упрощённый вариант без
Prisma/сервера — renderer собран как статический экспорт Next.js (`output: 'export'`), без Next
standalone-сервера внутри приложения; вся логика идёт через IPC. Смотри туда, когда новому
приложению не нужна БД/сложный бэкенд — там же примеры фиксов из раздела «Грабли» ниже.

## Новое приложение — через генератор

```bash
nx g @letar/generators:electron-app <name>
# с явным displayName/description/private:
nx g @letar/generators:electron-app <name> --displayName="Моё приложение" --private
```

Скаффолдит минимальный рабочий Nextron-каркас (`main/`, `renderer/` со статическим экспортом,
`nextron.config.js`, `project.json`, `electron-builder.yml`, `main/webpack.config.js`,
`scripts/dev.js`+`generate-icons.mjs`) с уже впаянными фиксами всех граблей ниже — точная версия
electron, `assetPrefix` под `file://`, `publish: null`. Версия electron/electron-builder берётся
из корневого `package.json` монорепо. Подробности и что делать дальше — в
`libs/generators/README.md` и в сгенерированном `README.md` приложения.

Генератор создаёт **минимальный** каркас без БД/сканера/автообновления — для сложного приложения
смотри `label-printer-desktop` как эталон и дописывай руками. `poster-microtext-desktop` —
пример минимального каркаса с добавленной бизнес-логикой (наглядно показывает, что и куда
дописывать после генерации).

## Main Process

```typescript
// main/background.ts
import { app, ipcMain } from 'electron'

// Регистрация IPC handlers
import './ipc/printer.handlers'
import './ipc/settings.handlers'
```

## IPC Handlers

```typescript
// main/ipc/printer.handlers.ts
import { ipcMain } from 'electron'

ipcMain.handle('printer:print', async (event, data) => {
  // Логика печати
  return { success: true }
})

ipcMain.handle('printer:status', async () => {
  return { connected: true, name: 'TSC TE210' }
})
```

## Preload Script

```typescript
// main/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  printer: {
    print: (data: PrintData) => ipcRenderer.invoke('printer:print', data),
    getStatus: () => ipcRenderer.invoke('printer:status'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings: Settings) => ipcRenderer.invoke('settings:save', settings),
  },
})
```

## Renderer (Next.js)

```typescript
// renderer/lib/electron.ts
declare global {
  interface Window {
    electronAPI: {
      printer: {
        print: (data: PrintData) => Promise<PrintResult>
        getStatus: () => Promise<PrinterStatus>
      }
    }
  }
}

// Использование
const status = await window.electronAPI.printer.getStatus()
```

## Shared библиотека

Используй `@letar/label-printer-core` для:

- GS1Parser — парсинг кодов
- ImageGeneratorService — генерация этикеток
- TSPLService — команды принтера

```typescript
import { GS1Parser, ImageGeneratorService } from '@letar/label-printer-core'
```

## Правила

- Main process — только Node.js код
- Renderer — React/Next.js код
- IPC — единственный способ связи между процессами
- Preload — минимальный bridge, без бизнес-логики
- Типизация — общие типы в `renderer/types/electron.d.ts`

## Сторонние CLI-инструменты: portable exe вместо native-модуля

Когда приложению нужен тяжёлый сторонний инструмент (апскейлер, кодек, ML-модель),
**предпочитай портативный exe, вызываемый через `child_process`, а не npm-пакет с нативным
биндингом.** Причина — раздел про упаковку native-модулей ниже: транзитивные зависимости
нативных пакетов под Bun+electron-builder резолвятся непредсказуемо, и ошибка вылезает
только в рантайме упакованной сборки. Отдельный процесс этой проблемы лишён вовсе.

Прецедент: `poster-microtext-desktop` использует `realesrgan-ncnn-vulkan` (Real-ESRGAN
через Vulkan, работает на любой видеокарте, Python не нужен) вместо npm-обёрток вокруг
ONNX/torch.

**Где хранить:** `apps/<app>/vendor/<tool>/`, папка добавлена в `.gitignore` приложения —
бинарники (десятки-сотни МБ) в git не тащим. В README/PLAN приложения обязательно записать
точный URL релиза и версию, чтобы инструмент можно было восстановить после клонирования.

**Что учесть при упаковке** (актуально в момент интеграции, не раньше):

- `extraResources` в `electron-builder.yml` — иначе exe не попадёт в сборку;
- путь резолвить по-разному в dev и в проде (`process.resourcesPath` против пути в репо);
- дочерний процесс наследует stdout — прогресс инструмента можно парсить и слать в UI
  через тот же IPC-канал прогресса, что и остальные этапы.

## Грабли (найдено на `poster-microtext-desktop`, 2026-07-18)

**Статический экспорт Next.js (`output: 'export'`) + `loadFile()` (file://) — только
относительные пути к ассетам.** По умолчанию Next генерирует `<script src="/_next/...">`
(абсолютный путь). Под `file://` браузер резолвит его от корня диска — JS вообще не грузится,
страница выглядит нормально отрендеренной (HTML/CSS есть), но **вся интерактивность мертва**
(клики по кнопкам ничего не делают — выглядит как «кнопка не работает», а не как ошибка).
Фикс: `assetPrefix: isProd ? './' : undefined` в `next.config.js`. Работает корректно только
если экспортируемая страница на **глубине 0** (`out/index.html` рядом с `out/_next/`) — для
однoстраничных Electron-приложений держи единственную реальную страницу на корне `/`, без
вложенных роутов, иначе `_next` не найдётся относительным путём.

**Electron ≥32: `File.path` у перетащенных (drag&drop) файлов больше не работает** — убрано
из соображений безопасности. Нужен `webUtils.getPathForFile(file)` (модуль `electron`,
доступен в preload), экспортированный через `contextBridge` как функция, принимающая `File`
(объект `File` корректно проходит границу изолированного мира context bridge).

**electron-builder + Bun монорепо: транзитивные зависимости native-модулей не хостятся в root
node_modules и не резолвятся под plain Node.js после упаковки.** Native-модуль (например
`sharp`) в dev резолвит свои транзитивные зависимости (`detect-libc`, `semver` и т.п.) через
собственный резолвер Bun, но упакованный `app.asar.unpacked` копируется плоско и требуется
через штатный `require()` (Electron main — обычный Node, не bun). Если транзитивная
зависимость не хостится в root `node_modules` (конфликт версий в монорепо — обычное дело для
`detect-libc`/`semver`), паковка падает в рантайме (`Cannot find module 'detect-libc'`), хотя
`bun run` в dev работает без единой жалобы. **Фикс:** явно прописать проблемную транзитивную
зависимость (смотреть `dependencies` в `package.json` самого native-пакета) как ПРЯМУЮ
зависимость приложения, затем `bun install` из корня. **Обязательно проверять после сборки:**
`node -e "require('<app>/dist/win-unpacked/resources/app.asar.unpacked/node_modules/<pkg>')"` —
успешная сборка НЕ гарантирует, что модуль реально резолвится под чистым Node.

**electron-builder требует точную версию electron** в `devDependencies` (`"electron": "42.6.1"`,
не `"^42.6.1"`) — иначе падает при определении версии для скачивания бинарника. И `publish: null`
в `electron-builder.yml`, если нет настроенного provider — иначе падает на шаге генерации
update-метаданных даже без реального `--publish`.

**GUI-уровень (диалоги, drag&drop, click-хендлеры) невозможно проверить в сендбоксе
Claude Code** — Chromium network service падает даже с `--no-sandbox`. Реальные GUI-баги
вылезают только на первом живом запуске у пользователя — закладывай это в ожидания при
релизе нового Electron-приложения, не считай «собралось и алгоритм проверен» равным
«протестировано».

**НО main-процесс проверяется headless — окно создавать не обязательно.** Скрипт,
запущенный как `npx electron scripts/verify-*.cjs`, доходит до `app.whenReady()` и
гоняет любые сервисы main-процесса (Chromium при этом не поднимается, падать нечему).
Сервисы на TypeScript под это удобно собирать отдельным бандлом, не трогая рабочий
webpack-конфиг приложения:

```bash
bun build main/services/<сервис>.ts --target=node --format=cjs \
  --external electron --external sharp --outfile scripts/.bundle.cjs
npx electron scripts/verify-pipeline.cjs <аргументы>
```

Прецедент: так проверен весь пайплайн `poster-microtext-desktop` (апскейл → цвет →
микротекст) на реальной картинке — без единого клика в GUI (2026-07-26).

## Внешние бинарники (не npm-модули) в Electron-приложении

Пример — `realesrgan-ncnn-vulkan.exe` (апскейлер) в `poster-microtext-desktop`.

- **Класть в `extraResources`, а не в `files`/`asarUnpack`.** Это не модуль Node,
  требовать его через `require` не нужно — нужен путь к файлу для `spawn`.
- **Путь различается dev/prod:** prod — `process.resourcesPath`, dev —
  `app.getAppPath()`. **Не `process.cwd()`** — в dev рабочая директория зависит от того,
  чем запущено приложение. Полезно добавить override через переменную окружения:
  тогда бинарник можно подсунуть headless-прогону, не копируя его в приложение.
- **Тяжёлые ассеты держи в `.gitignore` + скрипт скачивания**, а сам скрипт поставь
  первым шагом таргета сборки. Иначе сборка зелёная только на машине, где папка
  случайно осталась с прошлого раза. Фильтром в `extraResources` клади только реально
  используемые файлы (у апскейлера из 51 МБ моделей рецепту нужны 10 МБ).
- **`spawn` со списком аргументов и БЕЗ `shell: true`** — тогда пути с пробелами и
  любые символы в именах файлов передаются как есть, экранирование не нужно.

**Вывод CLI-утилит парси с оглядкой на локаль.** `realesrgan-ncnn-vulkan` печатает
прогресс через разделитель дробной части системной локали: на русской Windows это
`0,00%`, а не `0.00%`. Регулярка на `\d+\.\d+%` молча не совпадает — прогресс-бар
стоит на нуле, ошибки при этом нет. Лови оба разделителя: `/(\d+[.,]\d+)\s*%/`.

**Вулкан-приложения на ноутбуке по умолчанию могут уехать на интегрированную видеокарту.**
`-g auto` у ncnn-утилит выбирает устройство сам, и iGPU (id 0) вполне может выиграть у
дискретной (id 1) — разница в скорости кратная. Если утилита печатает список устройств
(обычно только в начале реального прогона), опроси его прогоном на картинке 16×16 и
предлагай дискретную как значение по умолчанию.
