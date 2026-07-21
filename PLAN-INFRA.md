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
  dashboard-agent и deploy-mcp вместо трёх копий.
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

### Батч M1 — статус на 2026-07-21 (BlackCove + root-weaver, тираж `staging-e2e-gate-m1-batch2`)

Итеративный цикл деплой→e2e→диагностика→фикс→повтор по `svoichuzhie`/`mandala`/`dsperevod`/`pravda`.
Найдено и починено силами root-weaver в течение сессии: `port_in_redirect` в `pravda/nginx.conf`
(редиректы уводили на внутренний container-порт), build-time `NEXT_PUBLIC_BETTER_AUTH_URL` без build
ARG в `Dockerfile.production` (`dsperevod`/`svoichuzhie` — заменено на `window.location.origin`,
паттерн aboi), Next.js 16 upstream-баг [vercel/next.js#85374](https://github.com/vercel/next.js/issues/85374)
для `pravda` (build adapter, реально работает на сетевом уровне — не воспроизводится вне
`@playwright/test`-обвязки, см. находку ниже). Незакрытые к концу сессии: `svoichuzhie:48` (успешный
вход без `callbackUrl` не редиректит — root cause найден: `testFan` заведён через `createDevSessionRoute`
без строки `Account`, реальный `/sign-in/email` не может найти credential-запись; чинить —
отдельный сид с реальным credential-аккаунтом, не трогая dev-session механизм), `mandala` auth.setup
(гипотеза не-засеянной staging-БД подтверждена, но сам сид не удаётся выполнить — см. находку ниже),
`pravda navigation.spec.ts` (5/13 падают только внутри `@playwright/test` — ad-hoc воспроизведение
голым `playwright` API проходит чисто, включён `retries:1` для сбора `trace.zip`, разбор не завершён).

### 🔴 Находки этой сессии, требующие отдельного трека (не в скоупе тиража M1, не почищено)

1. **`dashboard-agent` на s3 не передеплоен 9+ дней** — контейнер работает на коде, предшествующем
   уже смёрженной поддержке `seed` (`apps/dashboard-agent/src/routes/deploy.ts:418`, коммит
   `64e558fc`, см. `apps/dashboard-agent/PLAN.md` "В работе"). Из-за этого `deploy_app({ seed: true })`
   молча не запускает сид ни для одного приложения через deploy-mcp — обнаружено на `mandala`.
   **Нужно:** передеплоить `dashboard-agent` на s3 (и проверить s2 на ту же старость).
2. **`run_e2e` (routes/e2e.ts) не выставляет `CI=1`** при спавне `bunx nx e2e` на staging — у
   `nxE2EPreset()` (`node_modules/@nx/playwright/dist/src/utils/preset.js:82`) `retries: process.env.CI
   ? 2 : 0`, значит `trace: 'on-first-retry'` в `apps/*-e2e/playwright.config.ts` **никогда** не
   собирает `trace.zip` на staging-прогонах (retries=0) — только на locally-запущенных с `CI=1`.
   Не чинить хардкодом `retries` в конфигах приложений (сломает быстрый локальный dev-цикл) — нужно
   добавить `CI=1` в spawn-окружение `routes/e2e.ts`, тем же приёмом, что уже применён для
   `BASE_URL`/`DEV_SESSION_TOKEN` (`--preserve-env`, см. запись 0.7.4 выше в этом файле). Найдено при
   разборе `pravda navigation.spec.ts` — root-weaver обошёл точечным `retries:1` в самом `pravda-e2e`
   (временный коммит), но проблема системная для всех gated-приложений.
3. **`nx run <app>:db:seed` не резолвит `@/generated/prisma`-алиас** при ручном запуске (`npx tsx
   prisma/seed.ts` за кулисами `prisma db seed`) вне полного `deploy-affected.sh` пайплайна —
   воспроизведено на `mandala` (`Error: Cannot find module '@/generated/prisma'`, хотя файлы реально
   сгенерированы и alias `@/*` → `./src/*` в tsconfig на месте). Раз находка №1 выше чинится —
   возможно, тот же баг проявится и через официальный `deploy_app({ seed: true })` путь, раз он
   использует ту же команду — стоит проверить сразу после передеплоя `dashboard-agent`.
4. **`libs/admin-ui` — сломанная транзитивная зависимость `@letar/format-utils`** (несуществующий
   пакет), блокирует production-билд одновременно `aprel8008` и `aboi` — оба переведены на общий
   `SortablePhotoGrid` (`libs/admin-ui/src/photo/sortable-photo-grid.tsx` → `utils/slugify.ts:2` →
   `@letar/format-utils`). Владельцы (`aprel8008-dev`/`aboi-dev`) уже уведомлены через Agent Mail
   (2026-07-21), деплой обоих приложений придержан до фикса. Если к следующей сессии не закрыто —
   поднять снова здесь.

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

---
