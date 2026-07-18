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

## Готового генератора для новых Electron-приложений нет

Нового Electron/Nextron-приложения через `nx generate` не создать — копируй структуру существующего
(`main/`, `renderer/`, `nextron.config.js`, `project.json`, `electron-builder.yml`,
`main/webpack.config.js`, `scripts/dev.js`) и упрощай под задачу. `label-printer-desktop` — эталон
с БД/сканером/автообновлением, `poster-microtext-desktop` — минимальный вариант.

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
