# @letar/media-client

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
