# Media Server

Общий сервис загрузки и транскодинга видео для всех приложений монорепо.

## Архитектура

```
Приложение
  │  POST /api/v1/{appId}/video/upload  (X-Media-Key)
  ▼
media-api (Fastify, :3100)
  │  BullMQ job
  ▼
media-worker (BullMQ Worker)
  │  ffmpeg → 320p / 720p / 1080p + poster.jpg
  ▼
/data/processed/{appId}/{videoId}/
  │  webhook { event:"video.ready", urls }
  ▼
Приложение

nginx (:3101) → /data/processed/ (HTTP Range, immutable cache)
media.letar.best → s3:3101
```

## Расположение кода

```
infra/media-server/
├── Dockerfile                       # oven/bun:1-alpine + ffmpeg
├── docker-compose.production.yml    # media-api + media-worker + redis + nginx
├── nginx.conf                       # HTTP Range + кэш + Referer-защита
├── .env.docker.enc                  # SOPS+age шифрование
└── src/
    ├── config.ts    # env, API-ключи per appId
    ├── ffmpeg.ts    # spawnFfmpeg()
    ├── queue.ts     # BullMQ Queue + TranscodeJob
    ├── storage.ts   # пути /data/raw/ и /data/processed/, videoUrls()
    ├── server.ts    # Fastify API
    └── worker.ts    # BullMQ Worker
```

## URL-схема

```
https://media.letar.best/v/{appId}/{videoId}/320p.mp4    — мобилки, превью
https://media.letar.best/v/{appId}/{videoId}/720p.mp4    — основное
https://media.letar.best/v/{appId}/{videoId}/1080p.mp4   — HD
https://media.letar.best/v/{appId}/{videoId}/poster.jpg  — постер
```

## API

Аутентификация: заголовок `X-Media-Key: {appId}:{secret}`

| Метод  | Путь                                    | Описание                                                                                                  |
| ------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/v1/:appId/video/request-upload`   | Запросить upload-токен (тело `{ videoId, webhookUrl }`) → `{ uploadToken, uploadUrl, tusUrl, expiresIn }` |
| TUS    | `{tusUrl}` (заголовок `X-Upload-Token`) | Резюмируемая загрузка файла напрямую в `tusUrl`, минуя основной API-сервер                                |
| `GET`  | `/api/v1/:appId/video/status/:jobId`    | `queued` / `processing` / `ready` / `error`                                                               |
| `GET`  | `/health`                               | `{ ok: true }`                                                                                            |

Загрузка — **resumable TUS**, не одноразовый `POST /upload`: `videoId` генерирует
**приложение** (не сервер) до начала загрузки — им же вебхук `video.ready` находит свою запись
обратно. Клиент — общая библиотека `@letar/media-client` (`createMediaClient({ appId })`), см.
раздел «5. Подключить `@letar/media-client` в приложении» ниже.

### Webhook при готовности

Передаётся как `?webhookUrl=...` при загрузке. Воркер вызывает POST:

```json
{
  "event": "video.ready",
  "videoId": "abc123",
  "appId": "svoichuzhie",
  "urls": {
    "320p": "https://media.letar.best/v/svoichuzhie/abc123/320p.mp4",
    "720p": "https://media.letar.best/v/svoichuzhie/abc123/720p.mp4",
    "1080p": "https://media.letar.best/v/svoichuzhie/abc123/1080p.mp4",
    "poster": "https://media.letar.best/v/svoichuzhie/abc123/poster.jpg"
  }
}
```

## Интеграция нового приложения

### 1. Сгенерировать ключ

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Добавить в `infra/media-server/.env.docker`

```env
MEDIA_KEY_{APPID}=<сгенерированный_ключ>
```

Перешифровать:

```bash
sops --encrypt --output infra/media-server/.env.docker.enc infra/media-server/.env.docker
```

### 3. Добавить в `.env.docker` приложения

```env
MEDIA_SERVER_URL=https://media.letar.best
MEDIA_API_KEY={appId}:{secret}
```

### 4. Добавить в `docker-compose.production.yml` приложения

```yaml
environment:
  MEDIA_SERVER_URL: ${MEDIA_SERVER_URL}
  MEDIA_API_KEY: ${MEDIA_API_KEY}
```

### 5. Подключить `@letar/media-client` в приложении

Клиент вынесен в общую библиотеку `libs/media-client` (Shared-first, см. корневой `CLAUDE.md`) —
не копировать функции руками, а импортировать `createMediaClient`. Подключение библиотеки —
`.claude/rules/libs.md` § «Подключение к приложению» (`implicitDependencies` в `package.json`
приложения + опционально `paths` в его `tsconfig.json`).

`src/lib/media.ts` приложения:

```typescript
import { createMediaClient } from '@letar/media-client'

export const mediaClient = createMediaClient({ appId: '<app>' })

export const isMediaConfigured = mediaClient.isConfigured
export const requestUploadToken = mediaClient.requestUploadToken
export const getTranscodeStatus = mediaClient.getTranscodeStatus
```

`createMediaClient` по умолчанию читает `MEDIA_SERVER_URL`/`MEDIA_API_KEY` из `process.env`
(см. шаги 2–4 выше) — передавать их явным `baseUrl`/`apiKey` нужно только для тестов или
нестандартного окружения. `requestUploadToken(videoId, webhookUrl)` вызывается **с сервера**
(Route Handler, есть `apiKey`) и возвращает `{ uploadToken, uploadUrl, tusUrl, expiresIn }` —
`uploadToken`/`tusUrl` уходят в браузер, дальше файл льётся напрямую в `tusUrl` через
`tus-js-client` с заголовком `X-Upload-Token` (см. `apps/svoichuzhie/src/app/api/video/init-upload/route.ts`
и `apps/domwellbes/src/app/api/houses/[id]/video-tour/init-upload/route.ts` как референс, а
клиентский TUS-аплоад — в `apps/svoichuzhie/src/app/admin/video/new/page.tsx`, полная версия
с докачкой и Web Share Target, или `apps/domwellbes/.../house-video-tour-section.tsx`,
минимальная версия). Полный API библиотеки — `libs/media-client/README.md`.

### 6. Схема БД — поле videoId

```prisma
// schema.zmodel
model Video {
  id              String  @id @default(cuid())
  mediaVideoId    String? // videoId из media-server (null пока не загружено)
  status          VideoStatus @default(PENDING)
  // ...
}

enum VideoStatus {
  PENDING
  PROCESSING
  READY
  ERROR
}
```

## Переменные окружения

| Переменная           | Описание                                       |
| -------------------- | ---------------------------------------------- |
| `PORT`               | Порт API (дефолт `3100`)                       |
| `REDIS_URL`          | Redis для BullMQ (дефолт `redis://redis:6379`) |
| `DATA_PATH`          | Корень хранилища (дефолт `/data`)              |
| `WORKER_CONCURRENCY` | Параллельных транскодов (дефолт `2`)           |
| `MEDIA_KEY_{APPID}`  | API-ключ per appId (uppercase)                 |

## Зарегистрированные приложения

| appId         | Переменная              |
| ------------- | ----------------------- |
| `svoichuzhie` | `MEDIA_KEY_SVOICHUZHIE` |
| `animatrona`  | `MEDIA_KEY_ANIMATRONA`  |
| `domwellbes`  | `MEDIA_KEY_DOMWELLBES`  |

## Хранилище на s3

```
/data/
  raw/{appId}/{videoId}/source.ext      # удаляется после транскода
  processed/{appId}/{videoId}/
    320p.mp4
    720p.mp4
    1080p.mp4
    poster.jpg
  backups/                               # Resilio → offsite
```

## Деплой

```bash
cd infra/media-server
sops --decrypt .env.docker.enc > .env.docker
docker compose -f docker-compose.production.yml --env-file .env.docker build
docker compose -f docker-compose.production.yml --env-file .env.docker up -d
```

Проверка:

```bash
curl http://localhost:3100/health        # → {"ok":true}
curl -I http://localhost:3101/nginx-health  # → 200 OK
```

NPM proxy-host: `media.letar.best` → `s3:3101`

## Заметки

- **HLS не используется** — три MP4-файла, качество переключается кнопкой в плеере
- **Live streaming** — отдельная будущая фича с собственным ffmpeg pipeline
- **IPFS** — отдельный сервис `infra/pinner` (§15.4 PLAN.md), медиасервер может пинить файлы после транскода
- **Перемотка** — работает через HTTP Range + `movflags +faststart` без HLS
- **Кириллические домены** в nginx.conf настраиваются через punycode-кодировку (см. `idn2`/онлайн-конвертер)
