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
  │  ffprobe → ветка цвета (SDR / BT.2020 / HDR)
  │  ffmpeg → 320p / 720p / 1080p (H.264 High, 8 бит, BT.709) + poster.jpg
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
├── Dockerfile                # oven/bun:1-alpine + ffmpeg; стадии runtime и test
├── check-ffmpeg.sh           # роняет сборку, если в ffmpeg нет zscale/tonemap/libdav1d
├── docker-compose.yml        # media-api + media-worker + redis + nginx (target: runtime)
├── nginx.conf                # HTTP Range + кэш + Referer-защита
├── .env.docker.enc           # SOPS+age шифрование
├── src/
│   ├── config.ts     # env, API-ключи per appId
│   ├── ffmpeg.ts     # spawnFfmpeg(), runFfprobe()
│   ├── queue.ts      # BullMQ Queue + TranscodeJob
│   ├── storage.ts    # пути /data/raw/ и /data/processed/, videoUrls()
│   ├── server.ts     # Fastify API
│   ├── transcode.ts  # рендишены, постер, цепочки фильтров цвета
│   └── worker.ts     # BullMQ Worker: транскод → удалить raw → webhook
└── test/
    └── transcode.test.ts  # юнит + интеграция на настоящем ffmpeg
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

⚠️ **Значения в `.env.docker.enc` мало.** `--env-file` даёт `docker compose` только
интерполяцию `${VAR}` в самом compose-файле — в контейнер `media-api` попадает исключительно то,
что явно перечислено в его `environment:` ([env-files.md](/.claude/rules/env-files.md)). Новый
`MEDIA_KEY_{APPID}` обязателен в **обоих** местах: `.env.docker.enc` (значение) и
`environment:` сервиса `media-api` в `infra/media-server/docker-compose.yml` (строка
`MEDIA_KEY_{APPID}: ${MEDIA_KEY_{APPID}}`). Пропуск второго не роняет деплой — контейнер
поднимается здоровым, но `validateApiKey` для этого `appId` всегда возвращает `false`: 401 на
`request-upload`, и это легко принять за проблему на стороне приложения. Прецедент — `domwellbes`
2026-09-16: ключ был в `.env.docker.enc`, но не в `environment:`.

```yaml
# infra/media-server/docker-compose.yml, services.media-api.environment
MEDIA_KEY_{APPID}: ${MEDIA_KEY_{APPID}}
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

## Цвет и формат пикселей

Все рендишены — **H.264 High, `yuv420p`, теги BT.709, ограниченный диапазон**, что бы ни пришло
на вход. Аргументы собираются в одном месте (`renditionArgs()` в `src/transcode.ts`), три вызова
разойтись не могут.

⚠️ **`libx264` без `-pix_fmt yuv420p` сохраняет битность и субдискретизацию исходника.** До
2026-09-16 рендишены так и кодировались: 10-битный мастер (обычная запись iPhone — HEVC 10 бит
HLG/Dolby Vision) превращался в **H.264 High 10**, 4:2:2 с камеры — в High 4:2:2, RGB-запись экрана —
в High 4:4:4 Predictive. Chromium (Chrome, Edge, Android) такие профили не декодирует вовсе
([chromium-video-codec-limits](/.claude/docs/chromium-video-codec-limits.md)). Ошибки нет ни при
кодировании, ни в логах — видео просто не играет в браузере.

⚠️ **Смены `pix_fmt` мало для HDR.** 8-битный кадр с HLG/PQ-значениями в BT.2020 без тонмаппинга
выглядит блёклым, а ffmpeg ещё и переносит теги `arib-std-b67`/`bt2020` в выходной H.264. Поэтому
`buildVideoFilter()` выбирает одну из трёх веток по ffprobe исходника:

- **HDR** (`color_transfer` = `smpte2084` или `arib-std-b67`): `scale` →
  `zscale=tin/pin/min/rin:t=linear:npl=203` → `format=gbrpf32le` → `zscale=p=bt709` →
  `tonemap=tonemap=mobius:param=0.7:desat=0` → `zscale=t=bt709:m=bt709:r=tv`. Входные параметры
  zscale передаются явно и только из белого списка — метаданные файла пишет тот, кто загружает.
- **BT.2020 без HDR** (`color_primaries=bt2020`): `scale` → `zscale=…:t=bt709:p=bt709:m=bt709:r=tv`,
  без тонмаппинга.
- **Всё остальное:** один `scale` с явными `in_color_matrix`/`in_range` → `bt709`/`tv`. SD без
  тега матрицы считается BT.601 (как у mpv).

В конце каждой цепочки стоят `format=yuv420p` и `setparams` с итоговыми тегами.

### Выбор параметров тонмаппинга

Замер: однотонный кадр SDR → HLG-мастер с белым на 203 нит (опорный белый HDR по BT.2408) →
цепочка → RGB центрального пикселя. В таблице — сумма максимальных отклонений канала (из 255) по
восьми цветам: насыщенные, серые 25/50/88%, белый, жёлтый.

| вариант                            | ошибка | что видно                                              |
| ---------------------------------- | ------ | ------------------------------------------------------ |
| `npl=203`, `mobius:param=0.7`      | **21** | до 70% линейной яркости — ноль, белый −16, света сжаты |
| `npl=100`, `reinhard`              | 122    | насыщенные точно, серые подняты на 25–30               |
| `npl=100`, `mobius`                | 153    | всё светлее, серый 50% +42                             |
| `npl=100`, `hable` (частый рецепт) | 293    | всё темнее, белый −63                                  |
| `npl=203`, `clip`                  | 1      | точно только без светов выше белого — их срезает       |

`npl=203` ставит опорный белый HDR в 1.0 линейного света, `mobius` с коленом 0.7 не трогает всё,
что ниже, и плавно сжимает света к пику. Наивная конверсия без тонмаппинга на том же кадре
отклоняется примерно на 50.

### Прочие грабли

- ⚠️ **ffmpeg 7+ пишет в поток свойства кадра поверх `-color_primaries`/`-color_trc`.** `swscale`
  меняет в кадре только матрицу и диапазон, поэтому SD-исходник уезжал с тегами `smpte170m` при
  явном `-color_primaries bt709`. Лечит `setparams` в конце цепочки. Поймано тестом на ffmpeg 8,
  в образе пока 6.1.
- ⚠️ **Постер JPEG браузер декодирует как BT.601 полного диапазона.** ffmpeg сам матрицу не
  меняет, и постер из BT.709-видео выходил со сдвигом цвета ~20 на насыщенном зелёном. Цель `jpeg`
  в `buildVideoFilter()` пересчитывает в BT.601/`pc`.
- ⚠️ **`-ss 1` на ролике короче секунды:** ffmpeg завершается с кодом 0 и не пишет файл. Кадр
  берётся не дальше середины ролика, при неизвестной длительности — повтор с нуля.
- **AV1:** alpine-ffmpeg собран с `libdav1d` и выбирает его первым. `libaom` из других сборок
  падает на части файлов с «No sequence header»
  ([nvenc-web-video-codec-ladder](/.claude/docs/nvenc-web-video-codec-ladder.md)).
- **Проверка сборки:** версия Alpine приезжает с плавающим тегом `oven/bun:1-alpine`, поэтому
  `check-ffmpeg.sh` роняет сборку образа без `zscale`, `tonemap`, `setparams`, `libdav1d`. Старый
  воркер при этом продолжает работать. `libplacebo` в сборке есть, но без GPU на s3 бесполезен;
  `tonemap_opencl` нет.
- **Не покрыто:** Dolby Vision profile 5 (без совместимого базового слоя) — для него нужен
  libplacebo. iPhone пишет profile 8.4 с HLG-базой, он идёт веткой HLG. Мелкий исходник
  по-прежнему растягивается до 1080p, вертикальное видео масштабируется по высоте.

### Тесты

```bash
docker build --target test infra/media-server   # на ffmpeg прод-образа
cd infra/media-server && bun test                # на локальном ffmpeg; AV1 — если есть энкодер
```

Интеграционные тесты кодируют 2-секундные однотонные клипы: SDR 10 бит, HLG, PQ, BT.601, 4:2:2
полного диапазона, AV1 10 бит, ролик короче секунды. Для каждого рендишена проверяются профиль,
`pix_fmt`, теги и цвет центрального пикселя с допуском 8 из 255; для постера — цвет. У
`infra/media-server` нет Nx-проекта, в CI тесты не запускаются.

## Деплой

Через `deploy-mcp` (`deploy_infra({ service: "media-server", server: "s3" })`) — как и остальные
`infra/*`-сервисы. Файл называется `docker-compose.yml` (без `.production`/`.<server>` в имени)
именно затем, чтобы совпадать с дефолтной конвенцией `scripts/deploy-infra.sh`.

У `media-api` в compose стоит `build.target: runtime`: последняя стадия `Dockerfile` — тесты, и
без `target` compose собирал бы и прогонял их при каждом деплое.

⚠️ **История 2026-09-08, оба пункта уже закрыты в `scripts/deploy-infra.sh`, оставлено как
предупреждение при следующей правке скрипта:**

1. До этой даты имя было `docker-compose.production.yml` по ошибочной аналогии с приложениями
   (у `infra/*` нет staging/production выбора — сервис живёт на одном конкретном сервере),
   из-за чего `deploy_infra` падал с `no such file or directory` ещё до старта.
2. Переименование вскрыло вторую, более опасную проблему: `deploy-infra.sh` умел расшифровывать
   секреты только по манифесту `secrets/deploy.conf` (файлы), а media-server использует другой
   примитив — `.env.docker.enc` → `--env-file` (как у apps/*). Скрипт этого не знал и поднимал
   compose вообще без `--env-file` — не с ошибкой, а с молчаливой подстановкой ПУСТЫХ СТРОК во
   все `${VAR}` (`MEDIA_KEY_*`, `DATA_PATH` — контейнеры при этом выглядели полностью здоровыми).
   Ровно та ловушка, что описана в предупреждении наверху самого `docker-compose.yml`, только
   через новый путь входа. Добавлена поддержка `.env.docker.enc` как второго, взаимоисключающего
   с манифестом примитива секретов — теперь `deploy_infra` расшифровывает его во временный файл
   и передаёт `--env-file` сам. Заодно добавлен `--build` в команду up (был только `up -d` без
   пересборки — образ с изменённым `Dockerfile`/`src/` не обновился бы даже при успешном деплое).

Резервный канал (сырой SSH, если агент недоступен):

```bash
cd infra/media-server
sops --decrypt .env.docker.enc > .env.docker
docker compose -f docker-compose.yml --env-file .env.docker build
docker compose -f docker-compose.yml --env-file .env.docker up -d
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
