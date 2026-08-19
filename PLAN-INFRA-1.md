# PLAN-INFRA-1 — §15–§25

> Часть журнала `PLAN-INFRA.md` (журнал инфраструктурных треков монорепо letar, вне auth-плана).
> Файл разрезан на части 2026-08-20 — исходный файл превысил 10000 строк, см.
> [plan-decomposition-pattern.md](/.claude/docs/plan-decomposition-pattern.md).
>
> **Точка входа, легенда статусов и общая карта частей** — [PLAN-INFRA.md](/PLAN-INFRA.md).

| Часть                               | Диапазон §NN | Тема (ориентировочно, границы не строгие)                      |
| ----------------------------------- | ------------ | -------------------------------------------------------------- |
| **эта часть (PLAN-INFRA-1.md)**     | §15–§25      | сервер s3, deploy MCP, e2e-гейт, форматтер worktree, `libs/ui` |
| [PLAN-INFRA-2.md](/PLAN-INFRA-2.md) | §26–§48      | SEO, npm-публикация, деплой, redis-инцидент, Traefik           |
| [PLAN-INFRA-3.md](/PLAN-INFRA-3.md) | §49–§61      | firewall, hard e2e-gate, cron-задачи, security-инциденты       |
| [PLAN-INFRA-4.md](/PLAN-INFRA-4.md) | §62–§94      | канарейка, GlitchTip, CI-гейт, Agent Mail                      |

---

## 15. Сервер s3 — медиа, e2e, IPFS, бэкап 🆕

> **Статус:** ⚠️ рассинхрон закрыт (2026-07-06) — **E2E-ранер развёрнут и работает** (188.127.235.141,
> `e2e-postgres`/`e2e-redis`, cron nightly `0 2 * * *`) — подробности и текущая конфигурация: раздел
> «E2E-ранер на s3» в [e2e-testing.md](/.claude/docs/e2e-testing.md#e2e-ранер-на-s3-188127235141).
> **Медиа-сервер / IPFS-шлюз / піннер — всё ещё планирование, не развёрнуты.**
> **Deploy-gate (§15.3.1) — тоже только план:** `check_e2e_gate()` в `deploy-affected.sh` **не существует**
> в коде — деплой сегодня никак не зависит от результата e2e. См. предупреждение в
> [deployment.md](/.claude/docs/deployment.md#e2e-ранер-и-деплой--разделены).
> **Конфиг:** HDD S16 (12 ядер, 16 ГБ RAM) — обоснование: пиковое потребление `nx affected --target=e2e`
> при `--parallel=3` с driving-school в пачке ≈ 8–9 ГБ; 16 ГБ даёт запас для видеоэнкода параллельно с тестами.

### 15.1 Роли и ответственности

| Роль             | Сервис                      | Домен / порт       |
| ---------------- | --------------------------- | ------------------ |
| **Медиа-сервер** | Next.js/Express API + nginx | `media.letar.best` |
| **Видео-воркер** | ffmpeg + BullMQ             | фоновый процесс    |
| **E2E-ранер**    | Playwright + nx             | cron / webhook     |
| **IPFS-шлюз**    | Kubo (go-ipfs)              | `ipfs.letar.best`  |
| **IPFS-піннер**  | кастомный сервис            | внутренний         |
| **Resilio-нода** | Resilio Sync                | offsite-пир        |

s3 **не** хостит приложения монорепо (s1/s2) и **не** является точкой входа для пользователей —
только инфраструктурный бэкенд.

---

### 15.2 Медиа-сервер (видео) — общий для всех приложений

Единый сервис для загрузки, транскодинга и раздачи видео. Приложения (svoichuzhie, kami, будущие)
интегрируются через API-ключ — не хранят видео у себя.

#### URL-схема

```
https://media.letar.best/v/{appId}/{videoId}/source.mp4   — оригинал (приватный, только auth)
https://media.letar.best/v/{appId}/{videoId}/320p.mp4     — транскод 320p (публичный, мобилки/превью)
https://media.letar.best/v/{appId}/{videoId}/720p.mp4     — транскод 720p (публичный)
https://media.letar.best/v/{appId}/{videoId}/1080p.mp4    — транскод 1080p (публичный)
https://media.letar.best/v/{appId}/{videoId}/poster.jpg   — постер (первый кадр)
```

Качество переключается кнопкой в плеере — три отдельных MP4-файла, HLS не нужен.
Live streaming (будущее) — отдельная фича с собственным pipeline (`ffmpeg -f hls`), не связана с VOD.

#### API (аутентификация — API-ключ в заголовке `X-Media-Key`)

```
POST   /api/v1/{appId}/video/upload          — загрузить, поставить в очередь → { videoId, jobId }
GET    /api/v1/{appId}/video/{videoId}/status — статус транскода (queued|processing|ready|error)
DELETE /api/v1/{appId}/video/{videoId}        — удалить все файлы
POST   /api/v1/{appId}/video/{videoId}/poster — сгенерировать постер из timestamp
```

При завершении транскода воркер вызывает `webhookUrl` приложения (configurable per appId):

```json
{
  "event": "video.ready",
  "videoId": "...",
  "appId": "svoichuzhie",
  "urls": { "320p": "...", "720p": "...", "1080p": "...", "poster": "..." }
}
```

#### Транскодинг (BullMQ + ffmpeg)

```
Загрузка → /data/raw/{appId}/{videoId}/source.ext
Воркер   → ffmpeg → /data/processed/{appId}/{videoId}/320p.mp4 + 720p.mp4 + 1080p.mp4 + poster.jpg
Статус   → Redis (BullMQ job state)
```

Параметры ffmpeg (три качества MP4 + постер; перемотка через HTTP Range):

```bash
# 320p — мобилки, слабое соединение, inline-превью
ffmpeg -i source.ext -vf scale=-2:320 -c:v libx264 -preset medium -crf 26 \
       -c:a aac -b:a 64k -movflags +faststart 320p.mp4

# 720p
ffmpeg -i source.ext -vf scale=-2:720 -c:v libx264 -preset medium -crf 23 \
       -c:a aac -b:a 128k -movflags +faststart 720p.mp4

# 1080p
ffmpeg -i source.ext -vf scale=-2:1080 -c:v libx264 -preset medium -crf 22 \
       -c:a aac -b:a 192k -movflags +faststart 1080p.mp4

# Постер (1 кадр на 1 секунде)
ffmpeg -i source.ext -ss 00:00:01 -frames:v 1 poster.jpg
```

#### nginx — раздача статики с HTTP Range

```nginx
location /v/ {
    root /data/processed;
    # HTTP Range обязателен — без него не работает перемотка в браузере
    add_header Accept-Ranges bytes;
    # Кэш для MP4 (CDN-friendly)
    add_header Cache-Control "public, max-age=31536000, immutable";
    # Защита от хотлинкинга (Referer приложений монорепо)
    valid_referers ~\.(letar\.best|neyroaboi\.ru|направа\.рф|svoichuzhie\.ru)$;
    if ($invalid_referer) { return 403; }
}
```

#### Структура хранилища (HDD)

```
/data/
  raw/{appId}/{videoId}/source.ext        — сырые загрузки (удалять после успешного транскода)
  processed/{appId}/{videoId}/
    320p.mp4
    720p.mp4
    1080p.mp4
    poster.jpg
  backups/                                 — Resilio синкает на pinner/offsite
```

#### docker-compose.s3.yml (медиа)

```yaml
services:
  media-api:
    build: ./infra/media-server
    ports: ['3100:3100']
    environment:
      - REDIS_URL=redis://redis:6379
      - DATA_PATH=/data
    volumes:
      - /data:/data

  media-worker:
    build: ./infra/media-server
    command: node dist/worker.js
    environment:
      - REDIS_URL=redis://redis:6379
      - DATA_PATH=/data
    volumes:
      - /data:/data
    # ffmpeg должен быть в образе

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  nginx:
    image: nginx:alpine
    ports: ['80:80', '443:443']
    volumes:
      - /data/processed:/data/processed:ro
      - ./infra/media-server/nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

#### Интеграция в приложения

В `schema.zmodel` приложения добавляется поле `mediaServerVideoId: String?`:

```typescript
// svoichuzhie/src/lib/media.ts
const MEDIA_API = process.env.MEDIA_SERVER_URL // https://media.letar.best
const MEDIA_KEY = process.env.MEDIA_API_KEY

export async function uploadVideo(file: File, videoId: string) {
  const form = new FormData()
  form.append('file', file)
  form.append('videoId', videoId)
  const res = await fetch(`${MEDIA_API}/api/v1/svoichuzhie/video/upload`, {
    method: 'POST',
    headers: { 'X-Media-Key': MEDIA_KEY },
    body: form,
  })
  return res.json() // { videoId, jobId }
}
```

---

### 15.3 E2E-сервер — автоматический прогон тестов

#### Назначение

- Прогонять тесты при изменениях в `libs/` (общий код) — `nx affected --target=e2e`
- Прогонять конкретное приложение по запросу (webhook от CI или ручной запуск)
- Не блокировать локальную разработку — разработчик не запускает тяжёлые тесты у себя

#### Оценка потребления RAM (обоснование S16)

| Сценарий                                       | Peak RAM  |
| ---------------------------------------------- | --------- |
| `--parallel=3` (дефолт Nx)                     | ~8–9 ГБ   |
| `--parallel=3` + медиа-воркер                  | ~10–11 ГБ |
| driving-school (98 spec, 17 projects) отдельно | ~4–5 ГБ   |
| ОС + Redis + PostgreSQL                        | ~2 ГБ     |
| **Итого HDD S16 (16 ГБ) — запас ~5 ГБ**        | ✅        |

16 E2E-сюитов в монорепо (aboi, aira-web, animatrona, archetest, driving-school, dsperevod,
form-develop-app, form-example, grandslamcup, imot, kami, label-printer-desktop, mandala, pravda,
premium-rosstil, time).

#### Инфраструктура на s3

```
PostgreSQL (один инстанс, БД per-приложение):
  e2e_driving_school, e2e_premium_rosstil, e2e_aboi, ...

Redis (один инстанс, используется несколькими тест-сьютами):
  порт 6380 (не конфликтует с медиа-Redis на 6379)

Node 24 + Bun + Playwright browsers (Chromium headless):
  устанавливаются при provision
```

#### Запуск

```bash
# Автоматический — cron или webhook (GitHub Actions / самописный)
nx affected --target=e2e --base=origin/main --parallel=3

# Ручной — конкретный проект
nx e2e driving-school-e2e -- --project=shard-core

# Полный прогон всех
nx run-many --target=e2e --parallel=3
```

**Триггеры (выбрать один или комбинацию):**

- **Webhook** от GitHub при пуше в `main` или `libs/**` (простейший: ngrok / самописный HTTP endpoint)
- **Cron** (ежедневно ночью) — `0 2 * * * nx run-many --target=e2e --parallel=3`
- **Ручной** через agent-mail команду BlackCove

**Нотификации:** результат в Telegram (успех/провал + ссылка на html-отчёт Playwright).

#### Изоляция БД для тестов

```bash
# provision-e2e-db.sh — создать БД для E2E если не существует
psql -U postgres -c "CREATE DATABASE e2e_driving_school;"
psql -U postgres -c "CREATE DATABASE e2e_aboi;"
# ...

# В playwright.config.ts приложений:
# BASE_URL=http://localhost:XXXX (дев-сервер, запускается webServer)
# DATABASE_URL=postgresql://postgres:pass@localhost/e2e_<app>
```

---

### 15.3.1 Pre-deploy gate — в два этапа 🆕

> **Решение (сессия 2026-07-06):** не катить одним куском. Сначала лёгкий gate поверх уже работающего
> ночного e2e (без новой инфраструктуры) — посмотреть на реальный false-positive rate. Прод-снепшот +
> анонимизация (сложнее, юридический риск 152-ФЗ, нагрузка на прод) — отдельный, более поздний
> инкремент, запускается только после того, как этап A отработал стабильно.

#### Этап A — gate на существующих e2e-БД (без прод-снепшота)

Ничего нового разворачивать не нужно — ночной `nx run-many --target=e2e --parallel=3` на s3 (§15.3) уже
работает и гоняется на пустой (сгенерированной миграциями) схеме `e2e_<app>`. Не хватает только двух вещей:

1. Раннер на s3 после прогона пишет результат в `.last-e2e-status/<app>.json` (commit sha, pass/fail, timestamp) —
   уже есть Telegram-нотификация (§15.3), нужно добавить запись в файл рядом.
2. `deploy-affected.sh` перед сборкой образа читает этот файл — см. `check_e2e_gate()` ниже.

```bash
# перед сборкой образа — проверка свежего зелёного e2e для этого app
check_e2e_gate() {
  local app=$1
  local status_file=".last-e2e-status/${app}.json"
  [ -f "$status_file" ] || { echo "⚠️ нет e2e-статуса для $app — деплой без gate"; return 0; }
  local passed=$(jq -r '.passed' "$status_file")
  local age_hours=$(( ($(date +%s) - $(jq -r '.timestamp' "$status_file")) / 3600 ))
  if [ "$passed" != "true" ]; then
    echo "🔴 последний e2e для $app упал — деплой заблокирован, см. $status_file"
    exit 1
  fi
  if [ "$age_hours" -gt 48 ]; then
    echo "⚠️ e2e-статус старше 48ч — статус мог устареть, деплой с предупреждением"
  fi
}
```

Мягкий старт: сначала **warn-only** (лог + Telegram, `exit 0` даже при `passed=false`), потом (после недели
наблюдения без ложных срабатываний) — **hard gate** (`exit 1`, деплой требует `--skip-e2e-gate` с явным флагом).

**DoD Этап A:**

- [ ] Раннер на s3 пишет `.last-e2e-status/<app>.json` после каждого ночного прогона
- [ ] `deploy-affected.sh` — `check_e2e_gate()` в режиме warn-only
- [ ] Неделя наблюдения без ложных срабатываний на пилотном приложении
- [ ] Решение по hard gate (exit 1) принято по итогам пилота

**Заметка:** gate на пустой БД не ловит баги «упало именно на реальных данных прода» и не покрывает
blast radius по обратным зависимостям — это осознанное ограничение этапа A, закрывается этапом B.

---

#### Этап B — прод-снепшот + анонимизация (позже, отдельным решением)

##### Проблема

Пустая схема `e2e_<app>` (данные создаются самими тестами) не ловит класс багов «упало именно на реальных
данных прода» (кривые legacy-записи, специфичные состояния заказов, редкие форматы, накопленный объём) —
а также не ловит **межпроектный blast radius**: правка в общей либе (`libs/forms`, `libs/*-db`, `@letar/auth`)
может молча сломать приложение, которое её не трогало, а `nx affected` увидит только явно изменённые проекты,
если граф зависимостей не прогнан в обратную сторону.

**Цель:** ночной pipeline переносит **анонимизированный** срез прод-данных в `e2e_<app>` поверх уже
работающего gate из этапа A.

##### Pipeline (ночной, cron на s3)

```
1. pg_dump прод-БД каждого app (по конфигу APP_CONFIG dashboard-agent, уже знает все БД) → /data/e2e-snapshots/<app>.sql
2. restore во временную БД e2e_<app>_raw
3. anonymize.sql / anonymize.ts — детерминированная маскировка PII (см. ниже) поверх e2e_<app>_raw
4. swap: e2e_<app>_raw → e2e_<app> (DROP старой + RENAME, без окна простоя тестов)
5. nx affected --target=e2e --base=<последний зелёный коммит> --parallel=3 — прогон на свежих данных
6. Результат → Telegram (§15.3) + запись статуса в `.last-e2e-status/<app>.json` (commit sha, pass/fail, timestamp)
```

##### Анонимизация — обязательна (152-ФЗ, [personal-data.md](/.claude/docs/personal-data.md))

Реальные email/телефон/ФИО пользователей **не могут** физически лежать вне прод-контура — это отдельный
сервер (s3), не входящий в реестр операторов ПДн приложения. Маскировать **детерминированно** (не просто
`NULL`), чтобы сохранить форму данных, важную для тестов (уникальность, non-null constraints, паттерны):

```sql
-- пример для User-подобных таблиц, per-app скрипт в infra/e2e-anonymize/<app>.sql
UPDATE "user" SET
  email = 'user-' || substr(md5(id::text), 1, 12) || '@e2e.test',
  name  = 'Test User ' || substr(md5(id::text), 1, 6),
  phone = NULL
WHERE true;
-- пароли/токены/секреты — обнулить, не переносить сессии/API-ключи как есть
UPDATE "session" SET token = md5(random()::text);
DELETE FROM "verification"; -- одноразовые токены прод не нужны в e2e
```

- Общий раннер (`infra/e2e-anonymize/run.ts`) находит `anonymize.sql` для каждого `app`, если нет — **блокирует**
  снепшот этого приложения (fail-safe: лучше пропустить прогон, чем протащить реальные ПДн).
- Список PII-полей per-app ведётся вместе с моделью в `schema.zmodel` (там же, где access policies) —
  избегает дрейфа при добавлении новых полей.

##### Gate — переиспользует `check_e2e_gate()` из этапа A

Механизм тот же (`deploy-affected.sh` читает `.last-e2e-status/<app>.json`) — меняется только источник
данных для e2e-прогона (снепшот прода вместо пустой схемы). Отдельного gate-кода для этапа B не нужно.

##### Blast radius — обратный граф зависимостей

Правка `libs/forms` должна триггерить e2e не только у приложения, где менялся код, а у **всех потребителей**:

```bash
# найти все apps, зависящие от изменённой либы (обратные зависимости)
nx graph --focus=libs/forms --file=/tmp/graph.json
# → извлечь project names, запустить e2e для каждого, не только для nx affected по умолчанию
nx run-many --target=e2e --projects=$(cat /tmp/affected-consumers.txt) --parallel=3
```

Реализуется через `nx-mcp` / `nx graph` в CI-скрипте `infra/e2e-anonymize/blast-radius.ts` (граф `dependsOn`
в обратную сторону от изменённых файлов в `libs/**`).

##### Открытые вопросы (не решено, требует обсуждения перед стартом)

1. **Объём снепшотов растёт** с числом приложений — нужна ротация (`/data/e2e-snapshots` держать только
   последний + 1 предыдущий) и мониторинг диска s3 (уже есть слот в §15.6 п.9).
2. **Кто пишет `anonymize.sql` для каждого приложения** — по одному на владельца данных при подключении,
   как чек-лист «добавление нового приложения» (аналог бэкапов в deployment.md).
3. **Частота снепшота vs нагрузка на прод** — `pg_dump` с боевой БД ночью, но растущие БД (driving-school,
   grandslamcup) могут упереться в окно до утра — проверить длительность на реальных объёмах перед вводом в cron.

##### DoD Этап B

- [ ] Этап A отработал ≥1 неделю с hard gate — прежде чем начинать этап B
- [ ] `infra/e2e-anonymize/run.ts` — снепшот + restore + anonymize для одного пилотного приложения
- [ ] `anonymize.sql` написан и провалидирован (нет реальных PII в `e2e_<app>` после прогона — ручная проверка)
- [ ] `blast-radius.ts` — обратный граф от `libs/**` к зависимым apps, e2e гоняется на все
- [ ] Пилот на одном приложении (**grandslamcup** — пет-проект, ниже юридический риск, схема проще driving-school) отработал ≥1 неделю
- [ ] Решение принято по итогам пилота

---

### 15.4 IPFS-шлюз, піннер и раздача видео через IPFS

#### Концепция: IPFS как транспорт для видео

Видео в аниматроне (и потенциально коммерческих сайтах) раздаётся **через IPFS-шлюз** вместо или
параллельно с обычным nginx. Пользователи не обязаны иметь IPFS — они используют обычный HTTP-шлюз
`https://ipfs.letar.best/ipfs/{cid}`. Преимущества:

- **Контент-адресация** — CID = хэш файла, целостность гарантирована
- **Автоматическая дедупликация** — один и тот же файл хранится один раз
- **Нативное кэширование** — браузер кэширует по CID (immutable), CDN-friendly
- **Маркетинг** — видим CID в плеере, ссылка «что такое IPFS», кнопка «добавить в свой нод»
- **Путь к распределению** — в будущем несколько нодов пинируют разные файлы

Для пользователей с IPFS (Brave, расширение): браузер может загрузить контент p2p минуя наш шлюз.

#### Один Kubo — и піннер и шлюз

Kubo нативно совмещает обе роли на одном процессе:

```
┌──────────────────────────────────────────────────────┐
│  Kubo (один контейнер)                               │
│                                                      │
│  :4001  ← p2p swarm (другие IPFS-ноды в сети)       │
│  :5001  ← HTTP API  ← піннер-сервис (localhost)     │
│  :8080  ← Gateway   ← nginx → ipfs.letar.best       │
└──────────────────────────────────────────────────────┘
```

Піннер-сервис (Node.js) — тонкая обёртка над Kubo API:

- загрузить: `POST :5001/api/v0/add?chunker=size-1048576` → получить CID
- запинить: `POST :5001/api/v0/pin/add?arg={cid}` (при `add` пинируется автоматически)
- распинить: `POST :5001/api/v0/pin/rm?arg={cid}` (когда `PinRef` → 0)

Шлюз на том же Kubo отдаёт запиненный контент по HTTP Range — второй IPFS-нод не нужен.

#### Ключевая архитектурная деталь: Pin Registry

IPFS сам не знает «чей» это контент. Это решается через **Pin Registry** — наша БД в піннере:

```
┌─────────────────────────────────────────────────────────────────┐
│  Pin Registry (PostgreSQL в піннере)                            │
│                                                                 │
│  Pin { cid, size, pinnedAt, nodeId, status }                   │
│     ↑ один CID = одна запись, независимо от числа потребителей │
│                                                                 │
│  PinRef { cid, appId, entityType, entityId, label, metadata }  │
│     ↑ N ссылок на один CID от разных приложений               │
└─────────────────────────────────────────────────────────────────┘
```

**Правила:**

- CID распинируется (unpin) только когда `COUNT(PinRef WHERE cid=X) = 0`
- Удаление видео в animatrona → удаляется `PinRef`, не `Pin` (если svoichuzhie тоже ссылается)
- `nodeId` — поле для будущего распределения (какой именно IPFS-нод держит этот CID)

**Схема:**

```typescript
// infra/pinner/schema.prisma
model Pin {
  cid       String   @id        // QmXxx... или bafy...
  size      BigInt              // байт
  pinnedAt  DateTime
  nodeId    String   @default("s3")  // для будущего распределения
  status    PinStatus           // queued | pinning | pinned | failed

  refs      PinRef[]
}

model PinRef {
  id         String @id @default(cuid())
  cid        String
  appId      String              // "animatrona" | "svoichuzhie" | "kami"
  entityType String              // "video" | "image" | "audio" | "archive"
  entityId   String              // ID сущности в БД приложения
  label      String?             // "720p" | "1080p" | "poster" | "source"
  metadata   Json?               // { title, duration, ... }
  createdAt  DateTime

  pin        Pin @relation(fields: [cid], references: [cid])
  @@unique([appId, entityType, entityId, label])
}
```

#### API Піннера (с учётом мульти-тенантности)

Аутентификация — `X-Pinner-Key: {appId}:{secret}` (per-app ключ, как в медиа-сервере):

```
POST   /api/v1/{appId}/add          — загрузить файл → CID → запинить → PinRef
                                       body: FormData(file, entityType, entityId, label)
                                       returns: { cid, gatewayUrl, size }

POST   /api/v1/{appId}/pin/{cid}    — запинировать уже существующий CID (если загружен другим)
                                       body: { entityType, entityId, label, metadata }

DELETE /api/v1/{appId}/ref/{refId}  — удалить ссылку (unpin если refs=0)

GET    /api/v1/{appId}/refs         — список ссылок этого приложения
GET    /api/v1/{appId}/refs/{entityType}/{entityId} — все CID для сущности

GET    /api/v1/admin/pins           — все пины (admin key)
GET    /api/v1/admin/stats          — размер, количество по appId
```

#### Оптимизация Kubo для видео

```bash
# Инициализация с оптимальными параметрами для видео
ipfs init --profile=server

# Увеличить chunk size для видео (1 МБ vs дефолтный 256 КБ)
# Меньше нодов дерева → быстрее seek в больших файлах
ipfs config --json Chunker '"size-1048576"'

# Включить репликацию блоков (для надёжности)
ipfs config --json Reprovider.Interval '"12h"'

# Gateway — поддержка Range requests включена по умолчанию в Kubo ≥ 0.20
```

```yaml
# docker-compose
services:
  ipfs:
    image: ipfs/kubo:latest
    ports:
      - '4001:4001' # p2p swarm (публичный — нужен для пиров)
      - '5001:5001' # API (только localhost)
      - '8080:8080' # Gateway (проксируется nginx)
    volumes:
      - /data/ipfs:/data/ipfs
    environment:
      - IPFS_PROFILE=server
```

#### Доставка видео: гибридная схема (IPFS + nginx fallback)

```
Видеоплеер запрашивает URL видео
        ↓
  ipfs.letar.best/ipfs/{cid}     ← основной (IPFS gateway, HTTP Range ✅)
        ↓ если IPFS недоступен
  media.letar.best/v/{app}/{id}/720p.mp4  ← fallback (nginx, §15.2)
```

В плеере animatrona / svoichuzhie:

```typescript
// Примерная логика получения URL в плеере
const videoUrl = video.ipfsCid
  ? `https://ipfs.letar.best/ipfs/${video.ipfsCid}`
  : `https://media.letar.best/v/${appId}/${video.id}/720p.mp4`
```

После транскода (§15.2 медиа-воркер) добавляется шаг:

```
ffmpeg готов → POST /api/v1/{appId}/add (720p.mp4) → cid720p
             → POST /api/v1/{appId}/add (1080p.mp4) → cid1080p
             → POST /api/v1/{appId}/add (poster.jpg) → cidPoster
             → webhook в приложение: { videoId, cid720p, cid1080p, cidPoster, ... }
```

#### UX «IPFS-маркетинг» в плеере

Небольшой бейдж под видео (не мешает просмотру):

```
[▶ 14:32 ━━━━━━━━━━━━━━━━━━━━━━━━ 42:17]
IPFS: bafy…k3m2  [скопировать]  [что это?]  [открыть в браузере]
```

- **«что это?»** → всплывающий тултип: «Контент хранится в IPFS — децентрализованной сети.
  Целостность файла гарантирована его хэшем. Любой может проверить: ipfs.letar.best/ipfs/{cid}»
- **«открыть в браузере»** → ссылка на публичный шлюз (наш или cloudflare-ipfs.com как fallback)
- Пользователи Brave видят нативную IPFS-иконку в адресной строке

#### Будущее: распределённые пинеры

`nodeId` в таблице `Pin` готовит почву:

```
Сегодня (v1):       s3 пинирует всё → nodeId = "s3"

Завтра (v2):        s3 + s4 (или VPS другого провайдера)
                    Координатор распределяет CID по нодам:
                    - по размеру (большие видео → нод с бо́льшим диском)
                    - по аффинити (коммерческие → изолированный нод)
                    - по репликации (критичный контент → оба нода)

Послезавтра (v3):   IPFS Cluster (автоматический repin при падении нода)
                    или интеграция с Pinata/web3.storage для offsite-репликации
```

**nginx-проксирование шлюза:**

```nginx
server {
  server_name ipfs.letar.best;
  location /ipfs/ {
    proxy_pass http://localhost:8080;
    proxy_buffering off;          # важно для видео-стриминга
    proxy_read_timeout 300s;      # большие файлы
    # content-addressed = immutable
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
}

---

### 15.5 Resilio Sync — offsite-нода

s3 становится **третьей нодой** Resilio (s1, s2 → s3):

| Нода                | Роль               | Что хранит                                   |
| ------------------- | ------------------ | --------------------------------------------- |
| s1                  | продакшен          | uploads/, backups/                           |
| s2                  | продакшен          | uploads/, backups/                           |
| s3 (новый)          | **offsite backup** | uploads/, backups/, /data/processed/ (медиа) |
| Windows (локальный) | dev/restore        | резервная копия                              |

**IgnoreList s3** — те же правила что на s1/s2:
```

.env.docker
.env.local
.env
node_modules
\*.log

```
**Уникально для s3:** синкает `/data/processed/` (транскодированные видео) → у s1/s2 есть
offsite-копия медиафайлов без необходимости хранить их на прод-серверах.

---

### 15.6 Provision-план (порядок развёртывания)

1. **Базовая система** — OS + Docker + nginx + age-ключ (SOPS, как на s2)
2. **Redis** — порты 6379 (медиа) и 6380 (e2e) → два контейнера или один с неймспейсами
3. **PostgreSQL** — инстанс для E2E-БД + `provision-e2e-db.sh`
4. **Resilio Sync** — добавить пир, принять инвайт, проверить синхронизацию uploads/backups
5. **Kubo IPFS** — запустить ноду, дождаться swarm peers, проверить gateway
6. **Медиа-сервер** — `docker compose up`, проверить upload API + transcode smoke-test
7. **E2E-ранер** — установить Node 24 + Bun + Playwright browsers, прогнать shard-core driving-school
8. **nginx + SSL** — Nginx Proxy Manager (как на s1/s2); домены media.letar.best, ipfs.letar.best
9. **Мониторинг** — добавить в dashboard-agent (uptime + disk usage /data)
10. **Cron E2E** — `0 2 * * * cd /home/deploy/letar && nx run-many --target=e2e --parallel=3`

**Секреты s3** (добавить в `.env.docker.enc`):
```

MEDIA_API_KEY_SVOICHUZHIE=... # per-app ключи медиа-сервера
MEDIA_API_KEY_KAMI=...
TELEGRAM_E2E_BOT_TOKEN=... # нотификации E2E
TELEGRAM_E2E_CHAT_ID=...
IPFS_API_TOKEN=... # для внешних pinning services (опц.)

```
---

### 15.7 Связи с остальным планом

| Этап                             | Связь                                                                     |
| --------------------------------- | ------------------------------------------------------------------------- |
| **Этап 0.3** (бэкапы)            | s3 — новая Resilio-нода; `/data/processed` добавить в scope синхронизации |
| **Этап 0.4** (SOPS)              | age-ключ на s3 по той же схеме что s2                                     |
| **svoichuzhie Фаза 8** (видео)   | `Video.kind=UPLOAD` → медиа-сервер s3 вместо локального хранения          |
| **Фаза 12** (деплой svoichuzhie) | `MEDIA_SERVER_URL` + `MEDIA_API_KEY` в `.env.docker`                      |
| **E2E все приложения**           | E2E-прогоны переезжают с локальной машины на s3                           |
| **deploy-affected.sh**           | добавить s3 в маппинг (только media-server, не приложения); + `check_e2e_gate()` (§15.3.1) |
| **§15.3.1** (prod-снепшот + анонимизация) | pre-deploy gate поверх E2E-ранера — анонимизированный срез прода вместо пустой схемы |

**DoD §15:**

- [ ] s3 поднят, все 6 сервисов в статусе healthy
- [ ] Медиа-сервер: загрузка видео → транскод → раздача через nginx с HTTP Range ✅
- [x] E2E: `nx e2e:core driving-school-e2e` запускается через nx (skipInstall fix); 36/51 зелёных (10 failures: auth-nav + instructor profile)
- [ ] IPFS: `curl https://ipfs.letar.best/ipfs/<cid>` отдаёт файл
- [ ] Resilio: uploads/ с s2 появляются на s3 в течение 5 минут
- [ ] Мониторинг s3 в dashboard-agent (uptime + disk /data)
- [ ] Секреты зашифрованы SOPS, `.env.docker.enc` в git
- [ ] §15.3.1 — прод-снепшот + анонимизация + blast-radius gate (см. DoD 15.3.1 отдельно)

---

## §16 — Конвенция: фото-галереи через `PhotoGallery` из `@letar/ui`

> Принята в сессию №42 (2026-06-21) по итогам aprel8008 Sprint 4.

### Суть решения

В монорепо **единственный способ** сделать фото-галерею — компонент `PhotoGallery` из `@letar/ui`. Он объединяет:

- сетку через `next/image fill` (srcSet автоматически, кеш `/_next/image`)
- лайтбокс (`LightboxViewer` — yet-another-react-lightbox + Zoom + Fullscreen)
- паттерн `nextImageUrl(src, w, q)` → `/_next/image?url=...&w=...&q=...` для слайдов
- a11y: `role="button"`, `tabIndex`, `aria-label`, `_focusVisible`

**Batch pre-resize скриптом не нужен** — Next.js делает on-demand + кешируется навсегда.

### Применение во всех проектах

1. Добавить `@letar/ui` в `implicitDependencies` в `project.json`
2. tsconfig: `paths` + `references` на `libs/ui`
3. `import { PhotoGallery } from '@letar/ui'`

### Эталон

`apps/aprel8008` — `GalleryInfiniteScroll` (пагинация/данные) поверх `PhotoGallery` (отображение).

### Документация

- Паттерн: [images.md](/.claude/docs/images.md)
- Компоненты: [ui-components.md](/.claude/docs/ui-components.md)

---

## §17 — Kamal: zero-downtime деплой

> Добавлено 2026-06-26. Текущий `deploy-affected.sh` делает `docker compose up -d --build` — контейнер останавливается и поднимается заново (~10–30 с даунтайма). Kamal (от Basecamp/37signals) решает это через rolling-замену с healthcheck.

### Что даёт Kamal

- **Zero-downtime** — новый контейнер поднимается рядом со старым; Kamal переключает трафик через Traefik (или kamal-proxy) только после healthcheck
- **Простая конфигурация** — один `config/deploy.yml` на приложение; CLI: `kamal deploy`, `kamal rollback`
- **Встроенные секреты** — `.kamal/secrets` (аналог `.env.docker`, интегрируется с SOPS/age)
- **Аксессоры** — деплой сервисов (Postgres, Redis) отдельно от приложения
- **Аудит-лог** — история деплоев в `kamal audit`

### Текущее состояние деплоя
```

deploy-affected.sh → docker compose up -d --build → ~10-30с даунтайма на рестарт

````
**Kamal** заменяет эту цепочку, сохраняя монорепо-структуру.

### Архитектура для letar

Каждое приложение получает `apps/<app>/config/deploy.yml`:

```yaml
service: <app>
image: ghcr.io/kamiletar/<app>
servers:
  - s2.letar.best
proxy:
  ssl: true
  host: <app>.letar.best
  healthcheck:
    path: /api/health
    interval: 3
    threshold: 5
registry:
  server: ghcr.io
  username: kamiletar
  password:
    - KAMAL_REGISTRY_PASSWORD
env:
  secret:
    - DATABASE_URL
    - BETTER_AUTH_SECRET
    # ... остальные из .env.docker
````

### Интеграция с текущим стеком

| Текущее                         | После Kamal                                                   |
| ------------------------------- | ------------------------------------------------------------- |
| `deploy-affected.sh`            | `kamal deploy -c apps/<app>/config/deploy.yml` или обёртка    |
| `.env.docker` + SOPS            | `.kamal/secrets` → SOPS-расшифровка перед `kamal deploy`      |
| `docker-compose.production.yml` | `config/deploy.yml` (Kamal сам строит compose)                |
| Nginx Proxy Manager             | `kamal-proxy` (или оставить NPM + убрать SSL из Kamal)        |
| BlackCove (Deploy Agent)        | BlackCove вызывает `kamal deploy` вместо `deploy-affected.sh` |

### Потенциальные сложности

- **NPM vs kamal-proxy** — letar использует Nginx Proxy Manager. Kamal по умолчанию поднимает `kamal-proxy`; нужно решить: мигрировать на kamal-proxy или конфигурировать Kamal без proxy (`proxy: false`) и оставить NPM
- **Монорепо** — один `config/deploy.yml` на приложение; `deploy-affected.sh` нужно переписать, чтобы вызывать `kamal deploy` только для affected apps
- **БД и Redis** — аксессоры Kamal (`accessories:`) — отдельный деплой, не вместе с app
- **GHCR или локальная сборка** — Kamal по умолчанию пушит образ в registry; альтернатива — `kamal build push` + `kamal deploy --skip-build` для локальной сборки на s2 (текущий подход)

### DoD §17

- [ ] Пилот на одном приложении (предлагается: `grandslamcup` — небольшое, без критичного трафика)
- [ ] Zero-downtime подтверждён: `curl -s -o /dev/null -w "%{http_code}" https://grandslamcup.ru` не возвращает 502/503 во время деплоя
- [ ] Решён вопрос NPM vs kamal-proxy
- [ ] `deploy-affected.sh` или BlackCove обновлён для вызова kamal
- [ ] Rollback проверен: `kamal rollback` возвращает предыдущую версию
- [ ] Документация: [deployment.md](/.claude/docs/deployment.md) обновлён

---

## §18 — Deploy MCP + staging-gated пайплайн

> Добавлено 2026-07-09 (сессия №49). Полный план проработан и одобрен; детали архитектуры — ниже.
> Связь с другими разделами: реализует **Этап A §15.3.1** (warn-only e2e-gate); **§17 (Kamal) не отменён** —
> конкурирующий выбор для Фазы 3 (см. §18.6).

### Проблема

1. BlackCove деплоит через сырой SSH + парсинг stdout, хотя в dashboard-agent уже есть REST API
   (`POST /api/deploy/app` через nsenter) — дублирование, хрупкость.
2. s3 (188.127.235.141) — только ночной e2e-раннер; staging-окружения нет, хотя `deploy-affected.sh`
   уже поддерживает `--staging`, а у grandslamcup есть готовый staging-комплект.
3. Сохранность данных: `deploy-affected.sh` при падении `prisma migrate deploy` пишет warning и
   **продолжает деплой**; бэкап только ночной (окно потери до 24ч); образы не версионируются (нет отката).
4. **Битые submodule-pointer'ы блокируют весь деплой (найдено сессия №50, 2026-07-09):** bump-коммит в
   `letar/main` может зафиксировать SHA submodule-коммита, который не был запушен в приватный репо (или был
   потерян force-push/rebase) — `git pull` в `deploy-affected.sh` падает на `not our ref` для **всех**
   приложений, не только для затронутого submodule. Нужна проверка `git ls-remote <submodule-url> | grep <sha>`
   перед коммитом bump'а (pre-commit hook или CI-шаг), либо `deploy-affected.sh` должен явно резолвить и
   репортить, какой именно submodule и SHA не резолвится, вместо общего fail.

### Архитектура (кратко)

- **`libs/deploy-mcp`** — MCP-сервер (по образцу form-mcp/letar-consultant): тонкий HTTP-клиент к REST API
  dashboard-agent через **SSH-туннель** (по образцу `.claude/mcp/pg-wrapper.mjs`; порт 3100 закрывается от
  интернета). Tools Фазы 1: `deploy_app` (target: production|staging), `deploy_status` (deployId + курсор
  sinceLine), `deploy_cancel`, `git_status`, `list_servers`, `agent_health`. Фазы 2: `run_e2e`, `e2e_status`.
  Токен — из `apps/dashboard-agent/.env.docker` (SOPS), не из `.mcp.json`.
- **`libs/infra-config`** — единый маппинг app→server (`SERVER_APPS`, `getCurrentServer()`) для
  dashboard-agent и deploy-mcp вместо трёх копий. 2026-07-30: тем же паттерном добавлен
  `APP_PORTS`/`getAppPort()` — убрал дублирование карты HTTP-портов между
  `dashboard/app-metrics.ts` (прямой импорт) и `dashboard-agent/app-registry.ts` (локальная
  копия + `app-registry.guard.spec.ts`, Docker-изоляция агента). Список «кого мониторить/
  вызывать» у каждого потребителя остался своим — канон описывает только номер порта.
- **dashboard-agent**: deployId + ring-buffer истории (20) + cap логов (2000 строк) + sinceLine; `staging`
  в body; spawn аргументами без `bash -c`; **серверный guard** (s3 принимает только staging, s2 — только
  production); `docker-compose.s3.yml` (без прод-секретов, отдельный AGENT_TOKEN).
- **Staging-домены**: единообразно `<app>.s3.letar.best` (wildcard уже в DNS; gsc-test.letar.best переезжает).

### Пайплайн (Фаза 2, воркфлоу BlackCove)

```
deploy_app(staging) → s3: образ <app>:staging, контейнер, URL <app>.s3.letar.best
run_e2e(app) → s3: nx e2e с E2E_BASE_URL против staging-контейнера
→ .last-e2e-status/<app>.json { commitSha, passed, timestamp }
deploy_app(production) → deploy-mcp проверяет статус на s3 (warn-only!) → s2
```

Gate живёт в deploy-mcp (единственный видит оба сервера) — решает cross-server gap §15.3.1.
Ночной cron e2e на s3 не меняется. **Ограничение честно названо:** из-за `NEXT_PUBLIC_*`-инлайна gate
гарантирует «коммит прошёл e2e», не «этот артефакт протестирован» (build once/promote — вне скоупа).

### Сессии

| #     | Содержимое                                                                                                                                                                                                                                                                                                                        | Статус                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Харденинг `deploy-affected.sh`: миграции fail=abort (различать «нет миграций» от ошибки), pg_dump перед миграцией (`/home/deploy/pre-migrate-dumps/`, ротация 3), sha-теги образов (ретеншн 3). `--dry-run` + shellcheck; боевой прогон на низкорисковом app. Доки: deployment.md, backup-architecture.md                         | ✅ задеплоено на `time`, подтверждено BlackCove; + self-re-exec фикс `63bcada`                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **B** | `libs/infra-config`; dashboard-agent: серверный guard, `docker-compose.s3.yml`, консолидация production.yml/s2.yml (уточнить у BlackCove какой живой); коммит правок сессии №49 (deploy.ts, server-config.ts, cron.ts). Доки: README/CHANGELOG dashboard-agent, repo-structure.md, deployment.md (таблица серверов)               | ✅ коммиты `8498c06`, `a1772cf`; guard-тест вместо прямого импорта (Docker-изоляция); s2.yml удалён                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **C** | `libs/deploy-mcp` + `.mcp.json`; деплой dashboard-agent на s3 + закрытие порта 3100 — через BlackCove. Доки: README deploy-mcp, mcp-servers.md, deploy-coordination.md, deploy-agent.md, CLAUDE.md (строка MCP)                                                                                                                   | ✅ BlackCove задеплоил `time` через `deploy_app` (exitCode 0): deployId + sinceLine + self-re-exec + SOPS — все подтверждены вживую. Попутно 2 бага `/api/deploy/app` (SOPS-проброс `4d970e7` + sudo env-reset `1160e9e`). **s3-инстанс поднят и healthy** (loopback `127.0.0.1:13103`, HEAD `f21334bf`) — порт 3100 на s3 закрыт даром, s2 всё ещё торчит наружу (отдельный заход)                                                                                                                                         |
| **D** | Роут `e2e.ts` (run/status + `.last-e2e-status`), tools `run_e2e`/`e2e_status`, warn-gate; пилот grandslamcup: `.env.staging` s1→s3, домен, Playwright `E2E_BASE_URL` (webServer скипается), redirect URI auth-hub. Доки: deployment.md (воркфлоу), e2e-testing.md (конвенция + чек-лист подключения app), §15.3.1 отметить Этап A | ✅ **живой пилот завершён 2026-07-11** (сессии №55–61): `deploy_app(staging)` → `run_e2e` → `e2e_status` прогнан end-to-end, **24/28 passed**, `03-admin.spec.ts` (auth-цепочка) зелёный. По пути найдены и закрыты 5 багов — 3 в `@letar/auth` (dev-session по `NODE_ENV`, редирект на `0.0.0.0`, `__Secure-` cookie), 1 в `dashboard-agent` (privilege-drop терял env), 1 в `global-setup.ts` самого e2e-раннера. Оставшиеся 4/28 — тестовые locator/данные, не блокируют пайплайн (см. `apps/grandslamcup/PLAN.md` п.37) |

### §18.6 Фаза 3 — hard gate + `libs/deploy-engine` ✅ РЕШЕНО (2026-07-11)

> **Решение (владелец):** вариант **(а) `libs/deploy-engine`** (TS + docker-rollout), не Kamal.
> Причина: NPM/registry-трение Kamal постоянное (не разовая настройка — вечный обход дефолтного
> поведения: свой `kamal-proxy` вместо уже работающего NPM, нужен registry или `--skip-build`-обход),
> а zero-downtime rollout поверх текущего compose — ограниченная по объёму задача (health-check +
> переключение порта + rollback по sha-тегу), которую сессия A уже частично закрыла (sha-теги
> образов, pre-migrate dump, fail=abort). Kamal экономит время ровно на той части, которая у нас и
> так почти готова, а платит монорепо за это постоянным трением с NPM/registry. §17 (Kamal) остаётся
> в файле как справочный анализ, реализация не ведётся.
>
> **Hard gate — семантика (решено):** жёсткий блок без обхода. `deploy_app(production)` **отказывает**,
> если `.last-e2e-status/<app>.json` для текущего коммита не `passed` (включая случай «файла нет» —
> fail-closed, не fail-open). Никакого force-флага/override на старте — если понадобится обход для
> экстренных случаев (сама e2e-инфраструктура легла, а прод чинить надо прямо сейчас), обсуждать
> отдельно как следующий инцидент, не проектировать заранее.
>
> **Тираж (решено):** пока **только `grandslamcup`** — паттерн закрепляется на нём, следующее
> приложение под staging-e2e не подключаем, пока пайплайн не отработает без ложных срабатываний.
> Hard gate в Фазе 3 применяется только к приложениям с настроенным staging-e2e (сейчас — только
> grandslamcup); остальные деплоятся как прежде, без gate, пока не подключены к пайплайну.
>
> **Пилот rollout (решено 2026-07-11):** zero-downtime rollout пилотируется на **`time`**
> (низкорисковое, уже было пилотом сессий A и C), grandslamcup подключается вторым — когда
> механизм проверен. Первый живой прогон непроверенного механизма замены контейнера не должен
> идти на приложении с реальными пользователями.
>
> **Старт работ (решено 2026-07-11):** каркас движка (сессия E) — сразу, он не меняет поведение
> деплоя; hard gate (сессия F) — только после чистой недели warn-only (после 2026-07-18) и
> минимум одного живого warn-деплоя grandslamcup.

#### Архитектура deploy-engine (проработана 2026-07-11, ресёрч: docker-rollout-паттерн + agentic/MCP-практики)

**Форма — lib + CLI на хосте.** `@letar/deploy-engine` — Nx-библиотека с bin-входом, исполняется
на хосте `bun run` из `/home/deploy/letar`. dashboard-agent вызывает её тем же паттерном, что
сейчас bash — `spawn('nsenter', hostExecArgs([...]))` (`deploy.ts:414-428`). Встраивание в
dashboard-agent отвергнуто: его Dockerfile изолирован от `libs/` (прецедент — локальная копия
`server-config.ts`), а движку нужны docker/compose/git/SOPS хоста. Подкоманды: `doctor`,
`rollout`, `rollback`, `status`. Docker/compose/git-вызовы — через инжектируемый executor
(тестируемость без живого Docker).

**Zero-downtime — docker-rollout-паттерн с network alias.** Scale=2 compose-сервиса `app` +
**network alias `<app>-app`** на `kami-network`: сервис у всех приложений называется `app`,
голый service-name DNS коллидировал бы между проектами, а alias сохраняет текущий NPM Forward
Host (`<app>-app`) без изменений. Изменения compose (production, только у подключаемых
приложений): убрать `container_name` и `ports` у app, добавить alias + healthcheck +
`image: <app>:${DEPLOY_TAG:-latest}` + `stop_grace_period`. Последовательность:
`up -d --no-recreate --scale app=2` → wait healthy нового контейнера → `nginx -s reload`
(nginx резолвит оба IP, `proxy_next_upstream` прикрывает окно) → graceful stop + rm старого →
повторный reload. Риски: multi-IP поведение NPM (проверяется пилотом непрерывным curl), двойная
RAM на время rollout, SSE/WebSocket рвутся при остановке старого (принять). **Fallback:**
blue-green с переключением Forward Host через NPM REST API (уже автоматизирован для s3) —
документируется, включается только если DNS-путь провалится на пилоте. Staging s3 остаётся на
force-recreate (маршрутизация через `172.17.0.1:host-port`, простой некритичен).

**Strangler-миграция из bash.** Первым в TS уходит только блок `deploy-affected.sh:977`
(`docker compose up -d --force-recreate` — единственный шов простоя, окно 5–10 мин). Механизм
opt-in: label `letar.rollout: 'true'` в compose приложения → bash ветвится на
`bun run ... rollout --app X` либо идёт старым путём; откат = убрать label. В bash остаются
надолго (работают, перенос не даёт ценности): sudo re-exec, SOPS, git pull + self-re-exec,
bun install, affected-детекция, pre-migrate dump, migrate deploy, nx build, docker build +
sha-теги. `dashboard`/`dashboard-agent` исключены из rollout (спецпути: systemd-run
self-deploy / собственный контейнер).

**Hard gate — в deploy-mcp, fail-closed.** Gate остаётся в deploy-mcp (единственный компонент,
видящий оба сервера; s2-агент физически не может прочитать `.last-e2e-status` на s3). Новый
экспорт **`E2E_GATED_APPS`** в `libs/infra-config` (канон рядом с `SERVER_APPS`, сейчас
`['grandslamcup']`). Для gated-приложений `checkE2eGate` (`libs/deploy-mcp/src/server.ts:46-91`)
блокирует по **любой** ветке: файла нет / `passed=false` / `commitSha ≠ HEAD` / age > 24h /
s3 недоступен / ошибка запроса. Ответ при блоке — диагностичный (agentic-паттерн «эскалация с
готовой диагностикой»): причина + фактический статус (sha/время/результат) + шаги устранения
(`deploy_app(staging)` → `run_e2e` → повторить). Не-gated приложения — warn-only как сейчас.
Без force-флага; аварийный канал — ручной SSH (документирован как incident-путь).

**Rollback — команда + эндпоинт + MCP-tool.** `rollback --app X [--to-sha Y]` = тот же
rollout-механизм с `DEPLOY_TAG=<sha>` без пересборки, тоже zero-downtime. Поверх:
`POST /api/deploy/rollback` в dashboard-agent (async deployId-паттерн) + tool `deploy_rollback`
в deploy-mcp. Движок ведёт **deploy-manifest** `.deploy-manifest/<app>.json` — история
`{sha, imageTag, migrationsApplied[], timestamp, deployId}`: audit trail + источник
«предыдущего sha». Миграции БД **не откатываются автоматически**: rollback выполняется, но
возвращает `migrationWarning` (список миграций + путь к pre-migrate дампу). Агент может дёргать
rollback автономно (обратимая операция — agentic-практика); восстановление дампа — только
человек (уничтожает данные после миграции).

**Healthcheck-стандартизация через doctor.** ~~Факт: app-healthcheck есть только у 5/23
приложений~~ — устарело, тираж J (blue-green rollout) добавлял healthcheck попутно почти
везде. Перепроверено 2026-08-12: **23/24 production compose имеют healthcheck**, последний
пробел (`aira-web`) закрыт в той же сессии (профиль grandslamcup — `wget --spider`, interval
5s, retries 30, start_period 15s), заодно с волной деплоя §70 GlitchTip — приложение уже
трогали, добавление трёх строк почти бесплатно. Стандарт — профиль grandslamcup (при
подключении к rollout желателен выделенный `/api/health`, чтобы не зависеть от тяжёлой
главной). `deploy-engine doctor --app X` валидирует compose (healthcheck, alias, нет
container_name/ports, DEPLOY_TAG, label); **rollout отказывается работать без пройденного
doctor**. Healthcheck добавляется per-app в той же пачке, что и включение rollout — не
big-bang.

**Ключевые файлы будущей реализации:** `deploy-affected.sh:930-1040` (шов интеграции rollout),
`libs/infra-config/src/index.ts` (`E2E_GATED_APPS`), `libs/deploy-mcp/src/server.ts:46-91`
(`checkE2eGate` → hard gate), `apps/dashboard-agent/src/routes/deploy.ts` (паттерн
nsenter-spawn/deployId для rollback-эндпоинта), `apps/grandslamcup/docker-compose.production.yml`
(эталон compose-миграции).

#### Сессии Фазы 3 (продолжение нумерации A–D)

| #     | Условие старта                                                                             | Содержимое                                                                                                                                                                 | DoD                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E** | ✅ готово (сессия №65, 2026-07-11)                                                         | Каркас `libs/deploy-engine`: lib по `.claude/rules/libs.md`, CLI, команды `doctor`+`status`, docker-обёртки с executor-инъекцией, схема deploy-manifest, юнит-тесты        | ✅ lint/typecheck/test зелёные (15/15); `doctor --app grandslamcup` локально на реальном compose репо (эквивалент s2) выдаёт корректный NOT READY-отчёт с диагностикой                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **F** | после 2026-07-18 + ≥1 живого warn-деплоя                                                   | Hard gate: `E2E_GATED_APPS` в infra-config, блок fail-closed в deploy-mcp, диагностичный ответ при блоке, тесты всех 6 веток                                               | Живой блок прод-деплоя grandslamcup без свежего e2e (с полной диагностикой); цепочка staging→e2e→prod проходит; `time` (не gated) деплоится как раньше                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **G** | ✅ готово (сессия №68, 2026-07-12)                                                         | Команда `rollout` + пилот на `time`: compose time (healthcheck, alias `time-app`, минус container_name/ports, DEPLOY_TAG, label), ветвление в deploy-affected.sh по label  | ✅ Финальный ретрай (`deployId 1b6fd716`) — все 8 шагов rollout без единого ❌, multi-IP nginx-баланс подтверждён вживую (`nginx-reload-1` временно балансировал на оба контейнера, без потери трафика — `time.letar.best` 200 OK весь пилот). По пути найдены и закрыты 2 бага (`--deploy-tag` parseArgs strict-mode `6618e3e`; `resolveOldContainer()` по compose-лейблам вместо `<name>-1` `77d023b`), оба покрыты тестами. Возврат label не проверялся отдельно (не потребовался — прямого пути не было regression)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **H** | после G                                                                                    | Rollback + манифест: rollout пишет манифест, `rollback` в engine, `POST /api/deploy/rollback` в dashboard-agent, tool `deploy_rollback` в deploy-mcp, `migrationWarning`   | Живой rollback time на предыдущий sha без пересборки и простоя; roll-forward обратно; манифест корректен                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **I** | после F+H                                                                                  | grandslamcup на полный стек (gate+rollout+rollback) + доки (deployment.md — rollout/rollback, e2e-testing.md), отметка DoD §18 Фаза 3 с датой включения hard gate          | Живой gated-деплой grandslamcup через rollout; блок при несвежем e2e воспроизведён                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **J** | ⏳ начат досрочно (сессия №69, 2026-07-12, независимо от I — rollout не требует hard gate) | Тираж на остальные приложения пачками 3–5 через doctor-чек-лист; проверка, что host-порты нигде больше не используются (мониторинг!); blue-green fallback задокументирован | 8/~19 SERVER_APPS на rollout (`time`, `form-docs`, `pravda`, `kami-key-the-landing`, `letar-landing`, `animatrona-landing`, `dsperevod`, `aboi` — все ✅ чистые пилоты, подробности выше в шапке файла). Найден и закрыт баг детектора label в `deploy-affected.sh` (`4fbc414`), важен для всего тиража. `form-example` и `mandala` — обычный (не-rollout) деплой закрыт, `letar.rollout` пока выключен (mandala — период стабильности после прод-инцидента сессии №70; form-example — найден отдельный незаблокированный баг `/products` ECONNREFUSED, сессия №72, закрыт сессией №73). `umami` — compose смигрирован (commit `c119c66`, ⚠️ вендорский образ, rollback --to-sha не применим), `doctor` 8/8 READY, запрос пилота отправлен BlackCove (thread `deploy-umami-rollout-J`) — **ждёт выполнения**. Осталось пройти тиражом: `kami`, затем `archetest`/`grandslamcup`, затем `auth-hub`/`driving-school` последними (риск по возрастанию)                                                                                                                                                          |
| **K** | ✅ найдено и закрыто (2026-07-16, BlackCove + CobaltReef)                                  | Прод-инцидент: rollout `auth-hub` завис на 5 минут и упал по таймауту `wait-healthy`                                                                                       | **Root cause:** `rollout.ts:165` хардкодил имя нового контейнера как `${projectName}-app-2`, но Docker Compose при `--scale app=2` берёт следующий по возрастанию индекс относительно уже существующих реплик (не переиспользует «-2») — после нескольких rollout-циклов старый контейнер уже был `-app-3`, новый создавался как `-app-4`, и `waitHealthy` пять минут опрашивал несуществующий `-app-2`. Баг воспроизводился бы на любом rollout-приложении с накопленной историей циклов. **Фикс (commit `1e5e359`, CobaltReef):** новая `resolveNewContainer()` (аналог `resolveOldContainer`) резолвит новый контейнер через `docker ps --filter label=...` после scale-up; новый гейт `resolve-new-container` между `scale-up` и `wait-healthy` (10 гейтов вместо 9) — при неоднозначном резолве падает явно, не висит в таймауте. Regression-тест в `rollout.spec.ts` воспроизводит инцидент напрямую. Подтверждено в бою на 4 последующих rollout-деплоях (svoichuzhie, aprel8008, aboi, dsperevod) — все чистые, `resolve-new-container` корректно нашёл `-app-3`/`-app-4` вместо хардкод-угадывания |
| **L** | ✅ найдено и закрыто (2026-07-16, BlackCove)                                               | Побочная находка при расследовании K: `deploy_status` во время `wait-healthy` показывал пустой лог — выглядело как повторное зависание                                     | **Root cause:** не буферизация ОС/pipe, а архитектурный пробел — `runRollout()` не делал ни одного `console.log`, все 10 шагов копились в массив `steps` молча; `cli.ts` печатал их одним блоком (`printRolloutResult`) только после того, как `await runRollout(...)` полностью резолвился. Во время `wait-healthy` (до 5 минут поллинга) в лог не попадало вообще ничего. **Фикс:** `runRollout()` получил опциональный 5-й параметр `onStep?: (step) => void`, вызывается сразу после каждого `steps.push()` через локальный helper `push()`; `cli.ts` подключил его к `console.log` — шаг печатается сразу по готовности, не постфактум. Regression-тест в `rollout.spec.ts` проверяет, что `onStep` видит те же шаги в том же порядке, что и итоговый `result.steps`. Тесты/typecheck/lint зелёные                                                                                                                                                                                                                                                                                                     |

**🆕 Backlog — генератор rollout-профиля через `nx generate` (2026-07-15):** паттерн
`docker-compose.production.yml` (network alias `<app>-app`, healthcheck, `letar.rollout` label,
`stop_grace_period`, отсутствие `container_name`/`ports` у `app`) сейчас копируется вручную в
каждом из 19 приложений тиража J — источник ошибок копипаста (см. находки form-example
2026-07-15: пропущенный `ports:` у `db:`, разошедшееся имя `DB_PASSWORD`/`POSTGRES_PASSWORD`).
Тираж J завершён (19/~19), но для **новых** приложений эта ручная миграция повторится. Кандидат:
Nx-генератор (`nx g @letar/deploy-engine:rollout-profile <app>` или похоже) — накатывает
rollout-секцию `db:`+`app` по чеклисту из [deployment.md](/.claude/docs/deployment.md#чеклист-секции-db--обязательно-для-миграций)
(host-порт `db:`, `DB_PASSWORD`, healthcheck, alias, label) поверх существующего compose. Не
блокирует ничего текущего — заводить, когда появится следующее приложение с БД на очереди на
rollout, не раньше. Не начато.

### DoD §18 (Фазы 1–2)

- [x] Сессия A: sha-теги на образах ✅ (`time:63bcadacd`/`time:1160e9e46`); pre-migrate дамп/abort — код есть, на `time` миграций не было (нужен app с миграцией для полной проверки)
- [x] Сессия B: `nx lint/typecheck` зелёные ✅; guard staging/production в deploy.ts ✅
- [x] Сессия C: BlackCove задеплоил `time` через `deploy_app` (не SSH), exitCode 0 ✅. s3-инстанс поднят и healthy (loopback `13103`, порт закрыт от интернета даром) — **s2 порт 3100 всё ещё торчит наружу** (отдельный заход)
- [x] Сессия D: живой прогон полного цикла на grandslamcup завершён 2026-07-11 — `deploy_app(staging)` → `run_e2e` → `e2e_status`, 24/28 passed, `03-admin.spec.ts` (auth-цепочка через warn-gate) зелёный
- [ ] Неделя warn-only без ложных срабатываний → решение о hard gate (Фаза 3) — отсчёт начинается с 2026-07-11

---

## §18.7 — Тираж E2E-гейта на все приложения 🆕

> Выделено в отдельный трек 2026-07-21 (по запросу владельца) — раньше жил как подсекция
> внутри §18, хотя фактически это независимый, активный фронт работ (основной источник записей
> в журнале сессий `PLAN.md`) со своей инвентаризацией, батчами и DoD. Связан с §18 только тем,
> что использует тот же пайплайн `deploy_app(staging)` → `run_e2e` → `e2e_status`; не зависит от
> состояния hard gate (Фаза 3 §18, только `grandslamcup`).

> **Цель (сформулирована владельцем):** ни одно приложение не должно попадать на прод, не пройдя
> e2e — цель шире, чем нынешний факт «только `grandslamcup` в `E2E_GATED_APPS`». Отдельно от
> тиража rollout (§18.6 Сессия J, тот закрывает только «контейнер не поднялся», не логические
> регрессии — см. разбор в диалоге). Это НЕ добавление новых сессий к hard gate (F) — тот остаётся
> как есть (только grandslamcup, дата 2026-07-18); это отдельный трек по подключению остальных
> приложений к staging-e2e (Сессия D паттерну), параллельно и независимо от F.

> **📋 Плотный операционный нарратив тиража** (batch M1 находки, статус на 2026-07-21/22, находки
> требующие отдельного трека) — вынесен в `.claude/private/PLAN-JOURNAL.md` §18.7 (2026-07-28,
> §27 Часть 2 Шаг 2.5) — кросс-приложенческая запись с причинно-следственными связями между
> приложениями, тот же класс контента, что журнал §18.6/§18.7 выше.

**Инвентаризация (2026-07-17, `apps/*-e2e` × `S2_APPS` из `deploy-affected.sh`):**

Приложения на s2 **с готовым e2e-сьютом**, ещё не подключённые к staging-гейту (13): `time`,
`pravda`, `mandala`, `aira-web`, `kami`, `dsperevod`, `aboi`, `svoichuzhie`, `aprel8008`,
`form-example`, `archetest`, `auth-hub`, `driving-school`.

Приложения на s2 **без e2e-сьюта вообще** (9): `dashboard`, `dashboard-agent`, `form-docs`,
`umami`, `animatrona-landing`, `animatrona-tracker`, `kami-key-the-landing`, `letar-landing`,
`studio`. `umami` — вендорский образ (не наш код, `rollback --to-sha` уже отмечен как
неприменимый в J) — e2e тут смысла не имеет, кандидат на явное исключение, а не «долг». `dashboard`
и `dashboard-agent` — спецпути self-deploy, уже исключены из rollout по той же причине
(§18.6 Сессия J) — staging-e2e для них требует отдельного проектирования (self-deploy не вписывается
в «деплой на s3 → тест → деплой на s2»), не просто «добавить сьют».

**Тираж M — приложения с готовым e2e, подключение к staging-гейту.** По образцу Сессии D
(grandslamcup): staging-домен `<app>-stage.s3.letar.best`, `.env.staging`, при наличии приватных
данных в БД — анонимизированный снепшот (см. «Staging-данные» выше), `playwright.config.ts` на
`BASE_URL`, добавление в `E2E_GATED_APPS`. Порядок — по возрастанию риска, вслед за уже принятой
логикой J (низкорисковые вперёд, auth-критичные последними):

| Батч | Приложения                                                                               | Условие старта                                                                                                                                                              |
| ---- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1   | `aboi`, `svoichuzhie`, `aprel8008`, `dsperevod`, `mandala`, `pravda`, `aira-web`, `time` | ✅ можно начинать сразу — все уже прошли rollout-пилот, e2e-сьюты существуют                                                                                                |
| M2   | `form-example`, `kami`                                                                   | после M1, без доп. условий                                                                                                                                                  |
| M3   | `archetest`                                                                              | после M2 — своя специфика (психометрия, express-results), нужен отдельный анонимизирующий скрипт снепшота                                                                   |
| M4   | `auth-hub`, `driving-school`                                                             | последними — auth-hub держит OIDC для всего монорепо, ошибка гейта здесь блокирует релизы всех downstream-приложений; driving-school — мультитенантность, самый сложный e2e |

DoD батча: `deploy_app(staging)` → `run_e2e` → `e2e_status` зелёный для каждого приложения батча,
`E2E_GATED_APPS` обновлён, warn-only минимум неделю на новом приложении перед тем, как рассчитывать
на него как на реальную защиту (та же осторожность, что и с F).

**⚠️ M1 (`mandala`, `pravda`) — задеплоены, e2e прогнан 2026-08-12, оба с реальными красными.**
Не флейк — воспроизводимые кластеры, `E2E_GATED_APPS` **не обновлён**, DoD (зелёный прогон) не
выполнен:

- **`mandala`** (116/123 зелёных, 7 красных): гостевой checkout не находит кнопку «Добавить в
  корзину»/не переходит на `/shop/...` (`04-checkout.guest.spec.ts`,
  `05-full-checkout.guest.spec.ts`, 4 теста) — похоже, разметка/текст кнопки разошлись с
  селектором в тесте или сам flow изменился. Клик по заказу в admin-таблице не переводит на
  `/admin/orders/[id]` (`04-admin-orders.admin.spec.ts`, `09-admin-order-status.admin.spec.ts`,
  3 теста) — похоже на сломанную ссылку/роутинг в таблице. Интеграционный full-flow тест
  (admin-путь) при этом прошёл целиком.
- **`pravda`** (189/240 зелёных, 44 красных, 4 flaky): TOC не рендерится (счётчик ссылок = 0,
  `aria-current` не проставляется), bookmarks (весь файл красный на webkit — кнопка скрыта/не
  кликается), cross-refs (весь файл красный на webkit — элементы скрыты либо дублируются, strict
  mode violation), RSC-навигация в Firefox (тот же паттерн, что уже видели на mandala — клик по
  ссылке не меняет URL корректно), Command Palette не закрывается по Escape на webkit.

Скриншоты/трейсы — в `test-output` на s3. Чинить — отдельная задача (баг-трекинг конкретных UI
регрессий, не входит в скоуп подключения к гейту); можно параллельно тиражу.

**➡️ Раунд 2 (2026-08-12, тот же вечер) — часть кластеров закрыта, `E2E_GATED_APPS` всё ещё не
обновлён.** Детали и коммиты — `apps/mandala/PLAN_COMPLETED.md`/`apps/pravda/PLAN_COMPLETED.md`.

- **`mandala`** — checkout/success (`04-checkout.guest.spec.ts`) был тестовым багом, не
  приложения: `count()` не ждёт гидратации `'use client'`-компонента, заменено на `toBeVisible()`
  (`10046c8c`). admin-orders: рыхлый локатор `tr a` заменён на `getByRole('link', {name})`
  (`61f13bb8`), но **`09-admin-order-status.spec.ts:38/83` уже использовали точный локатор и
  всё равно не долетают до навигации на стейдже** — не закрыто, ждём network-лог из трейса
  BlackCove (запрос на `/admin/orders/[id]` вообще уходит с браузера или нет).
- **`pravda`** — застрявший прогресс-бар TOC + случайный `aria-current` (`850f0f62`), webkit
  дублированная разметка `Article` ломавшая bookmarks/cross-refs (`bbc5aad2`) — оба закрыты.
  **Не закрыто:** TOC всё ещё пустой (`count()===0`, другой баг, чем прогресс-бар), RSC-навигация
  Firefox/webkit, Command Palette Escape (флейк без стабильного репро).

**✅ M2 (`form-example`, `kami`) — staging-инфраструктура заведена 2026-08-12, два блокера
найдены и починены при первом деплое.**

1. **`form-example` staging задеплоен.** Первый e2e-прогон — **невалидный, не баг стейджа**:
   `apps/form-example-e2e/playwright.config.ts` хардкодил `webServer.url: 'http://localhost:3022'`
   вместо `baseURL` — readiness-проверка стучалась в localhost, не видела там ничего и тихо
   поднимала `next dev` на `localhost:3000` (Turbopack), 48/48 тестов упали против него, не
   против стейджа. Плюс у `form-example-e2e` не было `project.json` вообще — та же категория
   бага, что уже чинили на `time`/`aboi`/`grandslamcup` 2026-07-19 (без явного
   `executor: '@nx/playwright:playwright'` Nx-инференс через `@nx/playwright/plugin` добавляет
   `dependsOn` на dev-таск ДО проверки `reuseExistingServer`/`url`). Оба фикса внесены
   (`0598571a`) — `run_e2e` нужно перезапустить.
2. **`kami` staging НЕ собирался.** Причина — не OIDC/Telegram/Yandex Metrica (это и
   предполагалось), а `keystatic.config.ts`: `isProd = NODE_ENV === 'production'` — та же
   известная ловушка (`node-env-not-production-signal.md`) — на стейдже (тот же собранный
   `next build`, что и на проде) включала `storage: 'github'`, `next build` падал целиком на
   `collectPageData` для `/api/keystatic/[...params]` без `KEYSTATIC_GITHUB_CLIENT_ID`/`SECRET`.
   В отличие от OIDC (там просто нет кнопки входа), это ломало весь билд. **Решение владельца
   (2026-08-12): graceful degradation**, не отдельный GitHub OAuth App для стейджа. Условие
   заменено на `Boolean(process.env.KEYSTATIC_GITHUB_CLIENT_ID)` — сборка не зависит от
   NODE_ENV/домена, только от факта наличия кредов (`0598571a`). Тот же
   `project.json`/`webServer.url` фикс применён и к `kami-e2e`.
   > ⚠️ **Продолжение (2026-08-12, тот же день):** точечный фикс не заметил дубль —
   > `apps/kami/src/lib/keystatic.ts` (`reader`) содержал тот же `isProd = NODE_ENV ===
   > 'production'`, что и починенный `keystatic.config.ts`. Фикс тот же (`Boolean(GITHUB_PAT)`).
   > Заведён системный барьер: `no-restricted-syntax` в корневом `eslint.config.mjs` ловит
   > `NODE_ENV === /!== 'production'` (обе стороны сравнения) во всём репо, с allow-list на
   > разобранные точечно легитимные случаи (build-тулинг, Electron main, cookie `secure`,
   > Prisma dev-cache, rate-limit storage). Полный разбор всех 34 найденных вхождений —
   > `.claude/docs/node-env-not-production-signal.md` § Ревизия ESLint-правила.

✅ **Системный гэп закрыт полностью, аудит 2026-08-12.** Полный обход всех `apps/*-e2e/playwright.config.ts`
(не только подозреваемых) на оба дефекта (отсутствующий `project.json` с явным executor +
хардкод `webServer.url` вместо `baseURL`):

| Приложение                 | `project.json` было | `webServer.url` было      | Дефект(ы)                             | Статус                        |
| -------------------------- | ------------------- | ------------------------- | ------------------------------------- | ----------------------------- |
| `animatrona-landing-e2e`   | ❌ отсутствовал     | `'http://localhost:3008'` | оба                                   | ✅ починено                   |
| `letar-landing-e2e`        | ❌ отсутствовал     | `'http://localhost:3015'` | оба                                   | ✅ починено                   |
| `form-develop-app-e2e`     | ❌ отсутствовал     | `'http://localhost:3006'` | оба                                   | ✅ починено                   |
| `form-docs-e2e`            | ❌ отсутствовал     | уже `baseURL`             | только project.json                   | ✅ починено                   |
| `kami-key-the-landing-e2e` | ❌ отсутствовал     | уже `baseURL`             | только project.json                   | ✅ починено                   |
| `archetest-e2e`            | ❌ отсутствовал     | уже `baseURL`             | только project.json (см. разбор ниже) | ✅ починено (консистентность) |
| остальные 18 e2e-сьютов    | ✅ был              | ✅ уже `baseURL`          | ни одного                             | без изменений                 |

`form-develop-app-e2e` — шестое приложение с гэпом, не входившее в предварительный список
(инвентаризация `apps/*-e2e` целиком, не только подозреваемых из батча M2). Для каждого
починенного `project.json` добавлен по образцу `apps/time-e2e` (явный
`executor: '@nx/playwright:playwright'` для таргета `e2e` — обходит инференс-`dependsOn` на
dev-таск через `@nx/playwright/plugin`, см. врезку в `time-e2e/playwright.config.ts`). Хардкод
`url` заменён на ссылку на ту же переменную `baseURL`, что уже используется в `use.baseURL` того
же файла. Проверено `nx show project <app>-e2e --json`: у всех шести `targets.e2e.dependsOn`
теперь `undefined` (как у `time-e2e`), в отличие от отдельных атомизированных `e2e-ci--*`
таргетов, где `dependsOn` на `dev` остаётся — это ожидаемо, они не участвуют в обычном `nx e2e`.
Живой прогон `nx e2e <app>-e2e -- --project=chromium` подтверждён на двух приложениях:
`letar-landing-e2e` (11/11 зелёных) и `animatrona-landing-e2e` (14/14 зелёных).

**Разбор `archetest-e2e` (почему 21/21 проходил без `project.json`):** это было совпадение, не
защита. `webServer.url` там уже ссылался на `baseURL` (не хардкод), поэтому единственный
оставшийся дефект — отсутствие `project.json` — не проявлялся: без `BASE_URL` в окружении
`baseURL` резолвится в тот же `http://localhost:3012`, куда инференс-`dependsOn` и так поднимает
dev-сервер. Если бы CI/агент когда-либо прогнал `archetest-e2e` с `BASE_URL=https://archetest-
stage.s3.letar.best` (как задумано для тиража M3), сработал бы тот же race, что уже чинили в
`kami-e2e`/`form-example-e2e` (`0598571a`): Nx поднимает локальный dev ДО того, как Playwright
успевает проверить `reuseExistingServer`, и тест идёт против пустого локального окружения вместо
стейджа — молча, без ошибки. `project.json` добавлен для консистентности и на будущее (M3
использует именно `BASE_URL`-паттерн), подтверждено `nx show project archetest-e2e --json`.

**Генератор `@letar/generators:e2e-suite` — не является источником бага, чинить не пришлось.**
Оба его шаблона (`files/playwright.config.ts.template`, `files/project.json.template`) уже
генерируют правильный паттерн из коробки: `url: baseURL` в `webServer` и явный
`executor: '@nx/playwright:playwright'` в `project.json`. Все 6 починенных приложений либо
старше генератора (создан 2026-07-18), либо созданы не через него — проверено по отсутствию
`project.json`, который генератор всегда создаёт.

**⚠️ M2 (`form-example`, `kami`) — прогнаны на актуальном коде 2026-08-15, оба с реальными
красными.** Не флейк, не деплой/инфраструктура — сам BlackCove подтвердил, что провалы не по его
части (не ECONNREFUSED, не 4xx/5xx, не проблема авторизации). `E2E_GATED_APPS` **не обновлён**,
чинить — отдельная задача, не входит в скоуп подключения к гейту:

- **`form-example`** (28/48 зелёных, 20 красных), два паттерна, оба на всех 3 браузерах:
  - 12 падений — `h1` вообще не появляется на `/examples/conditional`, `/examples/groups`,
    `/examples/multi-step`, `/examples/validation` (`toBeVisible()` таймаут 5000ms).
  - 5 падений — `table-editor.spec.ts` (chromium+webkit): чекбоксы `input[type=checkbox]` не
    переходят в `checked` (select-all, toolbar count, одиночный клик).
- **`kami`** (12/150 зелёных, 138 красных) — первый прогон вообще. Контент блога не находится
  (`hello-world`, даты, `Featured`-бейдж, англ. версия статьи) — `element(s) not found`, таймаут
  5000ms, одинаково на всех браузерах. Похоже на **отсутствие seed-данных блога на staging**, а
  не баг рендера, но отчёт BlackCove обрезан (виден хвост, `05-blog.spec.ts` целиком — 24 из 138
  падений) — не подтверждено до конца, 114 падений вне видимой части (вероятно `01-04-*.spec.ts`).

**Побочный системный баг, найден в той же сессии, не починен:** `deploy-affected.sh` определяет
`SERVER_NAME` через `hostname -f`, а на s3 реальный hostname — `s1694383.smartape-vps.com`, не
матчит ни один паттерн (`*s3.letar.best*`/`s3`/`server3`). Из-за этого override
`docker-compose.s3.yml` для `dashboard-agent` не срабатывает — контейнер поднимается на
дефолтном `docker-compose.production.yml` с портом `3100` вместо `13103`, что ломает SSH-туннель
deploy-mcp/e2e на s3. BlackCove чинил вручную дважды за сессию (`docker compose -f
docker-compose.s3.yml --env-file .env.docker up -d --force-recreate app`). Заведено отдельной
секцией — **§81**.

**Тираж N — приложения без e2e, сначала пишем сьюты.** ✅ **6/6 закрыто (2026-07-18):**
`animatrona-landing` (14 тестов), `animatrona-tracker` (15), `kami-key-the-landing` (9),
`letar-landing` (11), `studio` (16, приватный submodule `letar-private-studio-e2e`), `form-docs`
(2, сгенерирован генератором ниже) — все прогнаны локально до зелёного (`bunx playwright test`
напрямую против вручную поднятого dev-сервера — **`nx e2e <app>-e2e` зависает**: инферренный
`dependsOn: [{project: <app>, target: 'dev'}]` в связке с `webServer`/`networkidle` в dev-режиме
Next.js виснет намертво, HMR-вебсокет никогда не даёт `networkidle`; воркэраунд задокументирован в
`.claude/docs/e2e-testing.md` § «nx e2e зависает намертво в dev-режиме Next.js»). По пути найдены и
починены два реальных бага: wiring `@letar/auth` в `studio` (paths/references/implicitDependencies
отсутствовали — dev-session роут падал 500) и отсутствующий `apps/form-docs/.env` (без него
`next dev` слушал 3000 вместо документированного 3020 — нарушение конвенции `.env` = только PORT).
`dashboard`/`dashboard-agent`/`umami` — отдельное решение по каждому (self-deploy-проектирование /
вендорский образ), не автоматически «просто напиши e2e» — не в скоупе тиража N.

**🆕 Генератор `@letar/generators:e2e-suite`** (`libs/generators`, 2026-07-18) — закрывает backlog
дублирования `playwright.config.ts` по ~20 приложениям (был отдельный пункт в этом же разделе).
`nx g @letar/generators:e2e-suite <app>` скаффолдит `apps/<app>-e2e` целиком (package.json,
tsconfig, eslint, playwright.config.ts с портом из `apps/<app>/.env`, `.gitignore` для
`playwright/.auth/`, стартовый smoke-тест). 8/8 юнит-тестов, живой прогон на `form-docs` подтверждён
(typecheck+lint+playwright test все зелёные). Заодно нашёл и закрыл реальный пробел в корневом
`eslint.config.mjs` — `**/out-tsc` (артефакт `tsc --build` для всех e2e-таргетов) нигде не
игнорировался, любой e2e-проект падал на линте `.d.ts` после первого `nx typecheck`.

**➡️ Следующий старт §18.7:** тираж M — подключение к staging-e2e-гейту приложений, у которых сьют
уже есть (14, включая 6 свежих из N): `aboi`/`time` первыми (уже проверенные пилоты rollout) через
паттерн Сессии D.

**🆕 Инцидент 2026-07-28 (archetest) продвигает 5 коммерческих приложений вне очереди батча M.**
`CookieBanner` рендерился вне `ChakraProvider` (сиблинг вместо потомка в `[locale]/layout.tsx`) —
падал на КАЖДОЙ странице сайта для реальных посетителей, деплой прошёл незамеченным (v0.25.0 →
0.25.4) потому что верификация шла через HTTP `fetch` (статус-коды), а не через реальный
браузерный рендер. Владелец решил: **hard gate сразу** (не warn-only минимум неделю, как в DoD
выше) — прогон e2e на staging обязателен перед КАЖДЫМ `deploy_app` на прод, начиная немедленно,
а не после своей очереди в батче M2/M3.

**Скоуп уточнён (2026-07-28, тред agent-mail `e2e-gate-hard-scope-5-commercial`):** не пилот на
одном archetest — сразу на всех пяти активных коммерческих приложениях: **archetest, dsperevod,
svoichuzhie, aboi, aprel8008**. У всех пяти уже есть `<app>-e2e` — технической причины
ограничиваться пилотом не было. Не путать с warn-only батчем M1 выше (`mandala`/`pravda`/
`aira-web` входят в M1, но не сюда — они не активные коммерческие приложения; `svoichuzhie`/
`aprel8008`/`dsperevod` состоят в обоих треках одновременно, но M1 не блокирует, а это должно).

Технические требования (озвучены BlackCove при подтверждении скоупа, реализация — на стороне
владельца deploy-mcp-инфраструктуры, не BlackCove — см. статус ниже):

- Подтвердить, что `<app>-e2e` гоняется против настоящего staging-инстанса, а не отдельной
  эфемерной БД (иначе гонка данных).
- Таймаут на `run_e2e` (10–15 мин) — истёк таймаут ⇒ трактовать как явный fail, не как
  «прогона не было» (иначе лазейка «просто не дождаться» разблокирует деплой).
- «Отсутствие прогона» и «явная ошибка e2e» блокируют деплой одинаково — разница только
  в тексте сообщения пользователю, не в поведении gate.
- Инфраструктурный сбой самого `run_e2e` (staging недоступен, БД занята другим деплоем) тоже
  блокирует прод, а не пропускает молча.

**Статус (2026-07-28, обновлено root-weaver):** ✅ **код реализован и покрыт тестами**, ⏳ **не
подтверждён вживую** — приоритет отдан archetest как самому срочному из пяти:

- `HARD_GATED_APPS` (`archetest`, `dsperevod`, `svoichuzhie`, `aboi`, `aprel8008`, `studio` —
  добавлен 2026-08-06) в `libs/infra-config/src/index.ts`. У `studio` staging-инфраструктуры не
  было вообще (не входил в тираж M1) — заведена по факту первого гейтованного деплоя
  (`apps/studio/docker-compose.staging.yml` + `.env.staging.example`, порты s3 app `3032`/db
  `5465`), гейт подтверждён живым прогоном (15/16 → фикс OIDC-креды в примере → 16/16 → deploy).
- `evaluateE2eGate()` в `libs/deploy-mcp/src/server.ts` (переименована из `checkE2eGate`) —
  fail-closed для этих 5: `deploy_app(production)` возвращает `isError` ДО вызова
  `/api/deploy/app`, если для приложения нет прогона / прогон упал / коммит не совпадает /
  старше 24ч / статус не удалось получить (сеть/туннель) — все причины блокируют одинаково,
  как и требовалось. 11/11 юнит-тестов (`server.spec.ts`, зависимости `fetchStatus`/`getHeadSha`
  инжектируются — тестируется без реального SSH/git), lint/typecheck зелёные.
- **Таймаут `run_e2e`** (требование из списка выше) — добавлен в
  `apps/dashboard-agent/src/routes/e2e.ts`: 15 мин, SIGTERM → SIGKILL через 10с, по срабатыванию
  явно пишет `.last-e2e-status/<app>.json` с `passed:false` (не оставляет «прогона как будто не
  было» — иначе зависший процесс никогда не обновил бы статус, и гейт продолжил бы читать старый
  зелёный). То же самое сделано для ошибки самого процесса (`spawn`/`error`-событие) — раньше
  `lastStatus` в этом случае не писался вообще.
- **Живая проверка (BlackCove, сразу после push):** ✅ гейт подтверждён fail-closed —
  `deploy_app(archetest, production)` реально отказал с причиной «ещё ни разу не прогонялся
  e2e на staging». Заодно поймал и починил второй блокер: коммит `b87ce831` был только
  локальным, не запушенным в `origin/main` — `git push` сделан, ветка синхронизирована.
- **🔴 Третий блокер, найден тем же прогоном: у archetest не было `docker-compose.staging.yml`**
  — `deploy_app(archetest, staging)` отвечал успехом, но ничего не разворачивал (`No
docker-compose.staging.yml found for archetest, skipping...`). Без staging-инстанса
  `run_e2e` бить некуда — гейт был бы заблокирован навсегда. **Заведён** (root-weaver, по
  образцу dsperevod/svoichuzhie): `apps/archetest/docker-compose.staging.yml` (БД-порт 5463,
  app-порт 3030, домен `archetest-stage.s3.letar.best` — валиден по существующему DNS
  wildcard, новая запись не нужна). Детали и что осталось (`.env.staging` на s3, NPM proxy
  host) — `apps/archetest/PLAN.md`.
- **Не сделано:** (1) redeploy `dashboard-agent` на s3 (таймаут `run_e2e` живёт там —
  BlackCove упёрся в то, что dashboard-agent на s3 живёт по отдельному `docker-compose.s3.yml`,
  обычный staging-путь его не видит, идёт через SSH напрямую как резервный канал); (2) первый
  живой `deploy_app(archetest, staging)` → `run_e2e` → зелёный → `deploy_app(archetest,
production)` — теперь технически возможен (staging-конфиг есть), но ещё не пройден.
- dsperevod/svoichuzhie/aprel8008 технически покрыты тем же кодом (список общий) и у них уже
  ЕСТЬ `docker-compose.staging.yml` — блокер выше был специфичен для archetest. Их собственный
  живой прогон не приоритет этой сессии.

Не путать с М3 в таблице выше — там archetest ждала после M2 «специфика психометрии, снепшот»
для ПОЛНОГО staging-гейта (анонимизация данных и т.п.); этот трек — только hard e2e-gate перед
деплоем, конкретный ответ на конкретный инцидент, для 5 приложений сразу.

**✓ DoD этого трека:** код — ✅ готово (см. выше). Живой блок прод-деплоя без свежего e2e хотя бы
на archetest — ⏳ не подтверждён. Живая успешная цепочка `deploy_app(staging)` → `run_e2e` →
зелёный → `deploy_app(production)` для archetest — ⏳ не подтверждена. Остальные 4 — тем же
чек-листом, после archetest.

> **Батч M1 (статус на 2026-07-21) и находки, требующие отдельного трека** (dashboard-agent
> устарел на s3, `run_e2e` не выставляет `CI=1`, `db:seed` не резолвит алиас, `@letar/format-utils`
> сломан) — детали в `.claude/private/PLAN-JOURNAL.md` §18.7 (см. пометку выше).

---

## §18.8 — `.env.staging` не шифруется и не трекается: завести `.env.staging.enc` по образцу `.env.docker.enc` 🟡 ТИРАЖ ЗАКРЫТ (2026-08-12), живой staging-деплой не подтверждён

> Добавлено 2026-08-05 (сессия domwellbes: staging-окружение + dev-session bypass для админки).
> Пилот на `domwellbes` закрыт 2026-08-06 (см. «Что сделано» ниже) — тираж на остальные 11
> приложений ещё не начат.

### Проблема

Прод-секреты (`.env.docker`) шифруются SOPS+age и хранятся в git как `.env.docker.enc`
(Этап 0.4) — единый источник истины, деплой расшифровывает на лету. **Staging-секреты
(`.env.staging`) в этот процесс не входят вовсе:** в git трекается только `.env.staging.example`
(шаблон-плейсхолдер), а реальный файл с паролями БД/`BETTER_AUTH_SECRET`/`DEV_SESSION_TOKEN`
существует только на s3, заводится BlackCove вручную и нигде не бэкапится и не версионируется.

Обнаружено на примере `domwellbes`: `.gitignore` submodule даже не игнорировал сам
`.env.staging` явно (только допускал `.env.staging.example`) — до правки файл при неосторожном
`git add .` на s3 мог случайно закоммититься **в открытом виде**. Тот же пробел в `.gitignore`
найден у `aboi` (чинится параллельным треком). Раз секреты живут на диске сервера без
шифрованной копии в git — это ещё и точка потери данных: пересоздание s3 требует ручного
восстановления `.env.staging` каждого staging-приложения по памяти/переписке, не из репозитория.

### Что сделать

- Завести `.env.staging.enc` для каждого приложения со staging-окружением (`grandslamcup`,
  `aboi`, `aprel8008`, `archetest`, `auth-hub`, `driving-school`, `dsperevod`, `mandala`,
  `pravda`, `svoichuzhie`, `time`, `domwellbes`) — тем же SOPS+age конвейером, что и
  `.env.docker.enc` (`sops --encrypt --output apps/<app>/.env.staging.enc apps/<app>/.env.staging`)
  — [secret-manager.md](/.claude/docs/secret-manager.md).
- Обновить pre-commit хук `scripts/hooks/pre-commit-sops.sh` — он сейчас шифрует только
  `.env.docker` → `.env.docker.enc` ([env-files.md](/.claude/rules/env-files.md)); нужно то же
  правило для `.env.staging` → `.env.staging.enc`.
- Обновить `.gitignore` каждого приложения: `.env.staging` игнорируется, `.env.staging.enc`
  трекается (симметрично `.env.docker`/`.env.docker.enc`).
- Обновить деплой (`deploy-affected.sh --staging`) — расшифровка `.env.staging.enc` на s3 тем же
  `decrypt_sops_env()`, что уже используется для `.env.docker.enc`.
- ⛔ **Отдельно проверить:** `ALLOW_DEV_SESSION`/`DEV_SESSION_TOKEN` живут только в
  `.env.staging`, никогда в `.env.docker`/`.env.docker.enc` — это правило не меняется, шифрование
  `.env.staging.enc` его не отменяет и не ослабляет ([env-files.md](/.claude/rules/env-files.md)).
- Одноразовая миграция: снять текущие `.env.staging` с серверов (там, где они уже заведены —
  как минимум `grandslamcup`), зашифровать и закоммитить как отправную точку.

### DoD

Пилот на одном приложении (кандидат — `domwellbes`, единственный, где `.env.staging` ещё не
заведён на сервере вообще — можно сразу делать правильно, без миграции существующего файла) →
хук проверен на реальном коммите → тираж на остальные 11 приложений.

### Что сделано (пилот `domwellbes`, 2026-08-06)

- [x] `.sops.yaml` — добавлено правило `\.env\.staging(\.enc)?$` (было только `\.env\.docker(\.enc)?$`,
      без этого `sops --encrypt` падал `no matching creation rules found`).
- [x] `scripts/hooks/pre-commit-sops.sh` обобщён на `.env.staging.enc` **и** переработан под два
      контекста запуска: из корня суперпроекта (`apps/<app>/...`, обычные приложения монорепо) и из
      корня самого приложения (`./...`) — коммит **внутри** приватного submodule запускает хук из
      `.git/modules/apps/<app>/hooks/pre-commit` с cwd = корень submodule, где префикса `apps/*/` не
      существует физически. Старый хук эту разницу не учитывал вовсе (и остался бы немым для
      submodule-коммитов, даже если бы просто добавить `.env.staging.enc` в старый паттерн).
- [x] Хук переустановлен в обе рабочие копии — `.git/hooks/pre-commit` (суперпроект) и
      `.git/modules/apps/domwellbes/hooks/pre-commit` (submodule) — раньше он не был установлен для
      submodule вообще, только для суперпроекта.
- [x] `apps/domwellbes/.env.staging` заведён локально (секреты — `openssl rand -base64 32`,
      не вручную), зашифрован в `.env.staging.enc`, закоммичен и запушен в
      `letar-private-domwellbes` (коммит `f82b056`).
- [x] **Хук проверен на реальном коммите:** правка `.env.staging` без ручного `sops encrypt` + обычный
      `git commit` → хук сам перешифровал и добавил `.env.staging.enc` в коммит (лог `[sops]
      Шифрую... / Зашифровано и добавлено в коммит: 1 файл(ов)`). Тестовый мусор убран отдельным
      коммитом `972f6ca`.
- [x] `.gitignore` `domwellbes`/`aboi` — уже корректны (`.env.staging` игнорируется,
      `.env.staging.enc` нет) — оказалось починено параллельным треком до этой сессии, отдельная
      правка не потребовалась.
- [x] **`.gitignore` остальных пяти submodule со staging (2026-08-10)** — `aprel8008`,
      `driving-school`, `dsperevod`, `studio`, `svoichuzhie` **не** игнорировали `.env.staging`
      явно: `driving-school` держал только `!.env.staging.example` (исключение из игнора шаблона —
      само по себе не игнорирует реальный файл), `dsperevod`/`studio` держали `.env.*.local`
      (матчит только файлы с суффиксом `.local`, `.env.staging` под этот паттерн не подпадает),
      `aprel8008`/`svoichuzhie` не упоминали `.env.staging` вообще ни в каком виде. Добавлена
      явная строка `.env.staging` во все пять — свой коммит в каждом приватном репозитории, SHA
      подняты в корне. Найдено при уборке грязного дерева на s3 (см. также
      [git-pathspec-commit-ignored-deletion](/.claude/docs/git-pathspec-commit-ignored-deletion.md),
      обнаружено в той же сессии). ⚠️ Это закрывает только риск случайного `git add .` — реальная
      SOPS-шифровка (`.env.staging.enc`) для этих пяти по-прежнему не заведена, см. пункт тиража
      ниже.
- [x] Хук установлен во **всех** приватных submodule монорепо, не только в `domwellbes`:
      `apps/aboi`, `apps/aboi-e2e`, `apps/aprel8008`, `apps/domwellbes-e2e`,
      `apps/driving-school`, `apps/driving-school-e2e`, `apps/dsperevod`,
      `apps/poster-microtext-desktop`, `apps/studio`, `apps/studio-e2e`, `apps/svoichuzhie`,
      `libs/driving-school-db`, `.claude/private`. Путь установки различается по типу
      submodule: обычный gitlink-submodule хранит хуки в `.git/modules/<путь>/hooks/pre-commit`
      суперпроекта; четыре submodule (`aprel8008`, `poster-microtext-desktop`, `studio`,
      `svoichuzhie`) физически имеют собственный `.git`-каталог (не gitlink), поэтому хук лежит
      прямо в `<путь>/.git/hooks/pre-commit`. Пустой прогон (без `.enc`-файлов рядом, без
      `SOPS_AGE_KEY_FILE` в окружении) проверен на всех тринадцати — хук тихо завершается
      `exit 0`, не блокирует обычный коммит.
- [ ] **Не проверено:** `decrypt_sops_env()` в `deploy-affected.sh` — по чтению кода уже работает
      **без изменений** для staging (использует переменную `ENV_FILE_NAME`, которая при `--staging`
      равна `.env.staging`, так что `enc_file` автоматически резолвится в `.env.staging.enc`) — но
      живой прогон через staging-деплой (`deploy_app({ target: 'staging' })`) не выполнялся в этой
      сессии, только чтение исходника. Первый реальный staging-деплой `domwellbes` подтвердит или
      опровергнет это на практике.
- [x] Тираж на остальные 11 приложений (2026-08-12) — `grandslamcup`, `aboi`, `aprel8008`,
      `archetest`, `auth-hub`, `driving-school`, `dsperevod`, `mandala`, `pravda`, `svoichuzhie`,
      `time`. У всех одиннадцати `.env.staging` уже существовал на s3 — снят по SSH, зашифрован,
      проверен round-trip'ом (`sops -d` совпал байт-в-байт с оригиналом) для каждого перед
      удалением плейнтекста. Хук уже был установлен во всех пяти submodule из этой группы (`aboi`,
      `aprel8008`, `driving-school`, `dsperevod`, `svoichuzhie`) — доустанавливать не пришлось,
      сделано заранее в сессии 2026-08-10 (см. «Что сделано» выше).
      ⚠️ **Найден и закрыт соседний пробел, не описанный в исходном чеклисте:** корневой
      `.gitignore` игнорировал `.env.staging.enc` для шести **непубличных submodule** приложений
      (`grandslamcup`, `archetest`, `auth-hub`, `mandala`, `pravda`, `time` — они не submodule, а
      часть публичного `letar`, поэтому именно корневой `.gitignore` для них авторитетен, не
      submodule-специфичный). Правило `.env.*` с исключениями матчило только `!**/.env.docker.enc`,
      симметричного исключения для `.env.staging.enc` не было — `git add` тихо не находил бы файл
      кандидатом на коммит без явного `git add -f`. Добавлено `!**/.env.staging.enc` рядом с
      существующим исключением. Пять submodule-приложений эту проблему не имели — у них
      собственный `.gitignore`, уже поправленный в сессии 2026-08-10.
- [ ] **Не проверено:** реальный staging-деплой этих 11 приложений (`decrypt_sops_env()` внутри
      `deploy-affected.sh --staging`) на новых `.env.staging.enc` — только `domwellbes` (пилот)
      имел это в плане, но живой прогон и для него не подтверждён (см. пункт выше). Тираж закрыл
      конвейер шифрования/хранения, не факт успешного применения на сервере.

---

## §18.8.1 — Секреты инфра-сервисов вне конвейера `.enc` вообще 🟡 ЧАСТИЧНО (2026-08-06, скрипт+конвейер — 2026-08-12)

> Выделено из §18.8 в ходе §48 (Traefik + acme-dns). Родительская секция расширяет конвейер на
> `.env.staging` приложений; здесь — соседний, но **не тот же** пробел: у сервисов из `infra/`
> конвейера нет вовсе, и встроить расшифровку физически некуда.

### Почему это отдельная задача, а не часть §18.8

Конвейер `.env.docker.enc` держится на трёх опорах, и главное его свойство в том, что **человек не
может пропустить шаг**: правило в `.sops.yaml`, pre-commit хук на входе, `decrypt_sops_env()`
внутри `deploy-affected.sh` на выходе. Оба конца автоматизированы и лежат на единственном пути,
мимо которого не пройти.

Для `infra/` ломается всё три:

1. **Нет пути деплоя.** `deploy-affected.sh` работает по `apps/<app>`. NPM, acme-dns, Traefik
   разворачиваются руками (`cd infra/<сервис> && docker compose up -d`) — точки, куда встроить
   расшифровку, просто не существует. Это корень: не «забыли добавить», а «некуда добавлять».
2. **Секрет — файл, а не переменные.** Конвейер заточен под `KEY=value` и `--env-file`. У инфры
   это JSON аккаунтов acme-dns (`600 root:root` по конкретному пути), htpasswd-файл дашборда
   Traefik, и потенциально другие. SOPS с JSON работает нативно, но результат должен лечь
   **файлом по пути с правами**, а не строкой в окружении — другой примитив.
3. **`infra/` вне графа Nx.** `nx affected` про эти сервисы не знает, значит ничто не скажет
   «сервис затронут, передеплой».

### Что делать (вариант согласован с владельцем 2026-08-06)

Рассматривались три подхода:

- **A — просто распространить конвенцию** (`infra/<сервис>/secrets/*.enc` + скрипт расшифровки,
  зовётся руками). Отклонён: не лечит корень. Расшифровка остаётся шагом, который надо помнить, —
  тот же провал, что с ручным `scp`, только переименованный. Прецедент того же класса в тот же
  день: инфра-шаг «завести NPM host», зашитый в тело deploy-request, потерялся, и `domwellbes-stage`
  встал (§48).
- **B — завести настоящий путь деплоя для инфры** ✅ **выбран**.
- **C — расшифровка внутри контейнера на старте.** Отклонён: требует age-ключ внутри контейнера,
  это ухудшение защиты, а не улучшение.

Содержание варианта B:

- [x] `scripts/deploy-infra.sh <сервис>` (2026-08-12) — расшифровывает `infra/<сервис>/secrets/*.enc`
      по манифесту `secrets/deploy.conf` → `docker compose up -d` → статус в stdout. Без секретов у
      сервиса (нет `secrets/deploy.conf`) шаг расшифровки просто пропускается. `git pull` внутрь
      скрипта сознательно не включён — деплой репозитория остаётся отдельным шагом (тем же, что и у
      `deploy-affected.sh`), скрипт решает только «поднять то, что уже в рабочем дереве».
- [x] Правило в `.sops.yaml` для инфра-секретов (2026-08-12) — `infra[/\\][^/\\]+[/\\]secrets[/\\].+\.enc$`,
      тот же age-получатель, что у `.env.docker(.enc)`/`.env.staging(.enc)`.
      `scripts/hooks/pre-commit-sops.sh` обобщён на `infra/*/secrets/*.enc` тем же способом, что
      §18.8 обобщал его на `.env.staging.enc`.
      ⚠️ **Регэксп с прямым слешем (`^infra/[^/]+/secrets/…`) на Windows не матчит вообще ничего** —
      `sops` резолвит путь через `os.Getwd()`/`filepath.Join`, на Windows это бэкслеши
      (`C:\web\letar\infra\traefik\secrets\…`), а `/` в регэкспе их не покрывает. Симптом — `error
      loading config: no matching creation rules found` без указания, что именно не совпало.
      Исправлено на класс символов `[/\\]` на оба разделителя. Остальные правила файла
      (`\.env\.docker…`) этой проблемы не имели, потому что матчат только суффикс имени файла,
      без разделителей пути — поэтому баг не всплывал до первого правила с директориями внутри.
      ⚠️ **Вторая ловушка, отдельная от первой:** `sops --encrypt --output X` матчит правило по
      пути **входного** файла, не по `--output` — плейнтекст с произвольным именем (например во
      временном каталоге) не матчит ничего, даже если целевой `--output` матчит идеально. Рабочий
      способ — положить плейнтекст временно по финальному пути (`…/secrets/<имя>.enc`, ещё как
      плейнтекст) и зашифровать `--in-place`.
- [x] Целевой путь и права описываются **рядом с самим секретом** (2026-08-12) — манифест
      `infra/<сервис>/secrets/deploy.conf`, формат `<файл>.enc:<целевой_путь>:<права_chmod>`,
      трекается в git рядом с самими `.enc`. `.gitignore` держит плейнтекст вне git
      (`infra/*/secrets/*` игнорируется, `*.enc`/`deploy.conf`/`README.md` — исключения).
- [x] Ручка в `deploy-mcp` (2026-08-12) — `POST /api/deploy/infra` в `dashboard-agent`
      (`apps/dashboard-agent/src/routes/deploy.ts`), тот же nsenter-путь на хост и тот же
      DeployStatus/Redis-конвейер, что у `/api/deploy/app` (обработчики stdout/stderr/close/error
      вынесены в общий `attachDeployProcessHandlers`, чтобы не дублировать между двумя роутами).
      Инструмент `deploy_infra({ service, server })` в `libs/deploy-mcp/src/server.ts` — без
      e2e-гейта и без staging/production выбора (не применимо к infra-сервисам), `server`
      обязателен явно: единого маппинга «сервис → сервер» для `infra/*`, в отличие от `apps/*`,
      нет (`traefik` — s3, `acme-dns` — s2). Typecheck+lint зелёные на обоих проектах, но **живой
      прогон на сервере не выполнялся** — до первого реального `deploy_infra` считать
      непроверенным тем же способом, что и остальной API (build ≠ доказательство работы на s2/s3).
- [x] Первые потребители размечены и мигрированы (2026-08-12): `infra/traefik/secrets/` —
      манифест + `acme-dns-accounts.json.enc`/`dashboard-users.enc`, оба сняты с s3 по SSH,
      зашифрованы и **проверены round-trip'ом** (`sops -d` совпал байт-в-байт с оригиналом до
      удаления плейнтекста из временного каталога). `infra/acme-dns` секретов для деплоя не
      несёт — секрет (файл аккаунтов lego) потребляет Traefik, не сам acme-dns. Ручной `scp` из
      `infra/traefik/README.md` остаётся нужен только для _первого_ заведения нового ключа
      (регистрация аккаунта acme-dns), не для доставки уже существующего файла — это теперь делает
      `deploy-infra.sh`. Живой staging/production-прогон `deploy_infra`/`deploy-infra.sh` на
      сервере (расшифровка на месте + `docker compose up -d`) не выполнялся — только шифрование и
      локальная проверка расшифровки, реальную раскладку по целевым путям на s3 ещё стоит
      подтвердить первым запуском.
- [ ] ⚠️ Не тащить в git `acme.json` Traefik даже зашифрованным: это выпущенные приватные ключи,
      они генерируются на месте и восстановлению из репозитория не подлежат — им место в бэкапах,
      а не в конвейере секретов. (Актуально и после реализации выше — `acme.json` в манифест
      `infra/traefik/secrets/deploy.conf` намеренно не включён.)

### Смежное решение, принятое сразу (не ждёт этого трека)

Учётные данные acme-dns **скоупятся по хосту**: на s3 кладётся только аккаунт `s3.letar.best`, а
не весь файл. Traefik на s3 выпускает только `*.s3.letar.best` и в аккаунте `letar.best` не
нуждается никогда. Положить туда оба означало бы, что компрометация staging-сервера даёт валидный
сертификат на весь продакшен-домен. Принцип наименьших привилегий здесь бесплатен — применён сразу,
до всякого конвейера.

---

## §19 — TypeScript 7 GA: план тиража на остальные проекты 🆕

> Контекст: 8 июля 2026 Microsoft выпустил стабильный **TypeScript 7.0** — Go-порт компилятора (ранее известный
> как preview-проект «Corsa»/`tsgo`), заявлено 8–12x ускорение полных сборок. Официальный анонс:
> https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/

### Текущее состояние монорепо (проверено 2026-07-10)

- `package.json` держит **два** компилятора отдельными зависимостями: `"typescript": "6.0.3"` (обычный `tsc`,
  используется в таргете `typecheck` всех apps/libs) и `"@typescript/native-preview": "^7.0.0-dev.20260706.1"`
  (dev-nightly сборка того же движка, что и вышедший TS7 GA; бинарник `tsgo`, таргет `typecheck:tsgo`,
  «в 9-38x быстрее tsc» — уже задокументировано в `CLAUDE.md`/`environment.md`).
- **Пилот выполнен на `time`** (сессия №51): таргет `typecheck:ts7` → `bunx --bun typescript@7.0.2 --noEmit`,
  результат идентичен `tsc` 6.0.3 и `tsgo` dev-preview (те же 4 pre-existing ошибки, не про компилятор).
  Скорость (`time`, чистый прогон): `tsc` 2.71s / `tsgo` 0.60s / **TS7 GA 0.62s** — паритет с уже используемым
  `tsgo`, ускорение подтверждается на реальном коде, а не только на бенчмарках Microsoft.
- **Память — второй мотиватор тиража (замер 2026-07-18, driving-school, `--extendedDiagnostics`):**
  `tsc` 6.0.3 — 2.3 GB / 18.4s, `tsgo` — 1.9 GB / 3.3s. Экономия по пику ~20%, но пик живёт 3 секунды
  вместо 19 — при `nx run-many -t typecheck` (`parallel: 3`) это разница между «3×2.3 GB висят минуту»
  и «всплеск на секунды». У `driving-school:typecheck` уже стоял костыль `--max-old-space-size=4096`
  (tsc не влезал в дефолтный heap) — с tsgo он не нужен. Таргет `typecheck:tsgo` добавлен в
  driving-school (2026-07-18), теперь он есть у 41 проекта.
- **Редакторская память (tsserver) — не покрывается CLI-тиражом:** solution-tsconfig на ~60 references +
  `paths` на исходники libs → tsserver в VS Code строит отдельную program на каждое открытое приложение и
  выедает гигабайты V8-heap. Лечится переходом редактора на нативный LSP: расширение «TypeScript (Native
  Preview)» + `"typescript.experimental.useTsgo": true` в настройках VS Code. Ограничения те же, что у
  embedded-языков ниже: tsserver-плагины (в т.ч. `next` из tsconfig) в нативном LSP не работают —
  редакторские подсказки typed routes пропадут, CLI-тайпчек не затронут. Пробовать индивидуально,
  в `.vscode/settings.json` репо не коммитить, пока не проверено на Next-приложениях.

### ⚠️ Найденная ловушка — коллизия имени bin `tsc`

При обычном `bun install` пакета `typescript@7.0.2` (даже под кастомным алиасом в `devDependencies`) bun
переписывает **общий** `node_modules/.bin/tsc` версией 7.0.2 **для всего workspace**, несмотря на то что
`package.json` продолжает показывать `"typescript": "6.0.3"` — потому что имя бинарника берётся из `bin`-поля
самого пакета `typescript` (`"tsc": "bin/tsc"`), а не из ключа-алиаса в `devDependencies`. Т.е. **любой** bump
версии в общем `package.json` немедленно и молча переключает `tsc` у всех 60+ проектов на новый компилятор —
пилотировать «на одном приложении» через обычный `bun add` **невозможно** без риска для всего монорепо.

Официальная рекомендация Microsoft для сосуществования 6.0/7.0 (нужна, т.к. TS7.0 **не имеет программного API**,
обещан только в 7.1 — инструментам вроде typescript-eslint нужен API 6.0):

```json
{
  "devDependencies": {
    "typescript": "npm:@typescript/typescript6@^6.0.2", // bin: tsc6, реэкспорт API 6.0 для тулинга
    "@typescript/native": "npm:typescript@^7.0.2" // bin: tsc, сам компилятор 7.0
  }
}
```

Проверено (`npm view`, 2026-07-10): `typescript` dist-tag `latest` = `7.0.2` (GA), `next` = `7.1.0-dev...`;
`@typescript/typescript6` = `6.0.2`, bin `tsc6`; `@typescript/native-preview` (текущий пакет монорепо) ещё
жив на `latest: 7.0.0-dev.20260707.2`, но по анонсу будет свёрнут в пользу `typescript@next`.

### План тиража (не начат, только пилот)

1. **Проверить lint-тулинг на зависимость от API `typescript`** — есть ли в летар ESLint-конфиге
   typescript-eslint (`.oxlintrc.json`/`eslint.config.mjs`), который импортирует `require('typescript')`
   программно, а не только зовёт бинарник. Если да — обязателен алиас-трюк выше, иначе сломается lint.
2. **Заменить `@typescript/native-preview`** на схему `typescript` + `@typescript/native` (алиасы выше) —
   одним PR в корневом `package.json`, с полным `nx run-many -t typecheck:tsgo` (или новый `typecheck:ts7`)
   по всем проектам на регрессии, прежде чем удалять старые таргеты.
3. **Переименовать таргеты** `typecheck:tsgo` → возможно оставить как есть (bin `tsgo` из
   `@typescript/native-preview` продолжит работать, пока пакет не убран) либо завести `typecheck:ts7` во всех
   `project.json` по аналогии с пилотом на `time`, и только потом решать судьбу `tsgo`.
4. **Аудит tsconfig на тихие breaking changes TS7** (дефолты `strict: true`, `module: esnext`,
   `noUncheckedSideEffectImports: true`, `rootDir: "./"`, `types: []`) — в `tsconfig.base.json` letar они уже
   явные, риск низкий, но нужно свериться по каждому app-level `tsconfig.json`, если там есть переопределения.
5. **Учесть ограничение embedded-языков** — Vue/MDX/Astro/Svelte/Angular-темплейты пока не работают с TS7
   language server (нет стабильного API). Проверить, есть ли такие стеки в летар (MDX встречается в
   `dsperevod` — `useMDXComponents`, см. `.claude/rules/git.md`) — для них редакторская поддержка TS7 пока
   недоступна, но CLI-тайпчек (`tsc`/`tsgo`) не затронут.
6. **Тиражировать по приложениям** — по одному, тем же способом, что и пилот (bunx-изоляция сначала,
   переход на настоящую замену зависимости только после проверки lint-тулинга, п.1).
7. **Вынести `typecheck`/`typecheck:tsgo` в `targetDefaults` корневого `nx.json`** (делать ПЕРЕД
   тиражом п.6; предложено 2026-07-18) — сейчас ~41 `project.json` держит почти дословные копии
   таргетов (разница только `cwd` и локальные костыли вроде `--max-old-space-size=4096` у
   driving-school). В `targetDefaults` — канонические `command`/`inputs`/`cache` с `{projectRoot}`;
   в `project.json` остаются заглушки `"typecheck": {}` (⚠️ targetDefaults сам таргеты НЕ создаёт —
   заглушка в каждом проекте обязательна), осмысленные вариации остаются локальными override
   (`options` мержатся по ключам). Выигрыш: тираж на оставшиеся ~20 проектов = добавление заглушек,
   а будущий свитч tsgo → стабильный `tsc` 7.0 — правка одной строки nx.json вместо 40+ файлов.
   Нюанс: часть `project.json` живёт в приватных submodules (driving-school, aboi, dsperevod и их
   db/e2e) — их заглушки коммитятся в свои репо отдельными коммитами + bump SHA в letar.

### ✓ DoD §19

- [x] Пилот на `time`: таргет `typecheck:ts7` добавлен, результат идентичен tsc/tsgo, задокументирован
- [x] **Проверено (2026-07-18, перепроверено в тот же день), зависит ли ESLint/typescript-eslint от API
      `typescript` программно — ДА, зависит всегда, alias-схема обязательна.** Первая проверка была права
      в том, что type-aware linting нигде не включён (`parserOptions.project`/`projectService`
      отсутствуют), но вывод «API не трогается» неверен: `@typescript-eslint/typescript-estree@8.57.2`
      делает `require("typescript")` в самом парсере (`convert.js`, `check-syntax-errors.js`,
      `create-program/*`) и зовёт `ts.createSourceFile` при **каждом** прогоне ESLint, безотносительно
      type-aware. Peer-резолюция проверена вживую: estree резолвит `typescript@6.0.3` из bun-изоляции
      (`node_modules/.bun/@typescript-eslint+typescript-estree@8.57.2+…/node_modules/typescript`).
      Голый бамп root `typescript` → 7.0.2 (пакет без JS API) переключит этот peer-линк и уронит
      `nx lint` по всему монорепо → шаг 2 (алиас `typescript: npm:@typescript/typescript6`) — обязателен.
- [ ] Корневой `package.json` переведён на схему `typescript6`/`native` алиасов (или обосновано, почему нет)
- [ ] `nx run-many -t typecheck:tsgo` (или `ts7`) зелёный по всем apps/libs на новом компиляторе
- [ ] Решение по судьбе `typecheck:tsgo`/`@typescript/native-preview` (оставить, свернуть, переименовать)
- [ ] `typecheck`/`typecheck:tsgo` вынесены в `targetDefaults` nx.json, project.json сведены к заглушкам (п.7)
- [ ] Тираж завершён на всех проектах, доки (`CLAUDE.md`, `environment.md`) обновлены под новую версию/цифры скорости

### Риски

- Коллизия bin `tsc` (см. выше) — обязательно использовать alias-схему, не голый bump версии.
- typescript-eslint/другие плагины ESLint требуют API 6.0 — **риск ПОДТВЕРЖДЁН (2026-07-18,
  перепроверка), не снят**: снятие в тот же день опиралось только на отсутствие type-aware linting,
  но `typescript-estree` зовёт `require("typescript")`/`ts.createSourceFile` при каждом прогоне
  ESLint (см. DoD п.1). Без алиаса `@typescript/typescript6` тираж ломает `nx lint` разом.
- **Расхождение tsgo и tsc в выявлении ошибок наблюдалось на практике** — прецедент driving-school
  v0.238.2 (2026-07-18, CHANGELOG): ошибку `Record<AuditAction, string>`, блокировавшую prod-билд,
  «поймал только полный tsc, не typecheck:tsgo». До выяснения причины (nightly-баг tsgo? разный
  скоуп прогона?) полный `tsc` остаётся эталонным пред-деплойным чеком; перед свёрткой TS 6.0
  воспроизвести этот кейс на TS7 GA.
- TS7 language server пока не поддерживает Vue/MDX/Astro/Svelte/Angular embedding — не блокер для CLI-тайпчека,
  но может повлиять на редакторский опыт там, где такие стеки используются.
- `@typescript/native` (замена `@typescript/native-preview`) отдаёт bin `tsc`, не `tsgo` — таргет
  `typecheck:tsgo` во всех `project.json` (или обвязка вокруг него) потребует правки при переключении
  пакета, не просто bump версии в зависимостях.

### §19.1 — Гейт проверки типов в деплое 🆕 (добавлено 2026-07-18, план, не начато)

> Триггер: инцидент `time` (§18.7 Тираж M1) — `typescript: { ignoreBuildErrors: true }` понадобился
> ещё одному приложению (теперь 15/60+), а `nx typecheck:tsgo` — единственная реальная проверка
> типов в проекте — **нигде не вызывается автоматически**: ни в `deploy-affected.sh`, ни в CI
> (`.github/workflows/` — только publish-npm/релизы), ни в git-хуках (только SOPS-шифрование
> `.env.docker`). Держится целиком на ручной дисциплине «прогнал `nx typecheck:tsgo` перед
> коммитом» (CLAUDE.md). Обнаружено при разборе, откуда взялась ошибка `time`.

**⚠️ ПРИОРИТЕТ: НИЖЕ §18.7 Тираж M — не начинать, пока Тираж M (гейт e2e на все приложения с
готовым сьютом) не закрыт.** Решение владельца (2026-07-18).

**Трек 1 — блокирующий `nx typecheck:tsgo $app` в `deploy-affected.sh`.** Добавить сразу после
`nx $BUILD_TARGET $app` (строка ~871, тот же цикл, что и сборка) — без условия по `$DEPLOY_ENV`,
работает одинаково на s2 (прод) и s3 (стейдж), для всех приложений, gated и не gated. `tsgo` —
0.6–1.1с на приложение (замер на `time`), дублирование на двух серверах почти бесплатно по
времени. Закрывает дыру «нет автоматического гейта типов вообще» для всех ~60 проектов сразу,
не дожидаясь завершения Тиража M.

**Трек 1b — снятие дублирования для gated+hard-gate приложений.** Как только приложение и в
`E2E_GATED_APPS`, и переведено на hard gate (`checkE2eGate` в deploy-mcp физически блокирует
прод без свежего зелёного стейджа для точного `commitSha`) — можно пропускать typecheck на
проде для этого приложения: гейт уже не пустил бы деплой без прохождения стейджа, где typecheck
уже прогнан. Не отдельная задача — маленькое дополнение к уже идущему rollout hard gate
(§18.6 Фаза 3), делается по одному приложению тем же темпом.

**Почему не «только на стейдже» с самого начала:** через стейдж проходят только приложения из
`E2E_GATED_APPS` (Тираж M, в процессе на момент написания — 8/~20 подключены). Остальные
приложения собираются один раз, сразу в проде (`deploy-affected.sh` без `--staging`) — если
гейт типов будет жить только на стейдже, эти приложения останутся вообще без проверки типов,
дыра просто сдвинется, а не закроется. Трек 1 (безусловный) закрывает всех сразу; Трек 1b —
точечная оптимизация поверх него, не замена.

**Зависимости:** не блокирует и не блокируется §19 (TS7-тираж) — гейт можно построить на
сегодняшнем `typecheck:tsgo` (dev-preview движок `@typescript/native-preview`), переключить
бэкенд позже, когда TS7-тираж дойдёт до DoD. **Блокируется §18.7 Тираж M** по приоритету
владельца — сначала довести e2e-гейт до конца на всех приложениях с готовым сьютом, потом уже
гейт типов.

---

## §20 — Рассинхрон форматтера между worktree/фоновыми сессиями ✅ Закрыто (2026-08-12)

> Контекст: сессия №59–60 (2026-07-11) дважды подряд ловила у себя в `git status` посторонние
> изменения после `nx format:write` (несвязанные `.claude/docs/*`, `.claude/commands/*`,
> `apps/animatrona-tracker/*`) и после фонового `spawn_task` в изолированном git-worktree
> (`apps/dashboard-agent/src/routes/deploy.ts` — только висячие запятые убраны/добавлены, без
> смысловых изменений). Оба раза откатывал вручную перед коммитом (см. §18 Сессии №59/60) — но это
> происходит систематически, не разово, и стоит решить на уровне инструментов, а не откатывать
> каждый раз руками.

### Находки (проверено 2026-07-11)

- **Две версии `dprint` физически лежат в `node_modules/.bun`**: `dprint@0.55.1` (то, что реально
  пинит `bun.lock` и `package.json` — `"dprint": "^0.55.1"`) и осиротевший `dprint@0.54.0`, на
  который в `bun.lock` больше никто не ссылается. `node_modules/dprint` (топ-уровневый симлинк)
  резолвится в 0.55.1 — в главном рабочем дереве всё верно.
- **PostToolUse-хук `.claude/hooks/auto-format.js`** форматирует файл после каждого Write/Edit
  через `spawn('bun', ['run', 'dprint', 'fmt', filePath])` — не пиновая команда, резолвится через
  `node_modules/.bin/dprint` **в той рабочей директории, откуда запущен хук**.
- **Гипотеза (не подтверждена глубже, нужна отдельная проверка):** изолированные git-worktree'ы,
  создаваемые для фоновых `spawn_task`/`Agent(isolation: "worktree")`, не гарантированно
  синхронизируют `node_modules` с текущим состоянием `bun.lock` главного дерева на момент создания
  — если worktree создан до последнего `bun install`/бампа зависимости, его `node_modules/dprint`
  может резолвиться в устаревшую версию (например, оставшийся 0.54.0), которая форматирует чуть
  иначе (наблюдаемый симптом — расхождение по висячим запятым, `trailingCommas: "onlyMultiLine"`
  между минорными версиями dprint мог измениться). Раз обнаруженный осиротевший `0.54.0` в общем
  bun-сторе — прямой кандидат на источник расхождения.

### Варианты решения (не выбран, нужно решение)

1. **Прунить bun-стор от неиспользуемых версий** (`bun pm cache rm` / ручная чистка
   `node_modules/.bun/dprint@0.54.0`) — быстро, но не защищает от повторного появления рассинхрона
   при следующем бампе версии без переустановки во всех worktree.
2. **Форсировать `bun install` при создании worktree** — если `EnterWorktree`/фоновый `spawn_task`
   с `isolation: "worktree"` не делает этого автоматически, добавить явный шаг (post-checkout hook
   или инструкция агенту) перед первым использованием форматтера в свежем worktree.
3. **Убрать авто-форматирование из PostToolUse-хука для файлов вне текущего таргетного скоупа
   задачи** — сузить `auto-format.js`, чтобы он не трогал файлы, которые агент не редактировал сам
   в этом вызове (сейчас неясно, форматирует ли он только гарантированно изменённый файл или шире
   — нужно перечитать `.claude/hooks/auto-format.js` целиком, здесь только начало было изучено).
4. **Held к минимуму — только вручную ревьюить и откатывать несвязанные правки перед коммитом**
   (текущая практика, задокументированная в `.claude/rules/git.md` про «чужие файлы в staging») —
   рабочий обходной путь, но не устраняет причину и требует внимательности каждый раз.

### ✓ DoD §20

- [x] **Прочитан `.claude/hooks/auto-format.js` целиком (2026-08-12).** Скоуп — **только один файл**:
      хук берёт `tool_input.file_path` из события Write/Edit и вызывает `spawn('bun', ['run',
      'dprint', 'fmt', filePath])` с этим единственным путём аргументом, никакого рекурсивного
      `dprint fmt .`. Гипотеза «хук форматирует шире, чем изменённый файл» (вариант решения 3) —
      **опровергнута**: хук технически не может задеть соседний файл. Посторонние диффы из сессий
      №59–60 — не от этого хука.
- [x] **Гипотеза про версии `dprint` в изолированных worktree — уточнена, не подтверждена в исходной
      формулировке (2026-08-12).** `git worktree add` без дополнительного шага **не создаёт
      `node_modules` вообще** (untracked, worktree его не копирует и не линкует) — проверено
      напрямую (`git worktree add ../letar-wt-test`, `ls node_modules` → нет каталога). Значит
      исходный механизм «worktree резолвит устаревшую версию dprint из своего node_modules» неверен
      буквально: голый worktree не резолвит dprint вообще (упал бы с ошибкой раньше форматирования).
      Наблюдаемое расхождение по висячим запятым в сессии №59–60 объясняется тем, ЧТО инструмент
      `Agent(isolation: "worktree")`/фоновый `spawn_task` использует для подготовки worktree —
      возможно, `bun install` в момент, отличный от текущего `bun.lock` (что и давало другую версию),
      возможно симлинк node_modules с гонкой по времени. Сам механизм подготовки — часть закрытого
      харнесса, недоступен для чтения из репозитория; дальше пределов этой сессии не проверяемо.
- [x] **Осиротевшие версии вычищены из bun-стора (2026-08-12).** На момент проверки в
      `node_modules/.bun/` их оказалось две, не одна: `dprint@0.54.0` (23M) и `dprint@0.55.1` (26M) —
      `package.json`/`bun.lock` с 2026-07-11 успели обновиться до `dprint@0.55.2`, оставив ещё один
      сиротский слепок. Оба `rm -rf`, ни один ни в `bun.lock`, ни в другом `package.json` монорепо
      (`grep -rn "dprint@0.5"` — только текущая 0.55.2) не упоминается. `node_modules/.bin/dprint
      --version` после удаления — по-прежнему `0.55.2`, главное дерево не задето.
- [x] **Выбран вариант (2026-08-12): комбинация 1+4.** Прунить осиротевшие версии по факту находки
      (сделано выше) — вариант 2 (форсировать `bun install` при создании worktree) невозможно
      реализовать из репозитория: `EnterWorktree`/`spawn_task(isolation: "worktree")` — закрытые
      инструменты харнесса, их процедура подготовки worktree не настраивается отсюда. Вариант 3
      закрыт как неприменимый (хук уже узкоскоуп, см. первый пункт). Остаётся вариант 4 — ручная
      проверка `git status` перед коммитом (уже задокументирована в `.claude/rules/git.md`), которая
      теперь дополнена конкретным диагностическим признаком (следующий пункт).
- [x] **Задокументировано (2026-08-12).** См. новый раздел ниже — что делает опровергнутую и
      уточнённую гипотезы конкретным чек-листом для агентов.

### Итог расследования (закрыто 2026-08-12)

`.claude/hooks/auto-format.js` невиновен: он форматирует строго один переданный файл. Причина
посторонних диффов — не в хуке, а где-то в процедуре подготовки worktree (вне репозитория, не
диагностируется дальше без доступа к харнессу) плюс накопление неиспользуемых версий `dprint` в
общем bun-сторе после каждого бампа (обнаружено уже вторая по счёту сиротская версия за месяц).
Практическая мера на будущее — при виде необъяснимых косметических правок (висячие запятые,
пробелы) в файлах, которые агент не редактировал сам, первым делом сверять
`node_modules/.bin/dprint --version` в своей рабочей копии с `package.json` — расхождение подтвердит
эту причину, совпадение исключит её и укажет искать в другом месте (например, ручной
`nx format`/`nx format:write` без `--projects`, см. предупреждение в `CLAUDE.md`).

### Риски

- Остаточный риск не устранён до конца: механизм подготовки worktree вне видимости репозитория,
  повторный дрейф версии возможен при следующем бампе `dprint`, если харнесс не переустанавливает
  зависимости. Обходной путь остаётся прежним — ревью `git status` перед коммитом
  (`.claude/rules/git.md`), теперь с конкретным диагностическим шагом выше.

### Новая находка — `nx format:write --projects=<неверное-имя>` форматирует ВЕСЬ репозиторий (2026-07-22, dashboard-agent-dev)

Другой механизм, тот же класс симптома. При выносе `libs/redis-client` вызвал
`nx format:write --projects=redis-client,dashboard-agent,animatrona-tracker,svoichuzhie` —
`redis-client` оказалось неверным именем проекта (канон — `@letar/redis-client`, из
`project.json`). Nx упал с `Cannot read properties of undefined (reading 'data')`, написал
`Defaulting to all files pattern: "."` и прогнал dprint по **всему репозиторию**. Затронул 8
файлов вне скоупа задачи (`PLAN.md`, `libs/email/src/provider.ts`, `apps/mandala/next.config.js` и
др.) — все правки чисто косметические (см. §20 выше), но заметил только потому что специально
сверил `git status` перед коммитом. Откатил `git restore <file>` поштучно (не `git checkout -- .`
— заблокировано хуком).

**Практический вывод:** перед `--projects=X,Y,Z` сверяй имя с полем `"name"` в `project.json`
целевого проекта — для npm-scoped библиотек (`@letar/*`) короткое имя каталога **не работает**,
а nx проглатывает ошибку резолва и молча откатывается к форматированию всего дерева, ничем не
предупреждая, что скоуп изменился. Не добавлено в DoD ниже как отдельный пункт — тот же паттерн
проверки («git status перед коммитом»), что и вариант решения 4 выше, но стоит учесть при выборе
финального решения §20: если чинить сузение `auto-format.js`/PostToolUse-хука, вероятно стоит
заодно защититься и от этого падения `--projects` в `nx format:write`/`format:check`.

### Новая находка — dprint и ESLint конфликтуют на правиле `curly` (2026-07-27, маркетинговая сессия)

Тот же класс («форматтер и линтер не согласованы»), но механизм третий: не рассинхрон версий и
не расползание скоупа, а **прямое противоречие двух правил**, из-за которого автофикс зацикливается.

**Что происходит:**

1. `eslint.config.mjs:122` требует `curly: ['error', 'all']` — фигурные скобки у каждого `if`.
2. `npx eslint <file> --fix` чинит `if (!rect) return null` в **однострочный** `if (!rect) {return null}`.
3. `dprint fmt` нормализует этот однострочник обратно в `if (!rect) return null` — скобки снимает.
4. `nx lint` снова падает на том же месте. Цикл замкнулся.

Выход только один — писать `if` многострочным вручную:

```ts
if (!rect) {
  return null
}
```

Такую форму dprint не схлопывает, и ESLint доволен. Но узнать об этом можно только методом проб:
ни одно из сообщений об ошибке не подсказывает, что автофикс бесполезен.

**Цена:** новый файл с несколькими однострочными `if` стоит 4+ итераций «fix → format → lint»,
прежде чем автор догадается, что фиксить надо руками. Поймано на
`libs/ui/src/lib/image-magnifier.tsx`; попытка обойти это скриптовой заменой regex'ом дополнительно
сломала строку с колбэком (`entries.some((e) => ...)`) — то есть обходной путь тоже небесплатный.

**Варианты решения (не выбран, нужно решение):**

1. **Снять `curly` из `eslint.config.mjs`** — стиль в монорепо всё равно диктует dprint, а он
   к однострочным `if` относится нормально. Самое дешёвое, убирает противоречие в корне.
2. **Настроить dprint не схлопывать `if`** — искать подходящую опцию в конфиге TypeScript-плагина
   dprint. Сохраняет требование скобок, но надо проверить, что опция вообще есть и не тянет
   переформатирование всего репозитория.
3. **Оставить как есть и задокументировать** в `.claude/docs/code-style.md`: «пиши `if`
   многострочным, `eslint --fix` для `curly` не помогает». Дешевле всего сегодня, но каждый
   новый агент/разработчик всё равно потеряет время до того, как прочитает документацию.

**Рекомендация:** вариант 1. Правило `curly` защищает от класса ошибок (дописал вторую строку
в тело `if` без скобок), но dprint форматирует тело сам, а конфликт стоит времени на каждом
новом файле.

### ✅ Закрыто — выбран вариант 2 (2026-08-09 корень, 2026-08-12 submodule)

Фактически применён вариант 2, не 1: `"useBraces": "always"` добавлен в секцию `typescript`
корневого `dprint.json` (2026-08-09) — опция нашлась и не потребовала переформатирования всего
репозитория. dprint перестал схлопывать многострочный `if` обратно в однострочник, конфликт с
ESLint `curly` снят без ослабления самого правила.

Пропагация в 12 приватных submodule со своим `dprint.json` (не наследующих корневой конфиг —
они явно перечислены в `excludes` корневого `dprint.json`, что и объясняет разрыв) сделана
2026-08-12: `aboi`, `aboi-e2e`, `aprel8008`, `domwellbes`, `domwellbes-e2e`, `driving-school`,
`driving-school-e2e`, `dsperevod`, `poster-microtext-desktop`, `studio`, `studio-e2e`,
`svoichuzhie`. Остальные 5 приватных приложений без собственного `dprint.json`
(`archetest`, `auth-hub`, `mandala`, `dsperevod-e2e`, `svoichuzhie-e2e`) не нуждались в правке —
они не входят в `excludes` корневого конфига, поэтому их `format`-таргет (`bunx dprint fmt`,
запущенный из их собственного `cwd`) находит корневой `dprint.json`, поднимаясь по дереву
каталогов, и уже получает `useBraces: "always"` оттуда.

- [x] Выбран вариант и применён (вариант 2, не 1 — см. выше)
- [x] Пропагировано во все submodule с собственным `dprint.json`

---

## §28 — `libs/ui` разросся: плоский `index.ts` на 30 экспортов 🟡 ЧАСТИЧНО (README — 2026-08-11)

> ⚠️ Перенумеровано из §21 → §28 (2026-07-28, §27 Часть 3.6 в `PLAN.md`) — номер §21 коллизировал
> с одноимённой секцией в `PLAN.md` («Корневой PLAN.md разросся»), на которую ссылается журнал.

> Наблюдение 2026-07-27 (маркетинговая сессия, при добавлении `ImageMagnifier`).
> Не срочно и ничего не ломает — но точка, после которой станет мешать, уже видна.

### Что есть сейчас

`libs/ui/src/index.ts` — 30 экспортов подряд, без группировки; `libs/ui/src/lib/` — 29 файлов
плоским списком. Внутри лежат вещи разной природы: оверлеи (`ConfirmDialog`, `LightboxViewer`),
навигация (`Header`, `UserMenu`, `MobileAuthSection`), медиа (`PhotoGallery`, `OptimizedAvatar`,
`ImageMagnifier`), формы (`PasswordInput`), согласия (`CookieBanner`, `CookieSettingsButton`,
`consent-types`), служебное (`BuildVersion`, `StudioCredit`, `TopLoader`).

### Чем это грозит

- **Поиск компонента взглядом перестаёт работать** — по имени файла не видно, к какой области
  он относится, и растёт шанс написать четвёртый вариант того, что уже есть (ровно этот сценарий
  описан в §16 про `PhotoGallery` и в ретро `aboi` от 2026-07-21 про `SortablePhotoGrid` —
  дублирование уже случалось дважды).
- Barrel-файл на 30 экспортов тянет за собой лишние зависимости при импорте одного компонента
  (актуально для приложений со статическим экспортом и для Electron-рендереров).

### Дополнение 2026-07-28: README отстаёт от экспортов примерно вдвое

Замер при добавлении секции про `ImageMagnifier` (его в README не было вовсе, хотя компонент
написан 2026-07-27): **33 экспорта в `index.ts` против 16 разделов в README.** Часть разрыва
мнимая — `RatingDisplay` описан вместе с `RatingStars`, `RoleStat` со `StatCard`. Но без
описания остаются, среди прочего: `AppEmptyState`, `DeleteAccountZone`, `ExternalLink`,
`LightboxViewer`, `MobileAuthSection`, `Pressable`/`PressableButton`, `QuantityStepper`,
`StatusBadge`, `Tooltip`, `UserMenu`, `CookieBanner`/`CookieSettingsButton`/`createConsentConfig`.

**Почему это тот же дефект, а не отдельный.** Правило `libs.md` требует от библиотеки README
с API. Пока его нет, единственный способ узнать, что компонент существует, — прочитать
`index.ts` глазами, а он как раз и плоский на 33 строки. То есть недокументированность
и отсутствие группировки усиливают друг друга и ведут к одному и тому же исходу —
написанию четвёртой копии уже существующего компонента.

⚠️ Разрыв растёт сам: компонент пишется под конкретную задачу, попадает в `index.ts`
за одну строку, а README требует отдельного усилия и потому пропускается.

### Что предлагается

0. ✅ **Довести README до полноты** — сделано (2026-08-11, letar-dev). Самое дешёвое из всего
   списка и единственное, что даёт пользу немедленно, без изменения структуры.
1. **Сгруппировать `lib/` по подпапкам** (`overlays/`, `navigation/`, `media/`, `consent/`,
   `forms/`, `misc/`) с сохранением плоского публичного API — импорты приложений не ломаются,
   меняются только внутренние пути. Решение не принято, не сделано — структурная миграция,
   не в скоупе этого захода.
2. ✅ **Разбить `index.ts` на секции с комментариями** — сделано (2026-08-12, letar-dev), см.
   ниже. Минимальный шаг, ноль риска, решает только читаемость, не структуру (п.1 остаётся
   открытым).
3. **Ничего не делать, вернуться при 40+ экспортах** — не актуально, п.0 закрыт, счётчик
   экспортов сейчас 37 (было 30/33 на момент завода секции).

### Что сделано (2026-08-11)

README (`libs/ui/README.md`) доведён до полноты вручную по факту, а не по счётчику: сверены
все 37 именованных экспортов `src/index.ts` против разделов README один в один
(`for name in ...; do grep -q "$name" README.md || echo MISSING; done` — после правки пусто).

Добавлено 18 разделов на компоненты/хуки/утилиты, которых не было вовсе:
`StatusBadge`, `QuantityStepper`, `Tooltip`, `AppEmptyState`, `ExternalLink`, `CoverImage`,
`DeleteAccountZone`, `PasswordInput`/`PasswordStrengthMeter`, `Pressable`/`PressableButton`,
`CookieBanner`/`CookieSettingsButton`, `createConsentConfig`/`readConsentState`,
`BuildVersion`/`StudioCredit`, `Header` (compound-компонент), `UserMenu`/`MobileAuthSection`,
`LightboxViewer`.

**Побочная находка — README документировал несуществующее.** `### FilterPanel` (с примером
`FilterField`/`FilterPanel`/`FilterRow`) и `### useUrlFilters` описывали компонент и хук,
которых в `libs/ui` **нет вообще** — ни в `index.ts`, ни в файлах `src/lib/`, ни в другой
библиотеке монорепо (проверено `grep -rl` по всем `libs/*/src`). Не переезд, а мёртвая
документация: читатель README пошёл бы импортировать несуществующий экспорт. Обе секции
удалены, а не помечены deprecated — восстанавливать нечего.

### ✓ DoD §28 (частично)

- [x] Каждый экспорт из `index.ts` имеет раздел в README (или явно описан вместе с родственным
      компонентом — напр. `useRipple`/`RippleEl`/`pressableConfig` внутри раздела
      `Pressable`/`PressableButton`, не отдельными подзаголовками)
- [x] README не описывает несуществующих экспортов (`FilterPanel`/`useUrlFilters` удалены)
- [x] **Закрыто (2026-08-12, letar-dev):** `index.ts` разбит на 8 секций с комментариями
      (оверлеи/навигация/медиа/согласия и аналитика/формы/отзывы и рейтинги/интерактивность и
      обратная связь/служебное) — п.2. Набор идентификаторов сверен `diff` до/после правки,
      ничего не потеряно; `typecheck:tsgo`/`nx lint` зелёные (падение `oxlint` на
      `header-logo.spec.tsx` — предсуществующее, не относится к этой правке). Commit `51c44633`.
- [ ] Выбран вариант группировки `lib/` по подпапкам (п.1) — не начато, отдельная структурная
      задача (переносит файлы, а не только `index.ts`, — риск выше)
- [x] Публичное API `@letar/ui` не менялось в этой сессии — правка только `README.md`, `nx build`/
      `typecheck` потребителей не требовались и не запускались. Проверено (2026-08-12):
      `git show --stat 820f5b3e` — единственный тронутый файл `libs/ui/README.md`.

---

## §22 — JSON-LD (schema.org) дублируется между приложениями 🟡 ЧАСТИЧНО (2026-08-12)

> Найдено 2026-07-28 при SEO-аудите `aboi` (маркетинговая сессия, §S у `apps/aboi/PLAN.md`).

### Что есть сейчас

Два независимых набора генераторов JSON-LD:

- `apps/aboi/src/lib/seo.ts` — `productJsonLd`, `breadcrumbJsonLd`, `organizationJsonLd`.
- `apps/svoichuzhie/src/lib/jsonld.ts` — свой набор для той же цели (карточка товара,
  хлебные крошки).

Компонент, инжектящий `<script type="application/ld+json">`, тоже написан инлайном
в `apps/aboi/src/app/[locale]/catalog/[slug]/page.tsx` (`JsonLdScript`), а не переиспользуется.

### Чем это грозит

- По `apps/aboi/PLAN.md` §S к этому набору добавятся ещё `FAQPage` (S6.2), `AggregateOffer`
  (S3.5, вариантные товары из §P), `ImageObject` (S8.3) — то есть копии разойдутся ещё сильнее
  вместо того чтобы разойтись один раз.
- Любой следующий интернет-магазин в монорепо (или третий магазинный раздел в существующем
  приложении) с большой вероятностью напишет третью копию тех же функций схемы.org.

### Что предлагается

1. **`libs/seo` → `@letar/seo`.** Генераторы `productJsonLd`/`breadcrumbJsonLd`/
   `organizationJsonLd`/`faqJsonLd` как чистые функции (вход — плоский DTO, не Prisma-модель,
   чтобы либа не тянула схему конкретного приложения) + один общий компонент
   `<JsonLdScript html={...} />`.
2. **Момент удачный:** копий пока две и они почти одинаковые — переносить дешевле, чем
   когда появится третья и разойдётся сильнее.
3. **Ничего не делать сейчас, вернуться после S6.2/S3.5** — если к тому моменту наберётся
   4–5 функций в каждом приложении, перенос всё равно будет дешевле копирования.

### Что сделано (2026-08-12, letar-dev) и что изменилось после разбора

**Решение владельца: вынести сейчас (п.2).** Но при сравнении фактического кода `aboi` и
`svoichuzhie` оказалось, что дублирование тоньше, чем описано выше:

- `svoichuzhie` не имеет ни `breadcrumbJsonLd`, ни `organizationJsonLd` вообще — только
  `musicGroupJsonLd`/`eventJsonLd`/`productJsonLd`/`articleJsonLd`/`albumJsonLd`, ни один из
  которых текстуально не совпадает с генераторами `aboi`.
- `productJsonLd` у `aboi` (вариантные цены → `AggregateOffer`/`Offer`) и у `svoichuzhie`
  (простой `Offer` для мерча) расходятся по форме ровно так же, как `estimatePackage()` в §23
  — это тот же класс ошибки: функция кажется общей по имени, но специфична по товару.
  **Не выносить `productJsonLd` — та же логика, что вывод §23 про упаковку.**
- Реально общее — только «конверт» (`@context`/`@type`/`itemListElement` и т.п.) двух
  генераторов, которые у `aboi` уже были app-agnostic pure functions: `breadcrumbJsonLd` и
  `organizationJsonLd`. Они параметризованы (`baseUrl`, бренд) и подняты в `@letar/seo`,
  `aboi/src/lib/seo.ts` переведён на тонкие обёртки (тот же паттерн, что уже был для
  `getBaseUrl`/`isProductionDomain`). Публичный API `aboi` не менялся — вызовы и тесты
  (`seo.test.ts`) не тронуты. `svoichuzhie` пока не мигрирован — ему пока нечего мигрировать
  (нет своих `breadcrumbJsonLd`/`organizationJsonLd`), но при появлении — сразу на общую версию.
- Инлайн-компонент `JsonLdScript` (`aboi`, `dangerouslySetInnerHTML`) и 6 инлайн-`<script>` в
  `svoichuzhie` (`JSON.stringify` в текстовом узле, без `dangerouslySetInnerHTML` — осознанный
  выбор по комментарию в коде) **не объединены** — реальное дублирование (7 копий одного и
  того же 2-строчного паттерна), но `libs/seo` сейчас чистый `.ts` без JSX/React
  (`tsconfig.lib.json` не включает `.tsx`, `package.json` без `react` в `peerDependencies`) —
  добавление компонента требует реконфигурации всей либы, отдельная задача, не походя.
- typecheck/lint/test (`nx test seo`, `nx test aboi`) зелёные. Commits: `681dd6d1` (libs/seo),
  `a40304f` (aboi, запушен в `letar-private-aboi`), `b51bd1ee` (bump SHA в letar).

### ✓ DoD §22

- [x] Выбран вариант (п.2, вынести сейчас) — решение владельца 2026-08-12
- [x] `breadcrumbJsonLd`/`organizationJsonLd` в `@letar/seo`, `aboi` мигрирован (тонкие обёртки,
      не удаление — публичный API `aboi/src/lib/seo.ts` не менялся)
- [ ] `svoichuzhie` — нечего мигрировать сейчас (нет собственных `breadcrumbJsonLd`/
      `organizationJsonLd`); если появятся — использовать общую версию сразу
- [x] **Решено (не переносить):** `productJsonLd` остаётся локальным в каждом приложении —
      форма `Offer` товароспецифична (см. разбор выше), общая функция была бы неправильной
      абстракцией
- [ ] `JsonLdScript`-компонент не объединён — `libs/seo` без JSX-инфраструктуры, отдельная
      структурная задача

---

## §23 — Логика СДЭК и расчёт упаковки дублируются, `@letar/cdek` не хостит оценку габаритов 🟡 ЧАСТИЧНО (2026-08-12)

> Найдено 2026-07-28 при проектировании §P (модель покупки) у `apps/aboi`.
> **Обновлено 2026-07-28 (aboi-dev, реализация §P):** «естественный момент» из раздела ниже
> **прошёл** — `package-estimator.ts` переписан, но на месте, а не в библиотеке. Плюс замер
> объёма дубля и один вывод, который меняет вариант 2 (см. «Что изменилось»).

### Что есть сейчас

`@letar/cdek` существует и используется в `svoichuzhie` (клиент API + типы). `apps/aboi`
при этом держит **свою** реализацию в `src/lib/shipping/` (`cdek.ts`, `cdek-order.ts`,
`cdek-types.ts`) — то есть клиент СДЭК написан дважды.

Расчёт габаритов и веса посылки — отдельная область, которой в `@letar/cdek` нет вообще:
`apps/aboi/src/lib/shipping/package-estimator.ts` и `apps/svoichuzhie/src/lib/merch-package.ts`
написаны независимо друг от друга под свои товары.

### Чем это грозит

- Изменение формата ответа СДЭК/новая версия их API правится в двух местах, и легко забыть одно.
- В `aboi` при переходе на форматы (§P) `package-estimator.ts` придётся переписывать всё равно
  (сейчас считает по константам флизелина, что для постеров даёт завышение веса примерно
  в полтора раза — см. `apps/aboi/PLAN.md` §P.4). **Естественный момент** заодно поднять расчёт
  в библиотеку, а не переписать вторую копию на том же месте.

### Что изменилось после реализации §P (2026-07-28)

**Замер дубля клиента.** `libs/cdek/src` — 945 строк; `apps/aboi/src/lib/shipping/cdek.ts` —
771 строка плюс `cdek-types.ts` — 149. Наборы функций совпадают почти полностью:
`getCdekToken`, `searchCdekCities`, `getCityCodeByPostalCode`, `getDeliveryPoints`,
`createCdekOrder`, `getCdekOrderStatus`, `ensureCdekWebhook`, `getFromLocation`. Типы
расходятся на три интерфейса (в библиотеке их больше). Единственное содержательное отличие —
`calculateTariffs()` в библиотеке против `calculateShippingCosts()` в `aboi`. **Это форк,
а не независимая реализация**, и он уже начал расходиться.

**Расчёт упаковки переписан, но остался в приложении.** `estimatePackage()` теперь принимает
позиции `{ widthMm, heightMm, quantity, kind }` и берёт плотность/толщину из таблицы
`MATERIALS` по `ProductKind` — то есть DoD-пункт «принимает материал параметром» фактически
выполнен, но локально. Заодно закрыт баг: расчёт по константам флизелина завышал вес постера
примерно в полтора раза (755 г против ≈514 г на 914×1300).

⚠️ **Вывод, меняющий вариант 2.** Поднимать `estimatePackage()` в `@letar/cdek` целиком уже
не выглядит правильным: функция стала **товароспецифичной** — она знает про `ProductKind`
приложения, про свёртку листов в рулон и про то, что ось идёт вдоль короткой стороны.
Мерч `svoichuzhie` (`merch-package.ts`, 49 строк) считает принципиально иначе — суммой
объёмов коробок, без всякой намотки. Общего у них — только формат результата
(`CdekPackageDims`) и конвертация в сантиметры. Скорее всего в библиотеку просится именно
эта тонкая часть, а формулы должны остаться в приложениях.

### Что предлагается (решение не принято)

1. Мигрировать `aboi` на `@letar/cdek` вместо собственного клиента (техдолг, уже отмечен
   как идея в корневом `PLAN.md`, но без привязки к конкретному триггеру — теперь он есть: §P.4).
   ⚠️ **Отдельной задачей, не попутно:** 771 строка под живым продакшеном с оплатой и заказами.
   Локально оставить только `package-estimator.ts` — он товароспецифичен (см. выше).
2. Поднять расчёт упаковки в `@letar/cdek` как функцию, параметризованную материалом
   (плотность г/м², толщина мм, ширина рулона) — тогда `estimatePackage()` для постеров
   Albeo и для флизелина обоев, и для мерча `svoichuzhie` — три вызова одной функции
   с разными константами, а не три реализации формулы.
3. Не трогать `svoichuzhie` — переносить только логику, которую пишет `aboi` заново.

### Что сделано (2026-08-12, letar-dev)

**Решение владельца: начать миграцию aboi на `@letar/cdek` (п.1).** Клиент мигрирован —
`apps/aboi/src/lib/shipping/cdek.ts` (771 строка) и `cdek-types.ts` (149 строк) заменены на
тонкие реэкспорты из `@letar/cdek`, минус 857 строк дублированного кода.

Найдены и **осознанно не унифицированы** два расхождения, вскрытые при построчном сравнении
(та же дисциплина, что в §22 — сначала сверить факт, потом переносить):

- **`getFromLocation()` — дефолты у либы и у aboi разные** (либа: `140013`/`Рождественская
  ул., 8`; aboi: `107076`, без адреса). Оба читают одни и те же env-переменные
  (`CDEK_FROM_POSTAL_CODE`/`CDEK_FROM_CITY`), так что на проде с заполненным `.env.docker.enc`
  разницы нет — но `.env.docker.enc` зашифрован целиком (не построчно), прочитать значения без
  расшифровки нельзя, а расшифровывать ради этой проверки — лишний риск для боевого секрета.
  Поэтому `getFromLocation()` **остался локальным** в `aboi`, не переведён на версию из либы —
  это единственный способ гарантированно не изменить адрес отправителя вслепую.
- **`calculateTariffs()` (либа) принимает готовые `CdekPackageDims`, `calculateShippingCosts()`
  (aboi) — сырые позиции заказа.** `aboi` держит тонкую локальную обёртку, которая считает
  `estimatePackage()` + `toCdekPackage()` и зовёт `calculateTariffs()` — та же сигнатура для
  вызывающего кода (`shipping.action.ts` не менялся), расчёт остался в приложении.

Остальные функции (`getCdekToken`, `searchCdekCities`, `getCityCodeByPostalCode`,
`getDeliveryPoints`, `createCdekOrder`, `getCdekOrderStatus`, `ensureCdekWebhook`) —
байт-в-байт идентичны либе, мигрированы без изменений поведения.

**Проверено:** `typecheck:tsgo`/`lint`/`test` (66/66, включая
`use-shipping-calculation.test.ts`, потребовавший добавить alias `@letar/cdek` в
`vitest.config.ts`) зелёные. **`nx build aboi` — зелёный** (2m 35s, все роуты собраны, включая
`/api/webhooks/cdek`) — живой проверкой реальных вызовов CDEK API не проверялось (нет доступа
к прод-серверам из этой сессии), только typecheck/build/mock-режим. Commit `89a6cdb` в
`letar-private-aboi`, запушен (`a40304f..89a6cdb`), bump SHA в `letar` — коммит `4ce632db`.

**Не сделано:** п.2 (поднять тонкую часть расчёта упаковки — `CdekPackageDims` + конвертация
см — в `@letar/cdek`) и п.3 — за пределами решения владельца в этой сессии (запрошена только
миграция клиента, не расчёта упаковки).

### ✓ DoD §23

- [x] Выбран вариант (п.1, начать миграцию aboi) — решение владельца 2026-08-12
- [x] `apps/aboi/src/lib/shipping/cdek.ts`/`cdek-types.ts` мигрированы на `@letar/cdek` —
      `cdek-order.ts` и `package-estimator.ts` не трогались (не форк, не нуждаются)
- [x] Функция оценки упаковки принимает материал параметром, а не хардкодит константы
      флизелина/бумаги внутри — ✅ сделано в `aboi` 2026-07-28 (таблица `MATERIALS` по
      `ProductKind`), по-прежнему **в приложении, не в библиотеке** (см. вывод выше — верно)
- [ ] Решено, что именно из расчёта упаковки поднимать в `@letar/cdek` — не в скоупе этой
      сессии, п.2/п.3 остаются открытыми

---

## §24 — Степпер количества («−1 +») написан трижды ✅ частично закрыт

> Найдено 2026-07-28 при проектировании §P у `apps/aboi`.
> **Обновлено 2026-07-28 (aboi-dev, реализация §P):** компонент создан, `aboi` переведён.
> Осталось мигрировать два приложения — и их оказалось не одно, а два (см. ниже).

### Что есть сейчас

~~`apps/aboi` использует голый `Input type="number"` для количества в двух местах~~ —
✅ **сделано 2026-07-28:** `QuantityStepper` создан в `libs/ui/src/lib/quantity-stepper.tsx`
и используется в `aboi` в обоих местах (карточка товара и корзина).

**Прогноз «трижды» подтвердился, и потребителей оказалось больше, чем думали.** Ревизия
после реализации нашла не одну чужую реализацию, а две:

- `apps/svoichuzhie/src/app/merch/cart/_components/cart-view.tsx` — своя пара кнопок `−`/`+`
  инлайном в разметке строки корзины (было известно).
- `apps/mandala/src/app/[locale]/(main)/cart/_components/cart-items.tsx` — свой `handleDecrease`/
  `handleIncrease` + `handleQuantityChange` с ручным `parseInt` (**в §24 не значилось**).

То есть на момент находки логика `quantity ± 1` жила в трёх приложениях в трёх видах —
ровно тот сценарий, о котором предупреждает §28 («растёт шанс написать четвёртый вариант
того, что уже есть»).

### Что предлагается

Делать `QuantityStepper` сразу в `libs/ui` при реализации §P3.3 у `aboi`, а не писать его
внутри приложения. Стоит копейки дороже сейчас и снимает третье повторение, когда следующий
магазин в монорепо доберётся до корзины.

### ✓ DoD §24

- [x] `QuantityStepper` существует в `@letar/ui` (2026-07-28) — `value`/`onChange`, `min`/`max`,
      `disabled`, три размера, aria-подписи. **Поля ввода намеренно нет:** свободный ввод
      в магазине провоцирует опечатки вроде «11» вместо «1», значение всегда целое и зажато
      в `[min, max]`.
- [x] `aboi` использует его в §P3.3/§P3.5 вместо собственной реализации (2026-07-28)
- [ ] (опционально, не блокирует) `svoichuzhie` мигрирован на тот же компонент
- [ ] (опционально, не блокирует) `mandala` мигрирован на тот же компонент

⚠️ **Обе миграции — не попутная правка.** Корзины `svoichuzhie` и `mandala` рабочие,
трогать их без повода не стоит: выгода от унификации не окупает риск. Делать при следующем
касании этих файлов по своей задаче.

---

## §25 — Еженедельный контроль зависимостей ✅ ЭТАП 1 (MVP) ЗАКРЫТ (2026-08-11, letar-dev)

> Спроектировано 2026-07-28 (сессия `/repo`, план целиком согласован с владельцем).
> Реализации ещё нет — это ТЗ для исполняющего агента, писалось так, чтобы его можно было
> выполнять буквально, по шагам. Полная копия плана также лежит в
> `C:\Users\Kami\.claude\plans\dynamic-gliding-church.md`.

### Что есть сейчас

Обновление зависимостей — ручной ритуал. Человек вспоминает, что «давно не обновляли», и
вызывает `/infra:deps-update` (`.claude/commands/infra/deps-update.md`) — markdown-инструкция
без автоматизации: ни отметки о выполнении, ни данных о накопившемся, ни разбора breaking
changes. В монорепо ~190 prod- и ~120 dev-зависимостей в корневом `package.json` и 25+
приложений — пропущенный major в `next`/`prisma`/`chakra` стоит дорого.

Цель — чтобы система сама напоминала и приносила готовый разбор: сколько устарело, что уязвимо,
что именно сломается **у нас** при major-обновлении. Решение по каждому пакету принимает человек.

### Принятые решения (НЕ пересматривать)

1. **Сбор данных только локально.** На сервере в `/home/deploy/letar` нет `node_modules` —
   сборка идёт внутри Docker. Скрипт гонит `bun outdated` + `bun audit` на машине разработчика
   и делает POST в dashboard.
2. **«Давно не обновляли» считается по git**: `git log -1 --format=%cI -- bun.lock`.
   Отдельного файла-отметки нет — забыть отметиться невозможно.
3. **Анализ changelog — только для major и CVE**, и его делает модель, а не скрипт.
   Patch/minor не разбираются никогда.
4. **Автообновление пакетов запрещено.** Ни кнопки «обновить», ни авто-PR, ни авто-коммита.
   Система смотрит и докладывает; `bun update` запускает человек.
5. **`CRON_SECRET`** берётся из локального `apps/dashboard/.env.docker` (см. ниже).

### Проверенные факты (перепроверять не нужно)

- `bun outdated` в bun 1.3.14 **не имеет `--json`**. При пайпе отдаёт чистую ASCII-таблицу без
  ANSI: `| Package | Current | Update | Latest |`. Парсится надёжно, но это самое хрупкое место.
- `bun audit --json` **есть**. Баннер `bun audit v1.3.14` идёт в **stderr** — читать только stdout.
  Формат: `{ "<pkg>": [{ id, url, title, severity, vulnerable_versions, cwe, cvss: { score } }] }`.
  Установленной версии пакета в выводе нет — join делаем сами.
- `bun outdated` без флагов сканирует только корневой workspace. Все зависимости подняты
  в корень — этого достаточно.
- `createAlert` в `apps/dashboard/src/lib/alerts.ts` уже дедуплицирует по `type + status=ACTIVE`,
  рядом есть `resolveAlertsByType`. Еженедельный скан ложится на это идеально.
- `git log -1 -- bun.lock` сейчас показывает коммит «бамп submodule», а не реальное обновление
  зависимостей — источник ложных отрицаний, см. Шаг 5.
- В репо сейчас есть уязвимости уровня high — первый же скан поднимет алерт. Это ожидаемо.

### Секрет `CRON_SECRET`

Значение живёт в `apps/dashboard/.env.docker` (в `.gitignore`, не коммитится). Если файла нет
или он устарел — синхронизировать с прода по SSH готовым скриптом:

```bash
./scripts/pull-env-docker.sh dashboard --apply
```

Скрипт ходит на `root@s2.letar.best`, тянет `/home/deploy/letar/apps/dashboard/.env.docker`.
Без `--apply` показывает только diff.

`scripts/deps-scan.ts` читает секрет в порядке: (1) `process.env.CRON_SECRET`; (2) парсит
`apps/dashboard/.env.docker`, строка `CRON_SECRET=...`; (3) не нашёл — падает с понятным текстом
и подсказкой запустить `pull-env-docker.sh`.

⛔ Секрет **не печатать** в терминал, логи и чат. В `.env` корня не класть — по
[env-files](/.claude/rules/env-files.md) там только `PORT`.

### Этап 1 — MVP

#### Шаг 1. Схема БД

Файл `apps/dashboard/schema.zmodel`. Комментарии `///` по-русски обязательны — стиль файла.

Новые enum'ы (в секцию `// ENUMS`):

```
enum DepUpdateKind      { MAJOR MINOR PATCH NONE }
enum DepVulnSeverity    { LOW MODERATE HIGH CRITICAL }
enum DepRiskLevel       { NONE LOW MEDIUM HIGH CRITICAL }
enum DepAnalysisStatus  { NOT_REQUIRED PENDING DONE FAILED }
```

`DepVulnSeverity` — отдельный, не переиспользовать `AlertSeverity`: у npm шкала
`low/moderate/high/critical`, у нас `INFO/WARNING/ERROR/CRITICAL`. Маппинг делается в коде.

**`model DepScan`** — снапшот одного запуска:
`id`, `createdAt`, `scannedAt` (время на машине разработчика), `source` (`local` /
`local-fallback`), `gitCommit`, `gitBranch`, `lockfileUpdatedAt`, `lockfileCommit`, `bunVersion`,
`scannerVersion`, `totalPackages`, `outdatedCount`, `majorCount`, `minorCount`, `patchCount`,
`vulnCount`, `vulnCritical`, `vulnHigh`, `vulnModerate`, `vulnLow`, `pinnedOutdatedCount`,
`riskScore`, `durationMs`, `analysisStatus`, `analysisSummary @db.Text`, `analysisAt`,
`analysisModel`, `reviewedAt`, `reviewedBy`, `rawAudit Json?`, `packages DepPackage[]`.

Почему так: агрегаты (`*Count`) денормализованы намеренно — карточки и порог алерта считаются
без чтения детей. `bunVersion`/`scannerVersion` нужны, чтобы при поломке парсера было видно, где
сменился формат. `rawAudit` позволяет переразобрать историю, не гоняя скан заново; сырой вывод
`bun outdated` не храним — он полностью разложен в `DepPackage`.

```
@@allow('all', auth() != null)
@@index([createdAt(sort: Desc)])
@@index([analysisStatus])
```

**`model DepPackage`** — строка внутри скана:
`id`, `createdAt`, `scan`/`scanId` (relation `onDelete: Cascade`), `name`,
`currentVersion String?` (null у транзитивных, которые видит только audit), `wantedVersion`,
`latestVersion`, `updateKind`, `depType` (`dependencies`/`devDependencies`/`transitive`),
`isPinned Boolean` (пакет в `resolutions`/`overrides` — сейчас minimist, qs, picomatch,
serialize-javascript), `vulnerable`, `maxSeverity DepVulnSeverity?`, `advisoryCount`,
`advisories Json?`, `riskLevel`, `analysisNote @db.Text`, `analysisAt`,
`analysisCarriedFrom String?`, `breakingChanges Boolean?`.

```
@@unique([scanId, name])
@@index([scanId, riskLevel])
@@index([name, createdAt])
@@allow('all', auth() != null)
```

Модель делать **сразу полную**, включая поля анализа из Этапа 2 — одна миграция дешевле двух.

**Правка `enum AlertType`**: добавить `DEPS_VULNERABLE`, `DEPS_STALE`.

⚠️ Список `AlertType` продублирован строкой в `z.enum([...])` в
`apps/dashboard/src/app/api/alerts/route.ts` (~строки 39–49) — **обязательно расширить и там**,
иначе алерты новых типов будут падать с 400. Самое лёгкое место, чтобы забыть.

Проверка: `nx run dashboard:zenstack:generate` → `nx run dashboard:db:migrate`.
`prisma/seed.ts` не трогать.

#### Шаг 2. Скрипт-сканер

Файл `scripts/deps-scan.ts`, шебанг `#!/usr/bin/env bun`. Стиль копировать с
`scripts/bump-version.ts` (chalk, `execFileSync`, русские JSDoc).
Запуск: `bun scripts/deps-scan.ts`. Флаги: `--dry-run`, `--out <path>`, `--endpoint <url>`.

1. Контекст репо: `git rev-parse --show-toplevel`, `git rev-parse HEAD`,
   `git rev-parse --abbrev-ref HEAD`, `git log -1 --format=%cI%x09%H -- bun.lock`.
2. Классификация: прочитать корневой `package.json` → `Map<name, dependencies|devDependencies>`
   и `Set<pinned>` из объединения `resolutions` + `overrides`.
3. `bun outdated` через `execFileSync('bun', ['outdated'], { cwd: root, encoding: 'utf-8',
timeout: 300_000, maxBuffer: 32*1024*1024, stdio: ['ignore','pipe','pipe'] })`.
   Парсер: брать строки, начинающиеся с `|`; отбросить разделители и заголовок
   (`cols[0] === 'Package'`); `split('|')` → срезать пустые края → `trim()` →
   `[name, current, update, latest]`. Снять возможный суффикс `(dev)`/`(peer)` из имени и
   запомнить как подсказку для `depType`. Страховка от ANSI: `replace(/\[[0-9;]*m/g, '')`.
   Ненулевой exit считать ошибкой только при пустом stdout.
4. Если парсер вернул 0 строк, а зависимостей > 0 — **бросить явную ошибку** «формат вывода
   `bun outdated` изменился, парсер нужно чинить». Fallback через npm registry — Этап 3.
5. `bun audit --json` со `stdio: ['ignore','pipe','ignore']` (баннер в stderr отбрасываем).
   Ненулевой exit при наличии уязвимостей — норма; ошибка только если JSON не разбирается.
6. Join по объединению имён (outdated ∪ audit). `updateKind` — сравнение `current`/`latest`
   через `Bun.semver`. Пакеты только из audit → `depType: 'transitive'`, `currentVersion: null`.
   `riskLevel`: `CRITICAL` — уязвимость critical/high; `HIGH` — уязвимость moderate **либо**
   major у критичного пакета (`next, react, react-dom, @chakra-ui/react, prisma, @prisma/client,
@zenstackhq/*, typescript, nx, @tanstack/react-query, better-auth`); `MEDIUM` — любой другой
   major; `LOW` — minor или уязвимость low; `NONE` — patch.
7. `riskScore = min(100, 40*critical + 25*high + 8*moderate + 2*lowVuln + 3*majorКритичных +
0.5*majorПрочих)`, округлить. Формула живёт в одном месте и пишется в БД — иначе тренд
   несопоставим между версиями скрипта.
8. Записать `.claude/state/deps-last-scan.json`. Каталога `.claude/state/` нет — создать и
   добавить в `.gitignore`. Прецедент структуры — `STATE_PATH` в
   `apps/dashboard-agent/src/lib/email-canary.ts`.
9. POST на `${endpoint}/api/deps/scan`, заголовок `X-Cron-Secret`. Таймаут 30 с, один ретрай.
   Endpoint по умолчанию — из `DEPS_DASHBOARD_URL`, иначе прод-адрес dashboard.
10. Печать сводки: топ-10 по риску + напоминание «обновление руками, автообновления нет».

#### Шаг 3. API

**`POST /api/deps/scan`** — приём скана. Авторизация по `X-Cron-Secret`, один в один как
`apps/dashboard/src/app/api/alerts/route.ts` (проверка заголовка → zod `.strip()` → 401/400).

Правка `apps/dashboard/src/proxy.ts`: **нельзя** добавлять `/api/deps` в `publicPaths` — там матч
по `startsWith`, откроются и GET'ы. Повторить точечное исключение сразу под тем, что стоит для
алертов (~строки 33–37):

```ts
if (pathname === '/api/deps/scan' && request.method === 'POST') { return NextResponse.next() }
```

**`GET /api/deps/latest`** — последний скан + пакеты + возраст lockfile, под сессией (proxy).

Валидация — zod/v4 со `.strip()`: `packages` `.max(2000)`, `name` `.max(214)`, `advisories`
`.max(50)` на пакет, строки версий `.max(64)`.

Сервис `apps/dashboard/src/lib/deps.ts` на сыром `prisma` (как `lib/alerts.ts`):
`ingestScan(payload)` — транзакция `depScan.create` + `depPackage.createMany`; ретеншн: оставить
последние 52 скана (каскад унесёт `DepPackage`), по образцу `cleanOldAlerts`; вернуть
`{ scanId, needsAnalysis }`. Плюс `getLatestScan()`.

Алерты внутри `ingestScan` через существующий `createAlert`: `vulnCritical > 0` →
`DEPS_VULNERABLE`/`CRITICAL`; иначе `vulnHigh > 0` → `ERROR`; уязвимостей нет →
`resolveAlertsByType('DEPS_VULNERABLE')`.

⚠️ Порог первой итерации — **`high+`, не `moderate`**: в репо есть вечные low/moderate
в devDependencies. Telegram-уведомление из ingest в MVP не слать вообще.

#### Шаг 4. Страница `/deps`

`apps/dashboard/src/app/deps/page.tsx`, целиком `'use client'` + TanStack Query. Эталон
структуры — `apps/dashboard/src/app/alerts/page.tsx`. `Header` **не импортировать** — это
заглушка, возвращает `null`; навигация в `Sidebar`. Компоненты — в
`apps/dashboard/src/app/_components/deps/`.

Запрос `['deps','latest']` → `/api/deps/latest`, `refetchInterval: 60_000` (данные меняются раз
в неделю, чаще незачем).

1. `DepsStalenessBanner` — возраст `lockfileUpdatedAt` и последнего скана. ≤7 дней скрыт,
   7–14 жёлтый, >14 красный. Кнопка «скопировать команду» (`bun scripts/deps-scan.ts`).
2. `DepsSummaryCards` — risk score, устарело (major/minor/patch), уязвимости по severity, возраст
   lockfile, последний скан. Форматирование — `formatRelativeTime`/`formatDateTime` из
   `apps/dashboard/src/lib/format.ts`. Скелетоны — `MetricCardSkeleton`, `SkeletonGrid` из
   `_components/ui/skeletons.tsx`.
3. `DepsPackageTable` — главный элемент. Фильтр-чипы (все / уязвимые / major / minor / patch /
   закреплённые), поиск по имени, сортировка `riskLevel desc, name asc`. Колонки: пакет ·
   текущая · целевая · последняя · тип обновления · уязвимость (severity + CVSS) ·
   dep/dev/transitive · 📌 pinned. Раскрытие строки → advisory со ссылками. Скелетон —
   `TableRowSkeleton`.

Навигация: `apps/dashboard/src/app/_components/layout/Sidebar.tsx`, массив `navLinks`
(~строки 57–71), между `/cron` и `/alerts`:
`{ href: '/deps', label: 'Зависимости', icon: LuPackage }` + импорт `LuPackage` из `react-icons/lu`.

⛔ На странице **нет и не будет** кнопок `bun update` / «обновить всё» / «обновить пакет».
Зафиксировать комментарием в коде страницы, чтобы позже не «доработали».

#### Шаг 5. Правка `/repo`

Файл `.claude/commands/repo.md`. Во frontmatter добавить
`allowed-tools: Bash(git log:*), Bash(git rev-parse:*)` — иначе будет промпт на разрешение.
Новая секция перед «Следующий шаг», в стиле файла (императив, нумерация, «Если X — предложи Y»):

1. `git log -1 --format=%cI -- bun.lock` — дата последнего изменения lock-файла.
2. `git log -5 --format='%cI %h %s' -- bun.lock` — определить, был ли последний коммит реальным
   обновлением зависимостей или lock задело попутно (например, бампом submodule). Если попутно —
   взять ближайший коммит, похожий на настоящее обновление, и отметить расхождение строкой.
3. Возраст в днях → `Зависимости: последнее обновление N дней назад (<коммит>, <дата>)`.
4. Условная логика: N ≤ 7 — «в норме», ничего не предлагать; 7 < N ≤ 14 — 🟡 «пора запланировать
   проверку»; N > 14 — 🔴 баннер, предложить `bun scripts/deps-scan.ts`, затем
   `/infra:deps-analyze`. **Спросить, запускать ли сканер. Не запускать без ответа.**
5. Если `.claude/state/deps-last-scan.json` есть — добавить строку с датой скана и счётчиками;
   если нет — «скан ни разу не запускался».

### Этап 2 — анализ changelog

**Перенос разборов при ingest** — ядро экономии. В `ingestScan`, до вставки: достать из
предыдущих сканов пары `(name, major.minor от latestVersion) -> analysisNote` (последнюю
непустую) и проставить в новые строки вместе с `analysisCarriedFrom = <id старого скана>`.
Если на этой неделе 21 major и 19 из них те же — модель разбирает 2 новых, а не 21. Ключ по
`major.minor`, а не по полной версии: иначе патч-бамп `17.0.4 → 17.0.5` сбросит валидную
заметку. `analysisCarriedFrom` показывать в UI — человек должен видеть, что заметка не свежая.
`analysisStatus` = `PENDING`, если есть пакет `riskLevel in (CRITICAL, HIGH)` без
`analysisNote`; иначе `NOT_REQUIRED`.

**Команда `/infra:deps-analyze`** (`.claude/commands/infra/deps-analyze.md`), запускается
человеком, не автоматически:

1. Прочитать `.claude/state/deps-last-scan.json`. Нет или старше 3 дней — предложить сперва скан.
2. Взять `scanId` и `needsAnalysis` (сервер уже вычел перенесённые разборы).
3. Отфильтровать: только `riskLevel ∈ {CRITICAL, HIGH}`, исключить `isPinned` (их регулирует
   раздел «Зафиксированные версии» в `deps-update.md`), отсортировать по риску, **взять не более
   12**. Остальные перечислить списком «не разбирали, лимит».
4. По каждому: найти changelog (GitHub Releases → `CHANGELOG.md` → npm), прочитать только
   диапазон между текущей и целевой версией.
5. Грепнуть `libs/` и `apps/` на реальное использование ломающихся API — вывод должен быть
   «что сломается **у нас**», а не пересказ релиз-нотов.
6. По пакету 3–6 строк: что ломается · где у нас · объём работы (тривиально / полдня / отдельная
   задача) · вердикт `breakingChanges`. Плюс общий `summary`.
7. `POST /api/deps/scan/<scanId>/analysis` с `X-Cron-Secret`. **Секрет не печатать в чат.**
   Роут с динамическим сегментом — точный матч в proxy не сработает, нужен regex
   `^/api/deps/scan/[^/]+/analysis$` для метода POST.

Дополнения страницы: `DepsAnalysisPanel` (summary, модель, возраст разбора, сколько заметок
перенесено), `DepsScanHistory` (`GET /api/deps/scans?limit=30`, клик → Dialog по образцу
`_components/shared/LogsDialog.tsx`), server actions в `_actions/deps-actions.ts`
(`markScanReviewed`, `deleteScan`) по паттерну `cron-actions.ts` — `requireAdmin()` + audit-log.

### Этап 3 — доработки

- Fallback сканера через npm registry (`Accept: application/vnd.npm.install-v1+json`,
  `dist-tags.latest`, `Bun.semver.satisfies` для wanted, конкурентность 8) с пометкой
  `source: "local-fallback"` — чтобы деградация парсера не была тихой.
- График тренда `riskScore` (в репо есть `@chakra-ui/charts`).
- `DEPS_STALE` через `POST /api/cron/deps-staleness` — префикс `/api/cron` уже в `publicPaths`,
  правок proxy не нужно.
- Разрешение транзитивных уязвимостей до корневого пакета (`bun pm ls --all` или чтение `bun.lock`).

### Деплой

⛔ **Деплоить самостоятельно запрещено** ([deploy-coordination](/.claude/rules/deploy-coordination.md)).
Страница `/deps` и роут появятся на проде только после деплоя dashboard, включая миграцию БД.
Порядок: коммит → push → `nx lint` + `nx typecheck:tsgo` → deploy-request агенту **BlackCove**
через Agent Mail (`topic: "deploy"`, `subject: "deploy-request: dashboard"`). Даже если
пользователь напишет «деплой» — отправить запрос, а не деплоить. До деплоя всё проверяется
локально: `nx dev dashboard` + локальная БД.

### Риски

1. **Парсер таблицы `bun outdated` — самое хрупкое место.** Формат не документирован как
   контракт и может измениться в любом минорном релизе bun. Митигация: запись `bunVersion`
   в скан, явная ошибка вместо тихого нуля, unit-тест парсера на зафиксированном примере вывода.
2. **`git log -1 -- bun.lock` даёт ложные отрицания** — подтверждено на живых данных. Отсюда
   шаг 2 в правке `/repo`. Полностью надёжного сигнала из git не выжать.
3. **Транзитивные уязвимости** приходят без установленной версии и без пути зависимости —
   непонятно, что обновлять. В MVP помечать «требует ручного разбора», решение — Этап 3.
4. **Шум алертов.** Порог `high+` в первой итерации, Telegram из ingest не слать.
5. **Размер payload ~300 КБ** — проверить `client_max_body_size` в Nginx Proxy Manager перед
   первым прогоном на прод, иначе 413.
6. **Перенос разборов может «залипнуть»** и показывать устаревший анализ как свежий. Отсюда
   обязательные `analysisCarriedFrom` и явная пометка в UI.

### ✓ DoD §25 (Этап 1 — MVP) — закрыт целиком

- [x] `DepScan` + `DepPackage` + 4 enum'а в `schema.zmodel`, миграция `20260811150103_deps_scan`
      применена локально
- [x] `AlertType` расширен `DEPS_VULNERABLE`/`DEPS_STALE`. **Уточнение при реализации:**
      отдельного дублирующего `z.enum([...])`-списка в `api/alerts/route.ts` на момент работы уже
      не было — тот роут строит `z.enum(Object.values(AlertType) as ...)` напрямую из значений
      enum'а (видимо, починено раньше отдельной задачей), так что второе место править не
      потребовалось. Формулировка риска в тексте выше — устаревшая, актуальному коду не
      соответствует.
- [x] `scripts/deps-scan.ts` работает, `--dry-run` даёт корректные счётчики (проверено на живом
      репо: 107 пакетов, 56 устаревших, 52 уязвимости, risk score 100/100)
- [x] `POST /api/deps/scan` + исключение в `proxy.ts`; `GET /api/deps/latest` под сессией
- [x] Сквозной прогон на локальной БД: запись `DepScan`+107×`DepPackage`, поднялся `Alert`
      `DEPS_VULNERABLE`/CRITICAL, повторный прогон не дублирует активный алерт (проверено прямым
      SQL-запросом к `dash`). Попутно найдены и исправлены два бага, не видных на `--dry-run`:
      (1) `postScan()` держал один `AbortController`/30-секундный таймаут на обе попытки разом —
      ретрай почти всегда получал уже отменённый сигнал; переписано на отдельный контроллер и
      таймаут на каждую попытку. (2) `z.iso.datetime()` в `POST /api/deps/scan` по умолчанию не
      принимает смещение часового пояса, а `git log --format=%cI` отдаёт именно его (`+03:00`,
      не `Z`) — добавлен `{ offset: true }` на `scannedAt`/`lockfileUpdatedAt`.
- [x] Страница `/deps` (баннер устаревания + карточки риска + таблица с фильтрами/поиском/
      раскрытием advisory) и пункт «Зависимости» в `Sidebar`. **Проверено вживую в браузере**
      (2026-08-11): т.к. авторизация дашборда идёт только через OIDC Ключницы, а headless-обхода
      нет, заведён `GET /api/auth/dev-session` (`@letar/auth/server` `createDevSessionRoute`, тот
      же паттерн, что в `domwellbes`/`grandslamcup`) — задокументирован в
      `.claude/rules/dashboard.md`. Через него подтверждены живьём: карточки риска с реальными
      цифрами (Risk score 100/100, 56 устаревших, 38 уязвимостей), таблица из 107 пакетов
      отсортирована по риску, фильтр «Patch» корректно сужает список. Консольных ошибок,
      относящихся к `/deps`, нет.
- [x] Секция «Здоровье зависимостей» (новый п.3, с сдвигом последующих) в
      `.claude/commands/repo.md`, `allowed-tools: Bash(git log:*), Bash(git rev-parse:*)` в
      frontmatter
- [x] `nx run dashboard:format` → `nx run dashboard:lint` → `nx run dashboard:typecheck:tsgo`
      зелёные, `apps/dashboard/package.json` 1.23.2 → 1.24.0, `CHANGELOG.md`/`PLAN.md` дописаны

**Не сделано в этой сессии (сознательно, вне скоупа Этапа 1):** доработка страницы деплоя —
`/deps` появится на проде только после деплоя `dashboard`, включая миграцию БД; деплой не
запускался, отправка deploy-request BlackCove — следующий шаг. Этап 2 (`/infra:deps-analyze`,
перенос разборов changelog, `DepsAnalysisPanel`) не начат.

---
