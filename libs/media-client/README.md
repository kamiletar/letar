# @letar/media-client

## Закрытое аудио

`createAudioClient({ appId })` использует MEDIA_SERVER_URL/MEDIA_API_KEY только на сервере.
Методы: `requestUpload(audioId, size)`, `getStatus(audioId)`, `getPlayback(audioId)`,
`deleteAudio(audioId)`. Приложение проверяет права перед каждым вызовом. Краткую ссылку из
getPlayback оставляют на сервере и передают поток в ответ с Range: ссылка не заменяет проверку
прав и не должна уходить в браузер для закрытых данных.

`uploadAudioFile` из `@letar/media-client/browser` передаёт File чанками 2 МиБ, принимает
audioId/tusUrl/uploadToken, AbortSignal и onProgress. Повторный вызов делает HEAD и продолжает
со смещения сервера. Сохранение id/отпечатка файла между посещениями — ответственность приложения.
После полного закрытия страницы пользователь заново выбирает тот же локальный файл.

Серверный лимит — 100 МиБ/30 минут; квоты владельца и связь с сущностью контролирует приложение.
Общий контракт и требования доступа — [media-server](../../.claude/docs/media-server.md).

media-client — shared-библиотека монорепо letar

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { createMediaClient } from '@letar/media-client'
```

## API

Клиент общего сервиса транскодинга видео `infra/media-server` (TUS resumable upload) —
общая логика между `svoichuzhie` и `domwellbes`, вынесенная по правилу Shared-first.

### `createMediaClient(options: MediaClientOptions): MediaClient`

- `options.appId` — идентификатор приложения на медиасервере, сегмент пути `/api/v1/:appId/...`
- `options.baseUrl` — опционально, по умолчанию `process.env.MEDIA_SERVER_URL`
- `options.apiKey` — опционально, по умолчанию `process.env.MEDIA_API_KEY`, шлётся заголовком `X-Media-Key`

Возвращает:

- `isConfigured(): boolean` — заданы ли `baseUrl` и `apiKey`
- `requestUploadToken(videoId, webhookUrl): Promise<{ uploadToken, uploadUrl, tusUrl, expiresIn }>` —
  запрашивает одноразовый upload-токен (`POST /api/v1/:appId/video/request-upload`), вызывается
  только с сервера (есть `apiKey`), токен отдаётся браузеру для TUS-аплоада
- `getTranscodeStatus(jobId): Promise<{ status, progress? }>` — статус транскодинга
  (`GET /api/v1/:appId/video/status/:jobId`)

```typescript
// apps/<app>/src/lib/media.ts
import { createMediaClient } from '@letar/media-client'

export const mediaClient = createMediaClient({ appId: '<app>' })
```

## Команды

```bash
nx test media-client
nx lint media-client
nx typecheck:tsgo media-client
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/media-client` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/media-client` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
