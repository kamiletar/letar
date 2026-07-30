# Electron: `app://` вместо `file://` для renderer'а

**Коротко:** если renderer'у нужен Web Worker или WASM, грузить его через `loadFile()` (`file://`)
нельзя — под `file://` origin равен `null`, и Chromium блокирует и создание Worker'а, и `fetch` к
соседним файлам. Лечится привилегированной схемой `app://`
(`protocol.registerSchemesAsPrivileged` + `protocol.handle`), а не флагами Chromium.

Найдено на ASS-субтитрах (SubtitlesOctopus = Worker + `.wasm`), но касается всего, что требует
настоящего origin: Worker, WASM-стриминг, `fetch`/XHR к своим же файлам, IndexedDB/localStorage с
предсказуемым ключом, Service Worker, `crypto.subtle`.

## Почему `file://` ломается

| Что                                | Под `file://`                                                            |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `origin`                           | `null` (opaque) — у каждого файла свой непрозрачный origin               |
| `new Worker('worker.js')`          | ❌ `Script cannot be accessed from origin 'null'`                        |
| `fetch('./file.wasm')`             | ❌ схема `file` в fetch не поддерживается вообще                         |
| `WebAssembly.instantiateStreaming` | ❌ следствие предыдущего пункта                                          |
| XHR к соседнему файлу              | ❌ cross-origin для opaque origin                                        |
| secure context                     | ❌ → нет Service Worker, `crypto.subtle` и прочего, что требует HTTPS    |
| абсолютные пути к ассетам          | ❌ `/_next/...` резолвится от корня диска, нужен хак `assetPrefix: './'` |

Отдельная ловушка `assetPrefix: './'`: относительный префикс работает **только** если страница
лежит на глубине 0 (`out/index.html` рядом с `out/_next/`). Любой вложенный роут — и `_next` не
находится. Отсюда ограничение «одна реальная страница на корне», записанное в
[.claude/rules/electron.md](/.claude/rules/electron.md).

⚠️ **Флаги Chromium (`--allow-file-access-from-files`, `webSecurity: false`) — не решение.** Они
снимают часть ограничений, но выключают модель безопасности целиком для всего окна, ломают
изоляцию и всё равно не дают secure context. Правильный путь — дать renderer'у настоящий origin.

## Решение: привилегированная схема `app://`

Два шага, и порядок важен.

**1. Зарегистрировать схему ДО `app.whenReady()`** (иначе привилегии не применятся —
схема регистрируется на уровне процесса Chromium при старте):

```typescript
// main/main.ts — на верхнем уровне модуля, до whenReady
import { protocol } from 'electron'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true, // полноценный origin (app://bundle), а не opaque
      secure: true, // secure context: Worker, WASM, crypto.subtle
      supportFetchAPI: true, // fetch() к своим файлам
      stream: true, // Range-запросы — нужны для <video>/<audio>
      corsEnabled: true,
    },
  },
])
```

**2. Повесить обработчик ПОСЛЕ `app.whenReady()`:**

```typescript
import { app, net, protocol } from 'electron'
import path from 'path'
import { pathToFileURL } from 'url'

app.whenReady().then(() => {
  const rendererRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'renderer-out')
    : path.join(__dirname, '../renderer/out')

  protocol.handle('app', (request) => {
    const url = new URL(request.url)

    // Хост схемы — просто «имя бандла», путь берём из pathname
    let relativePath = decodeURIComponent(url.pathname)

    // Статический экспорт Next.js: /route → /route.html, / → /index.html
    if (relativePath.endsWith('/')) {
      relativePath += 'index.html'
    } else if (!path.extname(relativePath)) {
      relativePath += '.html'
    }

    // ⚠️ Защита от path traversal: наружу из папки renderer'а выходить нельзя
    const filePath = path.join(rendererRoot, relativePath)
    if (!filePath.startsWith(rendererRoot)) {
      return new Response('Forbidden', { status: 403 })
    }

    // net.fetch по file:// сам ставит Content-Type и умеет Range
    return net.fetch(pathToFileURL(filePath).toString())
  })

  win.loadURL('app://bundle/')
})
```

Дальше `assetPrefix` не нужен — абсолютные `/_next/...` резолвятся от корня схемы, вложенные роуты
работают, ограничение «одна страница» снимается.

⚠️ **Вложенные роуты статического экспорта Next.js 16** требуют ещё одной правки, не связанной с
протоколом: пути RSC-payload'ов на диске расходятся с тем, что запрашивает клиентский роутер. См.
[nextjs-static-export-rsc-paths.md](/.claude/docs/nextjs-static-export-rsc-paths.md).

## Как проверить, что дело именно в origin

В DevTools renderer'а:

```javascript
window.origin // 'null' под file://, 'app://bundle' под app://
window.isSecureContext // false под file://, true под app://
new Worker(URL.createObjectURL(new Blob(['self.close()']))) // упадёт под file://
```

Симптом в консоли под `file://` (по нему баг и опознаётся):

```
Uncaught DOMException: Failed to construct 'Worker':
Script at 'file:///.../worker.js' cannot be accessed from origin 'null'.
```

Ловится **только на живом запуске**: сборка зелёная, типы зелёные, страница отрисована — не
работает лишь то, что зависит от Worker'а. В случае SubtitlesOctopus это выглядит как «ASS-субтитры
просто не появляются», без единой ошибки в билд-логе.

## Три способа отдать renderer, и когда какой

| Способ                             | origin                  | Worker/WASM | Цена                                                                                         |
| ---------------------------------- | ----------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `loadFile()` → `file://`           | `null`                  | ❌          | бесплатно, но `assetPrefix: './'` и одна страница на корне                                   |
| `app://` + `protocol.handle`       | `app://bundle`          | ✅          | ~30 строк в main-процессе                                                                    |
| localhost-сервер (Next standalone) | `http://127.0.0.1:PORT` | ✅          | внутри приложения живёт Node-сервер: поиск свободного порта, отдельный процесс, дольше старт |

**Выбор по умолчанию для статического экспорта — `app://`.** localhost-сервер нужен, когда
renderer'у требуются серверные возможности Next.js (API-роуты, server actions, ORM в рантайме).

Примеры в монорепо:

- `animatrona` — localhost-сервер: `main/services/next-server.ts` поднимает Next standalone
  (`utilityProcess.fork(server.js)`) на свободном порту от 3007 и грузит UI через
  `http://127.0.0.1:<port>`. Там есть API-роуты и ORM в renderer'е, поэтому статический экспорт не
  подходит. Заодно это причина, почему ASS-субтитры в нём работают: origin настоящий.
- `animatrona` же — рабочий пример привилегированной схемы: `main/protocols/media.protocol.ts`
  регистрирует `media://` (`standard`/`secure`/`supportFetchAPI`/`stream`/`corsEnabled`) для отдачи
  локальных видео и субтитров, с whitelist'ом путей в `main/protocols/allowed-paths.ts`. Тот же
  паттерн, только для медиа.
- `poster-microtext-desktop` — статический экспорт под `file://` с `assetPrefix: './'`: Worker'ов и
  WASM ему не нужно, поэтому дешёвый вариант достаточен.

## Границы применимости

- Схему `app` (или любую свою) регистрируем **до** `whenReady` — иначе привилегии молча не
  применятся, а симптом будет тот же, что под `file://`.
- `stream: true` обязателен, если через схему отдаётся видео/аудио: без него не работают
  Range-запросы, и `<video>` не сможет перематывать.
- Имя схемы не должно совпадать со стандартными (`http`, `https`, `file`, `data`, `blob`).
- CSP пишется в HTML/заголовках как обычно — привилегированная схема её не отменяет.
- Локальные файлы пользователя через эту же схему **не** отдаём: для них отдельная схема с
  whitelist'ом путей (как `media://` в `animatrona`), иначе renderer получает доступ ко всему диску.

## См. также

- [.claude/rules/electron.md](/.claude/rules/electron.md) — грабли Electron-приложений монорепо
- [nextjs-static-export-rsc-paths.md](/.claude/docs/nextjs-static-export-rsc-paths.md) — RSC-пути
  статического экспорта Next.js 16
- [nextjs-ssr-browser-only-libs.md](/.claude/docs/nextjs-ssr-browser-only-libs.md) — browser-only
  библиотеки (в том числе `shaka-player`) и SSR-пререндер
- [electron-sqlite.md](/.claude/docs/electron-sqlite.md) — миграции БД в Electron
