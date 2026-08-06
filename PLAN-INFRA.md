# PLAN-INFRA — Инфраструктурные треки (вне auth-плана)

> Вынесено из `PLAN.md` §21 (2026-07-21) — секции §15–§20 не связаны с темой auth (для которой
> заведён `PLAN.md`), а сами себя помечали «добавлено по аналогии». Нумерация секций (`§15`…`§20`)
> сохранена как есть — на неё ссылаются `.claude/docs/*.md`, журнал сессий в `PLAN.md` и переписка
> агентов; перенос не меняет номера, только физическое расположение файла.
>
> **Не архивировать вслепую** — §18.7 (тираж e2e-гейта) активен прямо сейчас, это текущий фронт
> работ монорепо. См. `PLAN.md` §21 для истории решения о переносе.

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

**Healthcheck-стандартизация через doctor.** Факт: app-healthcheck есть только у 5/23 приложений
(dashboard, dashboard-agent, grandslamcup, svoichuzhie, umami). Стандарт — профиль grandslamcup
(`wget --spider`, interval 5s, retries 30, start_period 15s; при подключении желателен выделенный
`/api/health`, чтобы не зависеть от тяжёлой главной). `deploy-engine doctor --app X` валидирует
compose (healthcheck, alias, нет container_name/ports, DEPLOY_TAG, label); **rollout отказывается
работать без пройденного doctor**. Healthcheck добавляется per-app в той же пачке, что и
включение rollout — не big-bang.

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

## §18.8 — `.env.staging` не шифруется и не трекается: завести `.env.staging.enc` по образцу `.env.docker.enc` 🟡 ПИЛОТ ГОТОВ

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
- [ ] Тираж на остальные 11 приложений (`grandslamcup`, `aboi`, `aprel8008`, `archetest`, `auth-hub`,
      `driving-school`, `dsperevod`, `mandala`, `pravda`, `svoichuzhie`, `time`) — не начат. Для
      приложений, где `.env.staging` уже существует на s3 (минимум `grandslamcup`) — потребуется
      снять текущий файл с сервера перед шифрованием (см. «Одноразовая миграция» выше), не завести
      с нуля как у `domwellbes`.
- [ ] Хук нужно доустановить в `.git/modules/apps/<app>/hooks/pre-commit` для каждого остального
      submodule по мере тиража — не автоматизировано, копируется вручную как в этой сессии.

---

## §18.8.1 — Секреты инфра-сервисов вне конвейера `.enc` вообще 🆕 (2026-08-06)

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

- [ ] `scripts/deploy-infra.sh <сервис>`: подтянуть репозиторий → расшифровать
      `infra/<сервис>/secrets/*.enc` по целевым путям с нужными правами → `docker compose up -d` →
      вернуть статус.
- [ ] Правило в `.sops.yaml` для инфра-секретов (сейчас там только `\.env\.docker(\.enc)?$` и
      `\.env\.staging(\.enc)?$`).
- [ ] Целевой путь и права описываются **рядом с самим секретом**, а не в голове исполнителя —
      иначе расшифровка положит файл не туда или с `644`.
- [ ] Ручка в `deploy-mcp`, чтобы BlackCove звал инструмент, а не набор команд по памяти.
- [ ] Первые потребители: `infra/traefik` (аккаунты acme-dns + htpasswd дашборда) и
      `infra/acme-dns`. Ручной `scp` из README Traefik убрать, когда заработает.
- [ ] ⚠️ Не тащить в git `acme.json` Traefik даже зашифрованным: это выпущенные приватные ключи,
      они генерируются на месте и восстановлению из репозитория не подлежат — им место в бэкапах,
      а не в конвейере секретов.

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

## §20 — Рассинхрон форматтера между worktree/фоновыми сессиями 🆕

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

- [ ] Прочитан `.claude/hooks/auto-format.js` целиком — подтверждён/опровергнут скоуп форматирования
      (весь файл целиком vs только изменённый диапазон)
- [ ] Подтверждена или опровергнута гипотеза про версии `dprint` в изолированных worktree
      (сравнить `node_modules/dprint` → `package.json.version` в свежесозданном worktree с главным деревом)
- [ ] Осиротевший `dprint@0.54.0` вычищен из bun-стора (или подтверждено, что он безвреден и не резолвится нигде)
- [ ] Выбран и применён один из вариантов решения выше (или комбинация)
- [ ] Задокументировано в `.claude/docs/environment.md` — как агентам избегать/распознавать этот класс диффов

### Риски

- Если не решить — каждая фоновая/worktree-сессия продолжит незаметно подмешивать косметические
  диффы в соседние файлы, увеличивая риск, что кто-то однажды закоммитит их не глядя (конфликты
  с другими агентами, шумные code review).

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

- [ ] Выбран вариант и применён
- [ ] Если выбран вариант 3 — правило добавлено в `.claude/docs/code-style.md`

---

## §28 — `libs/ui` разросся: плоский `index.ts` на 30 экспортов 🆕

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

### Что предлагается (решение не принято)

0. **Довести README до полноты** — самое дешёвое из всего списка и единственное, что даёт
   пользу немедленно, без изменения структуры. Делать не одним заходом, а правилом: тронул
   компонент — описал его.
1. **Сгруппировать `lib/` по подпапкам** (`overlays/`, `navigation/`, `media/`, `consent/`,
   `forms/`, `misc/`) с сохранением плоского публичного API — импорты приложений не ломаются,
   меняются только внутренние пути.
2. **Разбить `index.ts` на секции с комментариями** — минимальный шаг, ноль риска, но решает
   только читаемость, не структуру.
3. **Ничего не делать, вернуться при 40+ экспортах** — тоже допустимо, если зафиксировать порог.

### ✓ DoD §28

- [ ] Выбран вариант (или зафиксирован порог, при котором возвращаемся)
- [ ] Каждый экспорт из `index.ts` имеет раздел в README (или осознанно помечен как внутренний)
- [ ] Если выбрана группировка — `libs/ui/README.md` обновлён под новую структуру
- [ ] Публичное API `@letar/ui` не изменилось (проверить `nx build`/`typecheck` потребителей:
      aboi, archetest, driving-school, grandslamcup, studio и остальные)

---

## §22 — JSON-LD (schema.org) дублируется между приложениями 🆕

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

### Что предлагается (решение не принято)

1. **`libs/seo` → `@letar/seo`.** Генераторы `productJsonLd`/`breadcrumbJsonLd`/
   `organizationJsonLd`/`faqJsonLd` как чистые функции (вход — плоский DTO, не Prisma-модель,
   чтобы либа не тянула схему конкретного приложения) + один общий компонент
   `<JsonLdScript html={...} />`.
2. **Момент удачный:** копий пока две и они почти одинаковые — переносить дешевле, чем
   когда появится третья и разойдётся сильнее.
3. **Ничего не делать сейчас, вернуться после S6.2/S3.5** — если к тому моменту наберётся
   4–5 функций в каждом приложении, перенос всё равно будет дешевле копирования.

### ✓ DoD §22

- [ ] Выбран вариант
- [ ] Если вынесено — `aboi` и `svoichuzhie` мигрированы на `@letar/seo`, локальные
      `seo.ts`/`jsonld.ts` удалены
- [ ] `productJsonLd` в `@letar/seo` поддерживает `AggregateOffer` (нужно `aboi` §S3.5
      после перехода на варианты, §P)

---

## §23 — Логика СДЭК и расчёт упаковки дублируются, `@letar/cdek` не хостит оценку габаритов 🆕

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

### ✓ DoD §23

- [ ] Выбран вариант
- [ ] `apps/aboi/src/lib/shipping/*` мигрирован на `@letar/cdek` (или обосновано, почему нет)
- [x] Функция оценки упаковки принимает материал параметром, а не хардкодит константы
      флизелина/бумаги внутри — ✅ сделано в `aboi` 2026-07-28 (таблица `MATERIALS` по
      `ProductKind`), но **в приложении, не в библиотеке**
- [ ] Решено, что именно из расчёта упаковки поднимать в `@letar/cdek` — с учётом того,
      что формулы у постеров (намотка в рулон) и у мерча (сумма объёмов коробок) разные,
      а общий у них только результат

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

## §25 — Еженедельный контроль зависимостей 🆕

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
if (pathname === '/api/deps/scan' && request.method === 'POST') return NextResponse.next()
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

### ✓ DoD §25 (Этап 1 — MVP)

- [ ] `DepScan` + `DepPackage` + 4 enum'а в `schema.zmodel`, миграция применена
- [ ] `AlertType` расширен `DEPS_VULNERABLE`/`DEPS_STALE` **и в `z.enum` в `api/alerts/route.ts`**
- [ ] `scripts/deps-scan.ts` работает, `--dry-run` даёт корректные счётчики
- [ ] `POST /api/deps/scan` + исключение в `proxy.ts`; `GET /api/deps/latest` без сессии редиректит
- [ ] Сквозной прогон: запись в БД, поднялся `Alert`, повторный прогон не дублирует алерт
- [ ] Страница `/deps` (баннер + карточки + таблица) и пункт в `Sidebar`
- [ ] Секция «Здоровье зависимостей» в `.claude/commands/repo.md`
- [ ] `nx format` → `nx run dashboard:lint` → `nx run dashboard:typecheck:tsgo` зелёные,
      версия `apps/dashboard/package.json` поднята, `CHANGELOG.md` дописан

---

## §26 — Непоследовательный frontmatter у слэш-команд 🆕

> Найдено 2026-07-28, при проектировании §25.

### Что есть сейчас

В `.claude/commands/` frontmatter (`---\ndescription: ...\nallowed-tools: ...\n---`) есть
не у всех файлов. У `workflow/update-docs.md` — есть, с `description` и `allowed-tools`.
У `letar.md`, `end-session.md`, `infra/deps-update.md` и части других — нет вообще, файл
начинается сразу с `# Заголовка` или императива. Без `allowed-tools` во frontmatter команда,
которой нужен Bash (`git log`, `git rev-parse` и т.п.), упирается в промпт на разрешение
каждый раз — уже учтено отдельным пунктом в правке `/repo` (§25, Шаг 5), но это частный
патч одной команды, не системное решение.

### Что предлагается

- [ ] Пройтись по `.claude/commands/**/*.md` и добавить `description` всем, у кого его нет
      (сейчас используется как минимум для отображения в списке доступных команд).
- [ ] Для команд, которые систематически дёргают конкретные Bash-инструменты (git, nx, bun) —
      добавить `allowed-tools` с точечными разрешениями (`Bash(git log:*)` и т.п.), а не оставлять
      это на усмотрение каждой новой правки.
- [ ] Зафиксировать ожидаемый frontmatter-шаблон одной строкой в `.claude/commands/README.md`
      (если такого файла нет — создать) или в `.claude/docs/`, чтобы новые команды писались
      единообразно с самого начала.

### ✓ DoD §26

- [ ] Все файлы `.claude/commands/**/*.md` имеют `description` во frontmatter
- [ ] Команды с регулярными Bash-вызовами имеют `allowed-tools`
- [ ] Шаблон/конвенция задокументированы, на неё можно сослаться при создании новой команды

---

## §26.1 — Блок «## Деплой» скопирован в 26 командных файлов ✅ ЗАКРЫТО (2026-07-29)

> Найдено 2026-07-29, при правке шаблона командного файла в `create/new-app.md`. Соседняя
> с §26 тема: то же расхождение между файлами `.claude/commands/`, только не во frontmatter,
> а в теле.

### Что было

Блок «⛔ **ЗАПРЕЩЕНО деплоить самостоятельно!**» вместе с полным шаблоном вызова
`send_message(...)` был скопирован в 25 файлов `.claude/commands/*.md` плюс в шаблон командного
файла внутри `create/new-app.md` — по 22–24 строки в каждом, суммарно 596 строк.

Канонический источник тех же правил — `.claude/rules/deploy-coordination.md`. Он подключён как
project instruction и грузится в контекст всегда, то есть агент видит правило независимо от того,
есть ли копия в командном файле. Копия ничего не добавляла, но уже начала расходиться:

- в шаблоне `create/new-app.md` стоял `project_key: "C:/web/letar"` — это `human_key`, а не
  `project_key` (`"c-web-letar"`); в самих 25 файлах значение верное, но каждое новое приложение
  получало бы сломанный вызов (исправлено отдельно 2026-07-29);
- `auth-hub.md` запрещал заодно `docker compose`, остальные — нет;
- `letar.md` держал «Подробности» отдельной строкой без пустой строки перед ней;
- `synth.md` вместо блока имел одну строку без ссылки на правило и без имени приложения.

### Что сделано

- [x] Во всех 26 файлах блок схлопнут до пяти строк: запрет (SSH / `deploy-affected.sh` /
      `docker compose`) + `subject: "deploy-request: <имя-приложения>"` + ссылка на
      `.claude/rules/deploy-coordination.md`. Имя приложения оставлено в теле, чтобы его не
      пришлось искать; `letar.md` и шаблон `new-app.md` сохранили свои плейсхолдеры
      (`<app>` / `<name>`).
- [x] Сверено, что уникальной информации в блоках не было: 25 копий различались только именем
      приложения, упоминание `docker compose` из `auth-hub.md` перенесено во все файлы (оно и так
      есть в каноническом правиле). Особых условий деплоя у отдельных приложений не нашлось.
- [x] Шаблон в `create/new-app.md` («Создать команду приложения») переписан на ту же короткую
      форму — иначе дубль отрос бы заново с первым же новым приложением.

Итог: 596 → 182 строки, минус 414.

### ✓ DoD §26.1

- [x] `grep -rn 'sender_name: "<твоё-имя-агента>"' .claude/commands/` — пусто
- [x] Единственный источник правил деплоя для агентов — `.claude/rules/deploy-coordination.md`
- [x] Новая команда, созданная по шаблону `create/new-app.md`, получает короткую форму

---

## §29 — Нет документации по e-commerce-паттернам, а магазинов уже три ✅ ЗАКРЫТО (2026-08-06)

> Найдено 2026-07-28 при реализации §P у `apps/aboi` (ревизия монорепо в конце сессии).

### Что есть сейчас

В `.claude/docs/` 33 файла — и ни одного про корзину, варианты товара, заказы или доставку.
При этом магазинов в монорепо уже три: `aboi` (постеры), `svoichuzhie` (мерч), `mandala`.
Все трое независимо решили один и тот же набор задач:

- **Вариант товара.** `svoichuzhie` первым завёл `ProductVariant` + `OrderItem.variantId/quantity`;
  `aboi` при переходе на форматы (§P) повторил ту же структуру, взяв её как образец — но узнал
  о ней только потому, что §P.2 прямо велел «не изобретать свой, посмотреть в `svoichuzhie:616`».
  Без этой строчки в плане была бы четвёртая своя модель.
- **Снэпшоты в заказе.** `productNameSnapshot`, `productImageSnapshot`, теперь ещё
  `variantNameSnapshot`/`widthMmSnapshot`/`heightMmSnapshot` — зачем они и почему `productId`
  nullable, нигде не объяснено; каждый выводит заново.
- **Слияние анонимной корзины при логине** — `merge-anonymous.ts`, стратегия
  «суммировать количество для одинаковых вариантов».
- **Правило «не удалять то, на что ссылаются заказы»** — в `aboi` это `syncProductVariants()`:
  вариант со ссылками из корзин/заказов снимается с продажи вместо удаления. Логика неочевидная,
  а цена ошибки — потеря чужой корзины.
- **Расчёт посылки** — см. §23.

Единственное, что есть, — skill `ecommerce-patterns`, и тот описан как «паттерны
premium-rosstil», то есть привязан к приложению, **удалённому из монорепо** (см. память
`project_premium_rosstil_imot_removed`).

### Чем это грозит

Четвёртый магазин (или вторая волна любого из трёх) снова пройдёт тот же путь с нуля и снова
найдёт те же грабли — но уже в проде, где есть оплаченные заказы. Дублирование модели данных
дороже дублирования компонента: компонент переписывается, схема заказов — мигрируется.

### Что предлагается (решение не принято)

1. **`.claude/docs/ecommerce-cart-orders.md`** — вариантная модель, зачем снэпшоты в `OrderItem`
   и почему `productId`/`variantId` nullable, слияние анонимной корзины, правило «снять
   с продажи, а не удалять». Материал уже написан кодом в трёх приложениях — надо только
   сформулировать и дать ссылку на эталон по каждому пункту.
2. **Перепривязать skill `ecommerce-patterns`** к живому приложению вместо удалённого
   `premium-rosstil` (минимальный шаг, но не решает главного — skill читается по запросу,
   а док попадает в контекст через ссылку в `CLAUDE.md`).
3. Ничего не делать, пока не появится четвёртый магазин.

### ✓ DoD §29

- [x] Выбран вариант — с поправкой относительно первоначального предложения (см. ниже)
- [x] Док написан, ссылка есть в разделе «Документация» корневого `CLAUDE.md`
- [x] Skill `ecommerce-patterns` перепривязан — не к конкретному приложению, а обезличен

### Что сделано (2026-08-06) — с поправкой на `public-repo-hygiene.md`

Первоначальное предложение (п.1 выше — «дать ссылку на эталон по каждому пункту» с указанием
конкретного приложения/файла-источника паттерна) **конфликтует** с §27/`public-repo-hygiene.md`:
два из трёх магазинов, откуда реально взят паттерн (вариантная модель, снэпшоты, слияние
корзины), — приватные submodule, а правило запрещает даже нечувствительные технические записи
о них в публичном репо, не только бизнес-детали. Решение с владельцем: писать паттерн **обезличенно**
— как общее инженерное know-how (модель вариантов, снэпшоты в `OrderItem`, слияние анонимной
корзины, «снять с продажи, а не удалить»), без ссылок на конкретные приложения и без чтения кода
приватных submodule в процессе написания.

- [x] [`ecommerce-cart-orders.md`](/.claude/docs/ecommerce-cart-orders.md) — 5 разделов: вариант
      товара отдельной моделью, снэпшоты в `OrderItem` (с обоснованием nullable `productId`/
      `variantId` + `SetNull`), слияние анонимной корзины при логине, «снять с продажи, а не
      удалить», плюс раздел про упрощённый случай без вариантов (чтобы не переусложнять
      маленький магазин заранее). Ни одно приложение не названо по имени.
- [x] `skill ecommerce-patterns` — убрана привязка к удалённому `premium-rosstil` из frontmatter
      `description` и из тела; добавлена ссылка на новый док. `reference/order-workflow.md`
      внутри skill'а всё ещё содержит один старый email-пример на домене `premium-rosstil.ru` —
      не тронут, вне скоупа этого захода (тот же класс техдолга, что и остальные ~30 файлов из
      `project_premium_rosstil_imot_removed`).
- [x] Ссылка в `CLAUDE.md` добавлена.

---

## §30 — Документация по БД разошлась с правилом и с Prisma 7 🆕

> Найдено 2026-07-28 (aboi-dev) — после того, как реализация §P у `apps/aboi` потребовала
> пересоздать схему, и рецепт миграций из `.claude/rules/database.md` не сработал ни одной
> командой. Правило исправлено в той же сессии; ревизия показала, что то же устаревшее
> знание лежит ещё в трёх местах.

### Что есть сейчас

**1. `.claude/docs/database.md` противоречит `.claude/rules/database.md`.**
Док (1043 строки) в двух местах — шаг 3 воркфлоу (строка ~20) и раздел «Стратегия миграций»
(~493) — подаёт `nx db:push` как штатный путь разработки, без оговорок. Правило (124 строки)
требует **всегда** создавать migration file и разрешает `db:push` только с последующим
`migrate diff` + `resolve`. Док в восемь раз длиннее и попадается первым — а расходятся они
именно в разрушающей операции.

**2. Там же — 13 упоминаний `premium-rosstil` и `imot`.**
Оба приложения удалены из монорепо (2026-07-05). Примеры вида `nx db:push premium-rosstil`
буквально неисполнимы. Это известный общий техдолг по удалённым приложениям, но в доке
по БД он бьёт больнее прочих: команда копируется в работу с боевой базой.

**3. `.claude/docs/deployment.md:392` советует `migrate dev --create-only`.**
В Prisma 7 команда интерактивна и в агентской сессии падает с «environment is non-interactive»
(проверено на практике). Место опасное: это процедура baseline перед первым production-деплоем
приложения, чья схема раньше накатывалась через `db push` (иначе `migrate deploy` даёт
`P3005`). То есть агент упирается в тупик ровно тогда, когда работает с продом.

**4. `.claude/skills/zenstack-helper/SKILL.md:32`** повторяет ту же формулу
«`db:push` (dev) или `db:migrate` (prod)» — четвёртая копия расхождения.

### Чем это грозит

Prisma 7 поменяла и флаги, и интерактивность, и требования к shadow-БД. Пока актуальное знание
живёт в одном файле из четырёх, следующий агент с равной вероятностью откроет любой другой —
и потеряет время в лучшем случае на локальной базе, в худшем на проде во время baseline.

### Что предлагается (решение не принято)

1. **Сделать `.claude/rules/database.md` единственным источником по миграциям**, а в
   `.claude/docs/database.md` и `SKILL.md` заменить соответствующие разделы ссылкой на него.
   Дублирование инструкций к разрушающим операциям не окупается удобством.
2. Починить `deployment.md:392` на неинтерактивный путь, уже описанный в правиле:
   `migrate diff` → SQL в папку миграции → `migrate deploy`.
3. Вычистить `premium-rosstil`/`imot` из примеров `docs/database.md`, заменив на живое
   приложение с БД.

⚠️ **Согласовать с владельцами:** `.claude/docs/*` на момент находки правит кто-то ещё
(несколько файлов помечены изменёнными в `git status` параллельной сессией) — не редактировать
без координации через Agent Mail.

### ✓ DoD §30

- [x] `docs/database.md` и `rules/database.md` не противоречат друг другу по `db:push`/миграциям
- [x] `deployment.md` не советует интерактивных команд Prisma для агентского пути
- [x] `zenstack-helper/SKILL.md` согласован с правилом
- [x] В примерах `docs/database.md` нет удалённых приложений

### Что сделано (2026-08-06)

- [x] `docs/database.md` шаг 3 воркфлоу и раздел «Стратегия миграций» — заменены на
      «`db:push` только на локальной dev-базе», со ссылкой на `rules/database.md` как
      единственный источник по разрушающим операциям (сам он не трогался — уже был поправлен
      в сессии-первоисточнике).
- [x] `deployment.md` (чеклист baseline-миграции) — `migrate dev --create-only` заменён на
      неинтерактивный путь `migrate diff` → SQL в папку миграции → `migrate deploy`, с явным
      предупреждением про «environment is non-interactive» в Prisma 7. Правка сделана точечно
      (только этот абзац) — файл в момент правки уже редактировался параллельной сессией в
      совсем другом разделе (Telegram-прокси), тот раздел не тронут.
- [x] `zenstack-helper/SKILL.md` шаг 3 — та же формулировка, что и в остальных трёх местах.
- [x] `docs/database.md` — все 13 упоминаний `premium-rosstil` заменены на `<app-name>`
      (плейсхолдер, уже используемый в остальной части файла, а не привязка к конкретному
      живому приложению).

---

## §31 — Правка в `libs/*` не видна потребителю: typecheck читает устаревшие `.d.ts` 🆕

> Найдено 2026-07-28 (aboi-dev) при добавлении пропа в компонент `libs/ui`. Потерянные
> полчаса ушли на поиск ошибки в приложении, хотя ошибки там не было.

### Что происходит

`apps/*/tsconfig.json` содержит `references` на `libs/*`, а `libs/*/tsconfig.lib.json`
эмитит декларации в `libs/*/dist`. При TS project references потребитель резолвит
библиотеку **через собранные `.d.ts`, а не через исходник** — несмотря на то, что
`paths` и `package.json` библиотеки указывают на `src/index.ts`.

Практический эффект: правишь `libs/ui/src/lib/<компонент>.tsx`, добавляешь проп,
используешь его в приложении — и получаешь

```
error TS2322: Property '<новый проп>' does not exist on type
'IntrinsicAttributes & <Компонент>Props'
```

Ошибка **указывает на файл приложения**, подчёркивает строку с пропом и читается как
«ты написал ерунду в приложении». В исходнике библиотеки проп при этом на месте — открыв
его, видишь, что всё правильно, и начинаешь искать несуществующую проблему в другом месте.

Лечится одной командой: `nx typecheck <lib>` (пересобирает `dist/**/*.d.ts`).

### Почему это стоит починить, а не запомнить

- **Ловушка молчаливая и повторяемая.** Она срабатывает у каждого, кто расширяет API
  общей библиотеки, — то есть ровно при работе по правилу shared-first, которое монорепо
  само же и требует.
- **`nx lint` и dev-сервер её не ловят.** Turbopack резолвит по `paths` в исходник, поэтому
  в браузере всё работает — расходится только typecheck. Это худший вид расхождения:
  зелёный экран в браузере против красного в консоли.
- **Диагноз не подсказывается ничем.** Ни текст ошибки, ни `--verbose` не упоминают `dist`.

### Что предлагается (решение не принято)

1. **Прописать `dependsOn` явно.** `apps/*:typecheck:tsgo` должен зависеть от
   `^typecheck` — тогда Nx пересоберёт декларации библиотек сам, и ловушка исчезнет
   без участия человека. Проверить, почему этого нет сейчас: у `libs/ui:typecheck`
   `dependsOn: ["^typecheck"]` стоит, а у потребителя связи нет.
2. **Либо убрать `references` на библиотеки** и резолвить только через `paths` в исходники —
   но это меняет модель сборки всего репо и требует отдельного замера скорости.
3. **Минимум, если ни то ни другое:** строка в `.claude/docs/environment.md` рядом с
   разделом про shared-библиотеки — «поменял API в `libs/*` → `nx typecheck <lib>` перед
   typecheck потребителя».

### Проверка

- [ ] Добавление пропа в компонент `libs/*` и его использование в приложении даёт зелёный
      `nx typecheck:tsgo <app>` без ручного пересбора библиотеки
- [ ] Либо: ловушка описана в доке, и текст ошибки в ней узнаваем дословно

---

## §32 — Два форматтера с конфликтующими правилами: `nx format` против `dprint` ✅ ЗАКРЫТО (2026-08-06)

> Найдено 2026-07-28 (aboi-dev). Проявилось как «правки в `libs/ui` молча откатываются»:
> возвращаешь висячую запятую — через минуту её снова нет. Виновником сперва казался
> PostToolUse-хук, но дело оказалось в двух инструментах, которые форматируют одно и то же
> по разным правилам.

### Что есть сейчас

| Инструмент   | Конфиг        | Правило по висячим запятым                                        | Кто его запускает                                                                 |
| ------------ | ------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **dprint**   | `dprint.json` | `trailingCommas: "onlyMultiLine"` — **ставит**                    | PostToolUse-хук `.claude/hooks/auto-format.js`, таргеты `dprint` / `dprint:check` |
| **Prettier** | `.prettierrc` | `trailingComma: "es5"` — **убирает** в аргументах вызовов и типах | `nx format` (встроенная команда Nx)                                               |

`CLAUDE.md:55` предписывает перед коммитом `nx format` — то есть **канонический по документации
путь запускает Prettier**, а всё остальное в репозитории форматирует dprint. Каждый прогон
одного отменяет работу другого.

Замер по `libs/`: **366 файлов из 1449 не проходят `dprint check`.** Это не единичный дрейф,
а устоявшееся расхождение — большая часть репозитория отформатирована «не тем» инструментом.

### Чем это грозит

- **Шум в каждом диффе.** Тронул файл — вместе со смысловой правкой уезжают запятые в
  соседних строках. В этой сессии из-за этого пришлось вручную вычищать 5 посторонних
  хунков, чтобы коммит содержал только содержательное изменение.
- **`nx format` трогает чужие файлы.** Запуск `nx format --projects=ui,aboi` изменил три
  файла, которых сессия не касалась (`admin-edit-overlay.tsx`, `sticky-action-bar.tsx`,
  `use-scroll-gate.ts`). В монорепо, где параллельно работает несколько агентов, это прямой
  путь утащить чужое в свой коммит — против правила из `.claude/rules/git.md`.
- **Иллюзия отката правок.** Самый дорогой эффект: правишь файл, проверяешь — всё на месте,
  фоновый `nx format` доформатирует позже, и изменение выглядит пропавшим. В этой сессии
  это стоило нескольких итераций и одной ошибки компиляции (`imageRef is not defined`),
  прежде чем причина стала понятна.
- **`dprint:check` в CI (если появится) красный на трёх сотнях файлов** — то есть проверку
  форматирования сейчас невозможно включить как гейт.

### Что предлагается (решение не принято)

1. **Выбрать один форматтер — по факту это dprint.** Он в 30 раз быстрее (так и записано в
   `nx.json`), на нём висит хук и оба таргета. Тогда: убрать `.prettierrc`/`.prettierignore`,
   заменить в `CLAUDE.md:55` `nx format` на `nx dprint` (или `nx run-many -t dprint`), один раз
   прогнать `dprint fmt` по всему репозиторию отдельным коммитом «только форматирование».
2. **Либо согласовать конфиги**, оставив оба инструмента: выставить в `.prettierrc`
   `trailingComma: "all"`, чтобы совпадало с `onlyMultiLine`. Дешевле в моменте, но два
   форматтера продолжат расходиться при любой следующей правке любого из конфигов.
3. **Массовый прогон делать отдельным коммитом и в момент, когда в репозитории нет
   незакоммиченной работы других агентов** — иначе 366 файлов смешаются с чужими правками.

⚠️ Порядок важен: сначала решение по инструменту, потом массовый прогон. Прогон «как есть»
без выбора победителя просто передвинет расхождение на другую сторону.

### Дополнение 2026-07-29: страдает не только TypeScript

Изначально §32 описывал расхождение по висячим запятым. Оказалось, оно шире: **Prettier портит
и markdown**, причём порчу годами приписывали dprint'у.

Замер на `PLAN-INFRA.md`: `dprint fmt` идемпотентен — не меняет ни строки. `nx format` на том же
файле правит 21 строку, из них две — содержательно ломающие: снимает отступ у строк-продолжений
пункта списка, если внутри пункта есть inline-код, разорванный переносом строки. Строка выпадает
из пункта и рендерится отдельным абзацем. Остальное — кавычки и точки с запятой внутри
код-блоков, то есть Prettier переписывает **примеры кода в документации** под свой стиль.

Ловушка при диагностике: на вырезанном фрагменте файла не воспроизводится — только на полном.
Поэтому естественный ход «проверю кусок в песочнице» даёт ложный отрицательный результат.

За эту сессию порча случилась дважды на одном и том же месте — оба раза после `nx format`,
предписанного `CLAUDE.md` перед коммитом. Чинилось руками; ошибку легко не заметить, потому что
diff показывает её среди десятков строк косметики.

`.claude/docs/documentation-guidelines.md` содержал раздел, приписывающий это dprint'у —
исправлен тем же коммитом.

**Дешёвая мера, не требующая решения по §32:** добавить плановые файлы в `.prettierignore`
(`PLAN*.md`, `CHANGELOG.md`). Тогда `nx format` перестанет их трогать, а dprint продолжит
форматировать — он на них стабилен. Не отменяет выбор форматтера, но убирает самый дорогой
симптом.

### ✓ DoD §32

- [x] Выбран единственный форматтер (dprint) — решение владельца 2026-08-06;
      `.prettierrc`/`.prettierignore` удалены, `prettier`/`prettier-plugin-organize-imports`
      убраны из `package.json` (коммит `5f1b6b6d`)
- [x] `CLAUDE.md` называет ту же команду, что реально форматирует репозиторий
      (`nx run-many -t format` вместо `nx format`)
- [x] `dprint check` зелёный по всему репозиторию — подтверждено 2026-08-06 после массового
      прогона (публичный `letar` + все 10 submodule-приложений отдельными коммитами)
- [x] Ни один `project.json` не запускает Prettier в таргете `format` — дочищено 2026-08-06,
      см. «Неполное закрытие» ниже
- [x] Массовое переформатирование лежит отдельными коммитами (по одному на репозиторий —
      `letar` + каждый submodule), не смешано с логикой; см. инцидент и восстановление ниже
- [x] Плановые файлы перестали ломаться форматтером — Prettier убран, dprint на них стабилен

### ⚠️ Инцидент при попытке массового прогона (2026-08-06)

Первая попытка (`bunx dprint fmt` без ограничения по пути, агент TealHill) обернулась
побочным ущербом: команда обходит файловую систему рекурсивно и не различает границы git
worktree/submodule. Задело:

- Два `.claude/worktrees/*` (orphaned worktrees других агентов) — 473 и 92 файла соответственно.
- Все 10 приватных submodule-приложений (aboi, aprel8008, driving-school(-e2e), dsperevod,
  poster-microtext-desktop, studio(-e2e), svoichuzhie) — от 1 до 473 изменённых файлов каждый.

На `apps/domwellbes` найдено смешение чисто стилевых правок с реальным незакоммиченным кодом
другого агента (`src/lib/roles.ts` — новая константа `COMPANY_ADMIN_ROLES`), из-за чего слепой
`git checkout` там не применялся. Один из orphaned worktree (`jovial-bhabha-baae8b`, ветка
`claude/suspicious-nightingale-21116c`, не запушена в origin) уже был отменён через
`git checkout -- <файлы>` **до** того, как обнаружился риск смешения — по подтверждению
владельца, в этом worktree в момент инцидента работал активный агент; возможна безвозвратная
потеря его незакоммиченного WIP (git не хранит бэкап для `checkout` без stash). Уведомление
разослано через agent-mail (BlackCove, urgent) + маркер-файл `INCIDENT-2026-08-06.md` в самом
worktree.

**Основной репозиторий `letar` — откачен.** `apps/domwellbes` — оставлен нетронутым намеренно
(смешение). Worktree `heuristic-roentgen-7645de` (detached HEAD, похоже на мёртвую сессию — один
сэмпл диффа подтвердил чисто стилевые правки) — откачен. **Остальные 9 submodule-приложений
(aboi, aboi-e2e, aprel8008, driving-school(-e2e), dsperevod, poster-microtext-desktop,
studio(-e2e), svoichuzhie) НЕ тронуты вообще** — dprint-контаминация от этого прогона всё ещё
сидит в их рабочих деревьях (от 1 до 473 изменённых файлов на приложение), не отменена и не
проверена на смешение с реальным кодом, по той же причине, что и domwellbes — риск слепого
`checkout` не оправдан без проверки владельцем.

**Урок:** `dprint fmt`/`dprint check` без явного скоупа никогда не запускать из корня монорепо —
только с `--config`/явным списком путей ограниченным публичным репо, либо через
`nx run-many -t dprint --projects=...` (уважает границы Nx-проектов, но не факт что не заходит в
submodule-приложения, которые тоже являются Nx-проектами — требует проверки перед следующей
попыткой).

**Следующий шаг (не выполнено):** владельцы 9 незатронутых напрямую submodule-приложений должны
сами проверить `git diff` перед следующим коммитом на предмет случайных dprint-правок,
подмешавшихся в их рабочее дерево во время инцидента (диапазон времени — 2026-08-06, ~12:15-12:25
UTC). Массовое переформатирование самого `letar` — переносится в отдельную будущую сессию, с явным
скоупом по путям.

### ✅ Восстановление и повторный прогон (2026-08-06, тот же день)

Постоянный фикс — явные `excludes` в `dprint.json` на все 10 submodule-путей и
`.claude/worktrees` (коммит `76ad89b3`), закрывает класс бага для любого будущего прогона из
корня, не только для этой сессии.

По каждому из 9 непроверенных submodule-приложений сделан построчный аудит `git diff` перед
коммитом (искали паттерн «только вставки без удалений» — сигнатуру подмешанного реального кода,
как в `domwellbes`): не найдено ни одного файла с таким паттерном ни в одном приложении,
insertions/deletions сбалансированы во всех (напр. `driving-school` 6579/6184 на 473 файла,
`aboi` 863/835). Сэмпл-проверка крупнейших диффов в каждом приложении подтвердила: только
переформатирование (висячие запятые, позиция `&&`/`||`, реиндентация JSX-тернарников), реальный
код не задет. Каждое приложение закоммичено и запушено отдельным `style: dprint fmt`-коммитом
в свой репозиторий, пointers забамплены в `letar` одним коммитом.

На `domwellbes` реальный код (`COMPANY_ADMIN_ROLES` и др.) к моменту повторной проверки уже был
закоммичен владельцем отдельно (сессия продолжилась параллельно) — остались только 10 чисто
стилевых файлов, закоммичены штатно.

Публичный `letar` переформатирован повторно (1736 файлов, `c7a2924b`) — на этот раз с рабочими
excludes, submodule/worktree не затронуты (проверено после прогона: 0 изменений в каждом из 11
submodule-приложений и в обоих worktree). `dprint check` по всему репозиторию — зелёный.

**Закрыто владельцем (2026-08-06):** WIP в worktree `jovial-bhabha-baae8b`
(`claude/suspicious-nightingale-21116c`) признан не важным — можно было удалять. Worktree и
локальная ветка удалены. Ветка не была запушена в origin, поэтому удаление окончательное.

**Попутная уборка `.claude/worktrees/` (тот же день):** заодно проверены два оставшихся
каталога — оба мусор, не связаны с этим инцидентом. `heuristic-roentgen-7645de` (detached HEAD)
— коммит уже давно слит в `main` (`merge-base --is-ancestor` подтвердил), реальной работы нет.
`agent-a7fc4367155cb7fcb` — вообще не git-worktree (нет `.git`, нет `apps/`/`libs/`, только
голые конфиги и `node_modules` от 28 июля) — команды git из него по ошибке уходили в родительский
репозиторий (git ищет `.git` вверх по дереву), что и вскрыло подмену. Оба удалены через
`git worktree remove`/`rm -rf`. Заодно снесена ветка `claude/jovial-bhabha-baae8b` (с копией в
origin) — тоже давно слита в `main`, `git branch -D` + `git push origin --delete`.
`.claude/worktrees/` теперь пуст.

### Дополнение 2026-08-06 (вечер): targetDefaults `dprint`→`format` и постоянная документация ловушки

При аудите обнаружилось, что DoD-пункт «`CLAUDE.md` называет ту же команду, что реально
форматирует репозиторий» был закрыт лишь наполовину: `CLAUDE.md:55` действительно называл
`nx run-many -t dprint`, но в `nx.json` `targetDefaults` под именами `dprint`/`dprint:check`
были **мёртвой конфигурацией** — `targetDefaults` в Nx не создают таргет, только донастраивают
уже объявленный, а ни один `project.json` в репозитории таргет с именем `dprint` не объявлял.
Подтверждено: `nx run kami:dprint:check` → `Cannot find target 'dprint' for project 'kami'`,
`nx run-many -t dprint --dry-run` → «No tasks were run». Реальный работающий механизм — 22
app-level таргета `format`/`format:check` (сохранились со старого именования, ни разу не
подключённые к `targetDefaults`). Переименовал `targetDefaults` в `nx.json` на `format`/
`format:check`, чтобы они реально применялись к тем же 22 проектам; `CLAUDE.md` — без изменений
(там уже правильное имя команды, `-t dprint` в проверенном ранее пункте DoD относился именно к
названию таргета, а не к самому вызову). Побочный инцидент при проверке — `nx run-many -t format
--dry-run` не является настоящим dry-run для `nx:run-commands` executor и реально прогнал
форматтеры по нескольким `libs/*` и submodule `apps/studio`; откачено полностью. Постоянная
документация обеих ловушек (dprint не различает границы worktree/submodule + `--dry-run` не
дожидается выполнения) — новый файл
[dprint-worktree-submodule-scope.md](/.claude/docs/dprint-worktree-submodule-scope.md), со
ссылкой из `CLAUDE.md` и указателем в `.claude/rules/git.md` рядом с разделом про submodule.

### ⚠️ Неполное закрытие: три библиотеки продолжали запускать Prettier (найдено и починено 2026-08-06)

Закрытие выше проверяло **файлы** (`dprint check` зелёный) и **корневой конфиг**
(`.prettierrc`/`.prettierignore` удалены, `prettier` убран из `package.json`). Не проверялось
третье место — **`targets.format` в каждом `project.json`**. Там осталось три переопределения на
Prettier:

| Библиотека                  | Команда в `targets.format`                                 |
| --------------------------- | ---------------------------------------------------------- |
| `libs/forms`                | `prettier --write "**/*.{ts,tsx,js,jsx,json,css,scss,md}"` |
| `libs/ui`                   | `prettier --write .`                                       |
| `libs/zenstack-form-plugin` | `prettier --write "**/*.{ts,js,json,md}"`                  |

`libs/forms` держал ещё и `format:check` на `prettier --check` с `inputs` на удалённые
`.prettierrc`/`.prettierignore`.

Почему проверки этого не поймали:

- **`dprint check` зелёный** — потому что массовый прогон `c7a2924b` уже привёл эти файлы в
  dprint-стиль, а Prettier-таргеты после него ни разу не запускали. Расхождение было латентным.
- **Грепа по `project.json` никто не делал** — считалось, что удаления `.prettierrc` достаточно.
  Своего `.prettierrc` у трёх либ не было, и это не защита, а усугубление: Prettier работал на
  дефолтах, то есть максимально далеко от `dprint.json` (двойные кавычки, точки с запятой).

**Как проявилось:** `nx run-many -t format` — команда, которую `CLAUDE.md` предписывает перед
каждым коммитом — переписала **480 файлов** (`forms` 423, `ui` 47, `zenstack-form-plugin` 10) из
dprint-стиля в Prettier-стиль. Откатывалось вручную. Всплыло 2026-08-06 при работе над §49
(аудит firewall на s2), при попытке отформатировать один `PLAN-INFRA.md`: флаг `--files=` таргет
`format` не поддерживает, команда форматирует проекты целиком.

**Ключевая грабля при починке:** очевидный ход «удалить блок `targets.format`, подхватится
`targetDefaults` из `nx.json`» — **не работает**. `targetDefaults` в Nx **дополняет** уже
объявленный таргет и **не создаёт** новый: после удаления блока `nx show project` показывает, что
таргета `format` у проекта нет вовсе. То есть команда не переключилась бы на dprint, а молча
перестала бы что-либо форматировать. Блоки переписаны на `dprint fmt` в конвенции остальных
девяти библиотек (`cwd` = корень библиотеки, `cache: false`); у `libs/forms` сохранён
`format:check`, потому что от него зависит таргет `validate`.

Заодно приведён к общему виду `libs/label-printer-core` — там был dprint, но нестандартным
вызовом `bunx dprint fmt --config ../../dprint.json libs/label-printer-core` с `cwd` в корне
воркспейса и ошибочным `cache: true` на форматтере (кэшировать сайд-эффект в рабочем дереве
бессмысленно и опасно).

Массовое переформатирование **не потребовалось**: `dprint check` по всем четырём библиотекам
зелёный (438/51/17/40 файлов), прогон `c7a2924b` их уже покрыл. Коммит `c3f12c3d` — только
конфиги.

**Проверено попутно, чисто:** `format`-таргеты 13 приложений и остальных 9 библиотек — везде
dprint (упоминания «Prettier» там только в тексте `metadata.description`, «~30x faster than
Prettier»). `prettier` нет ни в одном `package.json` (в корне остался только
`eslint-config-prettier`, он ничего не форматирует — лишь глушит правила ESLint); сам пакет лежит
в `node_modules` транзитивно, поэтому команда и находилась. `.prettierrc`/`.prettierignore` нет
ни в корне, ни в трёх либах. Единственный git-хук — `pre-commit` с SOPS-шифрованием, форматтера
не вызывает; `lint-staged`/`husky` в репозитории нет.

**Урок (шире, чем Prettier):** утверждение «инструмент X в монорепо один» нельзя проверять
прогоном самого инструмента — зелёный результат означает лишь, что конкурента давно не
запускали. Проверять надо **объявления таргетов**, грепом по `project.json`. И помнить, что
`targetDefaults` не является единой точкой контроля: любой проект переопределяет команду у себя,
а `nx run-many` это выполнит без предупреждения.

### ✅ Покрытие таргетом: все библиотеки (2026-08-06, тем же вечером)

Побочная находка при починке выше: `targets.format` был объявлен лишь у 13 библиотек из 45 (9
исходных + 4 из этой сессии). У остальных 32 таргета не было вовсе, то есть `nx run-many -t
format` их **не трогал** — форматирование там держалось на PostToolUse-хуке
`.claude/hooks/auto-format.js` и на прогонах `dprint fmt` из корня. Расхождения стилей это не
давало (файлы зелёные), но и гейтом не было: библиотека могла годами не попадать под
предписанную `CLAUDE.md` предкоммитную команду.

Таргет добавлен 31 библиотеке одним блоком (`dprint fmt`, `cwd` = корень библиотеки,
`cache: false`) — коммит `c2dd94ad`. `libs/admin-ui` и `libs/animatrona-types` до этого не имели
объекта `targets` вообще.

**`libs/driving-school-db` пропущена намеренно** — единственная библиотека-submodule (своя запись
в `.gitmodules`) и единственный `libs/`-путь в `excludes` корневого `dprint.json`. Таргет там был
бы гарантированным no-op, а правка `project.json` ушла бы в чужой репозиторий с отдельным
коммитом и бампом SHA. Итог: **44 из 45**.

Переформатирования не потребовалось — `dprint check` по `libs/**` зелёный и до, и после;
`nx run-many -t format --projects="libs/*"` отработал на 44 проектах с нулём изменённых файлов.

⚠️ **Грабля при массовой правке:** правка `project.json` через `json.dump` в Python испортила бы
дифф (пересериализация развернула бы однострочные массивы вроде `tags` в многострочные), поэтому
вставка сделана текстовой по анкеру `"targets": {`. Но `Path.write_text` на Windows перевёл все
31 файл в CRLF при `newLineKind: "lf"` в `dprint.json` — `dprint check` поймал это как «Text
differed by line endings», чинится прогоном `dprint fmt` по тем же файлам. Итоговый дифф — ровно
по 12 строк вставки на файл, без шума.

**По `apps/*` была та же дыра** — таргет был у 25 из 48. Закрыто тем же вечером (коммит
`13efe8f9`): добавлен 19 приложениям — 7 обычным (`animatrona-mobile`, `animatrona-tv`,
`dashboard-agent`, `form-docs`, `form-example`, `kami-key-the`, `umami`) и 12 e2e-наборам.
`apps/umami` объекта `targets` не имел вовсе. Пропущены 4 e2e-submodule (`aboi-e2e`,
`domwellbes-e2e`, `driving-school-e2e`, `studio-e2e`) по той же причине, что и
`libs/driving-school-db`. Переформатирования снова не потребовалось: `dprint check` зелёный до и
после, прогон по 19 проектам — ноль изменённых файлов.

Опасение по `form-docs/.source` (генерируемый каталог) не подтвердилось: он в `.gitignore`, а
dprint по умолчанию уважает gitignore — `output-file-paths` возвращает по нему 0 совпадений.

**Итоговое покрытие: `apps` 44/48, `libs` 44/45.** Непокрыты только 5 submodule-путей.

### ⛔ Побочная находка: `nx run-many -t format` заходит внутрь семи submodule

Замерено при этом же заходе. `excludes` в `dprint.json` сопоставляются относительно каталога
конфига (корень `letar`), а обход dprint идёт от `cwd`. Поэтому запуск **из подкаталога,
перечисленного в `excludes`, эти excludes игнорирует**:

```bash
cd apps/driving-school && dprint output-file-paths | wc -l   # 1100, а не 0
```

Семь submodule-приложений объявляют `targets.format` именно с `cwd` внутри себя — `aboi` (182
файла), `aprel8008` (58), `domwellbes` (132), `driving-school` (1100), `dsperevod` (160), `studio`
(222), `svoichuzhie` (235). Итого **2089 файлов**, до которых достаёт `nx run-many -t format` без
`--projects` — то есть ровно та команда, которую `CLAUDE.md` предписывает перед каждым коммитом.
Это тот же класс ущерба, что и инцидент 2026-08-06 выше, только через другой вход: постоянный
фикс через `excludes` закрывал прогон **из корня**, а этот путь идёт мимо.

⚠️ **Обратная сторона той же медали — мёртвый таргет.** `apps/poster-microtext-desktop` был
объявлен наоборот: запуск из корня воркспейса с явным путём в аргументе
(`dprint fmt apps/poster-microtext-desktop/**/*.{ts,tsx,json}`), без `cwd`. Корневые `excludes`
для него сработали штатно — и вырезали ровно те файлы, которые таргет должен был обрабатывать:
**0 файлов из 62**. Таргет существовал, отчитывался успехом и не делал ничего. Изначально
записан здесь как «безопасный контрпример» — формулировка была неверной, это не образец, а баг.

Отсюда следует, что для submodule-пути в корневых `excludes` у таргета `format` ровно два исхода:
либо `cwd` внутри (форматирует по-настоящему, но достижим из родительского прогона), либо запуск
из корня (excludes применяются, таргет мёртв). Третьего нет, пока путь остаётся в `excludes`.

### ✅ Решение: каждому submodule собственный `dprint.json` (2026-08-06, выбор владельца)

Из трёх вариантов (переписать семь таргетов на форму `poster-microtext-desktop` / завести каждому
submodule свой конфиг / снять submodule из `excludes`) владелец выбрал второй. Выполнено, коммит
`67dfa856` в `letar` + по коммиту в каждом из 14 submodule.

⚠️ Первый вариант оказался **не просто хуже, а вредным**, и это выяснилось уже после выбора:
он превратил бы семь работающих таргетов в семь мёртвых, ровно как у `poster-microtext-desktop`.

Все 14 (13 кодовых + `.claude/private`) получили `dprint.json`: те же три плагина тех же версий,
те же правила `typescript`/`json`/`markdown`, минус `excludes`, специфичные для монорепо. В
`excludes` каждого оставлен `.claude/worktrees` — превентивно, под сценарий «у submodule появился
собственный worktree», о котором предупреждает doc-файл.

Что получено:

- **Submodule самодостаточен.** Раньше `dprint fmt` внутри него поднимался по дереву и находил
  конфиг `letar` — форматирование работало только при работе внутри монорепо и молча меняло
  поведение при клонировании репозитория в одиночку.
- **Прогон из родителя гарантированно нулевой** — `nx run-many -t format` по семи
  submodule-приложениям после правки даёт ноль изменённых файлов (проверено).
- **У каждого submodule появилось место для своих `excludes`.**

⛔ **Чего решение НЕ дало:** запись в чужое рабочее дерево осталась. `nx run-many -t format` без
`--projects` по-прежнему запускает dprint с `cwd` внутри семи submodule — просто теперь без
изменений.

### ✅ Остаток закрыт хуком, а не конфигом (2026-08-06, коммит `03d9c29d`)

Переписать семь таргетов на запуск из корня было нельзя — это сделало бы их мёртвыми (разбор
`poster-microtext-desktop` выше). Поэтому остаток закрыт на уровне команды: правило в
`.claude/hooks/validate-bash.js`, который уже висел на `PreToolUse: Bash` рядом с блокировками
разрушительных git-операций. Блокируются две формы:

1. **`nx run-many -t format` без `--projects`/`--exclude`** — единственная, которая дотягивается
   до submodule.
2. **Встроенная команда Nx для форматирования** (та, что без `run-many`) — второй вектор §32: она
   запускает Prettier мимо dprint. Отдельно опасна тем, что `.prettierrc` из репозитория удалён,
   значит Prettier отработал бы на дефолтах и по **всему** репозиторию, а не по одному проекту,
   как в инциденте с 480 файлами.

Не блокируются: форма `:check` (не пишет), одиночный `nx run <проект>:format`, прямой вызов
`dprint`. Законный путь для прогона по всему публичному репо — `dprint fmt` из корня, у него
`cwd` в корне и `excludes` работают.

⚠️ **Правила привязаны к позиции команды** (начало строки, после `&&`/`||`/`;`/`|`), а не ищутся
по всей строке. Без якоря хук блокирует сам себя: обе команды постоянно встречаются в тексте — в
сообщениях коммитов через heredoc, в документации, в `echo`. Наступили дважды за одну сессию,
пока писали само правило. Проверено таблицей из 35 случаев (11 блокируемых, 19 проходящих,
5 на регрессию старых правил). У старых правил хука якоря нет — там ложная блокировка сочтена
меньшим злом, чем пропуск разрушительной операции.

**Побочно починен `apps/poster-microtext-desktop`** (коммит `4dc69b3` в его репозитории,
указатель — `e3ea8084`): таргет приведён к форме с `cwd`, охват 0 → 62 файла. Прогон изменений
не дал, содержимое и так соответствовало стилю.

**Условия правки были идеальными и это проверялось до неё:** все 14 submodule на `main`, с чистым
рабочим деревом, в синхроне с upstream (`0/0` ahead/behind). Ни одного случая смешения с чужой
работой — в отличие от инцидента с `domwellbes` выше.

**Побочно найден дрейф в `apps/studio`** — `time-entries-table.tsx` разошёлся с dprint после
массового прогона: коммит `3729ca3` (недельный вид журнала времени) внёс многострочный
JSX-комментарий в форме `{/* ... */}`, которую dprint раскладывает в `{ /* ... */ }` с отдельными
строками под скобки. Дрейф **пре-существующий, не от заведения конфига**: проверено сравнением —
корневой и новый конфиг дают на этом файле одинаковый вывод (159 строк, exit 20 в обоих).
Закоммичен отдельным `style`-коммитом `294a005` в репозитории studio, до конфига.

Документировано в
[dprint-worktree-submodule-scope.md](/.claude/docs/dprint-worktree-submodule-scope.md) и
предупреждением в `CLAUDE.md` рядом с предкоммитной командой.

---

## §33 — SEO-фундамент: гейт индексации по домену не зашарен, у трети приложений нет `robots.ts` 🟡 ЧАСТИЧНО (2026-08-06)

> Добавлено 2026-07-28 (сессия archetest). Обнаружено при разборе техдолга: у `archetest`
> не оказалось ни `robots.ts`, ни `sitemap.ts`, ни `metadataBase` — при том что приложение
> идёт на фестиваль как B2B-демо, а его главная страница для психологов до v0.24.0 вообще
> не имела собственных метаданных. Проверка по монорепо показала, что это не единичный случай.

### Часть A — `isProductionDomain()` пора в `libs/`

Ловушка **`NODE_ENV === 'production'` на staging** ловилась в монорепо уже дважды и записана
в [env-files](/.claude/rules/env-files.md): `next build` выставляет `production` в любом
окружении, поэтому проверка не отличает staging от прода. Последствия разные — от открытой
индексации тестового домена до дев-бэкдоров.

Правильный гейт — сверка `NEXT_PUBLIC_BASE_URL` с боевым доменом. **Рабочая реализация уже
написана в одном из приложений** (`isProductionDomain()` рядом с SEO-хелперами; конкретный
путь и домен — в [приватном журнале](/.claude/private/PLAN-JOURNAL.md), домены коммерческих
приложений в публичный репозиторий не выносятся). Она локальна, захардкожена на свой домен
и остальным приложениям недоступна — каждое решает заново или не решает вовсе.

В `archetest` эта задача осталась **незакрытой именно из-за отсутствия общего механизма**:
домен приложения живёт только в незакоммиченном `.env.docker`, вписать его в код публичного
репозитория нельзя, а городить третью локальную копию функции ради одного приложения — значит
закрепить проблему. Записано в его техдолг как «staging индексируется наравне с продом».

**Предлагается:** `libs/seo` с `getBaseUrl()` / `isProductionDomain(productionUrl)`, где боевой
домен приходит параметром или из переменной окружения. Тогда приложение из публичного репо
получает гейт, не раскрывая домен в коде.

### Часть B — аудит `robots.ts` / `sitemap.ts`

Из 23 приложений с `src/app/` **у десяти нет ни того, ни другого**: `animatrona-tracker`,
`auth-hub`, `dashboard`, `form-develop-app`, `form-docs`, `form-example`,
`kami-key-the-landing`, `synth`, `time` и одно приватное (список — в приватном журнале).

Отсутствие бьёт **в обе стороны** и по-разному:

- **Закрытые панели** (`auth-hub`, `dashboard`) — здесь важнее `robots.ts` с `Disallow: /`,
  чем sitemap: сейчас ничто не мешает краулеру обходить страницы авторизации и админки.
- **Публичные лендинги** (`kami-key-the-landing`, `synth`, `time`) — наоборот, теряют sitemap
  и hreflang, то есть переводы конкурируют друг с другом как дубли.

⚠️ Отсутствие `metadataBase` — отдельный тихий дефект: без него Next.js строит OpenGraph-ссылки
и canonical **относительными**, и соцсети их не резолвят. Проверять вместе с robots/sitemap,
он не виден до попытки расшарить ссылку.

**Образец для тиража** — `archetest` (v0.25.2, публичное приложение, смотреть можно свободно):
`src/app/robots.ts`, `src/app/sitemap.ts` с `alternates.languages` на обе локали,
`metadataBase` в `[locale]/layout.tsx`, `noindex` приватных разделов через `layout.tsx`
(в клиентском компоненте `metadata` объявить нельзя — это отдельные грабли).

### Что сделать

1. Вынести `getBaseUrl()` / `isProductionDomain()` в `libs/seo`, перевести на неё приложение,
   где функция уже написана (не ломая его поведение).
2. Закрыть `archetest` — гейт индексации по домену, вместе с решением Kami, где держать
   список продакшен-доменов.
3. Пройти по десяти приложениям без `robots.ts`: закрытым — `Disallow: /`, публичным —
   robots + sitemap + `metadataBase` по образцу `archetest`.
4. Проверить `metadataBase` у тех, где robots/sitemap уже есть — его отсутствие они
   не подсвечивают.

### ✓ DoD §33

- [x] `libs/seo` существует, `isProductionDomain()` не продублирована — `aboi` переведён,
      функция теперь только там (обёртка с зафиксированным `PRODUCTION_URL`)
- [ ] Ни одно приложение не решает «прод или нет» через `NODE_ENV` — проверено только для
      9 приложений из этого захода, остальной монорепо не аудирован
- [ ] У каждого приложения с публичными страницами есть `robots.ts`, `sitemap.ts`, `metadataBase`
      — 6 из 10 закрыто (см. ниже), 4 остались
- [x] Закрытые панели отдают `Disallow: /` — `auth-hub`, `dashboard`, `form-develop-app`
- [ ] `noindex` для приватных разделов внутри публичных приложений — не сделано нигде (`time`
      получил только `disallow` в `robots.ts` для `/profile`/`/sign-in`/`/unsubscribe`, это
      не то же самое, что `noindex` в самой странице — краулер, зашедший по внешней ссылке
      в обход `robots.txt`, всё равно проиндексирует)
- [ ] Staging-домены не индексируются — гейт `isProductionDomain()` в коде, но **не проверено
      живым запросом** `/robots.txt` ни на одном staging-домене в этой сессии

### Что сделано (2026-08-06)

- [x] `libs/seo` (`@letar/seo`) — `getBaseUrl(productionUrl)`/`isProductionDomain(productionUrl)`,
      домен передаётся параметром (библиотека публичная, домены коммерческих приложений в неё
      не попадают). 7 unit-тестов, typecheck/lint зелёные.
- [x] `aboi` (`src/lib/seo.ts`) переведён на `@letar/seo` — старые `getBaseUrl()`/
      `isProductionDomain()` теперь тонкие обёртки с захардкоженным `PRODUCTION_URL`, вызовы в
      `robots.ts`/`[locale]/layout.tsx` не менялись. JSON-LD функции (`productJsonLd` и т.п.)
      остались в приложении — они специфичны для одного магазина, не общий код.
- [x] Закрытые панели получили безусловный `Disallow: /`: `auth-hub`, `dashboard`,
      `form-develop-app` (песочница для разработки форм — тоже не публичный контент).
- [x] Публичные приложения переведены на `@letar/seo` + собственный `robots.ts`:
      `kami-key-the-landing` (+ `sitemap.ts`, `metadataBase` уже был), `time` (+ `sitemap.ts` на
      всех 40 локалей, **найден и починен реальный баг** — `robots: { index: true, follow: true }`
      было захардкожено безусловно, staging индексировался наравне с продом), `synth`
      (+ `sitemap.ts`, `metadataBase` уже был), `form-docs` (+ `metadataBase`, без `sitemap.ts` —
      см. ниже), `form-example` (+ `sitemap.ts` на 47 статических маршрутов, + `metadataBase`).
- [ ] **Не сделано намеренно, требует решения владельца:** `animatrona-tracker` (веб-платформа
      с каталогом/плеером — неясно, задумана ли публичная индексация каталога или всё за
      авторизацией) и приватное приложение из исходного замера (не указано публично, см.
      приватный журнал) — индексационная политика не техническая, а продуктовая развилка,
      гадать не стал.
- [ ] **Не сделано, отдельная задача:** `sitemap.ts` для `form-docs` — страницы приходят из
      Fumadocs source API (десятки MDX под `content/docs/guides/`, RU+EN), а не из статического
      списка путей как везде — нужно отдельное исследование его page tree API, не тривиальная
      правка по образцу.
- [ ] **Не проверено:** живой `curl /robots.txt` на staging ни одного из переведённых
      приложений — гейт `isProductionDomain()` проверен только unit-тестами библиотеки, не в
      реальном staging-окружении.
- [ ] Остальные приложения монорепо (кроме этих 10 и `archetest`-образца) не аудировались на
      предмет `NODE_ENV`-ловушки индексации — исходный аудит §33 покрывал только `src/app/` без
      `robots.ts`/`sitemap.ts`, есть шанс, что где-то `NODE_ENV`-паттерн используется даже при
      наличии `robots.ts`.
- [ ] `nx build` не прогонялся для всех 9 приложений — `time`/`kami-key-the-landing` собраны
      полностью успешно; `synth`/`auth-hub`/`aboi`/`form-example` падают на **досессионных**
      несвязанных проблемах (композитный `tsc --build` в `synth`, БД/env в `form-example`/
      `auth-hub`, filesystem-трейсинг image-upload в `aboi`) — воспроизведено с полностью
      откаченными моими правками, подтверждено что не я их вызвал; `typecheck:tsgo`/`lint`
      точечно по своим файлам — зелёные везде.

---

## §34 — Автоподбор порта в `new-app` всегда выдавал 3000 ✅ ЗАКРЫТО (2026-07-29)

> Добавлено 2026-07-29. Обнаружено при генерации нового приложения без явного `--port`:
> сгенерированная `.env` получила `PORT=3000` вместо следующего в ряду 3xxx.

### Причина

`resolveNextPort()` стартовал с 3000 и возвращал **первую дырку** в последовательности:

```ts
let port = 3000
while (usedPorts.has(port)) port++
```

Порт 3000 в монорепо не занят никем — его намеренно обходят, это дефолт `next dev` без `-p`.
Цикл завершался на первой итерации, и генератор выдавал 3000 при любом составе `apps/`.
Скан `.env` при этом работал: гипотезы про submodule, порядок записи в Tree и регулярку —
все мимо, ошибка была в самой политике выбора.

Существующий unit-тест это маскировал: он писал `PORT=3000` + `PORT=3001` и ждал 3002 —
конфигурация, которой в реальном репозитории не бывает. **Урок для тестов на генераторы:
фикстура должна повторять форму реальных данных, а не удобную для проверки.**

Побочно нашлась вторая дыра: скан только `apps/*/.env` не видел занятыми порты лендингов
(`next dev -p <порт>` в `project.json`) и приложений, у которых `PORT` лежит лишь в `.env.local`.
Она не проявлялась только потому, что максимум ряда сейчас держит приложение с `.env`.

### Что сделано

1. `libs/generators/src/utils/ports.ts` — общий утиль `collectAppPorts` / `resolveAppPort` /
   `resolveNextFreePort`. Сканирует `.env`, `.env.local` и `-p`/`--port` в `project.json`,
   фильтрует диапазон 3000–3999 (иначе в занятые попадает `react-native start --port 8083`),
   якорь `^PORT=` с флагом `m` не ловит `SOCKET_PORT=`.
2. `new-app`: порт = `max(занятые) + 1`, нижняя граница 3001 — 3000 не выдаётся никогда.
3. `e2e-suite` переведён на тот же утиль: раньше он падал на приложениях, задающих порт
   в `project.json` («не удалось определить dev-порт»).
4. 16 unit-тестов на утиль + 3 новых на генератор; README библиотеки и
   `.claude/commands/create/new-app.md` приведены в соответствие с поведением.

### ✓ DoD §34

- [x] `new-app` без `--port` продолжает последовательность, а не откатывается в начало
- [x] 3000 не выдаётся ни при каком составе `apps/`
- [x] Занятыми считаются порты из `.env`, `.env.local` и `project.json`
- [x] `nx test generators` зелёный (52 теста), `lint` + `typecheck` зелёные
- [x] Проверено `--dry-run` на реальном репозитории — порт подобран как следующий в ряду

---

## §34.1 — Смежные находки того же захода ✅ ЗАКРЫТО (2026-07-29)

> Три находки, всплывшие при разборе §34. Применены по прямой просьбе владельца в той же сессии.

### 1. Четыре генератора повторяли один пролог

`toDisplayName()` был написан дважды символ в символ (`new-app`, `electron-app`), а
`fileURLToPath(new URL('.', import.meta.url))` и проверка «проект уже существует» — во всех
четырёх генераторах.

Вынесено в `libs/generators/src/utils/`: `naming.ts` (`toDisplayName`, `toCamelCase`),
`tree.ts` (`templatesDirFor(import.meta.url)`, `assertTargetIsFree(tree, dir, kind)`).
Все четыре генератора переведены, тексты ошибок сохранены. Раздел «Разработка нового генератора»
в README библиотеки теперь перечисляет утили — чтобы дубли не отросли заново.

### 2. Инструкция вела к несуществующей таблице портов

`.claude/commands/create/new-app.md` требовал «добавь новое приложение в таблицу портов
в `CLAUDE.md`». Такой таблицы нет — шаг молча не выполнялся годами.

Ручную таблицу решено **не заводить** (протухнет так же): в
[environment.md](/.claude/docs/environment.md) добавлен раздел «Dev-порты приложений» —
три места, где реально живёт порт, и однострочник, собирающий занятые порты из файлов.
Мёртвый шаг в команде заменён ссылкой на него.

### 3. `env-files.md` описывал желаемое как действительное

Правило «в `.env` только порт» не упоминало, что девять приложений `.env` не имеют вовсе.
Именно это расхождение и породило §34. В правило добавлен блок «Правило описывает желаемое,
а не текущее состояние» с требованием: код, которому нужен порт, обязан проверять все три места.
Лендинги задним числом не переводились — расхождение зафиксировано, а не залечено.

### ✓ DoD §34.1

- [x] `toDisplayName` существует в одном экземпляре, генераторы используют общие утили
- [x] `nx test generators` зелёный (62 теста), `lint` + `typecheck` зелёные
- [x] Ни одна инструкция не ссылается на несуществующую таблицу портов
- [x] Три источника dev-порта задокументированы в правиле и в docs

---

## §34.2 — Порт разъезжается между тремя потребителями; submodule без `.gitignore` ✅ ЗАКРЫТО (2026-07-29)

> Продолжение §34/§34.1 той же ночи. §34.1 задокументировал три места, где приложение
> **объявляет** порт. Здесь выяснилось, что есть ещё два места, где порт **потребляют**, и они
> расходятся с объявлением молча.

### 1. Дрейф dev-порта между источниками

Кроме `.env`/`.env.local`/`project.json` порт продублирован в `.claude/commands/<app>.md`
(строка `**Порт:**`, её читает агент) и в `redirectUrls` OIDC-клиента в
`apps/auth-hub/prisma/seed.ts` (по нему Better Auth валидирует redirect при локальном входе).
Ни один источник не читает остальные.

Расхождение не проявляет себя там, где возникло: приложение поднимается штатно, командный файл
просто врёт, а вход по OIDC падает с `invalid redirect_uri` — далеко от места правки и **только
локально**, поэтому на прод не выходит и живёт месяцами.

Сверка найдена не гипотезой, а замером: при первом же прогоне всплыли **три** расхождения в двух
приложениях, причём одно из них (командный файл Ключницы: 3010 против реальных 3014) до этого не
подозревал никто — вход в саму Ключницу через её же командный файл не идёт, врать она могла вечно.

**Что сделано.** `libs/infra-config/src/app-ports.ts` — сбор объявлений из всех источников и поиск
расхождений; `app-ports.guard.spec.ts` читает **реальный** монорепо и падает с именем виноватого
файла (`nx test infra-config`). Логика разбора покрыта отдельно, на синтетическом воркспейсе во
временном каталоге — по уроку §34 («фикстура повторяет форму реальных данных»): на живом репо
большинство веток парсера просто не встречается.

Библиотека выбрана по прецеденту: `@letar/infra-config` уже держит guard-тест против дрейфа
локальной копии `server-config.ts` в `dashboard-agent`. Это тот же класс задачи.

⚠️ **Правка seed не действует сама по себе.** Локальные приложения ходят в **прод**-Ключницу,
поэтому `localhost`-адрес должен лежать в боевой БД — нужен re-seed через `deploy_app(seed: true)`.
Guard об этом пишет прямо в тексте падения, чтобы следующий не потратил час на «я же исправил».

Парсер портов при этом продублирован с `libs/generators/src/utils/ports.ts` — почему это осознанно
и почему не схлопывается, см. пункт 4 ниже.

### 2. Приватный submodule без своего `.gitignore`

Корневой `.gitignore` монорепо на вложенный независимый репозиторий **не действует** — submodule
видит только собственный, а у свежесозданного его нет. Первый же `git add .` уносит `node_modules/`,
`.next/`, `dist/`, `*.tsbuildinfo` в initial commit. Поймано на живом примере: новое приватное
приложение утащило `dist/tsconfig.tsbuildinfo`.

**Что сделано.** `new-app --private` кладёт `.gitignore` из отдельного каталога шаблонов
`files-private/` (публичным приложениям он не нужен — их закрывает корневой репо, и два теста
фиксируют обе стороны). Правило и образец — в [git.md](/.claude/rules/git.md), перекрёстная
ссылка — в [repo-structure.md](/.claude/docs/repo-structure.md). Единственному submodule, у
которого файла не было, он заведён.

Заодно в `.claude/commands/create/new-app.md` записан обход `Device or resource busy` на Windows
при `rm -rf apps/<name>` (шаг переноса в submodule): папку держит Nx-демон, `nx reset` помогает
не всегда — надо удалять содержимое, потом `rmdir`.

### 3. `git commit -- <путь>` после `git rm --cached` возвращает файл

Коммит с pathspec берёт содержимое **рабочей копии**, а не индекса, поэтому связка «убрать из
индекса → закоммитить по пути» отменяет саму себя. Обнаружено при попытке выкинуть закоммиченный
`dist/` — удаление молча не применилось, заметил только повторной проверкой `git show --stat`.

Записано в [git.md](/.claude/rules/git.md) с оговоркой: правильный способ требует голого
`git commit` без путей, что прямо противоречит правилу «коммить только свои пути». Исключение
действует **только внутри submodule**, где кроме тебя никто не работает.

### 4. Дублирование парсера портов схлопнуть нельзя — проверено запуском (2026-07-29)

Разбор `.env`/`project.json` (регулярки `ENV_PORT_PATTERN`, `CLI_PORT_PATTERN`, функция
`extractPorts`) лежит в двух экземплярах: `libs/generators/src/utils/ports.ts` (поверх виртуального
Nx `Tree`) и `libs/infra-config/src/app-ports.ts` (поверх реального диска). Напрашивается вынести
общее ядро в `infra-config` и импортировать его из генератора. **Проверено — не выходит.**

**Что даёт запуск.** Достаточно добавить в `ports.ts` строку `import { getServerForApp } from
'@letar/infra-config'` и вызвать любой генератор:

```
NX  Cannot find module '@letar/infra-config'
Require stack:
- C:\web\letar\libs\generators\src\utils\ports.ts
- C:\web\letar\libs\generators\src\generators\new-app\generator.ts
- ...\nx\dist\src\plugins\js\utils\register.js
- ...\nx\dist\src\project-graph\plugins\transpiler.js
```

**Почему.** Две независимые причины, каждой хватает по отдельности:

1. `node_modules/@letar/` в этом воркспейсе **не существует вообще** — bun не раскладывает
   workspace-пакеты симлинками (проверено: в `node_modules` есть `@nx`, `@chakra-ui`, `@zenstackhq`
   и прочие, `@letar` — нет). Обычный CJS-резолв найти пакет физически не может.
2. Nx грузит локальный плагин через `project-graph/plugins/transpiler.js`, который регистрирует
   `tsconfig-paths` против **корневого** `tsconfig.base.json` (в коде — жёсткий список
   `tsconfig.base.json` → `tsconfig.json` из корня воркспейса, `tsconfig` самой библиотеки не
   участвует). А в `tsconfig.base.json` `paths` для `@letar/*` нет — резолв в монорепо построен на
   `exports` в package.json + `customConditions: ["@letar/source"]`, что работает для TS и
   бандлеров, но не для рантайм-`require` внутри Nx.

⚠️ **Типами это не ловится.** `typecheck`/`typecheck:tsgo` на таком импорте зелёные — TS резолвит
через `exports`+`customConditions`, а падает только рантайм загрузки плагина. Проверять здесь можно
исключительно реальным `nx g ... --dry-run`.

**Единственный сработавший обход — и почему он не взят.** Если добавить в `tsconfig.base.json`

```jsonc
"paths": { "@letar/infra-config": ["libs/infra-config/src/index.ts"] }
```

импорт начинает резолвиться, генератор отрабатывает штатно (проверено: `new-app` выдаёт тот же
порт 3026, что и до правки). Но цена — ввести в корневой конфиг **вторую, параллельную** схему
резолва `@letar/*` вдобавок к `exports`+`customConditions`, на которой стоит весь монорепо, и
распространить её на все проекты, наследующие `tsconfig.base.json`. Ради дедупликации ~15 строк
регулярок это несоразмерно, поэтому обход отклонён, а `tsconfig.base.json` оставлен нетронутым.

**Отклонённые альтернативы.** Относительный импорт через границу библиотек
(`../../../infra-config/src/...`) ломает `rootDir: "src"` в `tsconfig.lib.json` генератора и
запрещён правилом `@nx/enforce-module-boundaries` (включено в корневом `eslint.config.mjs`).
Обратное направление (ядро в `generators`, импорт из `infra-config`) затащило бы `@nx/devkit` в
рантайм `deploy-mcp`, который тянет `infra-config`.

**Что сделано вместо этого.** Дублирование остаётся осознанным, но синхронность больше не держится
на комментарии «меняй оба файла»: `libs/infra-config/src/port-parser.guard.spec.ts` вычитывает оба
файла **текстом** и сверяет литералы `ENV_PORT_PATTERN`/`CLI_PORT_PATTERN` вместе с флагами.
Текстом, а не импортом, по той же причине, по которой не выходит дедупликация — `@letar/generators`
отсюда так же не резолвится; тот же приём уже применён в `app-ports.ts` к `seed.ts` Ключницы. Это
третья копия паттерна «не можем импортировать — сторожим копию тестом» после `server-config.ts` в
`dashboard-agent` и сверки портов из п.1.

Падение называет оба файла и оба значения. Отдельная ветка ловит переименование/переезд константы,
чтобы тест не позеленел молча на сравнении двух `undefined`. Обе ветки проверены живым дрейфом.

⚠️ **Границы диапазона портов guard намеренно не сверяет.** Они записаны в двух файлах по-разному:
в `generators` `MIN_DEV_PORT` = 3001 — нижняя граница **выдачи** порта новому приложению, а нижняя
граница **разбора** зашита там литералом 3000; в `infra-config` `MIN_DEV_PORT` = 3000 и означает
именно границу разбора. Сверка одноимённых констант дала бы ложное падение. Тело `extractPorts`
тоже не сверяется — нормализованное сравнение исходников ломается от правки комментариев и
форматирования. Оба пробела записаны в шапке теста, чтобы следующий не «починил» их в ложный красный.

### ✓ DoD §34.2

- [x] Дрейф порта ловится автоматически (`nx test infra-config`), сообщение называет файл
- [x] Guard проверен на живом дрейфе — временно возвращённое старое значение роняет тест
- [x] Найденные три расхождения исправлены в источниках
- [x] `new-app --private` кладёт `.gitignore`; обе стороны поведения покрыты тестами
- [x] Обе git-грабли записаны в правило, а не только в переписку
- [x] Схлопывание дублированного парсера портов проверено реальным запуском генератора и отклонено
      с записанной причиной (пункт 4) — чтобы следующий не проверял это заново
- [x] Расхождение регулярок между двумя копиями парсера ловится автоматически
      (`port-parser.guard.spec.ts`), обе ветки падения проверены живым дрейфом
- [x] `nx test infra-config` (24) и `nx test generators` (64) зелёные, `lint` + `typecheck` зелёные
- [ ] ⏳ Re-seed прод-Ключницы — запрошен у BlackCove (тред `deploy-auth-hub-studio-redirect-3024`),
      до него локальный вход в приложение, менявшее порт, по-прежнему не работает

---

## §34.3 — Доки вели к мёртвому `/sync-env`; таблицы-слепки протухли ✅ ЗАКРЫТО (2026-07-29)

> Всплыло при попытке задеплоить правку §34.2: BlackCove остановил деплой, не найдя секрета
> в `.env.docker` на сервере. Секрет всё это время лежал в git.

### 1. Переход на SOPS был завершён, а документация — нет

Тираж SOPS + age закончен: **все 23** приложения с `.env.docker` имеют закоммиченный `.enc`,
plaintext-only не осталось ни одного. Но девять мест в `.claude/**` продолжали вести к
`scripts/sync-env-docker.sh` — доставке `.env.docker` по SSH.

Путь не просто лишний, а вводящий в заблуждение. Плейнтекст на сервере — **производный
артефакт**: `deploy-affected.sh` вызывает `decrypt_sops_env()` на каждом прогоне и
перезаписывает его расшифровкой `.enc`. Всё, что залито по SSH, затирается следующим деплоем.
Вдобавок скрипт ходит на s1 (выведен 2026-06-20) и перечисляет приложения, удалённые 2026-07-05.

**Цена расхождения в этот раз:** деплой Ключницы остановлен на «отсутствующем»
`OIDC_APREL8008_SECRET`, которого не было в серверном плейнтексте, но который лежал в
закоммиченном `.enc` с момента регистрации клиента. Дополнительный риск — попытка «починить»
недостающий секрет генерацией нового: секрет OIDC-клиента общий для Ключницы и приложения, новый
ключ ломает вход. Проверка отпечатком показала, что значения на обеих сторонах совпадают, то есть
чинить было нечего.

**Что сделано.** Девять файлов переведены на цикл `sops <файл>.enc` → `git commit` →
deploy-request. Команда `/sync-env` переписана в предупреждение с правильным путём (удалять не
стали: по привычке её всё ещё вызывают, и лучше получить объяснение, чем 404). В
`sync-env-docker.sh` добавлен стоп-guard — запуск только с `FORCE_LEGACY_SYNC=1`, иначе отказ с
объяснением; в `pull-env-docker.sh` — пометка, что локальный `.env.docker` восстанавливается из
`.enc` без обращения к серверу. В правило и в docs записан диагностический урок: **отсутствие
переменной на сервере обычно означает отставший checkout, а не потерянный секрет.**

### 2. Третья за две сессии протухшая ручная таблица

- `secret-manager.md` — таблица статуса «auth-hub ✅ / остальные ⏳» отражала состояние пилота
  (Этап 0.4) и врала с тех пор, хотя тираж давно закончен.
- `deployment-assistant/SKILL.md` — таблица портов разошлась с каноном
  (`apps/dashboard/prisma/seed.ts`) по **семи** позициям, а не только по двум удалённым
  приложениям: лишний `animatrona-web` на чужом порту, `aboi` 3019 вместо 3018, **перепутанные
  местами домены `form-docs` и `form-example`** (по такой таблице proxy host уводит трафик не
  туда), отсутствовали четыре приложения. Таблица uploads знала 4 строки при реальных 8, из них
  2 — про удалённые приложения.

**Что сделано.** Статус-таблица заменена проверочной командой. Таблицы портов и uploads сверены
построчно с каноном и помечены как слепок с датой, указанием источника истины и командой
перепроверки.

**Наблюдение для будущего.** Это третий случай подряд (§34.1 — несуществующая таблица портов,
§34.2 — дрейф порта, здесь — сразу две). Ручная таблица, дублирующая данные из кода, протухает
молча и всегда. Рабочих исхода два: либо заменять её командой, либо оставлять со ссылкой на
канон — но тогда лучше сразу думать, нельзя ли вместо этого поставить guard-тест, как в §34.2.

### ✓ DoD §34.3

- [x] Ни один живой док не ведёт к `sync-env` как к рабочему пути
- [x] Случайный запуск `sync-env-docker.sh` останавливается с объяснением
- [x] Правильный цикл (правка `.enc` → коммит → деплой) описан в правиле, docs и команде
- [x] Записан диагностический урок про «переменной нет на сервере» и запрет на перегенерацию
      общего OIDC-секрета
- [x] Таблицы портов и uploads сверены с каноном; протухшая таблица статуса удалена
- [ ] ⏳ Проверить, существует ли клиент `aprel8008-prod` в боевой `oauthApplication` — если seed
      с его секретом никогда не отрабатывал, SSO-вход в админку aprel8008 сломан (запрошено у
      BlackCove)

---

## §35 — Присмотреться к Rust-версии MCP Agent Mail (2026-07-29)

Сейчас координация агентов работает через `ghcr.io/dicklesworthstone/mcp_agent_mail` (Python,
FastMCP + Git + SQLite), контейнер `mcp_agent_mail-agent-mail-1`, порт 8765. Образ сверен с
апстримом 2026-07-29 — актуален (тег `latest` собирается не на каждый коммит, а на релизы).

У того же автора есть Rust-переписывание — `mcp_agent_mail_rust`: 34 инструмента (paritet с
Python), TUI-консоль, hybrid search, build slots, Product Bus (кросс-проектная координация через
`ensure_product`/`products_link`/`fetch_inbox_product` — агрегация inbox/поиска между разными
`project_key`, с contact handshake вместо файловых резерваций между проектами). Данные совместимы
(`.beads/issues.jsonl`), заявлена миграционная skill для CLI.

**Статус на 2026-07-29:** активность выше (пуш вчера против 20 дней у Python-версии), но 14
открытых issues против 2 — сырее. Переезд пока не даёт ощутимого выигрыша для текущего масштаба
(один активный проект `letar` + submodule'ы внутри него, кросс-репо координация не нужна).

**Что сделать:** периодически проверять зрелость (issues, релизы, стабильность TUI) и вернуться к
вопросу, когда появится реальный кросс-репо сценарий (например координация `letar` с полностью
отдельным репозиторием) или когда откроется issue-трекер Rust-версии станет чище.

---

## §36 — GitHub Releases API написан дважды, а фильтр по префиксу тега нужен обоим ✅ ЗАКРЫТО (2026-08-06)

Найдено при планировании браузерного демо Aira.

Два лендинга независимо реализуют одно и то же:

| Файл                                                                                    | Строк | Чего больше                                                                |
| --------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------- |
| [apps/aira-web/src/lib/github.ts](/apps/aira-web/src/lib/github.ts)                     | 176   | разбор архитектуры (`x86_64`/`aarch64`) и вида ассета (installer/portable) |
| [apps/animatrona-landing/src/lib/github.ts](/apps/animatrona-landing/src/lib/github.ts) | 184   | разбор release notes, отдельная обработка macOS                            |

Совпадает почти весь каркас: запрос к `api.github.com/repos/.../releases`, заголовок с
`GITHUB_TOKEN`, ISR `next: { revalidate: 3600 }`, подбор ассета под платформу, человекочитаемый
размер файла. Одно и то же названо по-разному: `formatSize` против `formatFileSize`,
`findAsset` против `findAssetForPlatform`. Общий экспорт ровно один — `getLatestRelease`.
`apps/dashboard/src/lib/github-actions.ts` сюда не относится: это Actions, а не Releases.

**Почему сейчас, а не «когда-нибудь».** Решение «релизы desktop-приложений публикуются из монорепо
`letar` по тегу `<app>-v*`» означает, что репозиторий релизов становится общим для нескольких
продуктов. Значит **обоим** лендингам придётся добавить фильтр по префиксу тега — иначе лендинг
покажет релиз чужого приложения. Эту работу всё равно надо делать в двух местах, и это подходящий
момент вынести общее.

**Что предлагается:** `libs/github-releases` → `@letar/github-releases`. Внутри: запрос с ISR и
токеном, **фильтр по префиксу тега**, разбор ассетов (платформа × архитектура × installer/portable),
формат размера. Специфику оставить в приложениях: разбор release notes у Animatrona, свои ярлыки
платформ у Aira. Не тащить в либу то, что нужно одному потребителю.

⚠️ Учесть при переносе: у Aira релизы остаются в **отдельном** репозитории `kamiletar/aira`
(самостоятельный OSS-проект со своим потоком релизов) — либа обязана поддерживать и «свой репо без
фильтра», и «общий репо с фильтром по префиксу».

### Что сделано (2026-08-06)

- [x] `libs/github-releases` (`@letar/github-releases`) — `fetchLatestRelease`/`fetchReleases`
      (ISR+токен, фильтр по `tagPrefix` через листинг `/releases` — `/releases/latest` не умеет
      фильтровать по тегу), `formatFileSize`. 7 unit-тестов (мокнутый `fetch`), `nx test/lint/
      typecheck:tsgo` зелёные.
- [x] Оба приложения переведены на общий фетчер, **специфика оставлена как и планировалось**:
      разбор ассетов по платформе/архитектуре/installer-vs-portable — свой у `aira-web`
      (`parseAsset`/`findAsset`/`findAssetByKind`), разбор release notes и `.exe`/`.dmg`/
      `.AppImage`-паттерны — свои у `animatrona-landing`. Публичный API обоих `src/lib/github.ts`
      не менялся (те же имена экспортов), чтобы не трогать компоненты-потребители
      (`hero.tsx`/`download-section.tsx`/`page.tsx`/`downloads-section.tsx`).
- [x] `nx build` обоих приложений — зелёный; `animatrona-landing` во время сборки реально дошёл
      до `api.github.com` через новый общий фетчер (страница `/` использует ISR, ошибок не было).
- [x] `tagPrefix` реализован, но **не включён** ни в одном из двух приложений — они по-прежнему
      читают из своих отдельных репозиториев (`kamiletar/aira`, `kamiletar/animatrona`), не из
      монорепо `letar`. Возможность появится сама, когда/если релизы desktop-приложений реально
      переедут на теги `<app>-v*` в `letar` — эта миграция сама по себе не входила в §36.
- [ ] `apps/animatrona-landing/src/lib/github.ts`: типы `getLatestRelease`/`getAllReleases`
      кастуются из узкого `GitHubRelease` библиотеки в собственный широкий `Release`
      (`id`/`name`/`html_url`/`content_type`/`download_count` — их нет в типе библиотеки, но они
      есть в реальном JSON от GitHub, так что каст не меняет рантайм-поведение) — решение
      сознательное (см. README библиотеки), но стоит иметь в виду при следующей правке этого файла.
- [ ] Замечена, но не тронута: `console.error` при неуспехе запроса была в оригинальном
      `animatrona-landing/src/lib/github.ts` и пропала при переходе на общий фетчер (`aira-web`
      такого логирования не имел изначально, теперь оба ведут себя как `aira-web` — тихий
      `null`/`[]`). Если пропажа логов окажется значимой, добавить `onError`-колбэк в
      `fetchReleases`/`fetchLatestRelease` библиотеки, а не возвращать её точечно в приложение.

---

## §44 — Публикация в npm открыта для публичной части монорепо; `libs/ui` к ней не готов 🆕 (2026-07-30)

Решение владельца 2026-07-30: всё, что лежит в публичной части монорепо, может выкладываться в
npm. Прежние три пакета (`@letar/forms`, `@letar/form-mcp`, `@letar/zenstack-form-plugin`) — это
было положение дел, а не запрет.

Порог входа низкий: `@letar/forms` — уже опубликованный — отдаёт **сырой TypeScript**
(`"main": "./src/index.ts"`), то есть build-таргет для публикации не нужен, потребитель
транспилирует сам. `libs/ui` внутренних `@letar/*`-зависимостей не имеет вообще.

**Что мешает опубликовать `libs/ui` прямо сейчас:** в
[libs/ui/package.json](/libs/ui/package.json) объявлена одна peer-зависимость —
`yet-another-react-lightbox`. Нет `react`, `react-dom`, `@chakra-ui/react`. Внутри монорепо это не
всплывает (один lock-файл), а внешний потребитель получит две копии React и два контекста Chakra.

**Что сделать перед публикацией любой UI-либы:**

1. Честные peer-deps на `react`, `react-dom`, `@chakra-ui/react` с диапазонами версий
2. Помнить, что сырой TS годится только потребителям со сборщиком (Next.js `transpilePackages`,
   Vite) — для голого Node такой пакет не работает
3. Осознать смену режима: у `@letar/ui` **141 потребитель** внутри монорепо. Сейчас переименование
   ловит typecheck, после публикации это breaking change по semver

Приоритет низкий: ни одна текущая задача публикации `@letar/ui` не требует. Задача существует как
подготовка, а не как блокер.

---

## §38 — Прогресс деплоя существует только как проза в логе 🆕 (2026-07-30)

Найдено в ночь инцидента с `letar-redis`, когда пришлось последовательно передеплоить четыре
потребителя Redis подряд. Проблема не в отдельном инструменте, а в том, что **у деплоя нет
машинного представления состояния** — только текстовый лог.

### Как выглядит сейчас

[`DeployStatus`](/apps/dashboard-agent/src/routes/deploy.ts) — это по сути
`{ running, exitCode, output: string[] }`. Чтобы понять «на каком мы этапе», агент обязан **читать
прозу лога**. Замер на одном деплое `kami` (2026-07-30, 6 минут):

| Проверка | `sinceLine` | Строк в контекст | Что удалось узнать   |
| -------- | ----------- | ---------------- | -------------------- |
| 1        | 0           | 243              | «идёт `next build`»  |
| 2        | 243         | 143              | «идёт rollout»       |
| 3        | 386         | 32               | готово, `exitCode 0` |

**418 строк лога, чтобы получить один бит «готово / не готово».** Курсор `sinceLine` уже спасает от
повторной выдачи — но в happy-path лог не нужен вообще.

При этом [`deploy-affected.sh`](/deploy-affected.sh) **уже печатает структурированные маркеры**:
`🔨 Building <app>`, `## rollout <app>`, `✅ [wait-healthy]`, `✅ [smoke-test]`,
`✅ [nginx-reload-2]`. Их никто не парсит. Данные есть — API их не отдаёт.

### Три связанных дефекта

1. **Нет фаз.** Состояние не структурировано, поэтому ждать нечего, кроме таймера.
2. **Строки лога не имеют времени** (`output: string[]`). Значит ни агент, ни вызывающий не могут
   сказать «вывода нет 10 минут» — залипший деплой внешне неотличим от идущего.
3. **`deploy_status` — мгновенный снапшот.** Опрос идёт по таймеру снаружи. Агенту приходится
   заводить будильник и **пересказывать себе весь список задач промптом** на каждое пробуждение;
   в ночь инцидента это один раз уже дало сбой — в цепочку уехал устаревший `deployId`.

### Что предлагается

**Этап 1 — фазы (`dashboard-agent` + `deploy-affected.sh`).** Скрипт печатает явный машинный
маркер отдельной строкой (`::phase:build:start` / `::phase:build:ok`), агент собирает
`phases: Array<{ name, startedAt, endedAt?, ok?, durationMs? }>`. Проза остаётся для человека,
массив фаз — для агентов. Бонусом из уже существующей истории (`MAX_DEPLOY_HISTORY = 20`) бесплатно
считается медиана длительности фазы **по этому приложению** → `progressHint` вида «build обычно
4.5 мин, идёт 2 мин». Пропадает нужда угадывать интервал опроса.

**Этап 2 — `deploy_wait` (long-poll).** Новый инструмент; `deploy_status` не трогать, он остаётся
дешёвым снапшотом.

```
deploy_wait({ server, deployId, waitSeconds: 300 })
```

`GET /api/deploy/wait` держит запрос открытым и **отпускает раньше** при: терминальном статусе,
смене фазы или признаке залипания. Возвращает дельту фаз + хвост лога (~20 строк), не весь лог.
Требует поднять `timeoutMs` в [`agentRequest`](/libs/deploy-mcp/src/client.ts) именно для этого
пути.

Ограничение сверху (`waitSeconds`) **и** ранний выход по залипанию закрывают риск «повиснуть
навсегда»: худший ответ — «идёт, фаза build, молчит 4 мин, порог 10», и решение принимает вызывающий.

Почему long-poll, а не SSE/webhook: транспорт — SSH-туннель к Fastify, MCP-инструмент по природе
request/response. Пуш-канал агенту физически некуда принимать.

**Этап 3 — watchdog залипания.** `lastOutputAt` + порог **на фазу** (`build` молчит 4 минуты
законно, `nginx-reload` — 5 секунд) → `stalled: true` + `stalledSince`.

⚠️ **Только сообщать, не убивать.** SIGTERM посреди `docker compose up` по ложному срабатыванию
хуже лишних пяти минут ожидания. Флаг `interrupted` (восстановление истории из Redis) уже
реализован ровно в этой философии — «исход неизвестен» честнее, чем выдуманный вердикт.

**Этап 4 — очередь на сервере (опционально).** Сейчас `isDeployRunning()` жёстко отказывает:
`Another deploy is already in progress`. Поэтому планировщиком выступает агент. С
`deploy_app({ queue: true })` → `{ queued: true, position }` многоприложенческий заход становится:

```
deploy_app A → deploy_app B (queued) → deploy_app C (queued)
deploy_wait({ queueDrain: true })   // один вызов на все три
```

Нужна политика на падение — по умолчанию `stopOnFailure: true`: если у первого упала миграция,
следующее приложение **с того же коммита** деплоить нельзя. Очередь обязана рехидрироваться из
Redis как `interrupted`, а не молча исчезать при рестарте агента.

### Чего делать НЕ надо

- **Авто-kill по залипанию** — см. выше.
- **Авто-rollback.** Настоящая страховка уже есть и работает: rollout делает реальный HTTP
  smoke-тест **до** переключения nginx, плюс rollback-тег образа (`<app>:<sha>`). Авто-rollback по
  таймауту будет стрелять по ложным срабатываниям и ломать успешные деплои.
- **Стримить полный лог в контекст.** Курсор `sinceLine` — правильная идея; цель в том, чтобы в
  happy-path лог не читался вообще.

### Приоритет

Этапы 1–2 — фактически одно изменение (ждать надо _чего-то_), самый большой выигрыш. Этап 3 мелкий,
но именно он делает ожидание безопасным. Этап 4 нужен только в дни массового передеплоя.

**Обходной приём до реализации:** `deploy_status({ deployId, sinceLine: 99999 })` возвращает
`output: []` и при этом честные `running`/`exitCode`/`totalLines` — дешёвая проверка «готово?» без
единой строки лога в контексте. Работает уже сегодня.

### Статус — Этапы 1–3 ✅ РЕАЛИЗОВАНЫ (2026-07-30)

- **Этап 1 (фазы):** `deploy-affected.sh` печатает `::phase:name:start/ok/fail` вокруг
  build/rollout/wait-healthy/nginx-reload; `deploy.ts` (`applyPhaseLine`) парсит эти маркеры
  **и** уже существующие `[step-id]` строки `libs/deploy-engine` (doctor/wait-healthy/
  smoke-test/nginx-reload-1/2 и т.д. — не потребовалось трогать сам `deploy-engine`) в
  `DeployStatus.phases[]`. `progressHint`/медиана длительности по истории — НЕ реализован
  (не было в скоупе делегированной задачи, только структура фаз).
- **Этап 2 (`deploy_wait`):** `GET /api/deploy/wait?deployId=&waitSeconds=` на dashboard-agent
  (`EventEmitter`, капа `waitSeconds` на 120с) + зеркальный MCP-инструмент `deploy_wait` в
  `libs/deploy-mcp` (`deploy_status` не тронут). `timeoutMs` для `agentRequest` поднимается
  на вызове (не в `client.ts` — параметр там уже был проброшен насквозь).
- **Этап 3 (watchdog):** `lastOutputAt` + `computeStalled()` с порогом молчания на текущую
  открытую фазу (`build` 5 мин, `nginx-reload` 10с, дефолт 30с) — только флаг `stalled`/
  `stalledSince` в `/api/deploy/status` и `/api/deploy/wait`, без kill процесса.
- Тесты: `apps/dashboard-agent/src/routes/deploy.spec.ts` (15 кейсов, `applyPhaseLine` +
  `computeStalled`). `dashboard-agent` 0.9.13 → 0.9.14.
- **Этап 4 (очередь на сервере) — сознательно не реализован**, как и было условлено
  (опционален, рискованнее, отдельная задача).

---

## §37 — Инцидент: `letar-redis` открыт наружу без пароля, захвачен `REPLICAOF` ✅ ЗАКРЫТО (2026-07-30)

Обнаружено при попытке владельца войти в `owner/invoices` studio: `auth.letar.best/api/auth/.well-known/openid-configuration`, `jwks`, `get-session` отдавали `500`. Локальный `auth-hub` (`nx dev`) отвечал нормально — проблема была прод-специфичной.

**Причина (нашёл BlackCove):** `letar-redis` был опубликован на `0.0.0.0:6379` без `requirepass`, `ufw` выключен. Кто-то извне выполнил `REPLICAOF` на боевом инстансе — Redis ушёл в read-only `slave`, все `setex` rate-limit записи в auth-hub (`secondaryStorage`) стали падать `READONLY`, что и давало 500 на любой роут better-auth.

**Исправлено:** `redis-cli replicaof no one` (роль master вернулась), порт `6379` больше не публикуется на хост (только `kami-network`), поставлен пароль (`openssl rand -hex 32`), все 4 потребителя (auth-hub, dashboard-agent, kami, driving-school) передеплоены с новым `REDIS_URL`. Проверка на компрометацию (crontab, `authorized_keys`, RDB save-path) — чисто, атака не пошла дальше захвата роли. Чек-лист на будущее — [.claude/docs/redis-security.md](/.claude/docs/redis-security.md).

**Тот же класс дыры нашёлся и на s3:** `e2e-redis` (порт 6380) был открыт так же — закрыт (`requirepass` + `iptables DROP` на внешнем интерфейсе). Попутно всплыло **e2e-postgres** (порт 5499) — всё ещё дефолтные `e2e`/`e2e`, ротация пароля не сделана (блэст-радиус не оценён, 9 файлов ссылаются на порт), временно смягчено тем же `iptables DROP`. Ротация credentials e2e-postgres — отдельная незакрытая задача.

**Не связанный остаточный блокер:** re-seed `studio-prod` redirectUrls (3020→3024) прогнан вместе с фиксом, но конкретно владелец после этого всё равно не смог залогиниться в `owner/invoices` — причина не установлена, см. `apps/studio/PLAN.md` (блокер вверху файла) и `PLAN_COMPLETED.md`.

---

## §39 — Шаблон `.gitignore` для приватных submodule уже́ корневого: `uploads/` не закрыт ✅ ЗАКРЫТО (2026-08-06)

Продолжение §34.2 п.2. Там закрыли «у submodule вообще нет своего `.gitignore`» — генератор
`new-app --private` стал класть файл из `files-private/`. Но **содержимое шаблона уже́ корневого**,
и первым же разошлось `uploads/`.

Корневой `.gitignore` монорепо закрывает загруженные файлы двумя строками (`uploads/` и
`**/uploads/*`). В `libs/generators/src/generators/new-app/files-private/.gitignore.template`
их нет — есть только `node_modules/`, сборка, секреты, тесты, логи, OS. Поэтому у приватного
приложения с загрузкой файлов каталог загрузок остаётся видимым для git, и первый же `git add .`
уносит пользовательские картинки в коммит вместе с кодом.

**Замер.** Строки `uploads` нет в собственном `.gitignore` у 11 из 14 submodule — они держатся
только на том, что туда пока ничего не заливали. Реально отслеживают загрузки двое: одно
приложение (29 файлов, 4.81 МиБ — практически весь вес его репозитория, разбор и план выноса
в его `PLAN.md`) и второе (2 файла контента, там `uploads/` в `.gitignore` уже есть, значит
добавлены до правила или через `-f` — возможно, осознанно).

**Почему это важнее, чем кажется.** Загрузки на проде — bind-mount в каталог чекаута, а бэкап
их уже покрывает Resilio (`.claude/docs/backup-architecture.md`: «синхронизируются только uploads
всех приложений… Всё остальное восстанавливается из git»). То есть git тут не просто лишний —
он противоречит принятой схеме восстановления. Плюс: пока каталог виден git'у, удаление файла
через прод-админку делает рабочее дерево submodule грязным по tracked-файлу — потенциальный
конфликт checkout'а при `git submodule update` во время деплоя.

**Что предлагается.**

1. Добавить `uploads/` в `files-private/.gitignore.template` (и заодно свериться со всем корневым
   `.gitignore` — не разошлось ли что-то ещё; `uploads` нашлось первым, но проверялось точечно).
2. Пройтись по 11 submodule и дописать строку — правка на один `printf` каждому.
3. Тест на шаблон по образцу тех двух, что уже фиксируют наличие файла: проверять не факт
   существования `.gitignore`, а покрытие ключевых путей.

**Приоритет:** невысокий, но дешёвый — п.1 закрывает приток новых случаев одной строкой.

### Что сделано (2026-08-06)

- [x] П.1 — `uploads/` добавлен в `files-private/.gitignore.template`, закрывает приток новых
      случаев для любого будущего `new-app --private`.
- [x] П.3 — тест в `generator.spec.ts` (`--private кладёт .gitignore`) дополнен проверкой
      `toContain('uploads/')`; `nx test generators` зелёный.
- [x] П.2 (частично) — при повторном замере на 2026-08-06 выяснилось, что 5 из 11 submodule
      (`aboi`, `aprel8008`, `domwellbes`, `driving-school`, `svoichuzhie`) уже получили строку
      параллельным треком между 2026-08-04 и этой сессией — правка не потребовалась. Из
      оставшихся дописаны `dsperevod` (реально использует `/api/uploads`, до правки не защищён
      вовсе) и `studio` (Next.js-приложение с тем же риском, uploads пока не используется).
      `poster-microtext-desktop` пропущен намеренно — Electron-приложение без Next.js API,
      концепция `uploads/` к нему не относится.
- [ ] **Не найдено:** приложение «29 файлов, 4.81 МиБ» из исходного замера — среди 13 submodule
      в текущем чекауте `git submodule status` ни у одного нет реально трекнутых файлов под
      `uploads/` кроме `aprel8008` (2 файла — тот самый «второй» случай из исходного замера).
      Либо это приложение уже почищено тем же параллельным треком, либо оно не входит в текущий
      набор submodule и требует отдельной проверки в сессии по конкретному приложению.
- [ ] `aboi-e2e`/`domwellbes-e2e`/`driving-school-e2e`/`studio-e2e`/`libs/driving-school-db` —
      не проверялись намеренно (e2e-сьюты и Prisma-либа не хранят пользовательские загрузки).

---

## §43 — `deploy-affected.sh` не пересобирает `libs/*/dist` перед сборкой приложений 🆕 (2026-08-06)

Обнаружено BlackCove при проде-деплое §41 (`createSignInWithLetarAuth` вынесен из девяти
приложений) — деплой `dashboard` на s2 упал на `next build` с 12 ошибками TypeScript
`TS6305` («Output file has not been built from source file»), все указывают на `libs/*/dist`:

```
libs/auth/dist/server/index.d.ts       ← @letar/auth/server
libs/auth/dist/client/index.d.ts       ← @letar/auth/client (createSignInWithLetarAuth)
libs/query-provider/dist/index.d.ts    ← @letar/query-provider
libs/chakra-provider/dist/index.d.ts   ← @letar/chakra-provider
libs/forms/dist/index.d.ts             ← @letar/forms
libs/api-server/dist/src/index.d.ts    ← @letar/api-server
libs/analytics/dist/index.d.ts         ← @letar/analytics
libs/infra-config/dist/index.d.ts      ← @letar/infra-config
```

**Причина (по грепу `deploy-affected.sh`, не подтверждено запуском с `--verbose`):** скрипт явно
пересобирает только `@letar/zenstack-form-plugin` перед сборкой приложений (комментарий в
скрипте про свежий сервер: "первый живой staging-деплой", §18 Сессия D). Остальные `libs/*`,
резолвящиеся через TS project references (`lib-entry-points.md`), полагаются на то, что их
`dist/` уже актуален — либо от предыдущего деплоя, либо от закэшированного Nx-артефакта. Правка
`@letar/auth/client` в §41 задела разом 8 либ, и хотя бы одна из них не пересобралась перед
сборкой `dashboard`.

Остальные 8 приложений из того же батча (kami, animatrona-tracker, grandslamcup, archetest,
time, studio, aprel8008, domwellbes) деплой на s2 не запускал — та же цепочка изменённых либ,
высокая вероятность той же стены. Деплой батча приостановлен, ждёт этого фикса.

**Что предлагается.**

1. Найти реальный шаг сборки `libs/*` в `deploy-affected.sh` (или его отсутствие) —
   `--verbose`-прогон на s2 покажет, действительно ли только `zenstack-form-plugin` собирается
   явно.
2. Если явного шага для остальных `libs/*` нет — добавить `nx run-many -t build --projects=libs/*`
   (или affected-версию) перед `nx build <app>`, по аналогии с уже существующим шагом для
   `zenstack-form-plugin`.
3. Проверить, не тот же ли класс проблемы всплывёт при следующем изменении любой другой
   часто-используемой библиотеки (`@letar/ui`, `@letar/hooks` и т.п.) — если да, это не
   единичный баг, а системный пробел в пайплайне.

**Приоритет:** высокий — блокирует прод-деплой минимум 9 приложений прямо сейчас.

### Дополнение 2026-08-06: 4 либы, ранее исключённые из soft-gate Step 2.45, все починены

Мягкий гейт `nx run-many -t typecheck --projects="$LIB_PROJECTS"` в Step 2.45 (не хардблокирует
деплой) находил 4 либы с собственными багами, не связанными с самим §43. Все четыре починены:

- **`@letar/deploy-mcp`, `@letar/deploy-engine`, `label-printer-core`** — `TS6307` (`tsc --build`
  требует, чтобы каждый достижимый из spec-файла источник был явно в file list проекта). Узкий
  `include` в `tsconfig.spec.json` (только `*.spec.ts`/`*.test.ts`/`*.d.ts`) не покрывал обычные
  `.ts`-исходники, которые эти spec-файлы импортируют. Расширил `include` до `src/**/*.ts` во
  всех трёх. У `label-printer-core` фикс вскрыл отдельный замаскированный баг — тестовая
  фикстура `tspl.service.spec.ts` не соответствовала актуальной `config.schema.ts` (нет `dpi`,
  `printerName` вместо `name`, `mode` не указан, `connection.type` в неверном регистре с
  несуществующими полями вместо `path`/`baudRate`) — приведена в соответствие.
- **`@letar/form-mcp`** — на первый взгляд другой баг (`TS2769`/`TS2322` на каждом
  `server.tool()`/`server.prompt()`, "ZodString is missing properties from ZodType"), но
  оказался уже задокументированной в `.claude/docs/mcp-server-pattern.md` ловушкой: `package.json`
  держал `@modelcontextprotocol/sdk` на диапазоне `"^1.29.0"` вместо точного пина, из-за чего bun
  резолвил либу на SDK 1.30.0 (нужен `apps/synth`), чья внутренняя `zod` (4.4.3) разошлась с
  `zod`, который использует сама либа (4.3.6). Точный пин `"1.29.0"` (по образцу `deploy-mcp`/
  `studio-time-mcp`) + `bun install` — типы снова совпадают.

✅ **Латентный риск в 16 других либах закрыт тем же днём** (`auth`, `consent`,
`electron-storage`, `email`, `format-utils`, `forms`, `generators`, `github-releases`,
`infra-config`, `mcp-server-kit`, `number-words`, `pin-auth`, `redis-client`, `seo`,
`studio-time-mcp`, `zenstack-fragments`) — держали тот же узкий `include`, что был причиной
`TS6307` у первых трёх, просто ещё не проявили его (либо explicit typecheck-таргет минует
аггрегированный `tsconfig.json`, либо не было spec-файла с межфайловым импортом). Расширен
`include` до `src/**/*.ts` во всех 16. Заодно починен источник дрейфа — шаблон генератора
`libs/generators/src/generators/new-lib/files/tsconfig.spec.json.template` воспроизводил тот же
узкий `include`, каждая новая либа унаследовала бы баг заново.

**Все 47 либ монорепо теперь зелёные на `nx typecheck`** — soft-gate Step 2.45 прошёл впервые
целиком без предупреждений.

---

## §45 — Аудит «падающих не по своей вине» `nx build` на чистом чекауте ✅ ЗАКРЫТО (2026-08-06)

При точечной проверке `nx build <app>` в сессии по трекам PLAN-INFRA (добавление `libs/seo`/
`libs/github-releases`) всплыли три падения сборки в приложениях, не связанных с самой правкой
(подтверждено откатом правок сессии — падают и на чистом состоянии). Разобрано каждое отдельно,
не чинилось вслепую скопом.

**`apps/synth` — реальный баг конфигурации, починен.** `nx build synth` падал `TS6305: Output
file '.../out-tsc/spec/vitest.config.d.ts' has not been built from source file
'.../vitest.config.ts'`. Похож по коду ошибки на §43 выше, но **другая причина**: там —
недособранные `libs/*/dist`, здесь — `apps/synth/tsconfig.json` был единственным во всём
монорепо Next.js-приложением с `"include": ["**/*.ts", ...]` вместо `"src/**/*.ts"` — голый
паттерн подтягивал корневой `vitest.config.ts` в основной (non-composite) tsc-прогон, а его
типы существуют только через `composite`-ссылку на `tsconfig.spec.json`. Проверено: не стейл-
артефакт (падает и после `rm -rf out-tsc *.tsbuildinfo .next/cache/.tsbuildinfo`), не
единичный для монорепо паттерн (сверены все Next.js-приложения с кастомным, не через
`tsconfig.next-app.json`, tsconfig — только `synth` матчил и `vitest.config.ts`, и держал
`tsconfig.spec` reference). Фикс — сузить `include` до `src/**/*.ts`/`src/**/*.tsx` (по образцу
остальных приложений); `nx build synth` и `nx typecheck:tsgo synth` зелёные.

**`apps/form-example` и `apps/auth-hub` — не баги, пробел в документации по локальному
сетапу.** Оба падают из-за отсутствующего локального окружения, а не кода:

- `form-example` — нет `DATABASE_URL` в `.env.local` (только в `.env.docker` для деплоя),
  `nx zenstack:generate form-example` падает `PrismaConfigEnvError`, дальше типы `PrismaClient`
  устаревшие → `TS2339` на несвязанных с правкой полях.
- `auth-hub` — `DATABASE_URL` есть, но `AUTH_ENCRYPTION_KEY` в `.env.local` нет; `next build`
  всегда ставит `NODE_ENV=production` (уже задокументированная ловушка,
  [env-files.md](/.claude/rules/env-files.md)), поэтому production-проверка обязательности
  ключа в `src/lib/db.ts` роняет сборку даже локально: `Failed to collect page data for
  /api/consent`.

Оба — состояние конкретной рабочей копии (недостающий локальный `.env.local`), не системная
проблема кода. Задокументирован общий паттерн в
[environment.md § `nx build <app>` для приложений с БД требует настроенного локального
окружения](/.claude/docs/environment.md) — как отличать «нет `DATABASE_URL` вовсе» от «есть
`DATABASE_URL`, но не хватает production-required секрета», и что чинить в каждом случае.
Секреты `form-example`/`auth-hub` не генерировались автоматически (правило security.md — только
явным действием владельца через генератор).

**Систематическая проверка по всем 19 приложениям с `schema.zmodel`.** Гипотеза «у большинства
нет `DATABASE_URL` локально, поэтому массово падают» не подтвердилась: 16 из 19 имеют
`DATABASE_URL` в `.env.local`, только `form-example` (описан выше) и два не-веб-приложения
(`animatrona`, `label-printer-desktop` — Electron, своя модель окружения) — без него. Массового
пробела нет, широкий прогон `nx build` по всем приложениям не потребовался.

`apps/aboi` (Turbopack filesystem-tracing в `image-upload-route.ts`) сознательно не трогался —
уже отдельно отслеживается в `PLAN.md`, смешивать с этой находкой не стал.

---

## §46 — Два блокера батча деплоя (kami OOM, time P3018) ✅ ЗАКРЫТО (2026-08-06)

**kami: `next build` (Turbopack) убивался SIGKILL на s2 дважды подряд, ровно на ~6.5 минуте.**
`NODE_OPTIONS=--max-old-space-size=8192` уже стоял в `deploy-affected.sh`, но это лимит V8-хипа —
Turbopack в Next.js 16 (production build без явного `--webpack`) выполняется нативным Rust-
процессом **вне** V8-хипа, так что этот флаг его вообще не ограничивает. На s2 в момент падения
было 15GB RAM, из них ~7.3GB заняты другими ~28 контейнерами (`docker stats`/`free -h`), т.е.
процессу Turbopack физически было где расти до OOM-килла ядра — никакого явного cgroup-лимита
на сам build-процесс `docker build` не поставлено.

Тот же класс проблемы уже чинился в четырёх приложениях по другим поводам (эмоция-гидратация —
[nextjs16-turbopack-default-emotion-hydration.md](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md),
Serwist SW не поддерживается Turbopack — `grandslamcup`/`archetest`). У `kami` в `project.json`
таргет `build` не переопределял executor и наследовал инферированный `@nx/next/plugin`
(`next build` → Turbopack по умолчанию), а в `next.config.js` вдобавок был явный блок
`turbopack: {}` с комментарием «используется для Next.js 16 production build» — то есть кто-то
осознанно на неё переключился. Починено: `build` таргет переопределён на
`next build --webpack` (dev-таргет не трогался — у kami его вообще нет в `project.json`,
локальная разработка не страдала). Локально `next build --webpack` компилируется за 79с; на s2 —
за 3.8 мин без падения, деплой прошёл (`exitCode 0`).

**time: `migrate deploy` падал P3018 (`relation "User" already exists`, код 42P07)
на первой же миграции `20260728041249_init`.** Проверка `_prisma_migrations` в прод-БД показала
единственную запись — саму эту миграцию, `started_at` сегодняшним числом, `finished_at NULL`,
`applied_steps_count 0` — то есть это бухгалтерия самой неудачной попытки, а не свидетельство
более раннего успешного применения. При этом реальные таблицы (`User`, `ConsentLog`,
`NotificationLog`, `NotificationSubscription`) уже существовали и `User` содержал 1 реальную
строку — схема была создана мимо `migrate deploy` (похоже на `db push` на раннем этапе
поднятия прод-окружения). Сверка колонок/типов/индексов/FK из `psql \d` для всех четырёх таблиц
с текстом `migration.sql` дала точное совпадение — это не drift, база соответствует ровно тому,
что должна была создать эта миграция.

Дамп прод-БД от неудачной попытки уже лежал в
`/home/deploy/pre-migrate-dumps/time-8ba146646-20260806-132406.sql.gz` (сам `deploy-affected.sh`
делает дамп перед каждой попыткой миграции). После сверки — `prisma migrate resolve --applied
20260728041249_init` (запущено на s2 из чекаута `/home/deploy/letar/apps/time`, `DATABASE_URL`
через `localhost:5445` — опубликованный порт `time-db`, тот же паттерн, что `deploy-affected.sh`
использует на build-шаге). `migrate status` после — «Database schema is up to date!», повторный
`deploy_app({ app: "time" })` прошёл (`exitCode 0`, «No pending migrations»).

**Открытый вопрос расследован дополнительно (2026-08-06, по просьбе владельца):** проверены все
17 прод-БД на s2 на ту же сигнатуру (`_prisma_migrations`: `finished_at` есть, но
`applied_steps_count = 0` — след `migrate resolve --applied` вместо реального прогона SQL).
Паттерн шире, чем казалось: та же сигнатура найдена ещё в **8 приложениях** — `dashboard`,
`form-example`, `aboi`, `animatrona-tracker` (5 раз), `auth-hub`, `grandslamcup`, `archetest`
(2 раза); `domwellbes` — похожий случай, но разрешился сам (повторная попытка реально накатила
SQL, `applied_steps_count = 1`). **Ни один из них сейчас не блокирует деплой** — старые
незавершённые записи (`finished_at IS NULL`) у `domwellbes`/`aboi`/`archetest` остались рядом с
более новой завершённой записью того же имени (Prisma не удаляет неудачные попытки, просто
добавляет новую при ретрае/`resolve`), а `migrate status` смотрит на наличие _хотя бы одной_
завершённой записи по имени — она есть у всех. Все соответствующие контейнеры сейчас живы и
работают. Вывод: это систематически повторяющийся, но каждый раз штатно закрываемый инцидент —
похоже, несколько приложений когда-то поднимались через `db push` до того, как запрет на это
(см. [database.md](/.claude/rules/database.md)) стал строго соблюдаться. Новых активных
блокеров, кроме уже починенного `time`, не найдено — целенаправленной чистки истории
`_prisma_migrations` не требуется.

**Заодно (2026-08-06):** в `apps/kami/next.config.js` убран мёртвый блок `turbopack: {}` с
устаревшим комментарием «используется для Next.js 16 production build» — после фикса выше
`build`-таргет всегда идёт через `--webpack`, блок был безвредным, но вводил в заблуждение.

---

## §47 — Разгрёб «разошедшихся» агентов: коммит накопленных изменений по всему репо (2026-08-06)

К началу сессии `git status` показывал грязное дерево почти по всей монорепе — результат
параллельной работы нескольких агентов, каждый из которых доделал свою задачу, но не закоммитил.
Владелец подтвердил: агенты уже разошлись, можно фиксировать всё как есть.

Помимо коммитов, найдено и удалено 3 мусорных артефакта security-тестов path traversal
(`apps/8dc986ac-*.png`, `apps/aboi/uploads-evil/`, `apps/etc/` — файлы с текстом `fake-image`
внутри, не годились в репо). `.codex/` добавлен в корневой `.gitignore`; `AGENTS.md`
(автогенерируемый `next dev`, см. [nextjs16-agent-guide-files.md](/.claude/docs/nextjs16-agent-guide-files.md))
добавлен в `.gitignore` submodule `driving-school` и `studio` — раньше это было учтено только в
корневом `.gitignore`, который на submodule не действует.

Заодно частично закрыт техдолг [[project_tg_proxy_npm_deployed]] (устаревший IP relay-сервера
`193.37.68.73` → `31.56.180.161`): исправлены 6 живых конфигурационных файлов
`infra/animatrona-gateway/pinner/pinner3/relay` (`setup.sh`, `bootstrap-all.sh`, `README.md`).
Оставшиеся упоминания IP — в исторических `PLAN_COMPLETED.md`/`CHANGELOG.md` разных приложений и
в `server-migration-letar.md`, трогать не стал: это записи о прошлом, а не live-конфиг.

**Важно — обнаружена гонка агентов вживую:** во время сессии другой агент параллельно делал
`git reset`+commit в этом же working tree (`infra/nginx-proxy-manager` про domwellbes-stage) —
`git log`/`reflog` на несколько секунд показывали разное HEAD. Коммиты не потерялись, но это
живое подтверждение риска из [agent-mail.md](/.claude/rules/agent-mail.md)/[git.md](/.claude/rules/git.md):
несколько агентов физически пишут в один `.git`-каталог одновременно, без изоляции по worktree.

Что закоммичено (13 коммитов в `letar`, плюс отдельные коммиты в submodule `aboi`,
`aprel8008`, `driving-school`, `studio`, все запушены): доки (deployment/pwa-offline/dns-records +
новые period-navigation-pattern/seed-scripts), генератор `new-app` (опциональный шаблон БД),
`libs/hooks` (`useInfiniteScrollSentinel`), рефакторинг `animatrona` (виртуализация сетки
библиотеки), `animatrona-e2e` тесты, рефакторинг `archetest`/`aprel8008`/`dashboard` на общий
ZenStack-фрагмент `libs/zenstack-fragments/src/better-auth` (`Account`/`Session`/`Verification`
вместо дублирования полей), `synth`, IP-фикс инфры, playwright storageState.

---

## §48 — Traefik + wildcard-TLS вместо Nginx Proxy Manager 🆕 (2026-08-06)

> Обсуждено и согласовано с владельцем 2026-08-06 (сессия `/repo`, root-weaver). Реализации ещё
> нет — это ТЗ. Пилот **только на s3**, прод s2 — отдельным решением после §18.7.

### Зачем — и зачем НЕ

Повод для разговора был «хочу HTTP/3», но HTTP/3 сам по себе миграцию edge **не оправдывает**:
выигрыш в основном на установке соединения и на потерях пакетов (мобильные сети), работает только
на участке клиент↔прокси, до контейнеров всё равно идёт HTTP/1.1, а для возвращающейся аудитории
выигрыш околонулевой. Это приятный бонус, а не цель.

Настоящая причина — **конфигурация прокси не в git**:

- источник истины сейчас — `data/database.sqlite` внутри контейнера NPM; таблица в
  [nginx-proxy-manager/README.md](/infra/nginx-proxy-manager/README.md) поддерживается вручную и
  сама признаёт себя неполной («остальные production-приложения сюда ещё не сведены»);
- заведение нового staging-домена — ручной вызов API NPM с уже задокументированным набором грабель
  (`meta: {}` в 2.15, синхронное ожидание LE внутри `POST` с таймаутом клиента, гонка
  certbot-лока `500: Another instance of Certbot is already running`, `ssl_forced` отдельным `PUT`);
- **6 августа 2026 на этом развалился `domwellbes-stage`**: инфра-шаг «завести NPM host» потерялся
  внутри тела deploy-request, разработчик поймал `ERR_SSL_UNRECOGNIZED_NAME_ALERT`. В тот же день
  соседний прецедент со `studio`: `run_e2e` стартовал раньше, чем появился host;
- §18.7 (тираж e2e-гейта) продолжает добавлять staging-домены, то есть цена этой ручной работы
  растёт, а не падает.

После переезда домен описывается label'ами в `docker-compose.production.yml` приложения — попадает
в git рядом с кодом и виден в диффе.

### Что даёт wildcard DNS-01 (решающий фактор)

1. **Лимит Let's Encrypt перестаёт быть проблемой.** Один сертификат `*.letar.best` + `letar.best`
   вместо ~50 отдельных. Лимит «50 сертификатов в неделю на registered domain» больше не
   ограничивает — миграция волнами, которая планировалась изначально, не нужна.
2. **Миграция становится обратимой.** DNS-01 не требует ни порта 80, ни чтобы трафик уже шёл на
   Traefik: он получает валидный сертификат, пока NPM продолжает обслуживать боевой трафик.
   Переключение = смена биндинга портов, откат = смена обратно, данные NPM всё это время целы.
3. **Новый staging-домен перестаёт требовать выпуска сертификата** — он уже покрыт wildcard.
   Гонка certbot-лока исчезает вместе с причиной.
4. **HTTP/3 приезжает попутно** — один параметр на entrypoint.

### Факты, установленные при проработке (не переоткрывать)

| Что                             | Вывод                                                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DNS-провайдер зоны `letar.best` | Dynadot; NS реально `ns1/ns2.dyna-ns.net` — проверено `Resolve-DnsName -Type NS`, зона не делегирована                                                                                  |
| Провайдер в lego                | код `dynadot`, `DYNADOT_API_KEY` + `DYNADOT_API_SECRET`, **добавлен только в lego v5.1.0**                                                                                              |
| Минимальная версия Traefik      | **≥ 3.6.25** — в `v3.6.15` был ещё lego `v4.35.2`, lego `v5.3.1` подтянули к `v3.6.25`. Версию **пинить явно**, `latest` и туториальный `v3.0` не годятся: провайдер просто не найдётся |
| Домены вне зоны `letar.best`    | wildcard для них **не делаем** (решение владельца) — остаются на HTTP-01                                                                                                                |
| Дашборд Traefik                 | **read-only**: показывает роутеры/сервисы/healthcheck, завести хост через него нельзя. Замены админке NPM не будет — это осознанный размен                                              |
| HTTP-кэш                        | у Traefik его **нет**. `gateway.letar.best` (IPFS, `proxy_cache` 2 ГБ) не переносится — остаётся на nginx отдельным upstream. Плагин Souin — community, в прод не берём                 |

### Архитектура

Два резолвера сертификатов одновременно, роутер выбирает свой:

| Резолвер | Способ                     | Покрывает                                                                                    |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| `dns`    | DNS-01 через Dynadot       | `*.letar.best` + `letar.best` — один сертификат на всё, включая любые будущие staging-домены |
| `http`   | HTTP-01 (как сейчас в NPM) | собственные домены приложений (вне зоны `letar.best`)                                        |

Приложение на поддомене `letar.best` про сертификаты не знает ничего. Приложению на своём домене
добавляется `certresolver=http` — дальше как раньше.

**Секреты Dynadot** (`DYNADOT_API_KEY`/`DYNADOT_API_SECRET`) едут штатным конвейером
`.env.docker` → SOPS → `.env.docker.enc`, см. [secret-manager.md](/.claude/docs/secret-manager.md) и
[env-files.md](/.claude/rules/env-files.md). Напоминание из того же правила: переменную надо
прописать **в двух местах** — в `.enc` и в `environment:` compose-файла Traefik.

**Дашборд** — отдельный роутер на домен + basicAuth поверх TLS. `api.insecure=true` из туториалов
(дашборд на :8080 без авторизации) **запрещён**: это карта всей внутренней сети наружу.

### Открытые риски

- 🟠 **Поведение API Dynadot при записи TXT.** У части регистраторов запись DNS через API
  перезаписывает набор записей целиком, а не добавляет одну. Если это тот случай — проявится
  только вживую и может задеть существующие записи зоны. Главная причина начинать с s3, а не с
  прода. Проверять на первом же выпуске: снять слепок зоны до и после.
- **Белый список IP в аккаунте Dynadot** — если ограничение есть, добавить IP s3 (позже s2).
- **`DYNADOT_PROPAGATION_TIMEOUT` по умолчанию 60 с** может не хватить; при таймаутах поднимать.
- **UDP/443 для HTTP/3** — открыть в `ufw` и проверить, что не режет хостер. Часть корпоративных
  сетей UDP блокирует, браузер откатится на TCP через `Alt-Svc` — это нормально, но замер надо
  делать с учётом отката.
- **Rollout-профиль** (§18.6): сейчас NPM форвардит на network alias, потому что app-сервисы на
  rollout не публикуют `container_name`. У Traefik это делается healthcheck'ом на сервисе, и
  alias-трюк становится не нужен — но переписать надо аккуратно, это несущая конструкция
  zero-downtime деплоя.
- **Автоматизация заведения хостов** (скрипты/деплой, использующие API NPM) переписывается на
  label'ы — отдельный объём работ, не забыть при оценке.

### Милестоны

⚠️ **Порядок пересмотрен 2026-08-06 (по ходу той же сессии).** Изначально M1 планировался на
HTTP-01, а wildcard откладывался — но это было следствием предположения, что доступ к DNS закрыт.
Предположение не подтвердилось: правка записей доступна, тип `NS` в панели есть. Держаться прежнего
порядка означало бы выпускать сертификаты дважды и лишний раз переключать роутеры, поэтому **DNS
идёт первым**.

Что из прежней логики сохранено: **acme-dns и Traefik не поднимаются одним шагом.** Две незнакомые
системы разом дают неразбираемый отказ — непонятно, виноват label, роутер, делегирование зоны или
занятый порт 53. Поэтому M1a доказывает цепочку делегирования **вообще без Traefik**, обычным
`lego`/`certbot` из командной строки, и только потом M1b поднимает прокси уже на готовое.

**M1a — wildcard через собственный acme-dns (Traefik ещё не участвует)**

**✅ Выбран путь B — делегирование через собственный acme-dns.** Проверено в панели 2026-08-06:
правка DNS-записей доступна, тип `NS` в списке записей поддомена присутствует. Путь A (прямой API
регистратора) отложен — включение API закрыто отдельным уровнем доступа, независимым от входа.

Путь B ценен и сам по себе, а не только как обход: после однократной ручной настройки ACME
**никогда** больше не обращается к регистратору — ни при выпуске, ни при продлении каждые 90 дней,
ни при добавлении нового домена. Зона остаётся у Dynadot, никуда не переезжает. Плюс провайдер
`acmedns` есть в lego **с v1.1.0**, поэтому требование «Traefik ≥ 3.6.25» на этом пути **не
действует** — оно нужно только пути A.

- [ ] Снят полный слепок зоны `letar.best` до правок — в панели кнопка «Очистить настройки» стоит
      вплотную к «Сохранить настройки», промах сносит `MX`/`SPF`/`DKIM` и ломает почту
- [ ] Решено, **где живёт acme-dns** — развилка, см. врезку ниже
- [ ] `acme-dns` ([joohoi/acme-dns](https://github.com/joohoi/acme-dns)) поднят, HTTP API **не
      публикуется наружу** (внутренняя docker-сеть либо `ACME_DNS_ALLOWLIST` по CIDR, если API
      нужен с другого сервера)
- [ ] Порт 53 UDP/TCP свободен и открыт — проверить конфликт с `systemd-resolved`, который на
      Ubuntu держит 53 на stub-интерфейсе и мешает docker-биндингу `0.0.0.0:53`
- [ ] В зоне `letar.best` **однократно руками** созданы три записи: `NS` подзоны `acme` →
      `ns-acme.letar.best`, `A` записи `ns-acme` → IP сервера, и `CNAME` `_acme-challenge` →
      выданный acme-dns fulldomain. ⚠️ Схема self-delegation из README acme-dns (`A`+`NS` на одном
      имени) **в панели Dynadot запрещена** — «Невозможно устанавливать NS-запись и A-запись
      одновременно для одного поддомена» (проверено 2026-08-06). Разнесение по двум именам обходит
      запрет и заодно убирает нужду в glue: `ns-acme` резолвится из родительской зоны обычной
      `A`-записью
- [ ] Учётные данные регистрации не проходят через переписку агентов и логи: в ответе исполнителя
      только `fulldomain` (он публичен по построению — уходит в DNS-запись), пара
      `username`/`password` пишется сразу в файл аккаунтов lego на сервере (`chmod 600`, root)
- [ ] `disable_registration = true` выставлен после регистрации единственного аккаунта и
      передеплоен — иначе любой, кто дотянется до API, заведёт себе поддомен
- [ ] **Проверка без Traefik:** голый `lego --dns acme-dns -d '*.letar.best' -d letar.best` выпустил
      сертификат. Это и есть DoD милестона — цепочка делегирования доказана изолированно
- [ ] acme-dns добавлен в бэкапы (его база + файл аккаунтов lego) и в мониторинг — от него теперь
      зависит продление всех сертификатов зоны
- [ ] _(опционально)_ `CAA`-запись на `letsencrypt.org` — тип `CAA` панелью поддерживается,
      ограничивает выпуск сертификатов на зону одним УЦ

> ⚠️ **Порт 53 придётся открыть всему интернету** — валидаторы Let's Encrypt приходят с
> произвольных адресов, ограничить их по IP нельзя. `ACME_DNS_ALLOWLIST` защищает **HTTP API**
> обновления записей, а не DNS-порт; путать эти две вещи опасно, потому что создаёт ложное
> ощущение закрытости.
>
> ⚠️ **Развилка «где живёт acme-dns».** На s3 — не жалко при переборке, API не надо публиковать
> (Traefik рядом, в той же docker-сети), но после переезда прода на Traefik продление боевых
> сертификатов станет зависеть от staging-сервера. На s2 — бэкапится и мониторится как прод, зато
> открытый 53 на главном сервере и API придётся выставить для Traefik'а с s3. Решать в начале M1a,
> перенос позже дороже переноса сейчас.
>
> ⚠️ Публичный инстанс `auth.acme-dns.io` не использовать: это отдаёт контроль над нашими
> ACME-челленджами третьей стороне. Только свой.
>
> ⚠️ **Учётные данные acme-dns — это ключ от выпуска сертификатов всей зоны**, а не пароль
> вспомогательного сервиса: кто ими владеет, тот выставит TXT по `_acme-challenge` и получит
> валидный сертификат на `*.letar.best`. То, что HTTP API слушает `127.0.0.1`, ограничивает
> сегодняшнюю досягаемость, но не ценность самих кредов — в M1b этот API открывается для Traefik с
> другого сервера. Обращаться с ними как с секретом уровня прод-БД. Прецедент 2026-08-06: первый
> аккаунт пришлось ротировать, потому что пара попала открытым текстом в переписку агентов
> (git-store на диске). Ротация была бесплатной только потому, что `CNAME` в зоне ещё не создали —
> после этого она стоила бы правки боевой DNS-записи.

**M1b — Traefik на s3, сразу на готовом wildcard**

- [ ] Traefik поднят на s3 рядом с работающим NPM, на непубличных портах
- [ ] Резолвер `dns` (провайдер `acme-dns`, `ACME_DNS_API_BASE` + `ACME_DNS_STORAGE_PATH`) отдаёт
      wildcard — промежуточного HTTP-01 и переключения роутеров не требуется вовсе
- [ ] Дашборд закрыт basicAuth + TLS, `api.insecure` не используется
- [ ] 2–3 staging-домена переведены на Traefik через label'ы в compose приложения
- [ ] NPM на s3 остаётся нетронутым как путь отката; откат проверен фактическим переключением
- [ ] HTTP/3 включён, UDP/443 открыт, факт согласования h3 проверен (`curl --http3`, `Alt-Svc`)
- [ ] Замер: сравнение времени установки соединения h2 vs h3 — записать в этот раздел
- [ ] Резолвер `http` (HTTP-01) заведён отдельно — он всё равно понадобится в M3 для собственных
      доменов приложений вне зоны `letar.best`

**M2 — s3 целиком**

- [ ] Все staging-домены s3 на Traefik, ни один не заводится через API NPM
- [ ] Новый staging-домен из §18.7 заведён **только** правкой compose — без ручных шагов
- [ ] NPM на s3 остановлен, данные забэкаплены

**M3 — решение по s2**

- [ ] Месяц e2e-прогонов на s3 без инцидентов, связанных с прокси
- [ ] План переезда s2 с учётом: `gateway.letar.best` остаётся на nginx; rollout-профиль
      переписан на healthcheck; ~40+ доменов, из них часть на собственных доменах через `http`
- [ ] Решение принимается **только после закрытия §18.7** — два незакрытых фронта на единственном
      прод-сервере одновременно не открываем

### Связь с другими треками

- **§17 (Kamal)** — пункт DoD «решён вопрос NPM vs kamal-proxy» закрывается этим треком в пользу
  «ни то, ни другое»: zero-downtime у нас уже свой (rollout-профиль, §18.6), а edge едет на
  Traefik. Сам Kamal тем самым окончательно вытеснен.
- **§18.7** — блокирует M3, но именно он же даёт основную выгоду от M1/M2.
- **§18.8** — секреты Dynadot едут тем же конвейером `.enc`.

---

## §49 — Firewall на s2: `ufw` неактивен, но включить его «как есть» — иллюзия защиты 🆕 (2026-08-06)

Найдено при развёртывании acme-dns (§48, деплой-агент BlackCove): на s2.letar.best `ufw status`
отдаёт `Status: inactive`. То есть на **единственном прод-сервере** монорепо firewall не работает,
а все `ufw allow` из чужих инструкций там исторически no-op. §37 (захват `letar-redis` через
`REPLICAOF` на открытом `0.0.0.0:6379`) — ровно этот класс проблемы.

> **Снимок с сервера получен** (BlackCove, 2026-08-06, тред `firewall-audit-s2`, только чтение).
> Всё ниже, кроме явно помеченного, — факт, а не вывод из compose-файлов.

⚠️ **Отдельная ловушка: `systemctl` врёт про ufw.** На s2 одновременно
`systemctl is-enabled ufw` → `enabled` и `systemctl is-active ufw` → `active`, при этом
`ufw status` → `inactive` и правил `ufw-*` в `iptables -S`/`nft list ruleset` **нет вообще**.
Юнит systemd поднят, но набор правил не применён. Значит `systemctl is-active ufw` как проверка
«firewall работает?» даёт ложноположительный ответ — проверять только `ufw status verbose`
и наличием цепочек `ufw-*` в реальном ruleset.

### Главная находка: `ufw` не защищает Docker-порты в принципе

Первый рефлекс — «включить ufw и закрыть всё лишнее» — **не сработал бы**, и это важнее самого
факта выключенного firewall. Docker публикует порты через DNAT в таблице `nat`: пакет попадает
в `PREROUTING`, адрес назначения переписывается на IP контейнера, дальше пакет идёт по цепочке
`FORWARD` — то есть **мимо `INPUT`, где живут правила ufw**. Правило `ufw deny 5441/tcp` для
опубликованного контейнерного порта не делает ничего.

Это не наша догадка, а документированное поведение Docker (docs.docker.com, «Packet filtering and
firewalls» → «Docker and ufw»): traffic to and from that container gets diverted before it goes
through the ufw firewall settings, effectively ignoring your firewall configuration.

Практический вывод: **`ufw enable` на s2 закрыл бы только хостовые службы (SSH и то, что слушает
сам хост), а все 20+ опубликованных Docker-портов остались бы открытыми ровно как сейчас** — при
этом в `ufw status` красовалось бы `active`, и следующий человек считал бы вопрос закрытым. Это
хуже, чем честный `inactive`.

Механизмы, которые для Docker-портов реально работают, — два:

1. **Привязка публикации к loopback** в самом compose: `- '127.0.0.1:5441:5432'` вместо
   `- '5441:5432'`. DNAT тогда создаётся только для `127.0.0.1`, снаружи порта нет вовсе.
2. **Цепочка `DOCKER-USER`** — единственное место в `FORWARD`, которое Docker гарантированно
   просматривает раньше своих ACCEPT-правил и не перетирает при рестарте демона. Именно ей
   пользовались как стоп-гэпом в §37 (`iptables -I DOCKER-USER -p tcp --dport 6379 -j DROP`).
   **Сейчас на s2 она пуста** (`-N DOCKER-USER` и больше ничего) — стоп-гэпов §37 в ней не
   осталось. Это не проблема: §37 закрыли правильно, сняв публикацию порта совсем (см. ниже),
   так что блокировать стало нечего.

Приём №1 в репозитории **уже применяется и уже описан** — но точечно, без обобщения в правило:

- `infra/acme-dns/docker-compose.yml`: `- '127.0.0.1:8053:80'` с комментарием «HTTP API — только
  loopback»;
- `apps/dashboard-agent/docker-compose.s3.yml`: `127.0.0.1:13103:3100` с комментарием
  «снаружи недоступен (закрытие порта от интернета получаем даром, **ufw не нужен**)».

То есть правильный подход в репо изобретён минимум дважды и оба раза остался локальным знанием.

### Что реально торчит наружу с s2 (подтверждено `ss -tulnp` + `docker ps`)

Таблица собрана по `docker-compose.production.yml` и **сверена со снимком сервера — совпала
полностью**. Ни у одного порта нет привязки к `127.0.0.1`, адрес публикации — `0.0.0.0`:

| Порт | Контейнер               | Что это                                                                   |
| ---- | ----------------------- | ------------------------------------------------------------------------- |
| 3002 | `dashboard-app`         | приложение                                                                |
| 3017 | `aira-web-app`          | приложение — **живо, хотя в маппинге `deploy-mcp list_servers` его нет**  |
| 3024 | `studio-app`            | приложение                                                                |
| 3100 | `dashboard-agent`       | служебное API деплоя                                                      |
| 3101 | `media-nginx`           | раздача медиа — **в compose-замере пропущено, нашлось только на сервере** |
| 5434 | `mandala-db`            | PostgreSQL                                                                |
| 5435 | `umami-db`              | PostgreSQL                                                                |
| 5436 | `dashboard-db`          | PostgreSQL                                                                |
| 5437 | `kami-db`               | PostgreSQL                                                                |
| 5438 | `driving-school-db`     | PostgreSQL                                                                |
| 5439 | `animatrona-tracker-db` | PostgreSQL                                                                |
| 5440 | `auth-hub-db`           | PostgreSQL                                                                |
| 5441 | `archetest-db`          | PostgreSQL                                                                |
| 5442 | `dsperevod-db`          | PostgreSQL                                                                |
| 5443 | `form-example-db`       | PostgreSQL                                                                |
| 5444 | `aboi-db`               | PostgreSQL                                                                |
| 5445 | `time-db`               | PostgreSQL                                                                |
| 5446 | `svoichuzhie-db`        | PostgreSQL                                                                |
| 5447 | `aprel8008-db`          | PostgreSQL                                                                |
| 5453 | `grandslamcup-db`       | PostgreSQL                                                                |
| 5455 | `studio-db`             | PostgreSQL                                                                |
| 5456 | `domwellbes-db`         | PostgreSQL                                                                |

Плюс инфраструктура: `nginx-proxy-manager` — 80, 81 (**админка, по plain HTTP**), 443;
`acme-dns` — 53/tcp и 53/udp (так и надо: валидаторы Let's Encrypt приходят с произвольных
адресов, сужать нельзя) и 8053 уже на loopback.

Итого **17 инстансов PostgreSQL, торчащих в интернет**, плюс 5 служебных/приложенческих портов
и админка прокси.

✅ **Redis — чисто, и это важный контрпример.** `letar-redis`, `svoichuzhie-redis`, `media-redis`,
`animatrona-tracker-redis` показаны в `docker ps` как `6379/tcp` **без префикса `0.0.0.0:`** —
то есть `EXPOSE`, а не публикация на хост. Наружу не торчат. §37 закрыли не правилом firewall,
а тем, что убрали `ports:` из compose — ровно приём №1 из этого раздела, применённый
последовательно. Дыра больше не воспроизводится, и `DOCKER-USER` поэтому законно пуст.
Для 17 баз данных этот же приём просто не применили.

**Что осталось непроверенным:** фильтрация на уровне хостера (панель провайдера) — с самого
сервера её не видно, нужен либо доступ в панель, либо скан портов s2 снаружи. Пока считаем, что
её нет: на уровне ОС не фильтруется ничего.

**Смягчающее обстоятельство:** пароль есть у всех — во всех compose стоит `${DB_PASSWORD}` или
`${POSTGRES_PASSWORD}` **без fallback-значения** (`:-postgres` нигде нет), то есть подстановка
идёт из `.env.docker` и пустой пароль невозможен. Это не повторение §37 «Redis вообще без пароля»,
а уровнем ниже: доступный снаружи Postgres под паролем. Риск — перебор, фингерпринтинг версии,
любая будущая CVE в аутентификации Postgres, и полный отказ от сетевой границы как слоя защиты.

**Почему порты вообще опубликованы.** Не по недосмотру: `deploy-affected.sh` (строки 716–720,
1118) прогоняет миграции и сид **с хоста**, собирая `DATABASE_URL` как
`postgresql://…@localhost:${DB_PORT}/…`, где `DB_PORT` вытаскивается грепом из compose-файла.
Механизм нужен — но для него достаточно `127.0.0.1`, `0.0.0.0` не требуется ничем.

### Что предлагается — три уровня, по убыванию отдачи

**Уровень 1 (основной — снимает 22 порта из 26; наружу осознанно остаются только 80, 443 и 53).**
Заменить в `docker-compose.production.yml` всех приложений `- '<port>:5432'` на
`- '127.0.0.1:<port>:5432'`; то же для 3002/3017/3024/3100/3101.
Работает без firewall вообще, едет обычным деплоем per-app, `deploy-affected.sh` не ломается
(он и так ходит через `localhost`).

✅ **Потребители проверены — ни один не сломается:**

- `postgres-kami-prod`, `postgres-kami-prod-write`, `postgres-studio-prod` в `.mcp.json` уже
  ходят **через SSH-туннель** (`pg-wrapper.mjs … --tunnel <локальный> root@s2.letar.best
  <удалённый>`). Туннель подключается к `localhost:<порт>` уже на самом s2, то есть привязка
  к `127.0.0.1` для него прозрачна;
- `deploy-mcp` достаёт `dashboard-agent` тоже туннелем;
- миграции/сид в `deploy-affected.sh` идут с хоста на `localhost:${DB_PORT}`.

Прямых подключений к s2 по внешнему IP:порту не нашлось ни одного. Уровень 1 — чистая правка
compose без изменений в тулинге.

✅ **Парсер `deploy-affected.sh` править не нужно — проверено.** Опасение было в разборе
`DB_PORT=$(grep -A 1 "ports:" … | grep -o "[0-9]\+:5432" | cut -d: -f1 | head -1)`: на строке
`- '127.0.0.1:5441:5432'` он мог бы вернуть `127`. Прогнал обе формы записи на реальной команде —
`grep -o` ищет самое левое совпадение целиком, `127` не проходит (после него `.`, а не `:5432`),
поэтому матч — `5441:5432`, и `cut` отдаёт `5441`. Обе формы дают одинаковый результат:

```
- '127.0.0.1:5441:5432'  ->  5441
- '5441:5432'            ->  5441
```

Это снимает единственную предполагавшуюся сложность уровня 1: правка чисто в compose-файлах,
скриптов не касается. Тест на обе формы всё же стоит зафиксировать, чтобы разбор случайно не
переписали обратно.

**Уровень 2 (страховка от рецидива).** Default-deny в `DOCKER-USER` на внешнем интерфейсе:
что бы кто ни опубликовал завтра без `127.0.0.1`, наружу оно не выйдет без явного разрешения.
Правила ставятся не руками, а конфигом с автозагрузкой (`iptables-persistent`/systemd-юнит) —
`iptables -I DOCKER-USER` вручную не переживает перезагрузку.

**Уровень 3 (то, с чего начинали).** `ufw` для хостовых служб — SSH и всё, что слушает сам хост
мимо Docker. Ценность реальная, но **малая по сравнению с уровнем 1**, и включать его надо
последним, когда уже понятно из `ss -tulnp`, что именно слушает хост.

Порядок включения без потери связи:
`ufw allow 22/tcp` → `ufw allow 80,443/tcp` → `ufw allow 53` (tcp+udp) → `ufw allow 3100/tcp`
→ и только потом `ufw enable`. Подстраховка обязательна: `echo 'ufw disable' | at now + 10 min`
перед включением, снять `atrm` после подтверждения, что SSH жив из нового окна.

### Definition of Done

- [x] Снимок с s2 получен (BlackCove, тред `firewall-audit-s2`, 2026-08-06): `ufw` действительно
      `inactive`, правил `ufw-*` в ruleset нет, `DOCKER-USER` пуст, 17 Postgres на `0.0.0.0`.
      Таблица портов сошлась с compose, кроме `media-nginx:3101` — его compose-замер пропустил
- [ ] Проверено, нет ли фильтрации на уровне хостера (панель провайдера) — **единственное, что
      осталось непроверенным**. На уровне ОС не фильтруется ничего. Если панель всё же закрывает
      лишнее, приоритет уровней 2–3 падает, но уровень 1 остаётся в силе
- [x] **Уровень 1 применён к 17 базам + `dashboard-agent`** (2026-08-06). 10 приложений в
      основном репо одним коммитом, 7 приватных submodule — своими коммитами, запушены,
      SHA подняты. Разбор `DB_PORT` прогнан на каждом изменённом файле и вернул верный порт.
      ⚠️ **Вступит в силу только при следующем деплое каждого приложения** — деплой намеренно
      не запускался, изменения ждут своей очереди
- [ ] Тест на разбор `DB_PORT` в обеих формах записи зафиксирован, чтобы разбор не переписали
      обратно на наивный
- [x] **App-порты 3002 / 3017 / 3024 переведены на loopback** (2026-08-06). Проверка, которой
      не хватало, получена от BlackCove — все три форвардятся **по имени контейнера** через
      `kami-network`, а не через `172.17.0.1`, значит публичный сайт не страдает:

      ```
      7.conf   dash.letar.best    -> set $server "dashboard-app";  set $port 3002;
      19.conf  aira.letar.best    -> set $server "aira-web-app";   set $port 3017;
      33.conf  studio.letar.best  -> set $server "studio-app";     set $port 3024;
      ```

      До правки приложения были доступны по `IP:порт` напрямую — в обход TLS и прокси
- [x] `media-nginx:3101` — расхождение объяснено, **активного конфликта нет**. Порт `3100:3100`
      в `infra/media-server/docker-compose.production.yml` объявлен не у `media-nginx`, а у
      отдельного сервиса `media-api`, а тот на s2 в состоянии `Created`, не `Up` — то есть
      никогда не поднимался и его публикация не активна. `dashboard-agent:3100` ему не мешает
- [ ] `media-nginx:3101` сам по себе остаётся на `0.0.0.0` — не трогал, потому что не знаю его
      forward host в NPM (в присланной выборке его не было). Проверить тем же грепом и, если
      форвард по имени контейнера, увести на loopback вместе с неактивным `media-api:3100`
- [ ] Проверено, что порт действительно закрыт: скан снаружи, не `ss` с самого сервера
- [ ] Уровень 2 — `DOCKER-USER` default-deny, персистентно
- [ ] Уровень 3 — `ufw` включён со списком правил выше, SSH не потерян
- [ ] ~~Админка NPM (:81, plain HTTP)~~ — **решено не трогать** (владелец, 2026-08-06). Пароль
      ходит по сети открытым текстом; сама админка при этом уже проксируется через
      `npm.s2.letar.best` с LE-сертификатом, то есть безопасный путь входа существует —
      публичный `:81` просто остаётся вторым, незащищённым. Если §48 доведёт замену NPM на
      Traefik, пункт закроется сам
- [ ] То же самое прогнано на **s3**. Там по §37 ставили точечные `iptables DROP` (redis 6380,
      e2e-postgres 5499 с дефолтными `e2e`/`e2e`). На s2 аналогичных правил в `DOCKER-USER` уже
      **не осталось** — значит либо их не персистили, либо сняли; на s3 надо проверить, живы ли
      они, и не держится ли `e2e-postgres` с дефолтным паролем на одном лишь неперсистентном
      правиле. Ротация credentials e2e-postgres из §37 всё ещё не сделана
- [ ] `.claude/docs/server-provision.md` §2.2 ставит `ufw` через `apt-get install` и **больше
      о нём не вспоминает** — ни `ufw allow`, ни `ufw enable`. Дописать; плюс завести
      `.claude/docs/firewall.md` с разбором «ufw не фильтрует Docker-порты»
- [ ] Правило про `127.0.0.1:` в публикации портов внесено в чек-лист заведения сервиса
      (по образцу [redis-security.md](/.claude/docs/redis-security.md), который то же самое
      уже требует для Redis — обобщить на все контейнеры с `ports:`)

---

## §50 — Прод-деплой молча откатывается с `--frozen-lockfile` на обычный `bun install` 🆕 (2026-08-06)

Найдено в ходе §48: `git pull` на s2 упал из-за грязного `bun.lock`. Разбор (BlackCove) показал,
что это не разовая случайность, а штатная, воспроизводимая на **каждом** прогоне ветка
`deploy-affected.sh`.

### Механизм

Три места в скрипте складываются в замкнутый цикл:

1. **Строка 316** — перед `git pull` выполняется `git checkout -- bun.lock`, иначе pull упал бы
   на «local changes would be overwritten».
2. **Строка 345** — `git submodule update --recursive` обновляет только **инициализированные**
   submodule; неинициализированные так и остаются отсутствующими workspace-путями.
3. **Строки 393–398** — `bun install --frozen-lockfile`, а при его падении **безусловный молчаливый
   фолбэк** на обычный `bun install`, который lockfile переписывает.

Строка `⚠️ --frozen-lockfile failed (возможно uninitialized submodules)` присутствует в логе
каждого деплоя. То есть фолбэк срабатывает не «иногда», а всегда.

### Почему это важно, независимо от причины

Комментарий в скрипте утверждает «реальные версии пакетов не меняются». Возможно, так и есть — если
единственная причина падения frozen в отсутствующих на этом сервере submodule-путях. **Но проверить
это нечем:** фолбэк не различает безобидный случай (нет workspace-пути) и настоящий дрейф (резолв
на сервере разошёлся с зафиксированным в git). Оба выглядят одинаково — одна и та же жёлтая строка.

Хуже: улика уничтожается до того, как на неё посмотрят. Переписанный `bun.lock` затирается
`git checkout` в начале **следующего** деплоя (п.1). Разница между «на проде стоят те версии, что
в git» и «стоят другие» никогда не попадает никому на глаза.

Правило репозитория при этом требует обратного: lockfile обновляется локально, коммитится и
приезжает на сервер готовым ([deployment.md](/.claude/rules/deployment.md)).

### Что проверить первым делом

Гипотеза комментария («виноваты неинициализированные submodule») **проверяема и не проверена**:

```bash
git submodule status   # на s2; неинициализированные помечены ведущим '-'
```

Если хотя бы один со знаком `-` — комментарий, скорее всего, прав, и фолбэк действительно
безобиден. Если все инициализированы — причина падения frozen другая, и тогда речь о реальном
расхождении резолва.

⚠️ Не делать вывод из того, что «submodule обычно инициализированы»: на s2 живёт не весь набор
приложений, а `git submodule update` (п.2) неинициализированные не подтягивает по определению.

### Что сделать

- [ ] Снять `git submodule status` с s2 и s3 — понять, какая из двух причин действует
- [ ] Сделать фолбэк **диагностируемым**: после обычного `bun install` сравнить `bun.lock` с
      закоммиченным (`git diff --stat bun.lock`) и вывести конкретное различие, а не общую фразу.
      Пустой diff — фолбэк был безобиден; непустой — деплой обязан это показать
- [ ] Решить, должен ли непустой diff **останавливать** прод-деплой (склоняюсь к да: молчаливо
      установить не те версии хуже, чем не задеплоить)
- [ ] Убрать уничтожение улики: не `git checkout -- bun.lock` вслепую в начале, а сначала
      зафиксировать, что именно разошлось
- [ ] Если причина — отсутствующие submodule: рассмотреть `--filter` для `bun install` вместо
      фолбэка, чтобы ставить только нужные workspace-члены и не трогать lockfile вовсе

---
