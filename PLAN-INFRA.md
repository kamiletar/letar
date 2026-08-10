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

## §26 — Непоследовательный frontmatter у слэш-команд ✅ ЗАКРЫТО (2026-08-10)

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

- [x] Пройтись по `.claude/commands/**/*.md` и добавить `description` всем, у кого его нет
      (сейчас используется как минимум для отображения в списке доступных команд).
- [x] Для команд, которые систематически дёргают конкретные Bash-инструменты (git, nx, bun) —
      добавить `allowed-tools` с точечными разрешениями (`Bash(git log:*)` и т.п.), а не оставлять
      это на усмотрение каждой новой правки.
- [x] Зафиксировать ожидаемый frontmatter-шаблон одной строкой в `.claude/commands/README.md`
      (если такого файла нет — создать) или в `.claude/docs/`, чтобы новые команды писались
      единообразно с самого начала.

### ✓ DoD §26 — выполнено

- [x] Все файлы `.claude/commands/**/*.md` имеют `description` во frontmatter — 56 файлов
      получили frontmatter (были без него вообще), 4 уже имели.
- [x] Команды с регулярными Bash-вызовами имеют `allowed-tools` — `audit/backup-audit.md`,
      `create/new-app.md`, `create/new-electron-app.md`, `create/new-lib.md`, `deploy-agent.md`,
      `docs-fix.md`, `end-session.md`, `infra/db-migrate.md`, `infra/deps-update.md`, `letar.md`,
      `workflow/code-review.md`.
- [x] Шаблон/конвенция задокументированы — `.claude/commands/README.md`.

`forms-coordinator.md`/`forms-dev.md` на момент правки содержали чужие незакоммиченные правки
(ротация agent-mail identity) — закоммичен только frontmatter поверх HEAD, рабочее дерево не
тронуто.

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

## §31 — Правка в `libs/*` не видна потребителю: typecheck читает устаревшие `.d.ts` ✅ ЗАКРЫТО (2026-08-07)

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

- [x] Добавление пропа в компонент `libs/*` и его использование в приложении даёт зелёный
      `nx typecheck:tsgo <app>` без ручного пересбора библиотеки
- [x] Ловушка описана в доке, и текст ошибки в ней узнаваем дословно

### ✅ Закрыто 2026-08-07 — выбран вариант 2, не вариант 1

Решение принято в пользу «убрать `references` на библиотеки из `apps/<app>/tsconfig.json`»
(вариант 2 из предложенных выше), а не `dependsOn: ["^typecheck"]` (вариант 1). Причина:
`references` резолвят потребителя на **солюшн-конфиг** библиотеки, который редиректит на
последний из `tsconfig.lib.json`/`tsconfig.spec.json` — а не только на дефолтную точку входа,
так что даже актуальный `dist/` не гарантирует корректный резолв. Без `references` приложение
читает исходники библиотеки напрямую через `paths` — та же модель, что использует прод-сборка
(`@nx/esbuild`/Next.js через `customConditions`), так что расхождение dev/prod исчезает тоже.

Фикс применён на все 28 приложений, у которых были `references` на `libs/*` (5 параллельных
фоновых агентов, коммиты `fix(<app>): убрать references на libs из tsconfig.json`). Три
побочных эффекта (`TS6059` от унаследованного `outDir`, `TS6307` при отсутствии lib в
`include`, утечка `*.spec.tsx` библиотек в программу приложения) и их рецепты — в
[libs.md](/.claude/rules/libs.md), разделы «⚠️ Тот же редирект под обычным tsc» и «⚠️ Тот же
фикс на приложениях, наследующих outDir/include из общего пресета». Проверено: ни один
`apps/*/tsconfig.json` не содержит `"path": "../../libs..."` — только `references` на
собственный `tsconfig.spec.json`, если он есть.

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
while (usedPorts.has(port)) { port++ }
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

## §44 — Публикация в npm открыта для публичной части монорепо; `libs/ui` к ней не готов 🟡 ЧАСТИЧНО (2026-07-30, peer-deps — 2026-08-09)

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

1. ✅ **Сделано (2026-08-09):** честные peer-deps на `react` (`>=18.0.0`), `react-dom`
   (`>=18.0.0`), `@chakra-ui/react` (`>=3.0.0`) добавлены в `libs/ui/package.json` — диапазоны
   и стиль версий скопированы с уже опубликованного `@letar/forms` (тот же паттерн `>=X.0.0`,
   не `^X.Y.Z`, чтобы не заставлять потребителя жёстко совпадать с монорепо). `yet-another-
   react-lightbox` сохранён как был. `typecheck:tsgo` чист (peer-deps не влияют на резолв типов
   внутри монорепо — там всё идёт через `customConditions`, не через это поле — эффект появится
   только у внешнего потребителя пакета).
2. Помнить, что сырой TS годится только потребителям со сборщиком (Next.js `transpilePackages`,
   Vite) — для голого Node такой пакет не работает
3. Осознать смену режима: у `@letar/ui` **141 потребитель** внутри монорепо. Сейчас переименование
   ловит typecheck, после публикации это breaking change по semver

Приоритет низкий: ни одна текущая задача публикации `@letar/ui` не требует. Пункт 1 (единственный
конкретный технический блокер) закрыт — задача из «не готов вообще» стала «готов технически, но
публиковать пока незачем» (пункты 2-3 — не действия, а вещи, о которых нужно помнить в момент
публикации, не блокеры сейчас).

---

## §38 — Прогресс деплоя существует только как проза в логе ✅ ЗАКРЫТО (этапы 1-3, 2026-07-30)

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

## §43 — `deploy-affected.sh` не пересобирает `libs/*/dist` перед сборкой приложений ✅ ЗАКРЫТО (2026-08-06)

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

### Дополнение 2026-08-06/07: полное покрытие тестами 20 либ без таргета `test`

Отдельный аудит (не про typecheck, про `nx test`) нашёл, что из 46 либ только 26 имели таргет
`test` вообще. Все 20 без него — либо не имели vitest-инфраструктуры никогда, либо она была
сломана молча (`@letar/query-provider` ссылался в `project.json` на несуществующий
`vitest.config.ts`, реальный файл — `.mts`; `@letar/zenstack-fragments` — `passWithNoTests`
не был выставлен, хотя либа принципиально не содержит TS-кода, только `.zmodel`-фрагменты).

Полное покрытие всех 20 — тремя волнами параллельных агентов:

- **Волна 1** (Node/pure-logic, без DOM): `demo-protection`, `validation-utils`, `e2e-testing`,
  `animatrona-utils`, `animatrona-franchise-graph`, `animatrona-shared`, `cdek`,
  `video-player-core`, `zenstack-form-plugin`, `form-mcp`, `letar-consultant` — 11 либ,
  ~400 тестов. 4 либы намеренно пропущены (нет юнит-тестируемой логики): `driving-school-db`
  (сгенерированный Prisma-код), `animatrona-types` (чистые типы), `exoplayer-ass`/
  `exoplayer-sync` (React Native native-bridge, нужен RN test-runtime).
- **Волна 2/3** (React-компоненты, `environment: jsdom` + `@testing-library/react`, по образцу
  `apps/aira-web`): `analytics` (8), `animatrona-ui` (26), `@letar/admin-ui` (128), `@letar/ui`
  (243), `@letar/video-player-react` (220) — 625 тестов, 83 файла компонентов/хуков/утилит.

**Системная находка, повторившаяся во всех React-либах:** корневой `tsconfig.base.json` даёт
только `"lib": ["es2022"]` — без DOM-типов. Каждой React-либе, которая раньше не типизировала
тестовый код, понадобилось добавить `"lib": ["dom", "dom.iterable", "esnext"]` в свой
`tsconfig.json` — иначе `tsc --build`/`tsgo` падает на `document`/`window`/`HTMLElement`/
`querySelector`/`getComputedStyle` ("Property does not exist" / "Cannot find name"), хотя
рантайм (vitest+jsdom) их резолвит нормально. Не единичный случай — воспроизвелось у
`animatrona-ui`, `admin-ui`, `ui`, `video-player-react` независимо.

**Другая системная находка:** `getComputedStyle()` в jsdom не резолвит Chakra/emotion CSS-in-JS
классы (стили из `w`/`bg`/позиционирующих пропсов) — jsdom не умеет парсить семантические
CSS-токены Chakra v3, выдаёт `Could not parse CSS stylesheet` и возвращает дефолты. Тесты,
проверяющие такие значения, ищут через `className`/grep по `document.head.innerHTML`, а не
`getComputedStyle`/`container.innerHTML.toContain(...)`. Отдельно — React 19 хостит
`<script async src=...>` как Resource в `document.head`, а не в `container` рендера, и не
убирает его между тестами (дедуп по документу) — искать нужно по уникальному атрибуту.

**Реальные баги в продакшен-коде, найденные попутно (не исправлялись, зафиксированы для
отдельного решения):**

- `form-mcp`: `buildDirectiveRegistry` мутирует module-level `KNOWN_DIRECTIVES` in place вместо
  клонирования — повторный `createFormMcpServer()` в одном процессе видит протёкшие описания.
- `video-player-core`: `toMediaUrl('file:///unix/path')` теряет ведущий слэш (`slice(8)`).
- `letar-consultant`: `formatChunksForPrompt` теряет номер строки при `startLine === 0`
  (falsy-проверка вместо `!= null`).
- `cdek`: `ensureCdekWebhook` трактует ошибку чтения списка вебхуков как «списка нет» и всё
  равно создаёт новый — риск дубликата при сетевом сбое.
- `@letar/ui`: `CookieBanner` — обработчик повторного открытия настроек регистрируется только
  если согласие уже было в `localStorage` на момент монтирования; если согласия ещё нет, эффект
  выходит раньше `addEventListener` — пользователь, только что давший согласие, не может
  переоткрыть настройки cookie без перезагрузки страницы.

### ✅ Закрыто — Step 2.45 добавлен в `deploy-affected.sh`

Реализован пункт 2 из предложенного выше: `deploy-affected.sh` (строки 438–465, Step 2.45)
явно прогоняет `nx run-many -t typecheck --projects="$LIB_PROJECTS"` (все `libs/*`,
`nx show projects --type=lib`) перед сборкой приложений — пересобирает `dist/*.d.ts` независимо
от того, объявлена ли зависимость в графе Nx. Шаг мягкий (не хардблокирует деплой при падении
typecheck отдельной либы — см. комментарий в скрипте), сборка самого приложения ниже покажет,
было ли это критично.

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
| HTTP-кэш                        | у Traefik его **нет**. Плагин Souin — community, в прод не берём. ⚠️ Про `gateway.letar.best` здесь стояло «остаётся на nginx отдельным upstream» — **отменено 2026-08-07**, см. §57     |

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

**✅ M1a ЗАКРЫТ 2026-08-06** — сертификат `*.letar.best` + `letar.best` выпущен через
staging-директорию Let's Encrypt, цепочка `Dynadot → делегирование → acme-dns → DNS-01 → LE`
подтверждена целиком. Осталось два необязательных для DoD хвоста (бэкапы, `CAA`), см. ниже.

- [x] Снят полный слепок зоны `letar.best` до правок — в панели кнопка «Очистить настройки» стоит
      вплотную к «Сохранить настройки», промах сносит `MX`/`SPF`/`DKIM` и ломает почту
- [x] Решено, **где живёт acme-dns** — **s2**: от сервиса зависит продление всех сертификатов
      зоны, значит он должен жить там, где его бэкапят и мониторят, а не там, где сервер регулярно
      перетряхивают под эксперименты. Расплата — открытый 53 на прод-сервере и необходимость
      выставить HTTP API для Traefik с s3 (шаг M1b)
- [x] `acme-dns` ([joohoi/acme-dns](https://github.com/joohoi/acme-dns)) поднят на s2, HTTP API
      только на `127.0.0.1:8053`. Конфиг — `infra/acme-dns/`
- [x] Порт 53 UDP/TCP свободен и открыт. Конфликт с `systemd-resolved` **воспроизвёлся**: wildcard-бинд
      `0.0.0.0:53` дерётся со стаб-листенером даже без совпадения адреса. Починено `DNSStubListener=no`
      + переключение `/etc/resolv.conf` на прямые апстримы; без второго шага резолвинг на сервере
      лёг бы вместе со стабом, и следующий деплой упал бы на `bun install` без видимой связи с причиной
- [x] В зоне `letar.best` созданы записи: `NS` подзоны `acme` → `ns-acme.letar.best`,
      `A` записи `ns-acme` → IP s2, `CNAME` `_acme-challenge` → fulldomain первого аккаунта.
      ⚠️ Схема self-delegation из README acme-dns (`A`+`NS` на одном имени) **в панели Dynadot
      запрещена** — «Невозможно устанавливать NS-запись и A-запись одновременно для одного
      поддомена». Разнесение по двум именам обходит запрет и заодно убирает нужду в glue
- [x] Учётные данные регистрации не проходят через переписку агентов и логи — правило введено
      **после** нарушения: первый аккаунт пришлось ротировать, см. врезку ниже
- [x] `disable_registration = true` выставлен и передеплоен
- [x] **Проверка без Traefik:** одноразовый контейнер `goacme/lego:v4` выпустил сертификат на
      `*.letar.best` + `letar.best`. lego на сервер **не ставили** — постоянным ACME-клиентом
      будет Traefik, отдельный бинарь стал бы мусором без обновлений
- [x] **Второй аккаунт под зону `s3`** — wildcard покрывает ровно один уровень имени, поэтому
      `*.letar.best` **не покрывает** `<app>-stage.s3.letar.best`. Заведён отдельный аккаунт и
      вторая запись `CNAME` `_acme-challenge.s3`. Найдено до разворачивания Traefik, а не после
- [x] acme-dns добавлен в бэкапы (его база + файл аккаунтов lego) и в мониторинг — от него теперь
      зависит продление всех сертификатов зоны. **Код готов 2026-08-07** (`dashboard-agent` 0.10.0,
      коммит `a89b7de2`): cron `acme-dns-backup-s2` в 03:30 + `acme-dns-backup-freshness-check`
      раз в 6 ч с алертом `BACKUP_FAILED`; оба источника обязательны, неполный архив не создаётся;
      `backup-freshness` обобщён с одной цели на список и наконец покрыт тестами (14 кейсов, раньше
      их не было вовсе). ⏳ **Ждёт деплоя агента** — deploy-request отправлен, до подтверждения
      ручного прогона на s2 считать хвост закрытым нельзя: в compose добавлено монтирование
      `/home/deploy/lego`, а без пересоздания контейнера оно не появится.
      Детали — [backup-architecture.md](/.claude/docs/backup-architecture.md#бэкап-acme-dns-s2)
- [ ] **Шифрование бэкапов на покое — общий вопрос, заведён здесь, но решать не точечно.** Три
      архива содержат секреты и лежат нешифрованными: `nginx_*.tar.gz` (приватные ключи всех
      сертификатов), `maddy_*.tar.gz` (DKIM), теперь `acme-dns_*.tar.gz` (учётные данные ACME).
      Все трое уезжают через Resilio на Windows владельца и pinner2. Шифровать один из трёх
      непоследовательно; решать — сразу для всех, с учётом того, что age-ключ в момент аварии
      становится ещё одной зависимостью восстановления
- [ ] _(опционально)_ `CAA`-запись на `letsencrypt.org` — тип `CAA` панелью поддерживается,
      ограничивает выпуск сертификатов на зону одним УЦ
- [ ] _(опционально)_ проверить доставку на `kami@letar.best` — на этот адрес LE шлёт
      предупреждения об истечении, это последняя линия обороны при тихом отказе автопродления.
      Логично добавить в canary-мониторинг (`PLAN.md` Этап 0.7)

#### Грабли M1a — каждая стоила бы времени позже

| Что                                                 | Симптом                                                                      | Разбор                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Образ `joohoi/acme-dns:v2.0.2`                      | контейнер `Up`, DNS и HTTP работают, но `POST /register` отдаёт пустой ответ | бинарь собран без sqlite3-драйвера, [acme-dns#403](https://github.com/acme-dns/acme-dns/issues/403). Пин откачен на `v1.0`. Проверять подъём версии **только** через `/register`, не через `docker ps`                                             |
| `docker compose up -d` не перечитывает `config.cfg` | правка применяется молча-никак                                               | конфиг смонтирован volume'ом, compose сравнивает описание сервиса, а не содержимое файлов. Нужен `docker restart` + сверка `Using config file` по времени в логе. Опасно тем, что проверка «регистрация закрыта?» соврала бы **в опасную сторону** |
| `A`+`NS` на одном имени                             | панель Dynadot отказывает явной ошибкой                                      | разнести на два имени (`acme` NS → `ns-acme` A). Побочно лучше исходного: glue не нужен вовсе                                                                                                                                                      |
| `-v /home/deploy/lego:/lego`                        | `not a directory`, хотя каталог существует                                   | `/lego` в образе `goacme/lego` — сам бинарь entrypoint. Монтировать на свободный путь (`/acme-data`). ⚠️ Первый диагноз («демон не видит `/root`») был **неверен** и держался на тесте, менявшем сразу две переменные — источник и назначение       |

> ⚠️ **Порт 53 придётся открыть всему интернету** — валидаторы Let's Encrypt приходят с
> произвольных адресов, ограничить их по IP нельзя. `ACME_DNS_ALLOWLIST` защищает **HTTP API**
> обновления записей, а не DNS-порт; путать эти две вещи опасно, потому что создаёт ложное
> ощущение закрытости.
>
> ✅ **Развилка «где живёт acme-dns» — решена в пользу s2** (2026-08-06). Альтернатива s3 была
> дешевле в моменте (не жалко при переборке, API не надо публиковать — Traefik рядом), но после
> переезда прода на Traefik продление **боевых** сертификатов зависело бы от staging-сервера,
> который по своей роли регулярно перетряхивают. Приняли расплату: открытый 53 на прод-сервере и
> необходимость выставить HTTP API для Traefik с s3 через proxy host с Access List.
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

**M1b — Traefik на s3, сразу на готовом wildcard** ⏳ **СЛЕДУЮЩИЙ ШАГ**

Конфигурация написана и закоммичена — `infra/traefik/` (compose, `traefik.yml`, `dynamic/dashboard.yml`,
README с полным порядком). На серверах ещё ничего не разворачивалось.

_Подготовка на серверах (запрос отправлен BlackCove 2026-08-07, msg #1101, ждёт исполнения):_

- [x] ⚠️ **`A`-запись `acme-api.letar.best` → IP s2** — создана владельцем 2026-08-07, разошлась
      (Cloudflare и Google DoH отдают тот же IP, что у `ns-acme`, `NOERROR`, TTL 300). Шаг
      **владельца** в панели Dynadot: у BlackCove доступа к панели нет, и он **блокирует** proxy
      host ниже — без записи NPM не выпустит сертификат на этот домен. В исходном чек-листе шага не
      было — найдено при сборке запроса 2026-08-07: остальные записи зоны создавались в M1a, а эта
      нужна впервые.
      ⚠️ Проверять распространение **только через DoH или с сервера**: с рабочей машины под TUN
      любые DNS-ответы — Fake-IP из `198.18.0.0/15`, явное `-Server` не помогает
      ([electron-net-fetch-tun-vpn.md](/.claude/docs/electron-net-fetch-tun-vpn.md))
- [x] Сеть `traefik-network` на s3 (`docker network create`). Форвард через хост-гейтвей
      `172.17.0.1:<порт>`, как делает NPM на s3 сейчас, **для Traefik не подходит**: docker-провайдер
      читает label'ы контейнеров, а не адреса. Значит staging-приложения входят в общую сеть — это и
      есть механизм, ради которого затевался трек
- [x] Proxy host `acme-api.letar.best` на **NPM s2** → контейнер `acme-dns:80`, Access List
      allow `188.127.235.141` (s3) / deny all (сверено в `35.conf`: `allow` + `deny all` +
      `satisfy all`). Голый порт наружу не открывать: через этот API выставляются ACME-челленджи
      всей зоны. ⚠️ Заводить пришлось **через UI владельцем** — см. находку про API NPM ниже
- [x] Копия аккаунта на s3 — **только ключ `s3.letar.best`**, не весь файл (см. §18.8.1, врезка про
      скоуп по хосту). Каталог `700`, файл `600`. Владелец — `deploy`, **не** `root`: у `deploy` на
      s3 нет `sudo`, и добывать root не нужно — см. разбор ниже
- [x] Файл basicAuth дашборда — пароль **только** `openssl rand`, не придумывать
      ([security.md](/.claude/rules/security.md)); `auth/` в `.gitignore`. Пароль перенесён
      владельцем в KeePassXC 2026-08-07, временный файл на s3 удаляется (`shred -u`) — работает
      bcrypt-хэш в `auth/dashboard-users`, само значение серверу больше не нужно. Понадобится
      сменить — новый `openssl rand` + `htpasswd`, а не поиск старого

#### Находка этапа A: API NPM на s2 молча встаёт, чинится только рестартом (2026-08-07)

`/api/nginx/proxy-hosts`, `/api/nginx/access-lists`, `/api/users/me` отдавали `500 Internal Error`
под токеном агента, при этом **сессия владельца в браузере работала нормально**. Диагностика
исключила данные: `integrity_check: ok`, 34 хоста на месте, права пользователя корректны. Причина —
зависшее состояние Node-процесса; `docker restart nginx-proxy-manager` вылечил, публичные сайты
после рестарта проверены (`200`).

Правило «перезапуск только через `deploy-affected.sh`» здесь **не нарушено**: у инфра-контейнеров
пути деплоя нет вообще (§18.8.1), скрипт про `nginx-proxy-manager` не знает.

**Почему это стоит записи, а не строчки в журнале:** источником истины для 34 боевых маршрутов
служит живой Node-процесс поверх SQLite внутри контейнера, и он умеет вставать так, что снаружи
это выглядит как отказ прав доступа. Сегодня цена — ручной обход через UI и рестарт прод-прокси.
Это ровно тот класс отказа, который §48 устраняет по конструкции: у Traefik конфигурация — файл в
git, перечитываемый с диска, а не состояние процесса.

#### Разбор: почему `deploy:deploy` на s3 — не деградация

На s3 у `deploy` нет `sudo` (на s2 есть), поэтому `root:root` из README недостижим. Добывать root
не нужно: у `deploy` есть доступ к docker-сокету — иначе он не запускал бы `docker compose`. Доступ
к сокету эквивалентен root, `docker run -v /home/deploy/lego:/x` прочитает файл независимо от
владельца. То есть `root:root` защищал бы от `deploy` ровно до первой такой команды.

`700`/`600` защищают от **посторонних** пользователей — это здесь реальная граница, и она
соблюдена. Ущерб при худшем исходе ограничен зоной `s3.letar.best`: сертификат на staging-домены,
не на прод. Ради этого второй ключ на s3 и не кладётся. README поправлен, чтобы следующий агент не
тратил время на добывание root ради иллюзии.

_Собственно M1b:_

- [x] Traefik поднят на s3 рядом с работающим NPM, на непубличных портах (`8090`/`8443` — `8080`
      занят IPFS-нодой `kubo`, см. грабли ниже)
- [x] Резолвер `dns` выпустил `*.s3.letar.best` — **боевой** директорией LE, не staging: цепочка уже
      доказана в M1a, а сертификат нужен рабочий. **Выпущен 2026-08-07 14:27**, проверен живым
      handshake: `subject=CN=s3.letar.best`, issuer Let's Encrypt, до 2026-11-05
- [x] Дашборд закрыт basicAuth + TLS, `api.insecure` не используется — `401` без пароля
      подтверждён и с сервера, и **внешним браузером** (2026-08-07). Обратная половина («с верным
      паролем пускает») за владельцем: пароль только в KeePassXC, в переписку агентов не идёт.
      Она и менее ценна — закрытость доказывает именно `401`
- [x] 2 staging-домена переведены на Traefik через label'ы в compose приложения — **сделано
      2026-08-07**, `pravda` и `aira-web` (оба публичные, не submodule, без БД и auth: при поломке
      маршрута ломается только страница). Задеплоено на коммите `27a310d6`, оба роутера видны в
      логе Traefik (`pravda-stage@docker` → `192.168.64.3:3007`, `aira-web-stage@docker` →
      `192.168.64.4:3017`), обе страницы отдают `200` через `:8443`.
      Маршрут теперь описан в `apps/<app>/docker-compose.staging.yml` — **ради этого и затевался
      §48**: чтобы добавить домен, правится файл в git, а не SQLite внутри чужого контейнера
- [ ] NPM на s3 остаётся нетронутым как путь отката. **Наполовину:** оба приложения продолжают
      отдавать `200` и через NPM на `:443` (`server: openresty`) — путь отката жив и проверен
      запросом. Чего **не** проверяли — самого переключения: маршруты сейчас работают
      **параллельно**, а не «Traefik вместо NPM». Настоящая проверка отката — на M2, когда Traefik
      встанет на боевой `443` и NPM придётся реально подвинуть
- [x] HTTP/3 включён, UDP-порт открыт — **серверная сторона готова целиком** (2026-08-07):
      `Alt-Svc: h3=":8443"` отдаётся, `0.0.0.0:8443/udp` слушается, правило `udp --dport 8443`
      добавлено в `docker-user-firewall.sh` в обе ветки (v4 `DOCKER-USER` + v6 `INPUT`), TCP не
      пострадал. До этого UDP резался **нашим же** firewall — в allow-list был только `4001`
- [ ] ⏳ **Факт согласования h3 клиентом — не подтверждён, отложено до M2.** Проверка с рабочей
      машины дала `h2` во всех попытках (навигация, reload, три подряд `fetch`), но это **не
      доказательство**: машина под TUN-VPN, который режет UDP — тот же класс, что искажение DNS
      из [electron-net-fetch-tun-vpn.md](/.claude/docs/electron-net-fetch-tun-vpn.md). Проверка
      **с s2** (вне TUN, через реальный интернет) тоже дала `HTTP/2` — но по `-v` видно, почему:
      `ALPN: offers h2,http/1.1`, то есть клиент **не пытался** в QUIC вовсе. Это «инструмент не
      умеет», а не «путь закрыт»: при срезанном UDP была бы попытка и таймаут.
      ⚠️ **Урок шире трека: `curl --http3` принимает флаг и молча идёт по TCP.** Ни ошибки, ни
      предупреждения — тихий откат. «Флаг принят» не доказывает поддержку QUIC, смотреть надо
      `ALPN: offers` в `-v`. Имя образа тоже не доказывает: `ymuski/curl-http3` оказался без
      QUIC-транспорта.
      **Почему отложено, а не «дожать сейчас»:** на M2 Traefik встаёт на боевой `443`, и тогда
      годится любой внешний онлайн-чекер — проверка станет и проще, и честнее (проверяет то
      состояние, которое реально пойдёт в эксплуатацию, а не пилотный порт).
      ⚠️ При переезде на `443` правило firewall нужно **заменить** (`udp --dport 443`), а не
      дополнить — иначе h3 снова окажется зарезан молча
- [ ] Замер: сравнение времени установки соединения h2 vs h3 — записать в этот раздел
      (упирается в предыдущий пункт: замерять нечего, пока h3 не согласуется)
- [ ] SSE проверить вживую при переносе `dashboard`: у Traefik буферизации ответа по умолчанию нет,
      но это надо подтвердить, а не предположить (в NPM для этого стоит `proxy_buffering off`)

⚠️ Проверить, что путь назначения свободен внутри образа, **до** добавления любого нового `-v` —
`docker run --rm --entrypoint sh <image> -c 'ls -la /'`. В M1a на этом потеряли круг.

#### Грабли M1b — первый запуск, 2026-08-07

| Что                                               | Симптом                                                                                    | Разбор                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Порт `8080` на s3                                 | `Bind for 127.0.0.1:8080 failed: port is already allocated` при нашем бинде `0.0.0.0:8080` | занят IPFS-нодой `kubo` (gateway). **Второй случай того же класса за два дня** — как acme-dns против `systemd-resolved` на 53: wildcard-бинд дерётся с чужим конкретным адресом, глазами конфликт не виден. Traefik переехал на `8090`, `kubo` не трогали. Проверять `docker ps`, не только `ss -tln`                   |
| `certResolver` на роутере вместо наследования     | `failed to register account: status code 404`, выглядит как проблема доступа к acme-dns    | роутер с `certResolver` и **без** `domains` заказывает сертификат ровно на своё правило `Host` (`traefik.s3.letar.best`). Провайдер acme-dns не находит точечное имя в хранилище (там только `s3.letar.best`), идёт регистрировать новый аккаунт — а регистрация закрыта, и правильно закрыта. Чинится пустым `tls: {}` |
| Та же грабля стояла в **инструкции**              | —                                                                                          | раздел README «Как подключить приложение» предписывал `tls.certresolver: 'dns'` на роутере приложения. Поймано на дашборде до тиража — иначе разошлось бы по всем staging-хостам сразу, и каждый выглядел бы как отдельный сбой acme-dns. Исправлено на `tls: 'true'` (наследование entrypoint)                         |
| Proxy host `acme-api`, заведённый руками через UI | Traefik бьётся в TLS: `remote error: tls: unrecognized name`                               | host создан **без SSL вообще** (`certificate_id: 0`, только `listen 80`) — прямое следствие того, что API NPM лежал и заводить пришлось через UI. Ручной путь не только медленнее: он молча пропускает шаг, который API делает явным. Починено двумя запросами (`POST /certificates` → `PUT` с `certificate_id`)        |
| Наследование `entryPoints…http.tls.domains`       | **тишина**: ни ошибки, ни попытки ACME; на handshake с нужным SNI отдаётся self-signed     | пустой `tls: {}` на роутере в расчёте на дефолт entrypoint'а **не заказывает** wildcard — проверено вживую. Опасен не `certResolver` сам по себе, а его наличие без `domains`; лечится явным `tls.domains` на роутере. Хуже предыдущей грабли тем, что провал выглядит спокойнее нормы: ошибка хотя бы видна в логе     |

**M2 — s3 целиком** ⏳ **В РАБОТЕ (2026-08-07)**

- [x] Label'ы добавлены оставшимся **двенадцати** staging-приложениям — `aboi`, `aprel8008`,
      `archetest`, `auth-hub`, `domwellbes`, `driving-school`, `dsperevod`, `grandslamcup`,
      `mandala`, `studio`, `svoichuzhie`, `time` (`pravda` и `aira-web` переведены в M1b).
      Домен у всех по конвенции `<app>-stage.s3.letar.best`, порт в `loadbalancer` — **контейнера**,
      сверен с портом из healthcheck того же файла программной проверкой, а не глазами
- [x] Задеплоено на s3 — **11 из 12 (2026-08-08)**. Порядок сработал как задумано: сначала один
      `time`, проверка роутера и `curl` через `:8443`, и только потом остальные. Все одиннадцать
      отвечают через Traefik (`auth-hub` — `307` на форму входа, это тоже успех: маршрут дошёл до
      приложения; провал выглядел бы как `404` от Traefik или `unrecognized name` на TLS)
- [ ] ⛔ **`aboi` не переведён** — его деплой упал на миграции (`P3018`, `CartItem.quantity`
      содержит `NULL`), к Traefik отношения не имеет. Деплой прервался **до** rollout'а, поэтому
      старый контейнер жив и домен отвечает через NPM — выглядит как «всё работает», хотя label'ы
      не применились. **При остановке NPM отвалится молча.** Разбор — в плане самого приложения
- [ ] Все staging-домены s3 на Traefik, ни один не заводится через API NPM
- [x] `deploy-affected.sh` больше не помечает `nginx-reload` как `fail` на сервере за Traefik
      (коммит `3cc8fbd3`). Иначе после остановки NPM красная фаза висела бы на **каждом** деплое
      s3 при полностью успешном деплое — а постоянно красная фаза приучает не смотреть на красные
      фазы вообще. Условие узкое: зелёная только при живом контейнере `traefik`, на s2 поведение
      прежнее
- [x] Проверено, что zero-downtime rollout **не** мешает: он жёстко зависит от `nginx -s reload`
      (провал `nginx-reload-1` прерывает весь rollout), но включается меткой `letar.rollout` в
      **production**-compose, а staging его не использует. То есть это блокер M3, не M2
- [x] **Полный список proxy host'ов NPM на s3 снят (2026-08-08)** — и он опроверг допущение, на
      котором строился весь milestone. См. ниже
- [ ] ⛔ **Блокер: четыре host'а не закрываются label'ами в принципе**

#### Слепок NPM на s3 (2026-08-08) — 12 приложений и 4 чужака

Из шестнадцати proxy host'ов двенадцать — staging-приложения (закрыты label'ами, кроме `aboi`).
`stream/` и `redirection_host/` пусты. А оставшиеся четыре **не имеют compose в репозитории
вообще**, поэтому механизм §48 к ним неприменим:

| Host                   | Форвард            | Что это                      |
| ---------------------- | ------------------ | ---------------------------- |
| `gateway.letar.best`   | `kubo:8080`        | публичный шлюз IPFS          |
| `ipfs.letar.best`      | `kubo:8080`        | IPFS-нода                    |
| `ipfsstor4.letar.best` | `172.19.0.1:42080` | `animatrona-pin-queue`       |
| `media.letar.best`     | `172.19.0.1:3101`  | `media-nginx` (медиа-сервер) |

⚠️ **Есть ли у этих четырёх «специальные конфигурации» — неизвестно.** Снят только `server_name` +
`proxy_pass`. Кеш, дополнительные `location`, access-list, websocket/SSE-специфика при переносе
теряются **молча**: снаружи по-прежнему `200`, просто перестаёт работать то, что было настроено.
Четыре `.conf` целиком запрошены.

⛔ **Не повторить ошибку, о которой этот же раздел предупреждает.** Первая редакция этой записи
утверждала, что у host'а `gateway.letar.best` на s3 стоит `proxy_cache` на 2 ГБ. **Это не
установлено.** Кеш на 2 ГБ был на **s2**, и его удалили 2026-08-08 (§57). Host на s3, судя по
всему, появился при откате инцидента 2026-08-07 и кеша, скорее всего, не несёт — но «скорее всего»
здесь и есть проблема: утверждение было перенесено из доки, а не снято с сервера, ровно тем
движением, которое разбирается абзацем ниже.

⚠️ **Дока при этом действительно расходилась с фактом**, и это отдельная находка:
`infra/traefik/README.md` говорил, что `gateway.letar.best` живёт на **s2** и всплывёт в **M3**.
Слепок показал его на **s3**, то есть в M2 — в шаге, который делался следующим.

**Урок шире IPFS:** перед остановкой прокси список его host'ов снимается **с сервера**, а не
берётся из документации — и снимается **целиком**, а не одной интересующей строкой. Дока описывает
намерение, сервер — факт. Тот же принцип, что в
[verification-pitfalls](/.claude/docs/verification-pitfalls.md).

#### ✅ Решение владельца (2026-08-08): `gateway` убрать отовсюду и поднять на mail

Ждать ответов про его конфиг не нужно — имя уходит с s3 совсем, вместе с host'ом в NPM. Это то же
решение, что уже записано в §57 (`gateway` = кеширующий прокси на `mail.letar.best`), просто теперь
оно стало на критический путь M2.

⛔ **Порядок из §57 остаётся обязательным и уже один раз нарушался** (инцидент 2026-08-07):

1. Поднять кеширующий прокси на mail и **проверить его снаружи** — не с рабочей машины, там под
   TUN-VPN резолвер врёт Fake-IP.
2. Только после этого переставить DNS `gateway.letar.best` → mail.
3. И только потом удалить host из NPM на s3.

Переставить имя раньше, чем прокси работает, — сломать контент трекера
(`NEXT_PUBLIC_IPFS_GATEWAY`), причём откатить это правкой переменной **нельзя**, только DNS.

**Остальные три host'а решением не покрыты.** `ipfs.letar.best` (сам узел) остаётся на s3 по §57,
`ipfsstor4` и `media` — тоже. Им маршрут на Traefik нужен по-прежнему, и label'ами он не задаётся:
compose этих сервисов в репозитории нет.

- [ ] `gateway.letar.best` поднят на mail, DNS переставлен, host удалён из NPM на s3 (§57)
- [x] `media.letar.best` размечен label'ами в `infra/media-server/docker-compose.production.yml`
      (2026-08-08) — **file-провайдер не понадобился**, см. поправку ниже
- [x] **Решение по TLS для `media.letar.best`** — вариант 1, отдельный аккаунт acme-dns
      (владелец, 2026-08-08). Репозиторная часть сделана, серверная — ниже

##### Поправка: `media` переносится обычными метками, а не файлом

Утверждение выше («у этих четырёх нет compose в репозитории») для `media` **неверно** — его
compose лежит в `infra/media-server/`, просто не в `apps/`. Проверено чтением, а не по памяти.

Часть про раздачу верна: `Accept-Ranges` для перемотки, иммутабельный кэш на год, `CORP`/`CORS`
против блокировки cross-origin видео браузером, защита от хотлинкинга по `Referer` (с отдельной
строкой под кириллический домен в punycode) живут в собственном `nginx.conf` **внутри** контейнера
`media-nginx`, и смена прокси эту логику не задевает.

##### ⛔ Поправка 2026-08-08: «переносить нечего» — неверно, и метка была одна вместо двух

Здесь стояло «у NPM для `media` нет никакой специальной конфигурации», «прокси — тупой
пробрасыватель на `:3101`» и «загрузка видео через прокси не ходит вовсе». Живой `4.conf` с s3
(прислан BlackCove) показал обратное:

| Что                         | Как было записано у меня   | Как на сервере                                    |
| --------------------------- | -------------------------- | ------------------------------------------------- |
| backend'ов                  | один, `:3101`              | **два**: `/` → `:3100` (API), `/v/` → `:3101`     |
| загрузка видео через прокси | не ходит                   | **ходит**, отсюда `client_max_body_size 20g`      |
| таймауты                    | «не нужны и не были нужны» | `proxy_read_timeout`/`proxy_send_timeout` `7200s` |

Единственная метка `Host(media.letar.best)` → `media-nginx:80` дала бы **404 на всём, кроме
`/v/`**: у `media-nginx` нет `location /` вообще. Загрузка видео и вебхуки отвалились бы целиком, а
проверка «видео играет» при этом прошла бы успешно — раздача-то работает. Классическая проверка,
врущая в успокаивающую сторону.

Исправлено двумя роутерами с явными приоритетами:

- `media-api` — `Host(...)`, приоритет 10, на `media-api:3100`, он же заказчик сертификата;
- `media-v` — `Host(...) && PathPrefix(/v/)`, приоритет 20, на `media-nginx:80`.

Приоритеты проставлены явно, хотя по длине правила порядок вышел бы тот же: неявная длина —
подпорка, которую переворачивает любое удлинение правила, и переворот был бы молчаливым.

###### Вторая находка того же разбора: дефолтный `readTimeout` Traefik обрывает заливку

`respondingTimeouts.readTimeout` по умолчанию **60 секунд**, и по исходникам Traefik это жёсткий
дедлайн на **весь запрос вместе с телом** (`Server.ReadTimeout` в Go). У nginx семантика другая —
`client_body_timeout` отмеряет паузу _между_ чтениями, поэтому медленная, но непрерывная заливка
20 ГБ через NPM проходит любой длины. После переезда на боевые порты всё, что грузится дольше
минуты, начало бы обрываться — с симптомом «иногда не грузятся большие файлы», без единой строки
про конфигурацию прокси.

Поставлено `readTimeout: 7200s` на entrypoint `websecure` — ровно то, что стояло у NPM.
`0` (без ограничения) не ставим: это уже не «как было». Настройка **глобальная** для entrypoint,
per-router такой в Traefik нет — послабление получают все приложения на `websecure`.

**Урок тот же, третий раз за §48 M2:** список host'ов, порты и «специальные конфигурации» берутся
с сервера целиком, а не из документации и не по одной интересующей строке. Первые два раза —
`gateway` на s2 вместо s3 и `media` с compose в `infra/`, а не в `apps/`.

##### ⛔ Сертификата на `media.letar.best` у Traefik на s3 нет — и это не упущение

`media.letar.best` не покрывается ничем из того, что лежит на s3: там wildcard `*.s3.letar.best` и
ключ acme-dns **только** для зоны `s3.letar.best`. Ключ от `letar.best` туда не клали
**сознательно** — иначе компрометация staging-сервера давала бы валидный сертификат на весь
продакшен-домен (`infra/traefik/README.md`).

То есть до переключения нужно решение владельца. Варианты, по возрастанию цены:

1. **Отдельный аккаунт acme-dns ровно на `media.letar.best`.** Один `CNAME`
   `_acme-challenge.media.letar.best` у регистратора + свой ключ на s3. Компрометация s3 даёт
   сертификат ровно на это одно имя, не на зону. Требует однократно открыть регистрацию в acme-dns
   (сейчас закрыта — и правильно закрыта) и один поход в панель регистратора.
2. **Положить на s3 ключ зоны `letar.best`.** Дёшево и ровно то, что было отвергнуто при M1b.
   Пересматривать только осознанно.
3. **Оставить `media.letar.best` на NPM.** Тогда NPM на s3 не останавливается вовсе, и весь M2
   теряет смысл.

Рекомендация — вариант 1: он сохраняет свойство «staging не может выпустить сертификат на прод» и
стоит одной DNS-записи.

##### ✅ Выбран вариант 1 (владелец, 2026-08-08)

**Сделано в репозитории:**

- роутер `media` получил `tls.certresolver=dns` **без** `domains`
  (`infra/media-server/docker-compose.production.yml`);
- заведён раздел «Аккаунт на одно имя» в `infra/acme-dns/README.md` — порядок с двумя рестартами
  и проверкой, что регистрация реально закрылась;
- в `infra/traefik/README.md` — таблица из трёх случаев TLS на s3 и общее правило под ними.

**Общее правило, которое свело три разрозненных запрета в один:** имя, на которое заказывается
сертификат, обязано совпадать с ключом в `acme-dns-accounts.json` **буквально**, поиск точный.
Отсюда все три строки таблицы: staging-приложение резолвер не ставит вовсе (берёт готовый
wildcard), дашборд ставит резолвер **с** `domains` (его Host ≠ ключ), `media` ставит резолвер
**без** `domains` (его Host = ключ). Раньше это выглядело тремя независимыми правилами, каждое со
своим «почему», и второе из них уже один раз разошлось бы по всем приложениям.

**Осталось на серверах (не делается из репозитория):**

- [ ] на s2: открыть регистрацию → `docker restart acme-dns` → `POST /register` → закрыть →
      `docker restart` → **проверить `403`**, а не предположить
- [ ] у регистратора: `CNAME _acme-challenge.media.letar.best` → `fulldomain`
- [ ] на s3: добавить ключ `media.letar.best` в существующий `acme-dns-accounts.json`
      **дополнением, не перезаписью** — рядом лежит `s3.letar.best`, потеря которого останавливает
      продление всех staging-доменов
- [ ] проверить выпуск **до** переезда портов: DNS-01 не занимает ни `80`, ни `443`, поэтому NPM в
      этот момент продолжает держать боевые порты и откат бесплатный

⚠️ **На M3 эту схему не тиражировать.** На s2 продакшен-имён больше десятка; аккаунт и `CNAME` на
каждое — ручная работа, которая накапливается и забывается. Там уместен зонный ключ `letar.best`:
возражение «ключ зоны на staging-сервере» к продакшен-серверу не относится.

ℹ️ Отдельный вопрос, который здесь только фиксируется: `media.letar.best` — **продакшен**-сервис,
живущий на пилотном s3. Сегодня это ни на что не влияет, но при любом разговоре «s3 — сервер для
экспериментов» надо помнить, что там же лежит боевая раздача видео.

⚠️ Переименовать `media.letar.best` во что-нибудь под `*.s3.letar.best` **нельзя**: абсолютные URL
видео сохраняются в БД приложений при готовности транскода (вебхук `video.ready` отдаёт готовые
ссылки). Смена имени осиротит весь уже загруженный контент.

- [x] `ipfsstor4` → **`pin1.s3.letar.best`**, маршрут описан файлом
      `infra/traefik/dynamic/pin1.yml` (2026-08-08). Метки к нему прицепить нельзя ни физически
      (`network_mode: host`, вне `traefik-network`), ни через репозиторий (compose в
      `/opt/pin-queue`, §60) — поэтому file-провайдер. Осталось подставить IP s2 в allowlist и
      переключить трекер, см. ниже
- [ ] Маршрут для `ipfs` (шлюз Kubo) — последний непристроенный host на s3

##### Переименование `ipfsstor4` → `pin1.s3.letar.best` (решение владельца, 2026-08-08)

Имя читалось как «хранилище IPFS» и **дважды за одну сессию ввело в заблуждение**: сначала меня —
я написал «закрыть от интернета» про весь сервис; следом владельца — он прочитал это как закрытие
раздачи. На деле через этот вход контент не ходит вообще: три ручки (`POST/DELETE /api/pin`,
`GET /api/status`, `GET /health`), пульт очереди пиннинга.

⛔ **Раздача к нему отношения не имеет и через Traefik не идёт.** Она живёт на swarm libp2p
(`4001/tcp+udp`, `43001` у пиннера) и на HTTP-шлюзе Kubo (`ipfs.letar.best`). Поломка этого
роутера раздачу не затронет, и наоборот. Записано здесь и в самом `pin1.yml`, потому что путаница
уже случилась дважды и случится в третий раз.

Выбор имени:

- **цифра сохранена** — привязка к пиннеру; живой пиннер теперь единственный, поэтому «1»
  (старый первый остался в истории);
- **`pin` вместо `ipfsstor`** — имя больше не врёт про назначение;
- **`.s3.` не украшение, а экономия** — поддомен покрыт уже выпущенным wildcard
  `*.s3.letar.best`, то есть не требует ни DNS-записи, ни выпуска сертификата. Имя вида
  `pin1.letar.best` упёрлось бы в ту же развилку, что `media.letar.best` (отдельный аккаунт
  acme-dns либо ключ прод-зоны на staging), — второй раз, на ровном месте.

Порядок переключения — как с `gateway`: новое имя работает → трекер переключён → старое убрано.
Оба имени какое-то время смотрят в один бэкенд, это ничего не стоит.

- [ ] Подставить публичный IP s2 в `pin1-allowlist` (сейчас заглушка `0.0.0.0/32` — не совпадает
      ни с одним адресом, маршрут закрыт для всех). Пустить «пока всех» на время настройки —
      ровно тот способ, которым временное становится постоянным
- [ ] Переключить `PinServer.pinQueueUrl` (и `name`) в базе трекера через админку, не руками в БД
- [ ] Убрать host `ipfsstor4` из NPM после того, как трекер поехал на новое имя

⚠️ **Ловушка на будущее:** сервис обязан слушать не только `127.0.0.1`. Прокси теперь в
контейнере, для него loopback хоста недоступен — правка `BIND_ADDR=127.0.0.1` (коммит `74a246ed`,
до прода так и не доехала, §60) этот маршрут сломает. Нужен либо адрес моста, либо `0.0.0.0` плюс
закрытие снаружи на уровне firewall. Тот же класс, что уже ломал `ipfsstor4` при первой попытке
закрыть порт правилом firewall.

- [ ] Новый staging-домен из §18.7 заведён **только** правкой compose — без ручных шагов
- [ ] Traefik переставлен с `8090`/`8443` на боевые `80`/`443`, NPM подвинут
- [ ] ⚠️ Правило firewall для h3 **заменено** (`udp --dport 8443` → `udp --dport 443`), не
      дополнено — иначе HTTP/3 окажется зарезан молча, см. пункт M1b выше
- [ ] Согласование h3 клиентом подтверждено внешним онлайн-чекером (отложено сюда из M1b: на
      боевом `443` проверка и проще, и честнее)
- [ ] NPM на s3 остановлен, данные забэкаплены

⚠️ **Публикация портов приложений на хост при этом НЕ снимается.** Через неё ходит NPM — это путь
отката, пока он не остановлен. Плюс `driving-school` использует хостовый `3021` для Socket.IO
(`NEXT_PUBLIC_SOCKET_URL` бьёт в `localhost:3021` с машины, где идёт Playwright), и роутера на этот
порт нет намеренно.

**Побочный эффект: M2 закрывает §54.** `auth-hub` и `driving-school` получают маршрут впервые —
сейчас их домена нет ни в NPM, ни в Traefik, и их e2e не может пройти в принципе.

#### 🎯 Доведение M2 до конца: убрать nginx (NPM) с s3 (решение владельца, 2026-08-08)

Задача сформулирована владельцем как «допереехать Traefik и убрать оттуда nginx». Ниже — то, что
осталось, в порядке зависимостей. Разметка приложений уже сделана (11/12), остались **чужаки** и
сам переезд портов.

##### ⛔ Второй домен без сертификата: `ipfs.letar.best`

Найдено при составлении этого плана, отдельной записи раньше не было. `ipfs.letar.best` лежит вне
`*.s3.letar.best` — ровно та же ситуация, что у `media.letar.best`, и решается так же: **свой
аккаунт acme-dns на одно имя**.

То есть походов к регистратору **два**, а не один:

| Имя                | Запись                            |
| ------------------ | --------------------------------- |
| `media.letar.best` | `CNAME _acme-challenge.media` → … |
| `ipfs.letar.best`  | `CNAME _acme-challenge.ipfs` → …  |

ℹ️ Теоретически `ipfs` можно было бы переименовать под `*.s3.letar.best` и обойтись без записи —
но это публичное имя IPFS-шлюза, и оно ведёт себя как `media`: ссылки на него уходят наружу и
живут дольше нашего удобства. Владелец уже выбрал «отдельный аккаунт» на этой же развилке для
`media`; делаем так же, без второго обсуждения.

⚠️ Маршрут для `ipfs` задаётся **file-провайдером**: kubo живёт в `/opt/letar-ipfs` вне git (§60),
метки к нему не прицепить. Образец — `dynamic/pin1.yml`, только без `ipAllowList`: шлюз публичный.

##### ✅ Проверка на полноту: сколько имён вне wildcard — ровно три, и это весь список

Пропущенное имя вне `*.s3.letar.best` отвалится **молча** в момент остановки NPM: TLS отдаст
`unrecognized name` (ровно так выглядел инцидент 2026-08-07), а не понятную ошибку. Поэтому счёт
сверен не по памяти, а против выгрузки всех 16 proxy host'ов, снятой BlackCove с живого s3.

| Host'ы NPM                   | Кол-во | Покрытие TLS после переезда                                                     |
| ---------------------------- | ------ | ------------------------------------------------------------------------------- |
| `*-stage.s3.letar.best`      | 12     | ✅ существующий wildcard `*.s3.letar.best`                                      |
| `ipfsstor4.letar.best`       | 1      | ✅ уходит переименованием в `pin1.s3.letar.best` — попадает под тот же wildcard |
| `gateway` / `ipfs` / `media` | 3      | ⚠️ **вне wildcard** — три per-name аккаунта acme-dns + три `CNAME`               |
| **Итого**                    | **16** | сходится с выгрузкой                                                            |

`stream/` и `redirection_host/` у NPM пусты — отдельных сущностей, которые пришлось бы переносить
мимо этого списка, нет.

⚠️ **Три `CNAME` — это ровно та работа владельца, без которой окно переезда не открывается.** Ни
один из трёх сертификатов нельзя выпустить позже, «когда понадобится»: HTTP-01 на этих именах
заработает только после переезда на боевой `:80`, то есть уже после остановки NPM — курица и яйцо.
DNS-01 через acme-dns снимает это, но требует записи у регистратора заранее.

##### 🔓 §57 расцеплён с M2: `gateway` не обязан уезжать на mail до остановки nginx (2026-08-08)

В первой редакции этого раздела §57 стоял первым пунктом «что осталось» с формулировкой «пока
прокси на mail не поднят — NPM не выключается». **Это была ошибка планирования, а не факт.**

Что выяснилось при сверке с самим §57 и с `infra/animatrona-gateway/README.md`:

| Утверждение, на котором держался блокер             | Как на самом деле                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| «`gateway` сейчас кешируется, Traefik не умеет кеш» | Кеш был на **s2**, вместе с узлом `animatrona-gateway`, который **выведен из эксплуатации ~17–21 июня 2026**. Удалён 2026-08-08.     |
| «имя обслуживается отдельной схемой»                | После отката инцидента 2026-08-07 имя указывает на **s3** и обслуживается тем же NPM, что и `ipfs` — оба голым `proxy_pass` на kubo. |

То есть **кеша перед `gateway` нет уже два месяца**, и Traefik на s3 воспроизводит текущее
поведение один в один: тот же сервер, тот же бэкенд, та же ноль-кеширующая схема. Переезд на mail
— это **улучшение** (появление кеша), а не восстановление чего-то утраченного при переходе.

**Следствие:** `gateway` получает третий per-name аккаунт acme-dns и роутер на s3 рядом с `ipfs`,
и NPM выключается, не дожидаясь mail. §57 продолжается своим темпом как отдельная задача.

⛔ **Что при этом НЕ отменяется.** Порядок внутри самого §57 остаётся ровно таким же и по той же
причине — он уже нарушался и стоил трекера: **прокси поднят → проверен снаружи → только потом
DNS**. Расцепление касается очерёдности §57 относительно M2, а не шагов внутри §57.

**Цена решения — одна:** владельцу нужно завести у регистратора **три** `CNAME`, а не два. Работы
у него столько же (все три однотипны), а M2 перестаёт зависеть от задачи с непринятым решением
(«что именно кешировать» в §57 до сих пор не выбрано).

⚠️ **Хвост, который легко забыть:** когда §57 доедет и `gateway` уйдёт на mail, роутер и
per-name аккаунт `gateway` на s3 станут мёртвыми — снести оба. Аккаунт acme-dns, оставшийся без
CNAME, ничего не ломает, но это ключ от зоны, живущий без надобности.

##### Что осталось, по зависимостям

- [ ] **`gateway.letar.best`** — аккаунт acme-dns + `CNAME` + ключ на s3, маршрут рядом с `ipfs`.
      ⚠️ **§57 больше НЕ блокирует M2 — снято 2026-08-08, см. «§57 расцеплён с M2» ниже.**
- [ ] **`media.letar.best`** — аккаунт acme-dns + `CNAME` + ключ на s3 (см. «Выбран вариант 1»).
- [ ] **`ipfs.letar.best`** — то же самое + `dynamic/ipfs.yml` в git.
- [ ] **`aboi`** — единственное приложение без применённых меток. Сейчас живёт через NPM и
      **отвалится молча** при его остановке. ⚠️ Блокер сменился, и второй хуже первого:
      - миграция (`P3018`, `CartItem`) — ✅ починена на staging 2026-08-08 12:49 UTC (BlackCove);
      - **новый блокер — hard e2e-gate**: падает `email-verification.spec.ts:63` в webkit,
      подтверждено как настоящий баг, а не флейк (`--workers=1` даёт то же). Пока тест красный,
      деплой не проходит, а без деплоя не применяются метки.
      ⛔ **Не наша часть работы:** `aboi` ведёт отдельный агент, вмешиваться в приложение не надо.
      От M2 требуется только держать зависимость видимой и не считать `aboi` переведённым.
      ⛔ Файл миграции не править ни при каком повороте — прод её применил, правка разъедет
      checksum в `_prisma_migrations`.
- [x] **`ipfs` / `gateway`** — ✅ 2026-08-08: `CNAME` разошлись, пробный выпуск на staging-директории
      LE прошёл для всех трёх имён, Traefik сам подхватил домены и получил боевые сертификаты
      (до 6 ноября 2026). `404` на голом `/` — ответ самого kubo, проверено прямым запросом к
      `127.0.0.1:8080` с тем же результатом.
- [ ] **`media`** — сертификат и аккаунт подтверждены, но **роутер не поднялся**: стек
      `infra/media-server` ни разу не пересоздавали после добавления меток. Нужен `up -d`.
- [ ] Проверить все домены на `:8443` **до** того, как трогать NPM.

##### ⚠️ «Метка в git» ≠ «метка на контейнере» — за день поймано дважды

Оба раза выглядело как отсутствие конфигурации, а на деле конфигурация была — просто не доехала до
работающего контейнера. Метки фиксируются в момент **создания** контейнера; `docker inspect`
показывает то, с чем контейнер родился, а не то, что сейчас лежит в compose-файле.

| Что              | Метки в git | Метки на контейнере | Почему                               |
| ---------------- | ----------- | ------------------- | ------------------------------------ |
| `aboi` (staging) | ✅          | ❌                  | деплой упал на миграции до rollout'а |
| `media-server`   | ✅          | ❌                  | стек просто ни разу не пересоздавали |

Второй случай особенно легко принять за «забыли написать конфиг»: `grep` по `dynamic/` ничего не
находит (у `media` маршрут метками, а не файлом), `docker inspect` показывает пусто — и вывод
«роутер ещё не сделан» напрашивается сам. Проверять надо **compose-файл на диске**, а уже потом
контейнер, и различать «не написано» от «не применено».

⛔ **Отсюда обязательный шаг перед окном переезда:** сверить не только `curl` по именам, но и
`docker inspect ... .Config.Labels` у каждого контейнера, чей маршрут описан метками. Проверка
`curl` на `:8443` это поймает — но только если её делать до остановки NPM, а не после.

##### Окно переезда — один заход, порядок жёсткий

✅ **Все три правки с номером порта уже сделаны в git (2026-08-08, `<этот коммит>`)** — в окне
редактировать на сервере нечего, только `git pull`. Так и задумано: правка конфигов на боевом
сервере руками создаёт расхождение с origin и ломает следующий `deploy-affected.sh --skip-git`.

1. Бэкап `/opt/npm/data` (это же и путь отката).
2. Остановить NPM — два процесса на `443` не уживутся, иначе `up -d` упадёт с `address already in use`.
3. `git pull` на s3. Что приедет:
   | Где                                                  | Было                          | Стало                      |
   | ---------------------------------------------------- | ----------------------------- | -------------------------- |
   | `infra/traefik/docker-compose.yml` → `ports`         | `8090:80`, `8443:443/tcp+udp` | `80:80`, `443:443/tcp+udp` |
   | `infra/traefik/traefik.yml` → `http3.advertisedPort` | `8443`                        | убран                      |
   | `infra/firewall/ports.s3.env` → `UDP_PORTS`          | `4001,8443`                   | `4001,443,8443`            |

   ⚠️ **UDP-правило — добавление, а не замена.** Ранее здесь стояло «заменить `8443` на `443`»;
   изменено осознанно. Пилотные порты оставлены открытыми на время окна отката, чтобы возврат
   «NPM на 80/443 + Traefik на 8090/8443» не требовал ещё и правки firewall под давлением времени.
   Открытый порт, на котором никто не слушает, безвреден; лишний шаг в откате — нет. Убираются
   вместе с остальными путями отката (см. «Уборка» ниже).

   ⚠️ После `git pull` firewall-скрипт нужно **применить** — сам он не перечитывается.
4. **`docker compose up -d`** (пересоздание), не `restart` — меняется описание сервиса. Проверить
   результат `docker inspect`, а не факт выполнения команды.
5. Сразу в этом же окне — ⚠️ **ОБА поля, не одно**:
   ```sql
   UPDATE "PinServer"
      SET "apiUrl"      = 'https://pin1.s3.letar.best',
          "pinQueueUrl" = 'https://pin1.s3.letar.best'
    WHERE id = 'pinner4';
   ```
   Раньше нельзя — `pin1` до переезда живёт только на `8443`; позже нельзя — `ipfsstor4` умирает
   вместе с NPM. Разбор — §61.

   ⛔ **`pinQueueUrl` было забыто в первой редакции этого runbook'а — пиннинг сломался на 20 минут
   (2026-08-08, 18:17–18:37 UTC).** Разбор ниже, читать до следующего переименования адреса.
6. Проверки: TCP и UDP **по отдельности** (`curl --http3` принимает флаг и молча идёт по TCP —
   смотреть `ALPN: offers` в `-v` или внешний чекер); оба пути `media` (`/v/` и корень); пиннинг
   живым запросом, не только `200` на `/health`.

##### Что осознанно НЕ делаем в этом окне

- **Публикацию портов приложений на хост не снимаем.** Это путь отката, плюс `driving-school`
  использует хостовый `3021` для Socket.IO. Снимать — отдельным шагом, после недели без инцидентов.
- **`readTimeout: 7200s`** остаётся глобальным для entrypoint — per-router его в Traefik нет.

##### ⛔ Инцидент 2026-08-08: переименовали адрес в поле, которое видно, а код ходит по другому

**Что произошло.** Runbook (мой) предписывал сменить у `pinner4` поле `apiUrl`. Оно и менялось —
шаг отработал, `SELECT` подтвердил новое значение. Но реальные запросы на пиннинг идут по
**`pinQueueUrl`**, а там осталось `https://ipfsstor4.letar.best` — имя, умершее вместе с NPM
двадцатью минутами ранее.

```ts
// apps/animatrona-tracker/src/lib/pinning.ts:337
const result = server.pinQueueUrl
  ? await pinQueueAdd(server.pinQueueUrl, …)   // ← реальный путь, если очередь настроена
  : await kuboPinAddAsync(server.apiUrl, …)    // ← запасной
```

**Почему проверка не поймала.** Проверяли `curl` на `https://pin1.s3.letar.best/api/status` и
получили осмысленный `401` от бэкенда. Проверка корректна и доказала ровно то, что заявлено — TLS,
роутинг, allowlist. Но она шла **по имени, которое мы сами вписали**, а не по адресу, который берёт
из БД настоящий потребитель. Пробный запрос по новому адресу не может обнаружить, что приложение
пойдёт по старому.

**Обобщение, за пределами этой задачи.** У сущности бывает несколько полей с адресом, и то, которое
показывает интерфейс (`pin-server-card.tsx`, `delete-pin-server-dialog.tsx` — оба выводят `apiUrl`),
не обязано быть тем, по которому ходит код. Отсюда два правила при любом переименовании адреса:

- **Искать все поля-адреса в модели, а не править то, что на виду.** `SELECT *` по строке перед
  правкой, а не `SELECT` по одному ожидаемому столбцу.
- **Проверять со стороны потребителя.** Не «новый адрес отвечает», а «приложение доехало»:
  сдвинулся `updatedAt` у заданий, появилась запись в логе, изменился статус. Синтетическая проба
  по имени проверяет имя — и только его.

**Итог инцидента:** починено 18:37 UTC, простой ~20 минут. Пострадавших нет — в `PinJob` за это
окно ни одной записи.

##### 🔍 Побочная находка из той же выборки: пиннинга нет с 22 июня

Проверка «сдвинулся ли `updatedAt`» дала чистый результат, но заодно показала состояние всей
таблицы:

| Статус    | Строк | Свежесть `updatedAt`  |
| --------- | ----- | --------------------- |
| `PINNED`  | 312   | не позже 22 июня 2026 |
| `FAILED`  | 29    | не позже 22 июня 2026 |
| `QUEUED`  | 3     | не позже 22 июня 2026 |
| `PINNING` | 2     | не позже 22 июня 2026 |

**Ни одной записи за семь недель.** Плюс пять заданий (`QUEUED` + `PINNING`) висят незавершёнными с
22 июня — то есть очередь не просто пуста, она осталась в незакрытом состоянии.

⚠️ **Совпадение по дате, которое стоит проверить, а не отмахнуться:** узел
`animatrona-gateway` выведен из эксплуатации примерно **17–21 июня 2026** (см.
`infra/animatrona-gateway/README.md`). Пиннинг прекращается ровно на границе этого окна.

**✅ Ответ владельца (2026-08-08): контент с июня не добавлялся.** Значит очередь простаивает
законно, пиннинг **не был сломан** все эти недели — им просто не пользовались. Пять зависших
заданий объясняются тем же выводом узла из эксплуатации: работа прервалась на полпути, новых
заданий с тех пор не поступало.

Остаются два хвоста, оба небольшие и оба — задачи трекера, не инфраструктуры:

- [ ] Пять заданий (`QUEUED` + `PINNING`) с 22 июня — закрыть или перезапустить. Сейчас они
      искажают любую будущую диагностику: выглядят как «работа идёт», хотя не идёт.
- [ ] ⚠️ **Пиннинг не проверен целиком с июня.** Сегодня починен адрес, по которому он ходит, но
      сквозной проверки «задание доехало до `PINNED`» не было семь недель. Проба, давшая `401`,
      доказала достижимость сервиса, а не работоспособность цепочки.

⛔ **Не путать «починили» с «проверили».** Единственная честная проверка — один настоящий пин
небольшого файла до статуса `PINNED`. Пока его не было, состояние подсистемы — «должно работать»,
а не «работает».

⚠️ Смежная нестыковка, вскрытая тем же разбором и **существовавшая до нас**: по `apiUrl` код зовёт
кубовские ручки (`/api/v0/pin/ls`, `/api/v0/pin/rm`), а адрес и раньше (`ipfsstor4`), и теперь
(`pin1`) ведёт на `pin-queue`, где таких эндпоинтов нет. Значит эта ветка либо мертва, либо тихо
отказывает. Задача трекера, не инфраструктуры — вынести владельцу отдельно.

##### ⛔ ОТКРЫТО, приоритет выше уборки: секреты на s3 не покрыты бэкапом

**Утверждение «на s3 бэкапить нечего» перестало быть верным сегодня.** Оно записано в
[backup-architecture.md:186](/.claude/docs/backup-architecture.md) («на s3 нет прод-БД, бэкапить
нечего») и было правдой ровно до M2. Теперь на s3 лежит три вещи, которых там раньше не было:

| Файл на s3                                 | Что это                              | Цена потери                                                                                                                                |
| ------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/home/deploy/lego/acme-dns-accounts.json` | 3 per-name аккаунта acme-dns         | ⛔ **невосстановимо без владельца** — регистрация закрыта, новый аккаунт даст новые `fulldomain` → переделывать три `CNAME` у регистратора |
| `infra/traefik/acme/acme.json`             | приватные ключи всех сертификатов s3 | восстановимо перевыпуском, но упирается в лимит LE на дубликаты (5/неделю)                                                                 |
| `infra/traefik/auth/`                      | `basicAuth` дашборда                 | восстановимо генерацией новой пары                                                                                                         |

Существующий `cron acme-dns-backup-s2` (03:30) снимает **только s2** — там свой
`acme-dns-accounts.json` с ключом зоны. Файл на s3 другой, содержит другие аккаунты, и под этот
джоб не попадает вовсе.

⚠️ **Опаснее всего первая строка, и опаснее, чем кажется.** Потеря не «перевыпустим и забудем», а
«нужен владелец, вручную, у регистратора, три записи». То есть восстановление упирается в человека
и во внешний сервис — ровно то сочетание, которое превращает часовой инцидент в дневной.

- [ ] Распространить бэкап аккаунтов acme-dns на s3 (тот же механизм, что для s2) **либо** положить
      три аккаунта в SOPS-хранилище (`.enc`) как остальные секреты.
- [ ] Поправить утверждение в `backup-architecture.md` — оно теперь дезинформирует.
- [ ] Решить по `acme.json`: бэкапить или сознательно принять перевыпуск как способ восстановления
      (тогда записать это явно, чтобы в инцидент никто не искал несуществующий бэкап).

##### Уборка — отдельным заходом, после недели без инцидентов

⛔ **Не делать в окне переезда.** Каждый пункт ниже — это удаление пути отката. Пока не набралась
неделя нормальной работы, они стоят ровно там, где стоят.

- [ ] Пилотные порты `8090`, `8443` — убрать из `TCP_PORTS`/`UDP_PORTS` в `infra/firewall/ports.s3.env`.
- [ ] Порт `81` (админка NPM) — оттуда же, вместе с удалением самого NPM.
- [ ] Контейнер и данные NPM (`/opt/npm`) — после снятия бэкапа в долгое хранение.
- [ ] Публикация портов приложений на хост — **кроме `3021` у `driving-school`**: там Socket.IO
      ходит через хостовый порт, это не путь отката, а рабочая схема.

⚠️ Пункты связаны порядком: пока цел NPM, нужны и `81`, и пилотные порты. Убирать по одному
и в обратном порядке к тому, как заводили.

**M3 — решение по s2**

- [ ] Месяц e2e-прогонов на s3 без инцидентов, связанных с прокси
- [ ] План переезда s2 с учётом: rollout-профиль переписан на healthcheck; ~40+ доменов, из них
      часть на собственных доменах через `http`. ⚠️ Пункт «`gateway.letar.best` остаётся на nginx»
      снят 2026-08-07 — имя уходит с s2 совсем, см. §57
- [ ] Решение принимается **только после закрытия §18.7** — два незакрытых фронта на единственном
      прод-сервере одновременно не открываем

### Связь с другими треками

- **§17 (Kamal)** — пункт DoD «решён вопрос NPM vs kamal-proxy» закрывается этим треком в пользу
  «ни то, ни другое»: zero-downtime у нас уже свой (rollout-профиль, §18.6), а edge едет на
  Traefik. Сам Kamal тем самым окончательно вытеснен.
- **§18.7** — блокирует M3, но именно он же даёт основную выгоду от M1/M2.
- **§18.8** — секреты Dynadot едут тем же конвейером `.enc`.

---

## §49 — Firewall: `ufw` неактивен на обоих серверах, но включить его «как есть» — иллюзия защиты ✅ ЗАКРЫТО (2026-08-07)

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

**Уровень 2 (страховка от рецидива) ✅ ПРИМЕНЁН 2026-08-07.** Default-deny в `DOCKER-USER` на
внешнем интерфейсе: что бы кто ни опубликовал завтра без `127.0.0.1`, наружу оно не выйдет без
явного разрешения.

Выбран **вместо** массового деплоя: из 17 баз к тому моменту закрылась деплоем только одна
(`studio-db`), а из оставшихся 16 пять приложений под hard e2e-gate — с гонкой из §51 один такой
цикл занимал до семи прогонов. Одно правило закрыло все 16 сразу и не зависит от того, что
написано в compose. Правки уровня 1 доезжают деплоями постепенно, как второй слой.

Итоговая конфигурация на s2 (`eth0`, обе таблицы):

```
-A DOCKER-USER -i eth0 -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
-A DOCKER-USER -i eth0 -p tcp -m multiport --dports 80,443,53 -j RETURN
-A DOCKER-USER -i eth0 -p udp -m udp --dport 53 -j RETURN
-A DOCKER-USER -i eth0 -j DROP
```

Три вещи, без которых это не сработало бы (или создало ложное чувство закрытости):

1. **IPv6.** Docker публикует и на `[::]` — в `docker ps` это видно как `[::]:3101->80/tcp`.
   `iptables` шестую версию не трогает вообще. Только-IPv4 правило оставило бы все 16 баз
   доступными по IPv6 при зелёном отчёте. Правила продублированы в `ip6tables`.
2. **Персистентность — не `netfilter-persistent save`.** Он сохранит заодно динамические правила
   Docker, и при загрузке они восстановятся протухшими. Сделано скриптом
   `/usr/local/sbin/docker-user-firewall.sh` + systemd-юнит `docker-user-firewall.service`
   (`After=docker.service`, `Type=oneshot`), скрипт идемпотентен (`-F` перед добавлением).
   Голый `iptables -I` не переживает перезагрузку — именно так в §37 и потерялись прежние DROP.
3. **Проверка снаружи, а не `ss` с самого сервера.** `ss` показывает сокеты, а не достижимость.
   Пробы шли с s3: `5441`, `5437`, `3100` — закрыты; `letar.best`, `auth`, `kami` — `200`.

**Порт 81 (админка NPM) намеренно не попал в allow-list.** Решение владельца: путь
`https://npm.s2.letar.best` правило не задевает — запрос приходит на 443 и дальше форвардится на
`localhost:81` **внутри контейнера NPM**, то есть через `eth0` и цепочку `FORWARD` не идёт.
Проверено до применения (`200`) и после (`200`), голый `http://<IP>:81` при этом закрыт. Умер
ровно тот путь, где пароль от прокси всех сайтов ходил открытым текстом. Запасной вход, если
HTTPS когда-нибудь подведёт, — `ssh -L 8081:localhost:81`; правило его не блокирует, потому что
матчит `-i eth0`, а туннель приходит по loopback.

**Уровень 3 (то, с чего начинали).** `ufw` для хостовых служб — SSH и всё, что слушает сам хост
мимо Docker. Ценность реальная, но **малая по сравнению с уровнем 1**, и включать его надо
последним, когда уже понятно из `ss -tulnp`, что именно слушает хост.

Порядок включения без потери связи:
`ufw allow 22/tcp` → `ufw allow 80,443/tcp` → `ufw allow 53` (tcp+udp) → `ufw allow 3100/tcp`
→ и только потом `ufw enable`. Подстраховка обязательна: `echo 'ufw disable' | at now + 10 min`
перед включением, снять `atrm` после подтверждения, что SSH жив из нового окна.

### ⛔ IPv6: `DOCKER-USER` не закрывает его вообще — первое «готово» было ложным

**Найдено 2026-08-07, уже после того как s2 отчитался зелёным.** Самая важная часть этой секции,
потому что неверная конфигурация выглядела в точности как верная.

`ip6tables -A DOCKER-USER … -j DROP` применяется без ошибок, показывается в `-S` и **не
блокирует ничего**. Причина: если в демоне не включён `ip6tables` (дефолт; `daemon.json` нет ни
на одном сервере, docker ставился официальным скриптом), DNAT-правил для v6 Docker **не создаёт**,
и опубликованный порт по IPv6 обслуживает userland-процесс `docker-proxy` — он слушает
`[::]:<порт>` как обычная программа на хосте. Соединение терминируется хостом и идёт в `INPUT`,
а `DOCKER-USER` хукается в `FORWARD`.

Диагностика в одну команду:

```bash
ps aux | grep docker-proxy
# root … /usr/bin/docker-proxy -proto tcp -host-ip :: -host-port 5499 …
#                                          ^^^^^^^^^^ v6 идёт мимо FORWARD
```

**Что это значило по факту.** После первого «всё зелёное» на s2 базы оставались доступны из
интернета по IPv6 — проверка по AAAA дала `5441`, `5437`, `3100` открытыми. Проверяли только
IPv4, поэтому отчёт был честным и при этом неверным.

**Лечится правилами в `ip6tables INPUT`** на внешнем интерфейсе. Три обязательных элемента, без
любого из которых сервер теряется:

1. `-p ipv6-icmp -j ACCEPT` — это NDP и Path MTU Discovery, а не «пинг для удобства». Без него
   IPv6-связность деградирует не сразу и невоспроизводимо;
2. `--dport 22 -j ACCEPT` — SSH по IPv6. Забудешь — отрежешь себе доступ (v4 останется
   запасным, но проверять надо до снятия отката);
3. `-i <внешний интерфейс>` — иначе отрежется loopback и межконтейнерное.

**Структурная альтернатива, отложена:** `"ip6tables": true` в `/etc/docker/daemon.json` заставит
Docker создавать полноценный DNAT и для v6, тогда `DOCKER-USER` заработает единообразно.
Правильнее по сути, но требует рестарта демона, то есть перезапуска **всех** контейнеров —
плановая операция, не походя. Пока живём с двумя механизмами: v4 в `FORWARD`, v6 в `INPUT`.

### Аудит s3 (2026-08-07) — та же болезнь, свои особенности

`ufw` там тоже `enabled`/`inactive` — юнит поднят, фильтра нет. Интерфейс — **`ens3`**, не `eth0`.

**Главная находка s3:** точечные `DROP` из §37 для `e2e-postgres:5499` и `e2e-redis:6380`
существовали **только в `iptables`**. То есть `e2e-postgres` с дефолтными `e2e`/`e2e` был
реально доступен из интернета по IPv6 с 2026-07-30 до 2026-08-07.

⚠️ **Firewall здесь смягчение, а не починка.** Ротация credentials `e2e-postgres` из §37
по-прежнему не сделана и остаётся самой приоритетной задачей этого трека: правило можно снять по
ошибке, пароль от этого не изменится.

**Приём «привязать к `127.0.0.1`» на s3 неприменим** — NPM там в собственной сети `npm_default` и
форвардит на staging через хост-гейтвей `172.17.0.1:<порт>` (все 8 приложений). Loopback уронил
бы весь staging. Единственный рабочий инструмент — default-deny; он совместим, потому что матчит
внешний интерфейс, а трафик от NPM приходит с docker-бриджа.

**Allow-list s3 шире, чем s2**, и каждое расширение осознанное:

| Порт         | Почему открыт                                                                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 80, 443      | NPM                                                                                                                                                                                     |
| 81           | админка NPM — **HTTPS-пути к ней на s3 нет** (проверены все 16 proxy hosts). Резать нельзя, пока не заведён домен с сертификатом; заводить не стали — §48 всё равно ведёт s3 на Traefik |
| 4001 tcp+udp | swarm `kubo` (IPFS) — входящие нужны для пиринга. `5001`/`8080` у него уже на loopback                                                                                                  |
| 8090, 8443   | живой пилот Traefik (§48)                                                                                                                                                               |

`53` на s3 **не нужен** — `acme-dns` живёт на s2.

⚠️ **У `deploy` на s3 нет `sudo` вообще.** `iptables`/`ufw`/`at`/`apt-get` напрямую недоступны.
Обход — привилегированный контейнер (`docker run --rm --net=host --cap-add=NET_ADMIN`, для записи
на хост — `--privileged --pid=host … nsenter -t 1`), пользователь состоит в группе `docker`.
Ловушка для следующего, кто полезет туда чинить сеть.

### Итоговое состояние обоих серверов (2026-08-07)

|                 | s2                             | s3                                        |
| --------------- | ------------------------------ | ----------------------------------------- |
| Интерфейс       | `eth0`                         | `ens3`                                    |
| IPv4            | default-deny в `DOCKER-USER`   | default-deny в `DOCKER-USER`              |
| IPv6            | default-deny в `INPUT`         | default-deny в `INPUT`                    |
| Открыто наружу  | 22, 80, 443, 53 tcp+udp        | 22, 80, 443, 81, 4001 tcp+udp, 8090, 8443 |
| Персистентность | `docker-user-firewall.service` | `docker-user-firewall.service`            |

Скрипт `/usr/local/sbin/docker-user-firewall.sh` на каждом сервере **свой** — allow-list разный.
Копировать между серверами нельзя: s2-версия на s3 одновременно откроет лишнее (`53`) и сломает
IPFS (нет `4001`).

Проверка на обоих — снаружи, по IPv4 **и** IPv6, с контрольным заведомо закрытым портом `59999`.
Публичные сервисы живы: `letar.best`/`auth`/`npm.s2` → `200`; `studio-stage` → `200`,
`media.letar.best/v/` → `403` (штатная referer-защита).

⚠️ **Урок про проверки, стоивший половины дня.** Наличие правила в выводе `-S` не доказывает,
что оно работает: оно может быть синтаксически верным, применённым и при этом нерабочим.
Доказательство — только проба снаружи, и обязательно с контрольным портом: без контроля «порт не
ответил» неотличимо от обрыва сети или опечатки в адресе. Именно контрольная проба на `59999`
отделила настоящую находку от «наверное, не достучались».

### Опыт с хостовым портом (2026-08-07) — закрыл последнее белое пятно §49

Оставался один непроверенный вопрос: не режет ли что-то выше уровня ОС (панель провайдера). В
панель не пошли намеренно — она говорит, **что настроено**, а нужно было знать, **что работает**.
За день до этого декларация и поведение разошлись трижды, так что проверяли опытом.

**Схема.** Поднять на хосте (не в Docker) слушателя на неиспользуемом порту и постучаться снаружи.
Хостовый слушатель идёт в `INPUT`, а default-deny уровня 2 живёт в `FORWARD` (`DOCKER-USER`) и
касается только контейнеров. Значит по IPv4 такой порт обязан быть открыт, если выше нас никто не
фильтрует. Предварительно сверили `iptables -S INPUT` → `-P INPUT ACCEPT`, блокирующих правил нет:
без этой сверки опыт был бы испорчен нашими же правилами.

**Результат:**

```
v4  185.28.85.195:59998        → OPEN     (слушатель поднят)
v6  [2a13:d207:1b4::1]:59997   → CLOSED   (слушатель поднят)
v4  185.28.85.195:59999        → CLOSED   (контроль, никто не слушает)
```

Два вывода:

1. **Фильтрации у провайдера нет.** Всё, что слушает хост мимо Docker, доступно из интернета.
   Отсюда — уровень 3 (`ufw` для хостовых служб) не «остаточный пункт», а реальная незакрытая
   поверхность. Приоритет поднимается обратно.
2. **`ip6tables INPUT` работает и для обычных хостовых процессов**, не только для
   `docker-proxy`-обёрнутых контейнерных портов. Это вторая независимая проверка правила из §49 —
   на другом типе процесса, чем тот, ради которого оно писалось.

### ⚠️ Первый прогон дал ложный результат — поймано положительным контролем

Первая попытка показала **все три порта закрытыми**, включая тот, что обязан был отвечать. Вывод
«фильтрация есть» напрашивался сам.

Причина: `s2.letar.best` резолвится **только в IPv6** — у зоны нет A-записи вообще. А у bash
`/dev/tcp/<хост>/<порт>` нет флага форсировать протокол. Поэтому «IPv4-тест» по имени хоста на
самом деле целиком шёл по IPv6, где наш default-deny честно всё и закрывал.

Разоблачил подмену **положительный контроль**: в том же ошибочном прогоне `443` показал `OPEN` —
хотя по логике «фильтрация режет всё» он был бы закрыт. Значит канал жив, а закрытость остальных
означает что-то другое. Перезапустили по **явным IP**, и картина стала правильной.

Отсюда два правила проверки, дополняющие «всегда бери контрольный порт» из §49:

- **Проверяй по явному IP, не по имени хоста.** Имя может быть одностековым, и тогда протокол
  выбирает резолвер, а не ты. Инструменты вроде `/dev/tcp` молча соглашаются.
- **Контроль нужен не только отрицательный, но и положительный.** Заведомо закрытый порт ловит
  «дошли ли мы вообще»; заведомо **открытый** ловит «не подменился ли протокол/адрес». Здесь
  сработал именно второй, первого бы не хватило.

**Побочная находка: у `s2.letar.best` нет A-записи, только AAAA.** То есть штатный доступ к серверу
по имени (в том числе SSH при деплое) идёт по IPv6. Следствия:

- порт `22` в `ip6tables INPUT` был не перестраховкой, а **несущей конструкцией** — забудь мы его,
  доступ по имени отвалился бы сразу;
- при проблемах с IPv6-связностью запасной путь — только явный IPv4-адрес `185.28.85.195`;
- любая проверка вида «резолвится, значит по v4 доступно» на этой зоне врёт. Класс тот же, что у
  TUN-DNS из [electron-net-fetch-tun-vpn.md](/.claude/docs/electron-net-fetch-tun-vpn.md), но
  причина другая: там врал резолвер клиента, здесь одностековая сама зона.

### Перепись хостовых слушателей (2026-08-07) — что на самом деле составляет уровень 3

Таблица портов выше собрана из `docker ps` и покрывает только **контейнерные** порты. Хостовые
слушатели — то есть всё, что уровень 2 не касается в принципе, потому что их трафик идёт в `INPUT`,
а не в `FORWARD`, — не переписывал никто ни разу. Опыт с хостовым портом показал, что этот слой не
фильтруется ничем, так что перепись стала обязательной: без неё оценка «уровень 3 — мелочь»
оставалась догадкой.

**s2 — хостовых процессов ровно два:**

| Порт            | Процесс   | Нужен снаружи                                                        |
| --------------- | --------- | -------------------------------------------------------------------- |
| `22` tcp        | `sshd`    | да                                                                   |
| `55555` tcp+udp | `rslsync` | да — без него пиры Resilio не соединяются напрямую                   |
| `3838` udp      | `rslsync` | **нет** — обнаружение пиров в локальной сети, в интернете бесполезно |

Всё остальное на s2 — `docker-proxy`, то есть уже под уровнем 2. Контейнеров в `network_mode: host`
на s2 нет.

**Значит уровень 3 на s2 — четыре правила**, а не неизвестного размера работа. Ожидание
подтвердилось, но подтвердилось **замером**, а не рассуждением — и попутно нашлось то, чего в
ожидании не было (см. ниже).

**s3** — снимали без `sudo` (у `deploy` его там нет), поэтому колонка процесса пустая. Порты и
привязки видны, и этого хватает: всё публичное совпадает с уже покрытым allow-list'ом §49, кроме
одного — **`*:42080` tcp, не опознан**. Единственная точка на обоих серверах, про которую не
известно ничего. Опознание — открытый пункт DoD.

⚠️ **Найден контейнер в `network_mode: host`** — `animatrona-pin-queue` на s3. Слушает
`127.0.0.1:8080`, наружу не торчит, живой проблемы нет. Но он **безопасен по факту привязки, а не
по замыслу**: в host-режиме ничто не мешало бы ему сесть на `0.0.0.0`, и тогда `DOCKER-USER` его не
закрыл бы — трафик host-контейнера идёт в `INPUT`. Отсюда постоянный пункт для любой будущей
проверки: `docker ps --filter network=host` смотреть **отдельно**, потому что в общей картине такие
контейнеры неотличимы от хостовых процессов и при этом выпадают из защиты уровня 2.

### ⛔ Побочная находка: дока предписывала открыть админку бэкапов всему интернету

Всплыло при сверке, нужны ли порты `rslsync` снаружи.
[backup-architecture.md](/.claude/docs/backup-architecture.md) в разделе про починку синхронизации
предписывала поднять веб-админку Resilio так:

```json
"webui": { "listen": "0.0.0.0:8888", "login": "admin", "password": "resilio2026" }
```

— и открыть `http://<server-ip>:8888`. То есть админку синхронизации **бэкапов**: всему интернету,
по plain HTTP (логин и пароль уходят открытым текстом), с придуманным словарным паролем. Последнее
прямо запрещено [security.md](/.claude/rules/security.md).

**Живой дыры не было** — `8888` в переписи отсутствует, webui выключен. Опасна была именно
инструкция: она создавала дыру у следующего, кто полезет чинить синхронизацию, причём в момент,
когда он занят другой проблемой и не думает о доступе.

Переписано на `127.0.0.1:8888` + SSH-туннель + `openssl rand`. Заодно там же поправлено, что раздел
описывал s1 (выведен 2026-06-20), а живой `rslsync` — на s2.

**Урок:** перепись слушателей стоит делать не только ради firewall. Она даёт список того, что
реально работает, — и по нему проверяются утверждения доков. Здесь именно отсутствие порта в
выводе `ss` отличило «у нас дыра» от «у нас опасная инструкция», а это разные задачи с разной
срочностью.

### Definition of Done

- [x] Снимок с s2 получен (BlackCove, тред `firewall-audit-s2`, 2026-08-06): `ufw` действительно
      `inactive`, правил `ufw-*` в ruleset нет, `DOCKER-USER` пуст, 17 Postgres на `0.0.0.0`.
      Таблица портов сошлась с compose, кроме `media-nginx:3101` — его compose-замер пропустил
- [x] **Фильтрации выше уровня ОС нет — проверено опытом 2026-08-07.** Панель провайдера не
      смотрели намеренно: она говорит, что настроено, а нужно было знать, что работает. Разбор —
      подраздел «Опыт с хостовым портом» ниже. Итог: **уровень 3 нужен по-настоящему**, голые
      хостовые порты не защищены ничем
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
- [ ] **`media-nginx:3101` на s2 — не «порт, который надо закрыть», а контейнер, которого там
      не должно быть.** Разобрано 2026-08-06, четыре независимых признака:

      1. `media.letar.best` — **CNAME на `s3.letar.best`** (проверено через `8.8.8.8` и
         `1.1.1.1`, локальный резолвер под TUN-VPN отдаёт синтетику и для этого не годится);
      2. все потребители ходят именно на `media.letar.best` — `MEDIA_SERVER_URL`,
         CSP `media-src`/`connect-src`, серверный прокси-роут приложения-потребителя;
      3. в NPM на s2 записи про него **нет вообще** (все 26 proxy host'ов сверены);
      4. в логах контейнера за ~9 дней — только сканеры и пробы на голый IP, **ни одного
         запроса `/v/<videoId>`**. Единственный реальный маршрут в его конфиге — `/v/` с
         referer-whitelist по нашим доменам, то есть легитимный трафик обязан приходить с
         Referer'ом и через `media.letar.best`. Его тут нет.

      Плюс сосед по тому же compose, `media-api`, на s2 в состоянии `Created` — никогда не
      запускался. Похоже, стек когда-то подняли на s2 частично и забыли.

      **Поэтому правку compose делать нельзя:** `infra/media-server/docker-compose.production.yml`
      — это боевой стек **s3**, а NPM на s3 форвардит через хост-гейтвей `172.17.0.1:<порт>`,
      не по именам контейнеров. Привязка к `127.0.0.1` в этом файле уронила бы реальную раздачу
      медиа на s3. Правильное действие — остановить/удалить лишний контейнер **на s2**, а файл
      не трогать. Это действие на сервере → решение владельца + BlackCove.

      **✅ Сделано 2026-08-07:** владелец согласовал, BlackCove остановил `media-nginx` на s2
      (`docker stop`, без `rm` — ждём сутки-двое). Порт `3101` больше не публикуется. Тома
      оказались безопасными: оба bind-монта локальной ФС s2, оба `ro`. Раздача на s3 не
      пострадала (`media.letar.best` → `188.127.235.141`, `403` на `/v/` без Referer — штатное
      поведение referer-защиты).

      ⚠️ **Всплыло попутно:** на s2 крутятся ещё `media-worker` и `media-redis` (Up 3 weeks),
      о которых в исходном анализе не было ни слова. Проверены: воркер подключён, но вхолостую —
      в redis 2 служебных ключа, `/data/processed` **пуст** (4.0K, только inode). Осиротевших
      данных нет, стек можно удалять целиком.

      **✅ Удалено 2026-08-07:** все четыре контейнера сняты по именам (`docker rm`), compose не
      запускался. Медийных портов на s2 не осталось; раздача на s3 цела (`media.letar.best/v/` →
      `403`, штатная referer-защита).

      ⚠️ **Данные лежат не в Docker volume, а в bind-монтах на хостовый диск s2** — поэтому
      `docker volume ls | grep media` вернул пусто, и через две недели искать будет нечего, если
      запомнить только имя тома. Запоминать надо **пути**:

      | Что | Где |
      | --- | --- |
      | `media-nginx` | bind `/data/processed` (ro) |
      | `media-api`, `media-worker` | bind `/data` (rw) |
      | `media-redis` | named volume `5f5c2ee520424a933fd3c7c3d81d0faca01ed49d9e1b274370e7518cc38124bf` |

      ⛔ **При уборке ~2026-08-21 не сносить `/data` целиком не глядя.** Это каталог верхнего
      уровня на хосте, и пуст был проверен только `/data/processed`. Сначала смотреть, что внутри
- [x] Проверено, что порт действительно закрыт: **скан снаружи (с s3), не `ss` с самого
      сервера** — `5441`, `5437`, `3100` закрыты, `letar.best`/`auth`/`kami` отдают `200`
- [x] **Уровень 2 — `DOCKER-USER` default-deny, персистентно** (2026-08-07). IPv4 + IPv6,
      systemd-юнит `docker-user-firewall.service`, откат через `at` был взведён до применения и
      снят после зелёной проверки снаружи. **Это то, что реально закрыло 16 оставшихся баз** —
      деплоями к тому моменту закрылась одна из семнадцати
- [ ] Уровень 3 — `ufw` (или `iptables INPUT`) для хостовых служб, SSH не потерян.
      ⚠️ **Приоритет поднят обратно 2026-08-07** — раньше стоял «остаточный» на предположении, что
      по IPv4 мимо Docker слушает мало что и провайдер, возможно, фильтрует. Опыт с хостовым портом
      показал: провайдер не фильтрует ничего, `-P INPUT ACCEPT`, любой хостовый слушатель на s2
      доступен из интернета. По IPv6 фильтр уже стоит, по IPv4 — **единственная оставшаяся
      незакрытая поверхность обоих серверов**.
      ✅ **Список слушателей снят** (см. «Перепись хостовых слушателей» выше) — на s2 это `sshd` и
      `rslsync`, то есть уровень 3 сводится к четырём правилам:

      | Правило | Порт |
      | ------- | ---- |
      | allow | `22` tcp |
      | allow | `55555` tcp+udp — пиринг Resilio |
      | **drop** | `3838` udp — обнаружение пиров в локальной сети, снаружи бесполезно |
      | default | deny |

      ⚠️ **Не забыть, что SSH к `s2.letar.best` идёт по IPv6** (A-записи у зоны нет) — по IPv4
      доступ только по явному `185.28.85.195`. Откат взводить до применения, как в уровне 2
- [x] **`*:42080` на s3 опознан и закрыт снаружи** (2026-08-08). Это `animatrona-pin-queue` в
      `network_mode: host`; `/health` отвечал без токена, раскрывая peer ID Kubo. Закрыт правилом
      `iptables -I INPUT -i ens3 -p tcp --dport 42080 -j DROP`, проверено снаружи с двумя
      контролями + локальный `curl` (чтобы отличить «закрыли порт» от «уронили сервис»).

      ⚠️ **Loopback-бинд здесь не подходит, и это неочевидно.** У сервиса есть внешний маршрут —
      `ipfsstor4.letar.best` через NPM, форвард на `172.19.0.1:42080` (`PLAN-INFRA.md:4212`).
      Первая версия правила фильтровала по источнику (`! -s 127.0.0.1`) и зарезала его —
      `ipfsstor4` отдавал `000`. Починено сужением по интерфейсу. Заготовленная пересборка с
      `BIND_ADDR=127.0.0.1` сломала бы то же самое ещё раз, поэтому отменена: слушатель на
      loopback не принимает обращения на адрес docker-бриджа.

      ⚠️ **Формулировка «маршрут», а не «потребитель», — намеренная.** Я сначала записала
      «используется снаружи легитимно», приняв существование конфига за доказательство
      использования. Проверка лога (`proxy-host-3_access.log`, 4 дня до ротации) показала 18
      строк: 16 — сканеры с 404, 2 — собственные health-check'и проверяющего. **Реальных внешних
      обращений не обнаружено.** На решение это не влияет — маршрут существует и сломался бы
      молча независимо от частоты использования, — но разница между «есть конфиг» и «есть
      трафик» здесь стоила бы неверного вывода в обе стороны.

      **Урок:** перед закрытием порта проверять не только код потребителей, но и конфиги прокси.
      Греп по коду `animatrona` показал «потребителей нет» — и это было правдой лишь для одного
      из двух каналов. Записано в [verification-pitfalls.md](/.claude/docs/verification-pitfalls.md).

      **Персистентность закрыта 2026-08-08.** Правило добавлено третьей секцией в
      `/usr/local/sbin/docker-user-firewall.sh` на s3 (`-D` перед `-I` для идемпотентности),
      существующие две секции не тронуты. Проверено `systemctl restart docker-user-firewall` —
      после рестарта все три секции встают заново, и четыре пункта проверки пройдены повторно,
      включая `ipfsstor4` через NPM.
- [x] **Уровень 2 применён на mail-сервере** (2026-08-08). Сервер не входил в исходный периметр
      §49, всплыл при подготовке §57: `DOCKER-USER` был пуст при 8 портах наружу, притом что `ufw`
      там единственный из трёх реально активен (`-P INPUT DROP`) — и ровно поэтому опаснее,
      создавал впечатление защищённости.

      Итоговый ruleset — в [firewall.md](/.claude/docs/firewall.md). Разрешены `80,443` (сайты),
      `25,465,587,993` (почта), `4001` (libp2p swarm), `8080`; `81` закрыт, доступ к админке через
      SSH-туннель.

      ⚠️ **`8080`, а не `41080` — и это не опечатка.** `DOCKER-USER` живёт в `FORWARD`, куда пакет
      приходит **после** DNAT, то есть с уже переписанным портом назначения. У relay маппинг
      `41080:8080` не 1:1, поэтому правило по хостовому порту не матчится вовсе. Поймано внешней
      пробой на первом прогоне; чтением `-S` не ловится — строка выглядит правильной. Остальные
      порты 1:1, там разницы нет. Разбор — [firewall.md](/.claude/docs/firewall.md).

      ⚠️ Проверку доставки письмом провести не удалось: канарейка красная независимо от нас
      (см. отдельную задачу). Подтверждение взято из логов maddy вокруг момента применения
      (12:31 UTC) — новых `refused`/`timeout` не появилось, картина до и после одинаковая.

      **Попутно снято расхождение:** репозиторий объявлял swarm-порт relay как `41001`, на сервере
      `4001`. Попади `41001` в allow-list, P2P-связность умерла бы тихо. См. §60.
- [ ] Проверить контейнеры в `network_mode: host` **на s2 тоже** — на s3 нашёлся один
      (`animatrona-pin-queue`, слушает loopback, безопасен), на s2 их нет. Это должен быть
      постоянный пункт любой будущей проверки: такие контейнеры выпадают из-под `DOCKER-USER`
- [x] **Админка NPM (:81, plain HTTP) — закрыта снаружи** (2026-08-07). Сначала решили не
      трогать (2026-08-06), потом вопрос вернулся сам: уровень 2 отрезает `:81` вместе с
      остальным, и BlackCove правильно остановился и переспросил, а не подставил порт в
      allow-list молча. Владелец подтвердил, что HTTPS-путь заведён, и `81` в allow-list не
      добавляли. Проверено `200` до применения и `200` после, голый `http://<IP>:81` закрыт.
      Плейнтекстовый вход, где пароль от прокси всех сайтов ходил по сети открытым, умер
- [x] **То же самое прогнано на s3** (2026-08-07). Точечные `DROP` из §37 нашлись, но **только
      в `iptables`** — то есть `e2e-postgres` с дефолтными `e2e`/`e2e` был доступен из интернета
      по IPv6 с 2026-07-30. Закрыт вместе с остальным
- [x] **Закрыт IPv6 на обоих серверах** через `ip6tables INPUT` (2026-08-07) — `DOCKER-USER`
      его не покрывает в принципе, разбор выше. Проверено снаружи по AAAA с контрольным портом
- [x] ⚠️ **`e2e-postgres` с дефолтными `e2e`/`e2e` — закрыт 2026-08-07, но не ротацией.** Разбор
      показал, что сервисом никто не пользуется: он **выведен из эксплуатации**, а не переименован
      секрет. Ротация мёртвого сервиса оставила бы ту же дыру с другим паролем. Подробности,
      доказательство и срок удаления волюма — §53
- [ ] Структурная альтернатива двум механизмам: `"ip6tables": true` в `/etc/docker/daemon.json`,
      чтобы v4 и v6 одинаково ходили через `DOCKER-USER`. Требует рестарта демона — плановое окно
- [x] `.claude/docs/server-provision.md` §2.2 ставил `ufw` через `apt-get install` и **больше
      о нём не вспоминал** — ни `ufw allow`, ни `ufw enable`. Дописан раздел 2.5; заведён
      [firewall.md](/.claude/docs/firewall.md) с разбором «ufw не фильтрует Docker-порты»
- [x] Правило про `127.0.0.1:` в публикации портов внесено в чек-лист заведения сервиса —
      [firewall.md § Чек-лист](/.claude/docs/firewall.md), обобщение того, что
      [redis-security.md](/.claude/docs/redis-security.md) уже требовал только для Redis

---

## §50 — Прод-деплой молча откатывается с `--frozen-lockfile` на обычный `bun install` 🟡 ЧАСТИЧНО (диагностика — 2026-08-10)

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

### Что проверить первым делом — ✅ проверено 2026-08-06, гипотеза скрипта опровергнута

Гипотеза комментария («виноваты неинициализированные submodule») снята с обоих серверов
(`git submodule status`, BlackCove):

| Сервер           | Неинициализированные (`-`)                                                                                         | Фолбэк в логе                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **s2** (прод)    | 6: `.claude/private`, `aboi-e2e`, `domwellbes-e2e`, `driving-school-e2e`, `poster-microtext-desktop`, `studio-e2e` | срабатывает                                                 |
| **s3** (staging) | **ни одного** — инициализирован весь набор из 14                                                                   | срабатывает **каждый** из 7 прогонов staging-деплоя за день |

**Вывод: на s3 безобидное объяснение исключено фактом.** Там нечему быть неинициализированным, а
`--frozen-lockfile` падает стабильно на каждом заходе. Значит комментарий скрипта («реальные версии
пакетов не меняются») описывает намерение, а не проверенное поведение — как минимум на s3
действует другая причина.

На s2 наличие шести неинициализированных путей делает безобидное объяснение **возможным**, но не
подтверждает его: там могут действовать обе причины сразу, и различить их нечем ровно по той же
причине, по которой заведён этот трек — фолбэк не показывает, что именно разошлось.

Третья, ещё не исключённая версия (BlackCove): расхождение не в версиях пакетов, а между
окружением, где `bun.lock` порождается (Windows-машина разработчика), и Linux-сервером — другая ОС
и arch. Это тоже не «уводы версий», но и не про submodule.

⚠️ Не делать вывод из того, что «submodule обычно инициализированы»: на s2 живёт не весь набор
приложений, а `git submodule update` (п.2) неинициализированные не подтягивает по определению.

### Что сделать

- [x] Снять `git submodule status` с s2 и s3 — снято 2026-08-06, см. таблицу выше
- [x] Сделать фолбэк **диагностируемым** (2026-08-10) — после фолбэка (`bun install` без
      `--frozen-lockfile`) скрипт сравнивает `bun.lock` с закоммиченным (`git diff --stat --
      bun.lock`) и печатает конкретную разницу вместо общей жёлтой строки. Пустой diff — зелёная
      строка «расхождение было безобидным»; непустой — красная строка с самим `diff --stat`.
- [x] Убрать уничтожение улики (2026-08-10) — перед `git checkout -- bun.lock` в начале Step 2
      скрипт теперь сначала проверяет, не разошёлся ли уже `bun.lock` (мог остаться от фолбэка
      **предыдущего** деплоя, если тот запускался без `--skip-git` и не дошёл до Step 3, либо если
      предыдущий фолбэк сработал, но следующий Step 2 стёр улику раньше, чем кто-то посмотрел лог)
      — и логирует эту разницу до сброса.
- [ ] **Не решено:** должен ли непустой diff **останавливать** прод-деплой (склоняюсь к да:
      молчаливо установить не те версии хуже, чем не задеплоить). Сознательно не реализовано —
      требует явного решения владельца, не техническая деталь. Пока только громкая видимость.
- [ ] Если причина — отсутствующие submodule: рассмотреть `--filter` для `bun install` вместо
      фолбэка, чтобы ставить только нужные workspace-члены и не трогать lockfile вовсе

**Проверка нового поведения:** живая — на следующем реальном деплое, где фолбэк сработает (судя по
логам s3 — каждый прогон), в логе должна появиться либо `✅ Фолбэк не изменил bun.lock`, либо явный
`git diff --stat` с конкретными пакетами. Со стороны этой сессии (нет доступа к прод-серверам)
проверен только `bash -n deploy-affected.sh` (синтаксис) — живой прогон подтверждает BlackCove на
следующем деплое.

---

## §51 — Hard e2e-gate сверяет HEAD всего монорепо, а не то, от чего зависит приложение 🟡 ДВА БАГА НАЙДЕНЫ И ПОЧИНЕНЫ ЖИВЫМ ПРОГОНОМ, конкретный инцидент BlackCove был корректной блокировкой (2026-08-07, код 2026-08-09)

Найдено BlackCove при деплое одного из гейтованных приложений 2026-08-06: цикл
staging → e2e → production пришлось повторить **семь раз**. Ни один повтор не был вызван
приложением — каждый раз между зелёным e2e и стартом прод-деплоя в `main` прилетал чужой
коммит (acme-dns, доки по firewall, перевод портов на loopback, конфиг traefik), и гейт
отклонял production как «код изменился с момента прогона».

**Причина:** `deploy_app(production)` сравнивает буквальный **HEAD корневого репозитория**
с коммитом, на котором прогнали e2e. Любой коммит в `main` инвалидирует уже пройденный гейт
для **всех** гейтованных приложений сразу, независимо от того, затрагивает он их или нет.

### Почему это не «просто параллельная работа»

Владелец подтвердил, что коммиты шли от параллельно работающих агентов. Но параллельная работа
здесь — не аномалия, а постоянный режим: [.claude/rules/agent-mail.md](/.claude/rules/agent-mail.md)
и [.claude/rules/git.md](/.claude/rules/git.md) прямо на неё рассчитаны, а правило «коммить
сразу после готового куска» (§47) её ещё и поощряет — намеренно, как защиту от гонок в рабочем
дереве. То есть частые коммиты в `main` — желаемое поведение, и цена в виде семи прогонов e2e
будет повторяться каждый активный день, когда деплоится гейтованное приложение.

### Чего делать НЕ надо

Напрашивающееся «сравнивать SHA submodule приложения вместо HEAD корня» — **дырка в гейте**.
Приложение зависит от `libs/*` и корневых конфигов, живущих в корневом репозитории: правка в
`libs/forms` уехала бы на прод без повторного e2e. Нынешнее поведение консервативно и в этом
смысле **корректно** — оно избыточно, но не пропускает непроверенного.

### Что предлагается

Сравнивать не весь HEAD и не один submodule, а **замыкание зависимостей приложения**: его
собственный каталог + библиотеки, от которых оно зависит + корневые конфиги, влияющие на сборку
(`nx.json`, `tsconfig*`, `bun.lock`, `deploy-affected.sh`, `Dockerfile.production`). Nx это уже
умеет считать — `nx show projects --affected --files=<изменённые файлы>` / граф зависимостей,
логику писать не с нуля.

Тогда правка в `apps/<другое-приложение>/docker-compose.production.yml` или в `.claude/docs/*`
не инвалидирует гейт, а правка в `libs/forms` — инвалидирует, как и должна.

### Definition of Done

- [x] Найдено место сравнения — **не `dashboard-agent`, а `libs/deploy-mcp/src/server.ts`**
      (`evaluateE2eGate`, вызывается из `deploy_app(production)` в `createDeployMcpServer()`).
      Подтверждено по коду, не по выводу из поведения: `getHeadSha` по умолчанию —
      `originMainSha()` из `libs/deploy-mcp/src/config.ts`, буквальный
      `git rev-parse origin/main`, без какой-либо привязки к конкретному приложению.
- [x] Решено: недосмотр, не осознанный консерватизм — комментарий над `originMainSha()`
      объясняет **почему `origin/main`, а не локальный HEAD** (чтобы не ловить непушнутые
      коммиты других агентов), но не адресует ортогональную проблему «весь репо, а не
      приложение».
- [x] **Реализовано (2026-08-09):** `isAffectedSince(app, sinceSha)` в `config.ts` —
      `git diff --name-only` между коммитом e2e-прогона и `origin/main`; если задет один из
      `ROOT_FILES_INVALIDATE_ALL` (`deploy-affected.sh`, `nx.json`, `bun.lock`,
      `tsconfig.base.json`) — считается затронутым сразу, без обращения к Nx; иначе —
      `nx show projects --affected --base <sinceSha> --head origin/main --type app`, тот же
      паттерн, что уже использует `deploy-affected.sh` для собственного per-app трекинга.
      `evaluateE2eGate` вызывает его только когда `last.commitSha !== head` (посторонний
      коммит), и только если приложение реально affected — добавляет причину блокировки.
      Любая ошибка `git`/`nx` (неглубокий клон и т.п.) — fail-closed, не fail-open: приложение
      считается затронутым, плюс отдельная причина в `reasons`. `isAppAffectedSince`
      инжектируется четвёртым параметром `evaluateE2eGate` (как `fetchStatus`/`getHeadSha`) —
      13/13 юнит-тестов `server.spec.ts` зелёные (3 новых: affected/not-affected/ошибка nx),
      `typecheck:tsgo` чист. `@letar/deploy-mcp` 0.3.0 → 0.4.0.
- [x] **Живой сценарий нашёлся сам собой (BlackCove, деплой `aprel8008`, 2026-08-09) — и вскрыл
      два реальных бага в непротестированном пути `isAffectedSince`, не в идее гейта:**
      1. Функция звала `npx nx`, а не глобальный `nx` — вопреки собственной конвенции монорепо
      (`CLAUDE.md`: «❌ НЕ `bunx nx`/`npx nx`»). На машине BlackCove это либо падает, либо
      резолвится не туда → `execFileSync` бросает → `evaluateE2eGate` ловит и уходит в
      fail-closed (`affected: true` без разбора) — то есть гейт вёл себя ровно как ДО фикса
      §51, посторонние коммиты снова блокировали.
      2. Даже если бы `nx` вызывался верно: текущий Nx (22.6) при непривязанном к TTY stdout
      печатает `nx show projects --affected --type app` как **JSON-массив одной строкой**
      (`["app1","app2"]`), не по имени на строку — подтверждено живым вызовом. Код делал
      `.split('\n')`, что никогда не могло сматчить ни один проект — `isAffectedSince`
      вернула бы `false` **всегда**, независимо от реальной затронутости (пробитие гейта в
      обратную сторону). Пофикшено на `JSON.parse(rawOutput)`.
      3. Попутно найдена нестабильность: тот же вызов с теми же `--base`/`--head` дал один раз
      `false` среди пяти подряд `true` (похоже на гонку демона Nx). Добавлен
      `NX_DAEMON: 'false'` в env вызова — та же защита, что уже стоит в `deploy-affected.sh`
      («крашит plugin workers на серверах, isolated-plugin fork bug»). После этого — 5/5
      стабильных повторов на реальном диапазоне коммитов.
      - **Но конкретно инцидент BlackCove эти баги не объясняют — блокировка была ПРАВИЛЬНОЙ.**
      Разобран точный диапазон (`63c9b8f6..b35c635b`, коммиты, на которые ссылался BlackCove):
      в нём реально изменились `bun.lock` (`chore(deps): safe minor/patch … + nx 23.1.0 →
        23.1.1`, чужой коммит) **и** `deploy-affected.sh` (мой же коммит §66 `c8f3c688`) — оба
      входят в `ROOT_FILES_INVALIDATE_ALL` по конструкции. Прямой вызов
      `isAffectedSince('aprel8008', '63c9b8f6', 'b35c635b')` подтверждает: `{ affected: true,
        reason: 'root-file: bun.lock' }`. То есть даже полностью исправная реализация
      заблокировала бы этот конкретный деплой — просто по другой причине, чем предполагал
      BlackCove («изменения не пересекались с aprel8008» — неверно: `apps/aprel8008`
      (submodule-указатель) тоже стоит в списке изменённых путей того диапазона).
      - Проверено прямыми вызовами на реальном репозитории (не моками): `git diff`/`nx show
        projects --affected` дают ожидаемый результат и для «не затронут» (посторонний коммит
      вне `apps/aprel8008` и без root-инвалидаторов), и для «затронут» (root-файл; commit,
      реально трогающий `apps/dashboard-agent/src/lib/cron.ts`).
      - `@letar/deploy-mcp` 0.4.0 → 0.4.1.
- [x] **Ещё два живых цикла тем же днём (BlackCove, деплой `svoichuzhie`, 2026-08-09) —
      исправленная версия (`28393d64`) работает штатно.** HEAD дважды уезжал вперёд между
      зелёным e2e и стартом прод-деплоя на посторонние doc-коммиты (`libs/forms/PLAN.md`,
      `.claude/docs`) — оба раза гейт корректно заблокировал (правка внутри `libs/forms` — это
      правка в зависимости `svoichuzhie`, инвалидирует по конструкции, даже если сам файл не
      код, см. «Что предлагается» выше), передеплой staging + повторный e2e прошли чисто.
      Обходной путь ниже пока не понадобился — цикл staging→e2e→prod стабильно доходит до
      конца за один-два повтора, не за семь, как в исходном инциденте §51.

### Смежное наблюдение

В том же прогоне `02-auth-redirect.spec.ts:29` (OIDC-редирект) флакует именно в полном наборе
с двумя воркерами: падал трижды, каждый раз проходил и в точечном перезапуске, и в следующем
полном прогоне. Похоже на конкуренцию воркеров под нагрузкой, а не регрессию — но это отдельный
хвост, не про гейт.

### 🆕 Смежная находка — ПОЧИНЕНО (2026-08-09): тот же формат вывода `nx` ломал собственное affected-обнаружение `deploy-affected.sh`

Пока разбирала §51, обнаружила: `deploy-affected.sh:546` определяет affected-приложения при
запуске **без `--app`** (автообнаружение «что задеплоить») тем же вызовом:

```bash
APP_AFFECTED=$(nx show projects --affected --base=$APP_LAST_DEPLOY --head=HEAD --type=app 2>/dev/null | grep -E "^(@[^/]*/)?${APP_FOLDER}$" || echo "")
```

**Подтверждено живым вызовом (2026-08-09, эта же машина, `nx` 22.6).** Поставила искусственный
маркер `.last-deploy/kami` на коммит `apps/kami` пятью изменениями назад и напрямую вызвала
`nx show projects --affected --base=<тот-sha> --head=HEAD --type=app` — вывод, как и в
`isAffectedSince`, пришёл JSON-массивом одной строкой (`["@letar/source","aboi",...,"kami",...]`),
`kami` в нём реально присутствует. Прогон того же построчного `grep -E "^(@[^/]*/)?kami$"` по этой
строке — пусто, ни один интервал не совпадает. Значит `APP_AFFECTED` действительно был всегда
пуст, и ветка «приложение не менялось, пропускаю» срабатывала для КАЖДОГО приложения при каждом
запуске `./deploy-affected.sh` без `--app`, независимо от реальных изменений. Полный прогон
скрипта целиком (`--dry-run` без `--app`) на этой машине не прошёл до конца за 2 минуты — заняло
слишком много времени именно из-за отдельного `nx show projects` (без демона, `NX_DAEMON=false`)
на каждое из ~25 deployable-приложений (~40с на вызов) — это отдельная, не связанная с этим
багом характеристика производительности bare-режима, не проверялось и не чинилось в рамках этой
находки.

**Не перепроверено на самих s2/s3** — фикс сделан и протестирован локально (изолированный вызов
node-парсера на реальном выводе `nx` + отдельный прогон `nx show projects --affected` с реальным
базовым коммитом), но не живым запуском `./deploy-affected.sh` без `--app` на сервере. Практический
эффект бага для прод-эксплуатации остаётся неясен по той же причине, что и раньше: штатный путь
деплоя — `deploy_app` через deploy-mcp (всегда с явным `--app`, использует `isAffectedSince`, а не
эту ветку), bare-режим — резервный канал. Если баг был активен всё это время, это тихий регресс
резервного канала, не подтверждённый прод-инцидент.

**Фикс:** `deploy-affected.sh:546` теперь парсит вывод `nx show projects --affected` через
`node -e` (JSON.parse с фоллбэком на построчный список, если вывод почему-то не JSON) — тот же
приём, что уже применён в `isAffectedSince()` (`libs/deploy-mcp/src/config.ts:152-168`), вместо
построчного `grep -E "^...$"`. `node` выбран, а не `jq`, потому что гарантированно есть на любой
машине, где вообще работает `nx` (Node 24 — часть стека, `jq` отдельная зависимость без гарантии
установки на сервере).

- [x] Проверить: `./deploy-affected.sh` без `--app` реально находит affected-приложения, или
      всегда молчит «Nothing to deploy» — **подтверждено воспроизведением на реальном выводе `nx`
      локально**; живой прогон на s2/s3 не выполнялся (см. выше)
- [x] Если баг подтверждён — тот же фикс, что в `isAffectedSince` (`config.ts`): парсить
      `nx show projects --affected ...` как JSON, не построчным `grep` — **сделано**,
      `deploy-affected.sh:546-563`

---

## §52 — Cron-задачи агента к приложениям падают с `HTTP 401` 🟡 ЧАСТИЧНО (2026-08-07, дедуп+логирование алертов — 2026-08-09)

Замечено BlackCove побочно, при деплое `dashboard-agent` 0.10.0: несколько **несвязанных между
собой** cron-задач к приложениям завершаются `HTTP 401: Unauthorized` — как минимум `studio-*` и
`driving-school-cleanup-api-logs`. Задачи самого агента (бэкапы, health-check, freshness) работают.

### Почему это стоит отдельного трека

Отказ не в одном приложении, а сразу в нескольких у разных владельцев — значит дело, скорее всего,
в общем механизме, а не в конкретной ручке. Наиболее вероятный кандидат — секрет `X-Cron-Secret`,
который проверяет `verifyCronSecret()` из `libs/api-server`: он один на все приложения, и разъехаться
мог как на стороне агента, так и в `.env.docker` приложений.

**Опасность в том, что провал тихий.** Cron-задача падает, но:

- пользователь этого не видит — задачи фоновые (чистка логов, уведомления по таймерам);
- продукт продолжает работать, просто перестаёт делать что-то регулярное;
- сколько это уже длится — неизвестно, `lastRun` показывает факт запуска, а не факт успеха.

То есть класс ровно тот же, что у бэкапов Maddy (§42) и у молчаливого `--frozen-lockfile` (§50):
механизм отключился, а сигнала нет. Первое, что надо выяснить, — не «почему 401», а **с какого
момента**.

### Что сделать

- [x] Сверить секрет: значение у агента против `.env.docker` каждого падающего приложения
- [x] Проверить, не сузилась ли проверка на стороне приложений — **нет**, `verifyCronSecret()`
      не менялся и работает верно (fail-closed, ровно как задумано)
- [x] Задеплоить фикс и убедиться, что задачи перешли в `success` — **подтверждено 2026-08-07**:
      после деплоя `0.11.0` (`b9c94c28`) все шесть ранее падавших задач дали `success 200` при
      ручном прогоне через `/api/cron/jobs/<id>/run`
- [x] Выяснить, как долго длился отказ — **ежедневно с 30 июля по 6 августа** (`error 401` каждый
      день), сегодня `success`. Глубже не видно: Redis хранит не больше 10 записей на задачу.
      Это и есть ответ на «если история так далеко не хранится» — **отсутствие длинной истории
      прогонов само по себе пробел**: определить, когда механизм сломался, по логам нельзя
- [ ] Починить сигнализацию: `CRON_FAILED` шлётся, но восемь дней никого не разбудил.
      ⚠️ Это теперь **главный незакрытый пункт трека**: сам 401 починен, а механизм, обязанный о
      нём сообщить, — нет. Разбор ниже

### Почему `CRON_FAILED` молчал восемь дней (разбор по коду, 2026-08-07)

Путь алерта исправен на всём протяжении: агент шлёт `postDashboardAlert` при любом
`!response.ok`, `/api/alerts` в dashboard принимает, секрет `dashboard` с агентским совпадает.
Ломается не доставка, а то, что происходит дальше. Нашлось **три независимых места, каждое из
которых гасит сигнал беззвучно**:

**1. Дедупликация сворачивает разные задачи в один алерт.** `createAlert()` ищет существующий
активный алерт по `type` + `serverId`:

```ts
const existingAlert = await prisma.alert.findFirst({
  where: { type, status: 'ACTIVE', ...(resolvedServerId ? { serverId: resolvedServerId } : {}) },
})
if (existingAlert) { /* обновляет message у него же */ }
```

`type` здесь — `CRON_FAILED`, один на **все** cron-задачи монорепо. То есть шесть разных сломанных
задач у двух разных приложений дают **один** алерт, в котором `message` от той, что упала
последней. Пять остальных не видны нигде. Чинишь одну — алерт остаётся активным от других;
смотришь на дашборд — видишь одну проблему вместо шести.

Дедупликация сама по себе разумна (иначе `*/5 * * * *`-задача завалила бы базу), но ключ выбран
слишком широкий. Правильный ключ — `type` + `metadata.jobId`: они уже передаются агентом.

**2. `sendNotification` возвращает `false` молча.** Если Telegram выключен или не хватает токена
либо `chatId` — функция просто возвращает `false`, без лога:

```ts
if (telegramEnabled && telegramBotToken && telegramChatId) { return await sendTelegramNotification(...) }
return false
```

А вызывающий код в `/api/alerts` результат **не проверяет** — `await sendNotification(...)` и всё.
Настройка «уведомления фактически некуда слать» неотличима от «отправлено успешно».

**3. `settings.enabled === false` отключает уведомления целиком**, оставляя алерты копиться в БД.
Тоже без следа в логах.

#### Побочный вывод, который можно сделать не заходя на сервер

Уведомления при этом шлются на **каждый** провал (дедупликация касается только записи в БД, не
отправки). Значит при включённом Telegram владелец получал бы сообщение на каждый из шести
провалов ежедневно — восемь дней подряд, около полусотни сообщений. Он их не видел. Отсюда:
**канал уведомлений почти наверняка выключен** (`enabled` или `telegramEnabled`), а алерты всё
это время просто копились в базе.

Ждём подтверждения фактами (`GET /api/alerts/settings` и `GET /api/alerts?active=true`) — но
чинить надо в любом случае все три места, а не только то, которое окажется виновато сегодня.

#### Факты пришли — и опровергли главную версию (BlackCove, 2026-08-07)

Проверка по прод-БД `dashboard` дала три числа, и второе ломает мою гипотезу:

1. `AlertSettings`: `enabled = t`, `telegramEnabled = t`. **Канал доставки открыт** — версия «всё
   выключено» снята.
2. Единственная `ACTIVE`-запись типа `CRON_FAILED` — от **2026-07-05**, `title` про Practice Diary
   Reminders. Пока это выглядит как подтверждение дедупа по `type`: новых строк за восемь дней и не
   должно было появиться, все провалы схлопнулись бы в эту.
3. **Но `message` у неё — `"This operation was aborted"`.** Это текст сетевого abort'а с 5 июля, а
   не 401. А `createAlert()` при дедупе **перезаписывает** `message` (`title` не трогает). Значит
   за восемь дней 401-провалов эту запись **не обновляли ни разу**.

Вывод: `createAlert()` для 401-кейса **не вызывается вообще**. Дедуп по `type` — реальный дефект и
чинить его надо, но восьмидневную тишину объясняет не он. Ветка «HTTP-статус ≠ 2xx» в cron-раннере
не доходит до создания алерта — где-то раньше глотается или не считается провалом.

⚠️ Методический момент: без пункта 3 картина выглядела бы как чистое подтверждение гипотезы. Один
столбец, который никто не просил проверять, развернул диагноз на противоположный. Проверять надо не
только то, что версия предсказывает, но и то, что она предсказывает **изменившимся**.

- [x] **Найдено (2026-08-09), не подтверждает исходную гипотезу:** путь «HTTP-ответ не 2xx» НЕ
      расходится с «исключение/abort» — читая `executeJob()` в `apps/dashboard-agent/src/lib/
      cron.ts`, оба пути (`!isSuccess` в try-ветке и `catch`-блок) вызывают
      `void notifyDashboardAlert(job, ...)` одинаково, и `notifyDashboardAlert` уже передаёт
      `metadata: { jobId: job.id, ... }`. То есть `createAlert()` для 401-кейса **вызывается** —
      расхождение с гипотезой BlackCove («не вызывается вообще») было по коду на момент
      диагностики; возможно фикс между диагнозом (2026-08-07) и этой сессией (2026-08-09) уже
      что-то поменял, либо расхождение было в другом слое (не проверено дальше — исходный вопрос
      закрыт находкой, что реальная причина молчания в другом месте, см. три пункта ниже).

#### Что чинить

- [x] **Ключ дедупликации: `type` + `metadata.jobId` вместо одного `type` (2026-08-09).**
      `apps/dashboard/src/lib/alerts.ts` → `createAlert()`: если `metadata.jobId` — строка,
      дедуп ищет активный алерт с тем же `type` **и** `metadata.jobId` (Postgres-диалект
      ZenStack v3 строит JSON-фильтр через `jsonb_path_query_first`, путь — JSONPath
      `'$.jobId'`, не голое имя ключа — уточнено чтением дизайлера
      `node_modules/@zenstackhq/orm` `PostgresCrudDialect.buildJsonPathSelection`, не
      документации). Алерты без `jobId` в metadata (CPU/память/диск) дедуплицируются как
      раньше. `nx typecheck dashboard` чист. ⚠️ **Не проверено живым запросом к реальной
      Postgres** — в `apps/dashboard` вообще нет ни одного `*.spec.ts` (не только для этого
      файла — конвенции юнит-тестов в приложении нет), добавлять первый тест с мокoм `prisma`
      ради одной функции посчитала непропорциональным. Синтаксис `$.jobId` выведен из чтения
      исходника диалекта, а не из документации ZenStack — риск неточности есть, хотя механизм
      Postgres jsonpath (`jsonb_path_query_first` + `$.`-путь) стандартный и стабильный.
- [x] **`sendNotification` — логирует причину, вызывающий код проверяет результат (2026-08-09).**
      `notifications.ts`: при отсутствии канала (`telegramEnabled`/токен/`chatId`) —
      `console.warn` с полным состоянием флагов вместо тихого `return false`.
      `app/api/alerts/route.ts`: результат `sendNotification()` проверяется, при `!sent` —
      отдельный `console.warn` с id/type алерта.
- [x] **`enabled: false` перестал быть тихим (2026-08-09)** — тот же route теперь логирует
      `console.warn` при `settings.enabled === false`, называя конкретный алерт. Само решение
      «что делать» (менять ли поведение, не только логировать) сознательно не принято — это
      выбор владельца о продуктовом поведении алертинга, не техническая правка с одним
      правильным ответом.
- [ ] **Сторож для сторожа.** У почты есть `email-canary`, проверяющий сквозную доставку. У
      алертов есть частичный аналог — `sendHeartbeatTelegram()`/`/api/cron/heartbeat`
      («У всех всё хорошо» раз в сутки, если алертов не было) уже реализован и стоит в cron
      (найден при этой сессии, задача `dashboard-heartbeat` — та самая «зомби»-задача из §56,
      заведённая мимо git и перенесённая в `DEFAULT_CRON_JOBS` там же). Не проверено, покрывает
      ли он именно сценарий «алерт создан, но не отправлен» (silent-канал) — heartbeat молчит,
      только если за сутки НЕ было алертов вообще, а не если алерты были, но не дошли. Разница
      между «тихо, потому что нечего слать» и «тихо, потому что канал сломан» этим механизмом
      не различается — открытый хвост.
- [ ] Хранить историю прогонов дольше 10 записей (или писать хотя бы «последний успех» отдельным
      ключом): при следующем таком отказе датировать его снова будет нечем
- [ ] Отдельно от этого трека: накопился ли в проде `driving-school` нечищеный `ApiLog`.
      Первый успешный прогон вернул `deletedCount: 0`, но это не ответ — по одному прогону нельзя
      отличить «чистить было нечего» от «хвост есть, но за пределами окна». Проверять надо прямым
      запросом к прод-БД.
      ⚠️ **`postgres-driving-school` MCP для этого не годится** — он смотрит на
      `apps/driving-school/.env.local`, то есть на **локальную dev-базу**; прод-варианта
      (`--tunnel`, как у `postgres-kami-prod`/`postgres-studio-prod`) для этого приложения нет
      вовсе. Запрос к нему вернул `0` строк, и это ноль в dev, а не на проде. Та же ловушка, что
      с `postgres-studio` в прошлый раз

### Диагноз (2026-08-07): секрет не «разъехался» — его вообще не может быть одного

Исходная гипотеза («общий `X-Cron-Secret` разъехался на одной из сторон») **неверна**. Сверка
хешей `CRON_SECRET` по всем `apps/*/.env.docker` показала, что общего секрета не существует и
никогда не существовало — у каждого приложения он свой:

| Приложение        | `CRON_SECRET` | Совпадает с агентским |
| ----------------- | ------------- | --------------------- |
| `dashboard-agent` | 44 символа    | — (сам агент)         |
| `dashboard`       | 44            | ✅                    |
| `dsperevod`       | 44            | ✅                    |
| `driving-school`  | 44            | ❌                    |
| `studio`          | 48            | ❌                    |
| `grandslamcup`    | 64            | ❌ (задач нет)        |
| `svoichuzhie`     | 64            | ❌ (задач нет)        |
| `time`            | 64            | ❌ (задач нет)        |

Разная **длина** — след того, что секреты генерировались в разное время разными командами, а не
раздавались из одного места.

А агент слал всем **один** свой секрет:

```ts
'X-Cron-Secret': process.env.CRON_SECRET || 'default-cron-secret'
```

Отсюда точный прогноз: падать должны ровно задачи к `studio` и `driving-school`, а к `dashboard` и
`dsperevod` — работать. Это в точности тот список, который наблюдал BlackCove. Гипотеза не просто
согласуется с данными — она предсказывает их до последней задачи.

**Сверено с тем, что реально едет на прод:** значения взяты не только из локальных `.env.docker`,
но и расшифровкой `.env.docker.enc` — совпадают. То есть картина на сервере именно такая.

#### Почему это чинится не «привести секреты к одному»

Соблазнительный быстрый фикс — раздать всем приложениям общий секрет. Он неверен: `CRON_SECRET`
приложения защищает его собственные ручки, и периметр доверия у `studio` (коммерческий проект с
финансовыми задачами — счета, бюджетные алерты) и у `dashboard` разный. Общий секрет означал бы,
что утечка из любого приложения открывает cron-ручки всех остальных.

Поэтому починка обратная: **агент шлёт секрет того приложения, к которому идёт**. Брать его
неоткуда дублировать — у агента уже смонтированы `apps/<app>/.env.docker` как `/secrets/<app>.env`
(изначально ради credentials к БД). Новый `lib/app-secrets.ts` читает `CRON_SECRET` оттуда.

Ключевое свойство: **второй копии секрета не появляется**. Если бы секреты приложений
продублировали в конфиг агента, они бы разъехались снова — и снова молча.

#### Отдельно — почему провал был тихим

Виноват не 401, а `|| 'default-cron-secret'`. Когда секрета нет, отправить _хоть что-нибудь_ —
худшее из возможных решений: приложение отвечает 401, неотличимым от настоящей проблемы
авторизации, и причина «секрет негде взять» теряется. Теперь при недоступном секрете запрос **не
отправляется вовсе**, а задача падает с текстом, который называет и приложение, и файл.

Это тот же класс, что `--frozen-lockfile` (§50) и наследование `tls.domains` (§48): механизм
молча подставляет «разумный» дефолт вместо того, чтобы сказать, что ему не хватает данных.

⚠️ Побочно найдено: `postDashboardAlert` слал алерты с секретом **агента**, а не `dashboard`.
Сейчас они совпадают, поэтому канал алертов работает — но это историческая случайность. Ротация
секрета в `dashboard` оборвала бы весь алертинг разом, причём беззвучно (ошибки отправки алерта
только логируются). Тоже переведено на секрет адресата.

## §53 — `e2e-postgres` на s3: не ротация пароля, а вывод из эксплуатации ✅ ОСТАНОВЛЕН (2026-08-07), волюм удалить ~2026-08-21

Последний остаток §37 и §49. Задача ставилась как «ротировать дефолтные `e2e`/`e2e`», но recon
показал, что ротация — неправильное действие: сервис никем не используется, и смена пароля оставила
бы ту же дыру на месте, просто с другим значением.

### Почему сначала recon, а не ротация

Перед изменением проверялось, кто вообще ходит в `e2e-postgres`. По коду в git:

- раннер `apps/dashboard-agent/src/routes/e2e.ts` **всегда** передаёт
  `BASE_URL=https://<app>-stage.s3.letar.best`;
- у всех 23 `playwright.config.ts` стоит `webServer.reuseExistingServer: true` — при отвечающем
  staging Playwright свой `nx dev` не поднимает.

То есть штатный e2e-путь в `e2e-postgres` не заходит вообще. Туда ведёт только **аварийный** путь:
если `BASE_URL` потеряется (регрессия `--preserve-env` в `sudo -u deploy`, поймана 2026-07-11),
Playwright поднимет `nx dev`, тот прочитает `.env.local` и пойдёт на 5499. То есть порт обслуживал
не рабочий сценарий, а **последствие бага** — и делал его ложно-зелёным вместо громкого падения
(прецедент `aboi` 2026-07-19, §18.7).

### Факты с сервера (BlackCove, read-only)

| Проверка                 | Результат                                                                    |
| ------------------------ | ---------------------------------------------------------------------------- |
| Контейнер                | `Up 7 weeks`, `restart: unless-stopped`                                      |
| Привязка порта           | `0.0.0.0:5499` + `[::]:5499` — снаружи закрыт только §49, не самим биндингом |
| Пароль                   | `e2e`/`e2e` буквально в `environment:` compose-файла                         |
| Базы                     | `e2e_auth_hub` 8 МБ, `e2e_driving_school` 13 МБ — непустые                   |
| Активные подключения     | нет                                                                          |
| Последняя запись на диск | **2026-07-14**, 24 дня назад                                                 |

⚠️ **Методическая деталь.** `docker logs | grep -c "connection authorized"` дал `0`, но это
false negative — `log_connections` в Postgres по умолчанию выключен. Доказательство дал mtime
каталога `base/`, а не счётчик в логах. Отсутствие записей в логе не равно отсутствию событий;
проверять надо то, что пишется всегда.

### Решение: остановить с выдержкой, не удалять сразу

Выбран обратимый вариант вместо мгновенного удаления:

1. `docker update --restart=no` → `docker stop` (именно в таком порядке — иначе `unless-stopped`
   поднимет контейнер обратно между двумя командами). Порт перестаёт публиковаться сразу, дыра
   закрыта в тот же момент.
2. Сервис закомментирован в `/opt/e2e-infra/docker-compose.yml`, volume оставлен до **~2026-08-21**
   как откат. Откат = раскомментировать + `docker start`.
3. Строки `DATABASE_URL` с портом 5499 в `apps/auth-hub/.env.local` и
   `apps/driving-school/.env.local` на s3 закомментированы — чтобы аварийный путь падал **громко**.
   Ложно-зелёный e2e хуже упавшего.
4. Доказательство гипотезы — зелёный прогон `run_e2e` для `auth-hub` (одно из двух приложений,
   чей `.env.local` на него ссылался) уже после остановки.

Смысл выдержки: она **проверяет** гипотезу «реликт», а не принимает её на веру. Стоимость — 21 МБ
на диске в течение двух недель.

### Что НЕ подтвердилось

Была гипотеза, что `requirepass` у `e2e-redis` из §37 потерян так же, как потерялись `iptables
DROP` из того же §37 (см. §49). **Не подтвердилась:** пароль задан в `command:` самого
compose-файла, то есть декларативно, и переживает пересоздание контейнера. `redis-cli PING` без
пароля отвечает `NOAUTH`. `e2e-redis` здоров и не трогался.

Разница по существу: в §49 правило жило только в runtime `iptables` и исчезло при перезагрузке;
здесь значение лежит в конфиге. Это разные классы, и смешивать их не надо — «починили на живой
системе» опасно, «прописали в YAML» нет.

### Побочная находка: беспарольный fallback `REDIS_URL` в пяти compose-файлах

Найдено при проверке той же гипотезы. Пять файлов держат дефолт **без пароля** для Redis, который
пароль требует:

| Файл                                                 | Строка |
| ---------------------------------------------------- | ------ |
| `apps/auth-hub/docker-compose.production.yml`        | 65     |
| `apps/dashboard-agent/docker-compose.production.yml` | 38     |
| `apps/driving-school/docker-compose.production.yml`  | 89     |
| `apps/kami/docker-compose.production.yml`            | 57     |
| `apps/driving-school/docker-compose.staging.yml`     | 58     |

Все вида `REDIS_URL: ${REDIS_URL:-redis://letar-redis:6379}` (на staging — `172.17.0.1:6380`).
Ровно те четыре прод-потребителя, которых §37 передеплоил с новым паролем.

Сейчас это мёртвый код: реальные значения приходят из `.env.docker`/`.env.staging`. Но дефолт
**fails open** — если переменная когда-нибудь не долетит (новый сервер, восстановление из бэкапа,
перегенерация env-файла), приложение молча пойдёт в Redis без пароля и получит `NOAUTH`. Для
`auth-hub` это ровно симптом §37: отказ `secondaryStorage` → 500 на роутах better-auth.

Правка: убрать `:-...`, оставить `${REDIS_URL}`. Все потребители обрабатывают отсутствие переменной
корректно (`process.env.REDIS_URL && ...`, graceful degradation в `@letar/redis-client`) — то есть
пустое значение даёт явную деградацию с записью в лог вместо подключения с заведомо неверными
учётными данными.

⚠️ `DATABASE_URL`-дефолты в тех же файлах **трогать не нужно** — они интерполируют
`${DB_PASSWORD}`, то есть беспарольными не являются.

### Побочная находка: `/opt/e2e-infra/docker-compose.yml` вне git

Конфиг живого сервиса (`e2e-redis`, до сегодня — `e2e-postgres`) существует в одном экземпляре на
одной машине: без ревью, без истории, без восстановления из репозитория. Именно поэтому пароль
`e2e`/`e2e` прожил незамеченным с момента заведения — его никто не видел в diff'е.

Деплой-пайплайна для `/opt/` в монорепо нет и заводить его ради одного файла избыточно. Минимум —
держать в `infra/e2e/` копию-источник истины с паролем через `${E2E_REDIS_PASSWORD}` и SOPS для
значения, по образцу остальных `infra/*`.

### Выбранный критерий проверки оказался невыполним — и это дало доказательство лучше

Первая попытка остановки прошла по всем пунктам, но контрольный `run_e2e auth-hub` упал:
`Timed out waiting 120000ms from config.webServer`.

BlackCove не стал чинить на месте: откатил всё и **прогнал повторно на откаченном окружении**.
Упало так же. Этот второй прогон и есть главный результат — он отделил «сломали мы» от «было
сломано». Без него разбор ушёл бы не туда.

Дальше версии разошлись. Первая — «сломан `reuseExistingServer`, `nx dev` поднимается всегда, значит
`e2e-postgres` может быть не резервом, а рабочим путём». Вторая (верная) — staging-домен не отвечает,
и таймаут этим и объясняется: `webServer.url` совпадает с `baseURL`, то есть локальный `nx dev` на
`localhost:<порт>` **никогда** не заставит ответить `https://<app>-stage.s3.letar.best`. Разбор
самой ловушки — [e2e-testing.md](/.claude/docs/e2e-testing.md), раздел про таймаут `webServer`.

Проверка подтвердила вторую: `curl` даёт `TLS unrecognized name`, домена нет ни в NPM, ни в Traefik
(§54). При этом обе версии одинаково объясняли наблюдаемое падение — различил их только внешний
запрос к домену, а не рассуждение.

**Замена критерия.** Оба приложения со ссылкой на 5499 в `.env.local` (`auth-hub`,
`driving-school`) оказались без staging-маршрута, то есть проверить на них нельзя ни то, ни другое.
Зато нашлось доказательство прочнее прогона — в выводе `docker ps`:

```
auth-hub-staging-db          Up 3 weeks (healthy)
driving-school-staging-db    Up 3 weeks (healthy)
```

У обоих **уже есть собственная staging-БД**. Когда маршрут починят, e2e пойдёт в неё — `e2e-postgres`
избыточен по построению, а не «вероятно, не используется». Плюс: пока домена нет, e2e для этих двоих
не доходит до единого HTTP-запроса, то есть 5499 не обслуживает даже аварийный путь.

⚠️ **Чего проверка не покажет.** Дымовой прогон делается на стороннем приложении с живым маршрутом,
поэтому про поведение `auth-hub`/`driving-school` после остановки он не говорит ничего. Проверить их
можно будет только после §54. Записано явно, чтобы «зелёный прогон» позже не прочитали шире, чем он
есть.

### Definition of Done

- [x] Установлено, что `e2e-postgres` не используется штатным e2e-путём (чтение кода + факты
      с сервера, а не одно из двух)
- [x] `docker update --restart=no` + `docker stop` — контейнер `Exited (0)`, автозапуск снят,
      сервис закомментирован в compose; файл и контейнер согласованы
- [x] Имя volume зафиксировано: **`e2e-infra_e2e_pg_data`**
- [x] Две строки `DATABASE_URL` на 5499 закомментированы в `.env.local` на s3 (с `.bak`)
- [x] Порт 5499 не слушается: `ss -tulnp` **и** `ps aux | grep docker-proxy` — оба пусто (v6
      обслуживает userland-процесс, отдельная проверка — урок §49)
- [x] ~~`run_e2e auth-hub` зелёный после остановки~~ — **критерий снят как невыполнимый**, см.
      выше. Замена выполнена: дымовой прогон `time` (маршрут живой) при остановленном
      `e2e-postgres` — `3 passed`. Staging-путь работает без 5499
- [ ] ~2026-08-21: удалить контейнер и volume, снять закомментированный блок
- [x] Убран беспарольный fallback `REDIS_URL` в пяти compose-файлах — сверка окружения на s2
      пройдена: во всех четырёх прод-контейнерах переменная задана и содержит `user:pass@`
- [ ] `/opt/e2e-infra/docker-compose.yml` заведён в `infra/e2e/` с параметризованным паролем
- [x] `.claude/docs/e2e-testing.md` приведён в соответствие: раздел «Настройка нового приложения
      для E2E» описывал схему с общей БД на 5499 и захардкоженными `e2e:e2e`

---

## §54 — `auth-hub` и `driving-school`: staging-контейнеры живы три недели, но снаружи недоступны ✅ ЗАКРЫТО (2026-08-08)

✅ **Закрыто попутно §48 M2.** Оба получили маршрут через Traefik — первый рабочий в своей истории,
не восстановленный: домена не существовало ни в NPM, ни в Traefik. Проверено с s3:
`driving-school-stage` → `200`, `auth-hub-stage` → `307` на форму входа (это тоже успех — маршрут
дошёл до приложения; провал выглядел бы как `404` от Traefik или `unrecognized name` на TLS).

Диагноз «не заводили никогда или снесли при чистке» так и остался неустановленным — и это
нормально: маршрут теперь описан в `docker-compose.staging.yml` в git, поэтому вопрос «кто и когда
удалил запись из чужого SQLite» перестал иметь практическое значение. Ровно ради этого свойства
§48 и затевался.

⚠️ **Что из §54 НЕ закрыто и требует отдельного трека:** причина, по которой это гнило три недели
незамеченным. `docker ps` показывал `Up (healthy)` при полностью недоступном снаружи сервисе —
healthcheck бьёт изнутри контейнера и о внешней достижимости не знает ничего. Сейчас исправлены
два конкретных приложения, а не механизм наблюдения. Следующее приложение без маршрута будет гнить
так же.

Разбор ниже сохранён — он про этот механизм, а не про два домена.

Найдено попутно при §53. Крупнее того трека, в рамках которого всплыло.

Оба приложения держат на s3 healthy-контейнеры приложения и БД, но домена
`<app>-stage.s3.letar.best` **не существует ни в NPM, ни в Traefik**:

```bash
$ curl -sv https://auth-hub-stage.s3.letar.best/
* TLS connect error: error:0A000458:SSL routines::tlsv1 unrecognized name   # и по v4, и по v6

$ docker ps -a --filter name=auth-hub-staging
auth-hub-staging-app   Up 3 weeks (healthy)
auth-hub-staging-db    Up 3 weeks (healthy)
$ docker port auth-hub-staging-app
3010/tcp -> 0.0.0.0:3019, [::]:3019
```

`driving-school-stage` — ровно то же. В NPM (`/opt/npm/data/nginx/proxy_host/*.conf`) заведены
16 хостов, этих двух среди них нет; в Traefik по §48 M1b переведены только `pravda` и `aira-web`.

**Следствие:** e2e этих двух приложений не может пройти в принципе. `BASE_URL` бьёт в
несуществующий домен, Playwright уходит в `webServer` и падает по таймауту через 120 секунд, ни
разу не обратившись к приложению.

### Почему это не заметили три недели

- **Ни то, ни другое не входит в hard e2e-gate.** Там пять приложений (§18.7), и все пять имеют
  маршрут в NPM. Гейт бы такое поймал сразу — эти двое просто не под ним, поэтому сломанный staging
  никого не блокировал и тихо гнил.
- **`docker ps` показывает `Up (healthy)`.** Healthcheck бьёт изнутри контейнера
  (`wget http://0.0.0.0:<порт>/`) и о внешней достижимости не знает ничего. То есть штатная
  панель наблюдения показывает зелёное при полностью недоступном сервисе.
- **Сообщение об ошибке уводит в сторону.** Единственный, кто это обнаруживал, — упавший e2e, и
  говорил он про `config.webServer`, а не про домен.

### Что предлагается

1. Установить диагноз: домен **не заводили никогда** или **снесли при чистке**. Это разные
   причины, и лечатся по-разному. Смотреть по истории NPM.
2. Завести маршруты (или перевести на Traefik сразу — §48 всё равно ведёт s3 туда).
3. Прогнать e2e обоих приложений и посмотреть, что накопилось за три недели, пока сьюты фактически
   не исполнялись.
4. Подумать о проверке внешней достижимости рядом со staging-контейнерами. Сейчас единственный
   индикатор — падающий через две минуты e2e с сообщением не по адресу. Дешёвый вариант: добавить
   staging-домены в существующий канареечный/health-check контур `dashboard-agent`.

⚠️ **Общий урок, шире этой секции:** `docker ps` + healthcheck отвечают на вопрос «процесс жив», а
не «сервис доступен». Между ними — DNS, сертификат, прокси-маршрут и firewall, и ни одно из этого
контейнер о себе не знает. Тот же разрыв уже стоил половины дня в §49 (правило есть в `-S`, но не
работает) и двух ложных прогонов в §53. Проверка обязана идти снаружи и по тому же пути, что и
настоящий потребитель.

### Definition of Done

- [ ] Установлено, заводили ли домены когда-либо (история NPM), — от этого зависит, был ли это
      регресс или недоделка изначально
- [ ] Маршруты для `auth-hub-stage` и `driving-school-stage` работают, `curl` даёт `200`
- [ ] e2e обоих приложений прогнан, накопленные за три недели отказы разобраны
- [ ] Проверено, нет ли **других** staging-контейнеров без маршрута — эти двое нашлись случайно,
      системно никто не сверял список контейнеров со списком proxy hosts
- [ ] Решено, добавлять ли внешнюю проверку достижимости staging-доменов в `dashboard-agent`

---

## §55 — `run_e2e` не отличает «тесты упали» от «упал тулинг вокруг тестов» 🟡 ЧАСТИЧНО (2026-08-07, вердикт из отчёта — 2026-08-09, гонка кэша остаётся)

Найдено на дымовом прогоне §53. Прогон `time` на s3 дал:

```
3 passed (15.8s)

Error: ENOENT: no such file or directory,
open '/home/deploy/letar/.nx/cache/terminalOutputs/1460922060517302158'
❌ E2E failed with exit code 1
```

Тесты прошли. Упала запись терминального вывода таска Nx — то есть инфраструктура вокруг прогона,
а не сам сьют. Но наружу это ушло как `E2E failed`.

### Почему это важнее, чем выглядит

`run_e2e` выводит вердикт из **кода возврата `nx`**, а `deploy-mcp` читает результат из
`.last-e2e-status/<app>.json` в `evaluateE2eGate` перед прод-деплоем. Значит любой сбой тулинга
между зелёными тестами и завершением процесса превращается в **ложно-красный гейт**: релиз
блокируется без реальной причины.

Для `time` это безобидно — он не под hard-гейтом. Тот же сбой на любом из пяти гейтованных
приложений (§18.7) блокирует релиз, и с учётом §51 (прогон и так приходится повторять из-за чужих
коммитов в `main`) цена высокая.

Ложно-красный несопоставимо лучше ложно-зелёного, поэтому это не аварийная ситуация. Но различать
«упало» и «не работает» должен инструмент, а не человек глазами по логу.

### Подтверждено: гейт действительно видит красное

```json
// .last-e2e-status/time.json
{ "commitSha": "27a310d6...", "passed": false, ... }
```

`"passed": false` при трёх реально прошедших тестах. То есть проблема не косметическая — статус,
который читает `evaluateE2eGate`, испорчен.

**Известный класс исключён.** Проверка владельца дала `drwxr-xr-x deploy deploy`, каталог
существует. Это **не** тот `EACCES` от root-owned артефактов, что описан в комментариях
`apps/dashboard-agent/src/routes/e2e.ts` — права нормальные, пользователь правильный.

### Причина установлена: e2e-прогон и деплой делят один `.nx/cache`

Зацепкой был пустой каталог `terminalOutputs` — Nx открывал несуществующий файл при нормальных
правах, значит его либо не записали, либо удалили между записью и чтением. Второе подтвердилось
таймстемпами того же вечера:

```
pravda    deploy_app(staging):  15:02:32.322Z → 15:05:01.115Z
time      run_e2e:              15:05:47.741Z → 15:06:11.629Z   ← упал на ENOENT
aira-web  deploy_app(staging):  15:05:56.474Z → 15:07:24.819Z
```

Прогон `time` и деплой `aira-web` пересеклись на ~15 секунд. Ровно в этом окне `nx e2e time-e2e`
писал terminal output, а параллельно на том же workspace шёл `nx run aira-web:build`. Один
`.nx/cache` на два процесса, никакой изоляции.

**Это не разовая случайность конкретной сессии.** Блокировка «деплой поверх деплоя» в
`dashboard-agent` есть, а «e2e против деплоя» — нет. Запросы приходят от разных агентов и никем не
сериализуются, так что окно открыто постоянно.

⚠️ **Следствие, которое важнее самого бага: прошлые красные результаты e2e недостоверны.** Раз
вердикт берётся из кода возврата `nx`, любое пересечение с деплоем могло дать «провал» при зелёных
тестах — и отличить такие случаи задним числом нечем. Нашли это вообще случайно: дымовой прогон §53
совпал с чужим деплоем. Сколько раз так было раньше, установить нельзя.

### Что предлагается

1. **Развести источники истины** — вердикт о тестах брать из отчёта Playwright (JSON-репортёр), а
   код возврата `nx` использовать только как признак «прогон вообще не состоялся». Нужно
   **независимо** от лечения гонки: вердикт о тестах не должен зависеть от того, чем закончился
   сборочный инструмент.
2. **Убрать саму гонку** — два варианта, ни один не бесплатный:
   - _блокировка e2e на время активного деплоя_, симметрично существующей «деплой поверх деплоя».
     Просто и по образцу, но сериализует и без того медленный контур — а §51 и так заставляет
     повторять прогоны;
   - _раздельный кэш_ (`NX_CACHE_DIRECTORY` для e2e-прогонов). Сохраняет параллельность, стоит
     потерей переиспользования артефактов — для e2e против staging это почти ничего, потому что
     приложение он не собирает.

⚠️ При выборе второго варианта помнить: **общее состояние шире, чем `cache/`.** Рядом лежит
`.nx/workspace-data` (граф проектов, файловая карта), который параллельные вызовы Nx тоже делят —
и по нему уже был инцидент с root-owned артефактами (комментарии в `routes/e2e.ts`). Развести
только кэш и считать вопрос закрытым — рано.

### Definition of Done

- [x] Установлено содержимое `.last-e2e-status/time.json`: `"passed": false` — ложно-красный
      подтверждён, гейт испорчен
- [x] Известный класс (`EACCES`, root-owned артефакты) исключён — права `deploy:deploy`, каталог
      на месте и пуст
- [x] **Причина установлена:** общий `.nx/cache` между параллельным деплоем и e2e-прогоном,
      подтверждено пересечением таймстемпов на ~15 секунд. Не разовая случайность — блокировки
      «e2e против деплоя» не существует, только «деплой поверх деплоя»
- [x] **Вердикт `run_e2e` берётся из отчёта Playwright (2026-08-09).**
      `apps/dashboard-agent/src/routes/e2e.ts`: команда прогона получает `--reporter=json` +
      `PLAYWRIGHT_JSON_OUTPUT_NAME=<REPO_ROOT>/.last-e2e-status/reports/<app>-<runId>.json`
      (заменяет html/blob-репортёр из `nxE2EPreset` только для этого запуска — вывод команды и
      так построчно пишется в `run.output`). В обработчике `close`: если отчёт прочитан —
      `passed = stats.unexpected === 0`, независимо от кода возврата `nx` (именно это чинит
      исходный баг: `3 passed`, но `nx` вернул 1 из-за ENOENT на `terminalOutputs`). Отчёта
      нет/не распарсился → откат на старое поведение (код возврата `nx`, fail-closed). Отдельного
      юнит-теста нет — в кодовой базе `apps/dashboard-agent/src/routes/*` вообще не покрыты
      тестами (только `src/lib/*`, конвенция подтверждена — 13 существующих
      `*.spec.ts`, ни один не в `routes/`), править `readE2eReportStats` изолированно означало
      бы вводить первый прецедент вразрез с этой конвенцией. `nx typecheck dashboard-agent`
      чист.
- [ ] Гонка НЕ устранена: блокировка e2e на время деплоя **или** раздельный `NX_CACHE_DIRECTORY`
      (при втором варианте — проверить и `.nx/workspace-data`, он тоже общий). Сознательно не
      взято в этой сессии — доку сама предупреждает, что разведение только `cache/` недостаточно
      («считать вопрос закрытым — рано»), а безопасно спроектировать полную изоляцию (включая
      `workspace-data`) без живого прогона на s3 — риск. Фикс вердикта выше снижает цену гонки
      (сбой тулинга больше не портит вердикт сам по себе), но не устраняет её как источник
      нагрузки/конкуренции ресурсов.
- [ ] ⚠️ **Не проверено на живом сценарии.** Нужно: (1) искусственно уронить запись
      `.nx/cache/terminalOutputs` во время зелёного прогона (или дождаться естественного
      повторения гонки §55) и убедиться, что `.last-e2e-status/<app>.json` всё равно `passed:
      true`; (2) убедиться, что реально упавший тест по-прежнему даёт `passed: false`
      (`stats.unexpected > 0`) — простая проверка, но без реального `--reporter=json` под
      настоящим Playwright не гарантирована (структура `report.stats` предполагается по
      документированному, стабильному публичному формату JSON-репортёра, не проверена на живом
      прогоне в этом репо).

## §56 — Список cron-задач на проде расходится с кодом, и код почти ничего не может с этим сделать 🟡 ЧАСТИЧНО (2026-08-07, RETIRED_JOB_IDS — 2026-08-09)

Найдено попутно при §52, когда список задач из ответа BlackCove не сошёлся со списком в
`DEFAULT_CRON_JOBS`. Расхождение в обе стороны, и каждая сторона — отдельная проблема.

Источник истины на проде — **файл `/home/deploy/letar/cron-jobs.json` на сервере**, а не код.
`DEFAULT_CRON_JOBS` в `apps/dashboard-agent/src/lib/cron.ts` только дополняет его при старте.

### Что подтверждено чтением кода

**1. Задача, удалённая из кода, живёт на проде вечно.** `loadAllCronJobs()` добавляет
недостающие дефолты и обновляет существующие, но **не удаляет** записи, которых больше нет в
`DEFAULT_CRON_JOBS`. `DELETE`-ручки у API агента тоже нет — только `PATCH` и `run`. То есть
убрать задачу из эксплуатации правкой репозитория невозможно в принципе.

**2. Изменение расписания в коде на прод не доезжает.** Merge сверяет ровно три поля:

```ts
defaultJob.app !== existing.app
  || defaultJob.endpoint !== existing.endpoint
  || defaultJob.server !== existing.server
```

`schedule` среди них нет. Правка `'30 3 * * *'` → `'0 5 * * *'` в коде пройдёт код-ревью, ляжет в
git, задеплоится — и не изменит ничего. Для `enabled` и `description` это осмысленно (их правят
через UI, код не должен затирать выбор человека), а вот молчаливое игнорирование `schedule` —
скорее недосмотр, чем решение: в UI расписание тоже правится, но в коде оно выглядит как
источник истины и читается именно так.

Класс ровно тот же, что у §48 (маршруты в SQLite внутри NPM вместо git) и §50 (`--frozen-lockfile`
молча откатывается): состояние живёт вне репозитория, а репозиторий выглядит так, будто он им
управляет.

### Подтверждено фактом: три задачи работают на проде мимо git

Снятый с s2 `cron-jobs.json` содержит **19 задач против 16 в коде**. Лишние три:

| Задача                      | Расписание на проде | Эндпоинт в коде приложения                         |
| --------------------------- | ------------------- | -------------------------------------------------- |
| `studio-send-reminders`     | `0 9 * * *`         | `apps/studio/src/app/api/cron/send-reminders/`     |
| `studio-recurring-invoices` | `0 8 * * *`         | `apps/studio/src/app/api/cron/recurring-invoices/` |
| `dashboard-heartbeat`       | (уточняется)        | `apps/dashboard/src/app/api/cron/heartbeat/`       |

Первым делом проверялось, не огрызки ли это: **эндпоинты для всех трёх существуют**, задачи
рабочие, при ручном прогоне дают `200`. Заведены прямо в файл на сервере — ручки создания задач у
API агента нет, `git log -S` не находит их ни в одном коммите.

**Опасность именно в том, что они работают.** Пропадёт `cron-jobs.json` — новый сервер,
восстановление, пересоздание тома — и код их не восстановит, потому что не знает о них. Ошибки не
будет: агент поднимется, отработает 16 задач из кода и промолчит. А у `studio` перестанут уходить
напоминания клиентам и выставляться регулярные счета. У коммерческого проекта, молча.

### Что сделать

- [x] Снять фактическое состояние с s2 и сверить с `DEFAULT_CRON_JOBS` — **сделано 2026-08-07**,
      19 против 16
- [x] Выяснить происхождение «лишних» задач — **реальные, рабочие, заведены мимо git**
- [x] Занести все три в `DEFAULT_CRON_JOBS` с прод-значениями — **сделано 2026-08-07** (`8139b39b`),
      перенесены точь-в-точь по полному JSON с сервера. Списки и все 19 расписаний сверены
      программно, совпадают

### Второй пример дрейфа, найденный при сверке: расписание, которого нет в git

Сверка расписаний код↔прод дала одно расхождение: `s2-database-backup` стоял в коде на
`0 2 * * *`, а на проде выполняется в **4:00**.

Значение `0 4 * * *` **не встречается ни в одном коммите** — расписание сдвинули через
`PATCH /api/cron/jobs/:id` (это легальная операция, ручка её разрешает), и обратно в git оно не
попало. То есть код разъезжался с фактом минимум с 2026-07-10 и всё это время вводил в
заблуждение любого, кто его читал: написано «бэкап БД в 2 ночи», работает в 4.

Приведено к факту (`0 4 * * *`) — прод здесь источник истины, и сдвиг выглядит осмысленным: в 3:00
идут бэкап nginx и чистка логов, в 3:30 — acme-dns, 4:00 разводит их по времени.

⚠️ **Важное следствие для пункта «синхронизировать `schedule`».** Если синхронизацию включить, не
сверив предварительно все расписания, код молча перепишет прод — и такие сдвиги, сделанные
осознанно через UI, откатятся в ближайший деплой. Порядок действий обязан быть: сначала свести код
к факту (сделано), и только потом включать синхронизацию.

- [ ] Решить судьбу `schedule`: либо синхронизировать из кода наравне с `app`/`endpoint`/`server`,
      либо явно задокументировать в коде, что расписание живёт в конфиге, — сейчас поведение не
      описано нигде, и код вводит в заблуждение. **Не решено сознательно** — это выбор владельца
      о поведении прод-планировщика (риск отката осознанных правок через UI, см. предупреждение
      выше), не техническая задача с одним правильным ответом.
- [x] **Реализовано (2026-08-09):** `RETIRED_JOB_IDS` в `apps/dashboard-agent/src/lib/cron.ts`
      — список id рядом с `DEFAULT_CRON_JOBS`. `applyRetirement(jobs, retiredIds)` (чистая
      функция, экспортирована для теста) убирает задачи из смёрженного списка **после**
      добавления новых дефолтов — если id одновременно и в `RETIRED_JOB_IDS`, и всё ещё в
      `DEFAULT_CRON_JOBS` по ошибке, ретир побеждает. `loadAllCronJobs()` пишет результат на
      диск, если ретир что-то реально убрал (даже без других изменений), и логирует
      `[Cron] Выведены из эксплуатации: <ids>`. 4/4 юнит-теста
      (`cron-retirement.spec.ts`: пустой список / убирает нужные / no-op на отсутствующем id /
      несколько разом), `nx typecheck dashboard-agent` чист. `RETIRED_JOB_IDS` пока пуст —
      использовать при следующем реальном выводе задачи из эксплуатации. Не проверено живым
      деплоем (нечем — список пуст, проверять на реальном ретире пока нечего).
- [ ] Проверить остальные задачи на «зомби»: выполняется ли на проде что-то, чего в коде нет

---

## §57 — Раздача IPFS: у Traefik нет кеширования, а дока пиннеров описывает несуществующую схему ✅ ЗАКРЫТО (2026-08-09)

> ## ⛔ РАЗДЕЛЕНИЕ ИМЁН И ПОРЯДОК ДЕЙСТВИЙ — читать первым
>
> **Решение владельца 2026-08-07:** имена разводятся по смыслу.
>
> | Имя                  | Что это                     | Куда указывает      |
> | -------------------- | --------------------------- | ------------------- |
> | `ipfs.letar.best`    | сам IPFS-узел (origin)      | **s3**              |
> | `gateway.letar.best` | публичный кеширующий прокси | **mail.letar.best** |
>
> ⛔ **Порядок обязателен, иначе поломка повторится:**
>
> 1. **Сначала вернуть `ipfs.letar.best` на s3.** ✅ Сделано 2026-08-07.
> 2. **`gateway.letar.best` переставлять на mail ТОЛЬКО после того, как прокси там поднят и
>    проверен снаружи.** Это имя обслуживает контент трекера прямо сейчас
>    (`NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.letar.best'`, `src/lib/ipfs.ts`). Переставить
>    заранее — сломать трекер ровно тем же способом, каким уже сломали раздачу видео.
>
> ⚠️ **Пункт 2 нарушили в тот же день — и он оказался не рекомендацией, а единственным безопасным
> путём.** Обе записи переставили одновременно: `ipfs` починили, а `gateway` увели на mail, где
> прокси нет. Разбор — «Инцидент 2026-08-07» ниже. Главное следствие: **откатить это правкой
> переменной нельзя**, только DNS.
>
> **Побочная выгода разделения: «не кешировать видео» становится структурным, а не настроечным.**
> Плеер `svoichuzhie` ходит на `ipfs.letar.best` напрямую, то есть крупные файлы до кеша просто не
> доходят. Фильтр по `Content-Type` при этом **всё равно нужен**: через `gateway.letar.best` идёт
> аниме-контент трекера, а это HLS — сегменты по несколько мегабайт, которые пройдут любой фильтр
> по размеру и забьют 10 ГБ за считанные просмотры. То есть домен отсекает большие файлы, тип —
> маленькие видеокуски; ни один из двух механизмов не заменяет другой.
>
> **1. Раздача видео НЕ была сломана** — проверено снаружи 2026-08-07 (BlackCove, с s2 и через
> `@1.1.1.1`): CNAME на mail к тому моменту ещё не применился, `ipfs.letar.best` резолвился в s3,
> шлюз отдавал `HTTP/2 200` с `x-ipfs-path`. Опасение было верным по механике, но не по факту —
> успели раньше DNS.
>
> ⚠️ Проверять такое **только снаружи, не с рабочей машины**: под TUN-VPN резолвер врёт, отдаёт
> Fake-IP из `198.18.0.0/15`, см.
> [electron-net-fetch-tun-vpn.md](/.claude/docs/electron-net-fetch-tun-vpn.md).
>
> **2. Не решено, что именно кешировать** — см. раздел «`< 5 МБ` и раздача видео плохо совместимы»
> ниже. Порог по размеру почти не покрывает видеотрафик; альтернатива — `slice 1m` + кеш кусков.
> Разные назначения кеша, без выбора владельца конфиг написать нельзя.

### ✅ Задеплоено и закрыто (2026-08-09)

`infra/gateway-cache/` (`nginx.conf` + `docker-compose.yml` + `README.md`) поднят на mail-сервере
и прошёл весь чеклист (BlackCove, тред `infra-57-gateway-cache`):

- Контейнер `gateway-cache-nginx` на mail, кеш подтверждён живым запросом (`MISS` → `HIT`)
- **Порт 8098 публикуется на `0.0.0.0`, сознательно** — `DOCKER-USER` на mail фильтрует по порту
  **контейнера** (после DNAT), не по порту хоста, и `80` там уже разрешён для NPM: любой сервис на
  `X:80` проходит фильтр независимо от `X`. `127.0.0.1:8098:80` проверили как альтернативу — не
  работает, Docker создаёт DNAT только под конкретный destination IP из `ports:`, а трафик от NPM
  идёт на `172.17.0.1` (другой IP) и под loopback-биндинг не попадает — путь NPM отваливается
  целиком. Риск публичного порта принят как низкий: раздаёт тот же контент, что и так публичен
  через `ipfs.letar.best`, только в обход кеша/будущего SSL-терминирования NPM для тех, кто узнает
  адрес напрямую.
- NPM Proxy Host на mail → `172.17.0.1:8098`, сертификат Let's Encrypt (id=4, `ssl_forced: true`) —
  первая попытка выпуска упала `403` на протухшем IPv6-кеше (LE провалидировал по старому AAAA s3),
  вторая прошла чисто
- DNS `gateway.letar.best` → mail переставлен **владельцем вручную** (не по чеклисту «сначала
  HTTPS, потом DNS» — совместно решили сократить порядок, риск короткого окна принят, поломки не
  было, HTTPS снаружи подтверждён `200` сразу после)
- Хвост на s3 убран: роутер Traefik (`infra/traefik/dynamic/ipfs.yml`, коммит `e40e0aff`) и
  acme-dns аккаунт `gateway` вычищены, `ipfs.letar.best` (origin) проверен положительным
  контролем после рестарта — жив

Старая дока `infra/nginx-proxy-manager/README.md` (раздел «IPFS Gateway (proxy_cache)») — та самая
«несуществующая схема» из заголовка §57 — помечена устаревшей, оставлена зачёркнутой для истории.

### ⛔ Кеш на s2 не заводить и не сохранять (решение владельца 2026-08-07)

При разборе инцидента (ниже) всплыло, что §48 описывал уже существующий кеш для
`gateway.letar.best` — nginx на s2, `proxy_cache` 2 ГБ. Возник соблазн: раз кеш есть, может, не
строить новый, а оставить как есть?

**Решение владельца: нет.** На s2 живут продакшен-сайты, и раздача IPFS не должна отъедать у них
трафик и диск. Кеш строим на mail-сервере, как и планировали; имя уходит с s2 совсем.

Отсюда правки в §48: строка про HTTP-кэш в таблице находок и пункт M3 «`gateway.letar.best`
остаётся на nginx» — оба сняты. Это тот случай, когда сегодняшний откат случайно сделал правильно:
уведя имя на `s3`, он уже убрал s2 из пути.

#### ✅ Уборка выполнена 2026-08-08 — освобождено ~9 ГБ

| Замер               | Занято     | Свободно  |
| ------------------- | ---------- | --------- |
| до уборки           | 145 ГБ     | 29 ГБ     |
| после сноса кеша    | 144 ГБ     | 30 ГБ     |
| после удаления тома | **136 ГБ** | **38 ГБ** |

Что убрано: каталог кеша `.../data/nginx/ipfs-cache` (1.3 ГБ, 968 файлов, последняя запись
17 июня) и named volume `animatrona-gateway-data` (7.7 ГБ, IPFS-репозиторий, создан 3 марта,
блоки не менялись с 21 июня). Владелец подтвердил, что содержимое тома — дубль пиннящегося на s3.

Proxy host 11 выключен владельцем через админку NPM (не правкой SQLite — см. ниже, почему).
Директива `proxy_cache_path` в `http_top.conf` **оставлена**: зона без потребителей безвредна, а
правка общего конфига nginx ради двух строк рискованнее. Уберём вместе с полным удалением host 11.

**Квитанции из списка CID снять не удалось** — Kubo не поднимается на read-only томе (`repo.lock`),
а читать datastore в обход `ipfs` — отдельная задача с риском повредить структуру. Две попытки,
дальше не пошли: страховка не должна становиться блокером после принятого решения.

**Побочная находка, вынесена в отдельную проверку:** `dashboard.letar.best` отвечает TLS
`unrecognized name` и резолвится в `185.28.85.195` — адрес, который
`infra/animatrona-gateway/README.md:8` называет адресом s2. Либо дока врёт про адрес, либо это
живое имя на s2 без vhost. Отдельная зацепка: `s1.letar.best` списан 2026-06-20, и если адрес
принадлежит ему, то это мёртвая запись на списанный сервер — опасна тем, что хостер может отдать
адрес другому клиенту. Замер запрошен, изменений не делаем.

#### Как убирали (порядок, который стоит повторить)

**Уборка: убрать кеш с s2** (распоряжение владельца 2026-08-08, выдано BlackCove). Порядок в
задании не косметический — два шага можно сделать необратимо неправильно:

- ⚠️ **Править `/opt/npm/data/nginx/proxy_host/*.conf` бесполезно.** NPM генерирует эти файлы из
  своей SQLite и восстановит удалённый при следующем reload/restart — тихо, уже после отчёта об
  успехе. Отключать нужно саму запись proxy host через админку/API NPM. Тот же класс ловушки, что
  `docker compose up -d` со смонтированным конфигом
  ([docker-bind-mount-pitfalls.md](/.claude/docs/docker-bind-mount-pitfalls.md)): проверка
  результата врёт в опасную сторону.
- ⛔ **Каталог кеша сносить только после `disable`.** Под работающим nginx дескрипторы остаются
  открытыми: место не освободится, поведение станет непредсказуемым.
- **`disable`, а не удаление записи** — обратимо одним кликом. Полное удаление отдельным шагом
  позже.
- **Шаг 0 — DNS.** Если хоть один из шести запросов к авторитетному NS отдаст `s2`, работу не
  начинать: снимем фронт у живого трафика.

Отдельно в задании запрошен `proxy_pass` из конфига **до** удаления: если бэкенд ходил не на
локальный Kubo, картина маршрутов у нас неполная, и это надо разобрать до того, как свидетельство
исчезнет.

### Инцидент 2026-08-07 — `gateway.letar.best` увели на пустой сервер, трекер лёг

Разделение имён (блок выше) применили в панели DNS **обеими записями сразу**: `ipfs` вернули на
s3 — правильно, а `gateway` перевели на mail — на два-три шага раньше, чем следовало. Прокси на
mail не существует до сих пор.

**Как выглядела поломка.** Не таймаут и не «медленно»: TCP до `31.56.180.161:443` проходил, а TLS
отдавал `alert: unrecognized name` — NPM на mail активно отвергал handshake, потому что vhost с
таким SNI там не заведён. Отрицательный контроль (мёртвый порт `:9999`) дал пустой ответ,
положительный (`:443`) — коннект. То есть сеть была ни при чём, различие ровно на уровне TLS.

Пострадал `animatrona-tracker`: в его `.env.docker` переменная задана явно, и она `NEXT_PUBLIC_*`,
то есть **вшита в клиентский бандл**. Браузер каждого посетителя ходил за постерами и манифестами
в мёртвое имя.

#### Урок: у этого имени нет быстрой ручки, кроме DNS

Первый напрашивающийся откат — «переопределить `NEXT_PUBLIC_IPFS_GATEWAY` на `ipfs.letar.best` и
передеплоить». Проверено по коду: **не работает, и провалилось бы частично** — худший из режимов.

`apps/animatrona-tracker/next.config.js:16-33` перечисляет в `images.remotePatterns` только
`gateway.letar.best`; `ipfs.letar.best` там нет. Значит `fetch` за JSON ожил бы, а всё, что идёт
через `next/image` — постеры, то есть основной контент интерфейса и прямая цель кеша, — начало бы
отдавать `400` от оптимизатора. Починка выглядела бы как новая поломка.

Плюс имя зашито дефолтом ещё в семи местах (`src/lib/ipfs.ts:12`, `audit-cid-collector.ts:16`,
четыре компонента, `docker-compose.production.yml:72`), так что одна переменная перекрывает не всё.

Итог: путь через env = правка конфига + полная пересборка образа + деплой. Откат сделали
возвратом CNAME на s3 — одно действие, без сборки, эффект в пределах TTL.

**Обобщение, которое стоит помнить за пределами этой задачи:** домен, попавший в `NEXT_PUBLIC_*`
**и** в `remotePatterns`, перестаёт быть конфигурацией и становится частью собранного артефакта.
Переставлять его DNS'ом можно только туда, где уже есть рабочий фронт, — «поправим переменной,
если что» здесь не запасной план, а иллюзия запасного плана.

### Всплытие

Всплыло при переписи хостовых слушателей (§49): на s3 нашёлся `animatrona-pin-queue`, слушающий
`*:42080`. Разбор вывел на две отдельные задачи — архитектурную и уборочную.

### 1. Кеширующий слой перед раздачей (решение владельца)

**У Traefik нет кеширования.** Для раздачи файлов это существенно: каждый запрос уходит на бэкенд,
а в случае IPFS бэкенд — Kubo, которому чтение блоков стоит дорого (на пиннере с HDD особенно, там
и datastore подобран под это, и GC отключён именно из-за стоимости обхода блоков).

**Решение:** промежуточный кеширующий **nginx для файлов меньше 5 МБ**. Крупные отдаются мимо
кеша — иначе кеш вытесняется одним большим файлом и перестаёт работать для остальных.

**Размещение: сразу на mail-сервере.** Первоначально планировалось «сейчас на s3, потом переезд»,
но владелец решил не делать промежуточный шаг — ставим там, где всё равно окажемся. Заодно
снимается вопрос совмещения с пилотом Traefik на s3 (§48): фронты оказываются на разных машинах, а
не два на одной.

Значит прокси и пиннер **на разных серверах**: nginx-кеш на mail-сервере, Kubo с `pin-queue` — на
s3. Отсюда требование, которое иначе было бы неочевидным: **бэкенд адресуется по сети, а не через
`127.0.0.1`**. `Caddyfile` из старой схемы проксировал на `127.0.0.1:5001`/`127.0.0.1:42080` —
переиспользовать его как образец нельзя, там оба сервиса были на одной машине с фронтом.

⚠️ **Кеш на mail-сервере опаснее, чем где-либо ещё.** Кеш растёт сам. На любой другой машине
переполнение диска означает «сломался сервис»; здесь — **сломалась почта**, а почта у нас канал
доставки алертов. То есть первым отвалится ровно то, что должно было сообщить о заполненном диске,
и узнаем мы не от мониторинга, а по тому, что что-то давно не приходило.

Отсюда два требования независимо от того, сколько там места:

- `proxy_cache_path` **обязан** иметь `max_size` с большим запасом, а не «сколько поместится»;
- кеш и почта по возможности на разных разделах; если раздел один — запас считать от нужд почты,
  а не от свободного места.

**Размер: 10 ГБ** (решение владельца 2026-08-07). ⚠️ Владелец назвал 35 ГБ по памяти, замер
дал другое: **33 ГБ раздел, 27 ГБ свободно**. Решение в силе, но запас после кеша не 25 ГБ, а **17 ГБ**
на всё — раздел один, отдельного под почту нет.

Две поправки к арифметике, обе занижают реальную ёмкость:

- `max_size` у nginx — **мягкий предел.** Cache manager вычищает лишнее периодически, между
  проходами объём может его превышать. Считать 10 ГБ как «не больше 10» нельзя, это «в среднем
  около 10».
- **Временные файлы идут поверх кеша.** По умолчанию скачиваемый ответ пишется в
  `proxy_temp_path`, и только потом переносится в кеш. Если он на том же разделе — это плюс к
  занятому месту, а при разных разделах ещё и лишнее копирование. Ставить `use_temp_path=off`,
  тогда временные файлы пишутся прямо в каталог кеша.

### ⚠️ «Кешировать файлы меньше 5 МБ» и раздача видео плохо совместимы

Требование сформулировано как «кеш для файлов меньше 5 МБ». Но основной потребитель
`ipfs.letar.best` — плеер `svoichuzhie`, а он тянет **видеофайл целиком по CID**
(`upload-player.tsx:19`), Range-запросами (в §14 так и записано: «HTTP Range ✅»). Видео на 720p —
это десятки-сотни мегабайт, то есть **под правило «меньше 5 МБ» не попадает почти ничего из
видеотрафика**. Кеш получится, но обслуживать будет постеры и мелочь, а не то, ради чего затевался.

Плюс отдельная техническая деталь: nginx не кеширует частичные ответы «сам собой». Чтобы кешировать
файл, который запрашивают по кускам, нужен модуль `slice`:

```nginx
slice 1m;
proxy_cache_key "$uri$is_args$args$slice_range";
proxy_set_header Range $slice_range;
```

Тогда кешируются **куски по 1 МБ**, а не файл целиком, и порог «меньше 5 МБ» теряет смысл —
кусок всегда меньше. При 10 ГБ это ~10 000 слайсов, то есть порядка 10 ГБ горячего видео в любой
нарезке.

**✅ Решено владельцем 2026-08-07: кешируем только мелочь — JSON, постеры, субтитры. Видео и аудио
не кешируем вообще.**

**Цель кеша — скорость отрисовки интерфейса `animatrona-tracker`.** Постеры и JSON — основной
контент, который он тянет; от их задержки зависит, как быстро появляется интерфейс. Не пропускная
способность, а **время до первого байта на множестве мелких запросов**. `slice` не нужен, конфиг
проще.

Из «латентность, а не трафик» следуют четыре вещи, которые иначе не очевидны:

1. **Контент по CID неизменяем — TTL фактически бесконечный.** `/ipfs/{cid}` по определению всегда
   отдаёт одно и то же: меняется содержимое — меняется CID. Значит `proxy_cache_valid 200 365d` и
   никакой инвалидации не нужно вовсе. Это редкий случай, когда у кеша нет самой сложной его части.
2. **Отдавать устаревшее, обновляя в фоне** — `proxy_cache_use_stale updating` +
   `proxy_cache_background_update on`. Для интерфейса «мгновенно, пусть и слегка несвежее» лучше,
   чем «подожди, пока схожу к бэкенду». Хотя при неизменяемом CID случай почти не наступает.
3. **`proxy_cache_lock on`** — иначе при первом открытии страницы десяток параллельных запросов
   одного и того же непрокешированного постера уйдут в Kubo одновременно. Ровно та нагрузка, от
   которой уходим.
4. **Браузерный кеш важен не меньше серверного.** Повторный заход не должен доходить даже до
   прокси: `Cache-Control: public, max-age=31536000, immutable`. При неизменяемом CID это
   безопасно — а без этого прокси будет обслуживать то, что вообще не должно было до него дойти.

По объёму 10 ГБ здесь с большим запасом: постер — сотни килобайт, JSON — единицы. Это десятки
тысяч объектов, то есть размер кеша ограничением не будет.

**Фильтровать по `Content-Type`, а не по размеру.** Порог в мегабайтах — эвристика: короткий ролик
или превью-аудио в неё попадут и осядут в кеше вопреки решению. Список разрешённых типов
(`application/json`, `image/*`, `text/vtt`, субтитры) выражает намерение прямо и заодно исключает
`video/*`/`audio/*` по построению.

⚠️ Проверить, что шлюз Kubo вообще отдаёт вменяемый `Content-Type` для `/ipfs/{cid}` — он
определяет его по содержимому, и на этом фильтр держится целиком. Если для части ответов приходит
`application/octet-stream`, фильтр по типу их не пропустит в кеш (это безопасный отказ, но полезно
знать заранее).

### ⛔ Некешируемое видео — отдельная угроза диску, не связанная с `max_size`

Решение «видео не кешировать» **не означает**, что видео не касается диска mail-сервера.

nginx по умолчанию буферизует ответ бэкенда: если ответ не помещается в память (`proxy_buffers`),
он пишется в `proxy_temp_path` **на диск** — независимо от того, кешируется он или нет. То есть
каждый проксируемый видеофайл на сотни мегабайт может лечь во временный файл, и `max_size` кеша
тут ни при чём: это другой механизм и другой каталог.

На mail-сервере это ровно тот сценарий, которого мы боялись, — переполнение диска ломает почту, а
почта наш канал алертов.

**Лечится явно:**

```nginx
proxy_max_temp_file_size 0;   # не писать ответ во временный файл вообще
proxy_buffering off;          # на пути раздачи крупных файлов
```

С `proxy_max_temp_file_size 0` nginx отдаёт клиенту синхронно, не складывая ответ на диск. Для
раздачи файлов это и правильнее по сути — меньше задержка до первого байта.

⚠️ Это надо **проверить замером, а не поверить конфигу**: пустить крупное видео через прокси и
следить за `df` на разделе с `proxy_temp_path`. Сегодняшний урок применим буквально — наличие
директивы в конфиге не доказывает, что она работает так, как прочитана.

**Адрес: `ipfs.letar.best`.** Домен уже существует как proxy host в NPM на s2 — то есть это не
заведение нового имени, а **перенос точки входа**: DNS переставить на mail-сервер, запись в NPM на
s2 снять, иначе останется второй путь к тому же имени и будет непонятно, какой из них живой.
Прецедент ровно такой уже был в §49: `media.letar.best` вёл на s3, а на s2 при этом крутился
осиротевший медиа-стек, и это девять дней никто не замечал.

**Доступ — только с наших доменов.** Реализация — `valid_referers` + `403`, как уже сделано в
`infra/media-server/nginx.conf`.

⚠️ **Называть это надо честно: это защита от хотлинка, а не контроль доступа.** `Referer`
подставляется одной строкой в `curl`, а часть браузеров его не шлёт вовсе (`Referrer-Policy`,
переходы с HTTPS на HTTP). То есть механизм отсекает встраивание наших файлов на чужие сайты — и
не отсекает того, кто целенаправленно хочет забрать файл. Если понадобится настоящее ограничение,
это отдельная задача с токенами или подписанными URL, и решать её надо будет осознанно, а не
надеяться, что `valid_referers` уже её решил.

⚠️ **Список доменов не хардкодить в файл публичного репозитория.** В
`infra/media-server/nginx.conf` он лежит прямо в конфиге, и там сейчас перечислены коммерческие
домены — то есть нарушение [public-repo-hygiene](/.claude/rules/public-repo-hygiene.md), которое
разбиралось в §49 и осталось непочиненным (конфиг рабочий, чинится только параметризацией). Новый
фронт заводить сразу с подстановкой списка через env/`include`, чтобы не создавать второй такой же
случай.

⚠️ **`403` не должен попадать в кеш.** Проверка `Referer` — до `proxy_cache`, иначе один запрос без
реферера отравит кеш для всех остальных. И наоборот: `Referer` не должен входить в ключ кеша, иначе
кеш размажется по числу источников и перестанет работать.

### 2. Дока `infra/animatrona-*` описывает схему, которой нет

Владелец подтвердил: **пиннер сейчас один, на s3**. Репозиторий описывает другое — и не в одном
месте, а в пяти:

| Написано в репозитории                                                                                                  | Реальность                                                                  |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| pinner1 на `mail.letar.best`, отдельный каталог `infra/animatrona-pinner`                                               | пиннера там нет                                                             |
| pinner2 «списан» — упоминание живёт в `animatrona-pinner/README.md:18`                                                  | списан, упоминание осталось                                                 |
| pinner3 на выделенном VPS `188.127.235.38` (`infra/animatrona-pinner3/README.md`)                                       | на s3 (`188.127.235.141`)                                                   |
| HTTPS через **Caddy** (`Caddyfile` + `docker-compose.npm.yml` там же)                                                   | Caddy на s3 не запущен: `80`/`443`/`81` держит NPM, `8090`/`8443` — Traefik |
| `bootstrap-all.sh` ходит по SSH на `mail.letar.best` (pinner1) и `s2.letar.best` (gateway) и правит там `Peering.Peers` | адреса из старой схемы                                                      |

⛔ **`bootstrap-all.sh` опасен в текущем виде.** Он не читает конфигурацию, а лезет по SSH на
зашитые хосты и меняет там настройки узлов. Запуск «чтобы посмотреть» пойдёт не туда. До приведения
в порядок — не запускать.

⚠️ Отдельно: расхождение доки дало **ложный вывод в анализе firewall**. Опираясь на README, я
написала, что `*:42080` «обходит фронт Caddy» — то есть проблема тонкой настройки. На самом деле
Caddy там нет вовсе, и у порта **нет фронта в принципе**. Разные диагнозы, разная срочность.
Дока, описывающая несуществующую схему, не просто бесполезна — она уводит расследование.

### Аудит mail-сервера (2026-08-07) — раньше не проводился ни разу

§49 закрывал «оба сервера» — это s2 и s3. Mail-сервер под аудит не попадал, хотя на нём Maddy,
релей и скоро кеш. Замер сделан перед тем, как ставить туда прокси.

**Что слушает наружу:**

| Порт                      | Кто                                                                   |
| ------------------------- | --------------------------------------------------------------------- |
| `80`, `81`, `443`         | nginx-proxy-manager                                                   |
| `25`, `465`, `587`, `993` | maddy                                                                 |
| `4001`                    | `animatrona-relay` (swarm)                                            |
| `41080`                   | `animatrona-relay`, внутренний `8080` — HTTP-регистрация PeerId в ACL |
| `22`                      | sshd                                                                  |

Контейнеров всего три (NPM, relay, maddy), **host-mode нет ни одного** — того класса риска, что
нашёлся на s3 (`animatrona-pin-queue`), здесь нет. `systemd-resolve` и `chronyd` — только loopback.

⚠️ **`ufw` здесь реально работает** — `-P INPUT DROP` и штатный стек `ufw-*`-цепочек. Это первая
из трёх машин, где он не декоративен. **Но `DOCKER-USER` пуст**, а значит всё, что опубликовано
Docker'ом (все 8 портов выше, кроме `22`), идёт **мимо `ufw`** ровно так же, как на s2 и s3.
Работающий `ufw` тут ничего не меняет — это буквально та иллюзия, с которой начался §49, просто
в более убедительном виде: `ufw status` покажет `active`, и ошибиться проще, чем на s2.

**Диск:** один раздел `/dev/vda1`, 33 ГБ всего, 6.1 ГБ занято, **27 ГБ свободно**. Отдельного
раздела под почту нет — почта и кеш будут делить один и тот же `/`.

**Почта:** bind-mount `/opt/maddy/data`, занимает **24 МБ**. То есть по объёму почта не конкурент
кешу вообще; риск не в том, что она займёт место, а в том, что она **первой пострадает**, если
место займёт кеш. И первой же перестанет доставлять алерты об этом.

**RAM:** 3.8 ГБ, доступно ~3.0 ГБ. Для nginx-кеша достаточно с запасом.

⚠️ Первая попытка замера дала «доступа нет»: BlackCove ходил как `deploy`, а на mail-сервере в
`~/.ssh/config` пользователь **`root`**, тем же ключом. Сам нашёл и поправил. Стоит держать в
голове — маппинг пользователей по серверам не единый.

### Definition of Done

- [ ] Установлено, чем сейчас фронтится пиннер на s3: proxy host в NPM (`ipfs.letar.best`?
      `ipfsstor4.letar.best`?) или роутер Traefik. Без этого нельзя ни чинить доку, ни ставить кеш
- [ ] ⛔ Решено, что делать с `*:42080` — **проба подтвердила: по IPv4 открыт из интернета**
      (`188.127.235.141:42080` → succeeded; контроли: `59999` refused, `443` succeeded; по IPv6
      закрыт нашим `ip6tables INPUT`). Причина — `fmt.Sprintf(":%d", …)` в
      `cmd/pin-queue/main.go:172` плюс `network_mode: host`, то есть мимо `DOCKER-USER` (§49).
      **`GET /health` отвечает `200` без токена** и раскрывает peer ID Kubo и состояние очереди.
      Самый прямой фикс — сменить привязку на `127.0.0.1` (фронт всё равно на том же хосте)
- [x] Свободное место на mail-сервере: **35 ГБ**, под кеш выделено **10 ГБ** (владелец,
      2026-08-07). Осталось свериться, на каком разделе лежит почта — если на том же, 25 ГБ
      запаса относятся к ней
- [x] **Решено, что кешируем** (владелец, 2026-08-07): только мелочь — JSON, постеры, субтитры.
      Видео и аудио не кешируем. Цель — скорость отрисовки интерфейса `animatrona-tracker`
- [ ] Фильтр по `Content-Type` (allow-list), а не по размеру в мегабайтах
- [ ] Проверено, что шлюз Kubo отдаёт вменяемый `Content-Type` для `/ipfs/{cid}` — на этом
      фильтр держится целиком
- [ ] `proxy_cache_valid 200 365d` + `proxy_cache_lock on` — контент по CID неизменяем,
      инвалидация не нужна, но стампед при первом открытии страницы реален
- [ ] `Cache-Control: public, max-age=31536000, immutable` наружу — повторный заход не должен
      доходить до прокси вообще
- [ ] Кеширующий nginx на **mail-сервере**, `use_temp_path=off` (иначе временные файлы ложатся
      поверх `max_size`)
- [ ] ⛔ `proxy_max_temp_file_size 0` — **некешируемое видео тоже пишется на диск** через
      `proxy_temp_path`, это отдельный от кеша механизм, `max_size` его не ограничивает.
      Проверить замером `df` под прогоном крупного файла, а не наличием директивы в конфиге
- [ ] Бэкенд (шлюз Kubo на s3, **не** `pin-queue`) адресуется по сети, а не через `127.0.0.1` —
      фронт и шлюз
      на разных машинах, старый `Caddyfile` как образец не годится
- [ ] `ipfs.letar.best` переставлен на mail-сервер, **и запись в NPM на s2 снята** — иначе останется
      второй живой путь к тому же имени (прецедент `media.letar.best`, §49)
- [ ] `valid_referers` + `403`, список доменов **через env/`include`**, не хардкодом в публичный
      конфиг (иначе повторим нарушение public-repo-hygiene из `infra/media-server/nginx.conf`)
- [ ] Проверка `Referer` стоит **до** `proxy_cache`, и `Referer` не входит в ключ кеша
- [ ] Проверено, что `403` не закешировался: запрос без реферера, следом запрос с реферером —
      второй должен отдать файл, а не `403` из кеша
- [ ] `infra/animatrona-pinner3` переписан под реальность (s3, актуальный домен, актуальный фронт);
      `Caddyfile`/`docker-compose.npm.yml` либо удалены, либо помечены как история
- [ ] `infra/animatrona-pinner` (pinner1) — удалён или помечен как история, вместе с упоминаниями
      pinner2
- [ ] `bootstrap-all.sh` приведён в соответствие или обезврежен

---

## §58 — `libs/*/tsconfig.spec.json`: разнобой composite/emitDeclarationOnly — мёртвый груз, не защита ✅ ЗАКРЫТО (2026-08-07)

Всплыло при починке `nx typecheck dashboard-agent` (§ redirect-баг из `.claude/rules/libs.md`,
раздел «Тот же редирект под обычным `tsc`»): у 5 либ (`auth`, `contract-generator`,
`deploy-engine`, `email`, `label-printer-core`) `tsconfig.spec.json` держал
`composite`/`noEmit`/`emitDeclarationOnly`/`tsBuildInfoFile`/`exclude`, а у остальных 34 —
только базовый набор (`outDir`/`types`/`rootDir`). Гипотеза при заходе: богатый вариант — защита
от `TS6305`, и его надо раскатать на все либы.

**Проверка гипотезы её опровергла.** Правило `libs.md` объясняет сам механизм: `references` в
solution-конфиге `tsconfig.json` библиотеки — это выбор TypeScript **последнего** элемента
списка как редиректа при обычном `tsc --noEmit -p`/`tsgo`. У всех 5 «богатых» либ порядок —
`spec`, затем `lib` → редирект уходит на `tsconfig.lib.json` (его строит собственный таргет
`typecheck`, `dist/` реален). Значит `tsconfig.spec.json` в этих пяти — не редирект-цель
вообще, композитные поля никогда не используются. Подтверждено:

- ни один `project.json` этих пяти либ не собирает `tsconfig.spec.json` (`tsc --build` везде
  нацелен на `tsconfig.lib.json`), то есть `out-tsc/spec/` никогда не наполняется — даже если бы
  куда-то редиректило, `TS6305` всё равно был бы;
- ни один `apps/*/tsconfig*.json` не ссылается на `tsconfig.spec.json` этих либ напрямую (грепом
  проверено);
- `libs/generators/src/generators/new-lib/files/tsconfig.spec.json.template` (источник истины
  для новых либ) — плоский вариант без composite-полей. То есть плоский, а не богатый,
  — актуальная конвенция; богатые пять — исторический дрейф, не образец для копирования.

**Реальная защита от `TS6305`/`TS6307` в этом классе — не composite-поля spec-конфига, а уже
задокументированный и частично применённый фикс** (`libs.md`): убрать `references` на `libs/*`
из `apps/<app>/tsconfig.json` целиком, тогда редиректа нет вовсе. Применено пока только к
`dashboard-agent` (2026-08-07, commit `885ceaf2`); ещё у **29 приложений** `tsconfig.json`
содержит `{ "path": "../../libs/<name>" }` — экспозиция бага остаётся живой до их обхода.
Отдельная задача (см. spawn_task той же сессии) — не дублировать здесь.

**Что сделано:** у пяти либ-outlier'ов (`auth`, `contract-generator`, `deploy-engine`, `email`,
`label-printer-core`) убраны неиспользуемые `composite`/`noEmit`/`emitDeclarationOnly`/
`tsBuildInfoFile`/`exclude` — конфиг теперь не создаёт ложного впечатления, что эти пять как-то
защищены иначе остальных 34. `nx run-many -t test typecheck` по всем пяти — зелёный после
правки. Унификация в другую сторону (раскатать композит на все 39) не сделана осознанно — она
ничего не чинит без сопутствующего `tsc --build tsconfig.spec.json` таргета, которого ни у одной
либы нет и заводить его не за чем при живом решении «убрать references у приложений».

---

## §59 — Технический барьер против голого `git commit`, затягивающего чужие staged-файлы ✅ ЗАКРЫТО (2026-08-07)

**Проблема:** 2026-08-07 в один день случились третий и четвёртый инцидент того же класса, что
уже дважды описан в `.claude/rules/git.md` с прошлыми прецедентами (2026-08-06): два параллельных
фоновых агента при бампе SHA submodule выполнили голый `git commit`/`git add` без явного pathspec
и затянули в свои коммиты чужие staged-файлы неродственной инфра-сессии (Traefik staging-labels,
§48 M2) — `apps/kami-key-the-landing` уехал в коммит `070d6eb0`, пять `docker-compose.staging.yml`
(archetest/auth-hub/grandslamcup/mandala/time) — в `42f5ac81`. Данные не потеряны, оба коммита
содержат корректный код под чужим commit message, но письменное правило не сработало третий раз
подряд — значит текстового правила недостаточно, нужна механическая защита.

**Проверено и отклонено:** MCP-инструмент `mcp__agent-mail__install_precommit_guard` — по описанию
должен быть «authoritative reservation gate» против такого класса конфликтов. На практике вызов
возвращает пустой хук (`{"hook": ""}`) и ничего не пишет в `.git/hooks/` — нерабочий на сегодня,
использовать нельзя без предварительной проверки на реальном коммите.

**Что сделано:** установлен локальный git pre-commit хук — `scripts/hooks/pre-commit-scope-guard.sh`.
Смотрит `git diff --cached --name-only`, группирует застейдженные файлы по scope (`apps/<x>`,
`libs/<x>`, `infra/<x>`, либо первый сегмент пути для остального) и блокирует коммит, если файлов
из более чем одного scope — именно это поймало бы оба инцидента выше. Обход для осознанных
multi-scope коммитов (bump all submodules, repo-wide format): `GIT_ALLOW_MULTI_SCOPE_COMMIT=1
git commit ...`. Установка — `scripts/hooks/install.sh`, ставит связку scope-guard +
существующего `pre-commit-sops.sh` в один `.git/hooks/pre-commit`; заменяет старую инструкцию
`cp pre-commit-sops.sh .git/hooks/pre-commit` в `CLAUDE.md`.

Протестировано на реальном сценарии: staged-файлы из `apps/kami` + `libs/forms` → блокируется;
один scope → проходит; с `GIT_ALLOW_MULTI_SCOPE_COMMIT=1` → проходит (хук поймал даже собственный
коммит этой правки — `.claude`, `CLAUDE.md`, `scripts` — три scope, использован задокументированный
обход). Коммит `c87a1cdb`.

**Ограничения:** установка не автоматическая — не подхватывается новыми клонами/агентами сама
собой, у кого уже стоит старый хук от `cp` — нужно вручную перезапустить `install.sh`. Хук ловит
только «несколько scope в одном коммите» — конфликт двух агентов внутри одного и того же
`apps/<x>` он не видит, для этого по-прежнему нужны file reservation через Agent Mail. Broadcast
о новом хуке через agent-mail не прошёл полностью — часть агентов потребовала contact approval
(заявки созданы автоматически); расчёт на то, что `.claude/rules/git.md`/`CLAUDE.md` прочитают
при следующей сессии.

---

## §60 — Инфраструктурные сервисы на серверах живут вне git: фикс в репозитории не доезжает до прода 🆕 (2026-08-08)

**Заведено по итогам попытки закрыть `*:42080` (§57).** Задача выглядела как «поправить код и
пересобрать», а заняла три захода на сервер — и ни один фикс так и не доехал.

### Что случилось

`animatrona-pin-queue` слушал все интерфейсы (`fmt.Sprintf(":%d")` при `network_mode: host` =
порт открыт из интернета мимо `DOCKER-USER`). Исправление — переменная `BIND_ADDR` с дефолтом
`127.0.0.1`, коммиты `74a246ed` и `f01b5281`. Дальше три промаха подряд:

1. Прописала `BIND_ADDR` в `infra/animatrona-pin-queue/docker-compose.yml` — **не тот файл**: на s3
   сервис объявлен внутри compose пиннера, а этот каталог служит лишь build-контекстом.
2. Прописала в `infra/animatrona-pinner3/docker-compose.yml` — **тоже не тот**.
3. Работающий контейнер оказался из **`/opt/pin-queue/` на s3**, а это вообще не git-репозиторий:

```
docker inspect animatrona-pin-queue --format '{{json .Config.Labels}}'
  com.docker.compose.project.config_files: "/opt/pin-queue/docker-compose.yml"

cd /opt/pin-queue && git status
  fatal: not a git repository
```

Каталог создан руками через `setup.sh` 18 июня — снимок исходников на тот день, дальше живущий
своей жизнью. `git pull` в `letar` его не затрагивает никогда.

### Почему это отдельная задача, а не деталь §57

Дыру закрыли обходным путём (правило firewall + ручное копирование исходников). Но **причина
осталась**: любой следующий фикс любого инфра-сервиса упрётся в то же самое, и выяснится это
опять только на сервере, после нескольких неверных попыток.

Отдельно скверно то, что расхождение **невидимо из репозитория**. Правка выглядит применённой:
код изменён, compose изменён, коммит есть, `git pull` на сервере проходит. Ровно тот класс, что
собран в [verification-pitfalls.md](/.claude/docs/verification-pitfalls.md) — проверка отвечает
на соседний вопрос («файл в репозитории изменён» вместо «сервис работает по изменённому файлу»).

### Что сделать

- [x] **Перепись выполнена** (BlackCove, 2026-08-08). Искали по
      `docker inspect ... com.docker.compose.project.working_dir` по всем контейнерам трёх
      серверов. Оказалось **десять каталогов**, а не два:

      | Сервер | Каталог                                     | Что там                 | Секреты                           |
      | ------ | ------------------------------------------- | ----------------------- | --------------------------------- |
      | s2     | `/home/deploy/wordpress`                    | nginx, php, mariadb     | ⛔ пароли БД **в самом compose**  |
      | s2     | `/home/deploy/lena/apps/animatrona-tracker` | `…-tracker-redis`       | ⚠️ `.env.docker` — **директория** |
      | s3     | `/opt/pin-queue`                            | `animatrona-pin-queue`  | `.env` (`AUTH_TOKEN`)             |
      | s3     | `/opt/npm`                                  | nginx-proxy-manager     | нет                               |
      | s3     | `/opt/letar-ipfs`                           | kubo                    | нет                               |
      | s3     | `/opt/e2e-infra`                            | e2e-redis, e2e-postgres | нет                               |
      | mail   | `/root/nginx-proxy-manager`                 | nginx-proxy-manager     | нет                               |
      | mail   | `/root/animatrona-relay`                    | `animatrona-relay`      | `.env`                            |
      | mail   | `/opt/maddy`                                | maddy                   | нет                               |

      Остальные 44 контейнера s2 — внутри клона. `.git` нет **ни в одном** из десяти, то есть
      риска «`git init` поверх чужого репозитория» нет нигде.

#### Три находки, которых не искали

1. **На mail внутри клона нет ни одного контейнера — все три вне.** Это меняет постановку: не
   «один каталог отбился», а **целый сервер живёт вне репозитория**. Причём тот самый, на котором
   почта — канал доставки алертов, и куда по §57 едет кеширующий прокси.
2. **У `wordpress` пароли БД лежат прямо в `docker-compose.yml`**, без `.env` вообще. Пока каталог
   вне git это «просто плохо». В момент переноса в репозиторий это становится способом
   закоммитить прод-пароли — значит вытаскивать их в `.env` надо **до** переноса, а не после.
3. **`.env.docker` у `animatrona-tracker-redis` — директория, а не файл.** Классическая ловушка
   bind-mount: Docker создаёт каталог, если монтируемого пути нет
   ([docker-bind-mount-pitfalls](/.claude/docs/docker-bind-mount-pitfalls.md)). Контейнер почти
   наверняка работает не с теми переменными, которые ему собирались передать, и выглядит при этом
   здоровым. Плюс сам путь `/home/deploy/lena/...` — из времён до переименования `lena` → `letar`.

#### Способ переноса: не один на все десять

Каталоги делятся на три группы, и цена у них разная:

- **Compose уже есть в репозитории** (`pin-queue`, kubo, `e2e-infra`, оба NPM) — переносить нечего,
  надо просто **запускать из клона** и удалить копию. Это не новый механизм: `traefik`,
  `media-server`, `acme-dns` уже так живут.
- **Compose нет нигде, кроме сервера** (`wordpress`, `maddy`, `animatrona-relay`) — сначала завести
  его в `infra/<name>/`, потом переключать. Здесь же сначала вынимать секреты.
- **То, что скоро умрёт** — `/opt/npm` на s3 (выключается в §48 M2) и `e2e-postgres` (§53, волюм
  удаляется ~2026-08-21). Их переносить **не надо вовсе**: работа уйдёт в мусор вместе с сервисом.

⛔ **Переносить = пересоздавать контейнер.** Для `maddy` это простой почты, а почта — канал
доставки алертов; для `mariadb` под `wordpress` — риск данным. Поэтому порядок: сначала то, где
фикс реально нужен и терять нечего (`pin-queue`), потом безболезненное (kubo, relay), и в самом
конце stateful на mail — отдельной сессией, а не «заодно».

- [x] `pin-queue` → запуск из клона ✅ ЗАКРЫТО (2026-08-10). Сделано **не** через `git init` +
      sparse-checkout на месте (пункт «Способ» ниже), а проще: у сервиса `container_name` и имя
      тома (`animatrona-pin-queue-data`) заданы явными литералами в compose, а не выводятся из
      имени compose-проекта — значит рабочая директория вообще не влияет на привязку тома, и
      «на месте vs в клоне» перестаёт быть развилкой с риском для pin-queue конкретно (риск
      актуален для `relay`, где идентичность зашита в томе — там способ ниже остаётся в силе).
      Контейнер поднят прямо из `/home/deploy/letar/infra/animatrona-pin-queue/`, тот же паттерн,
      что уже у `traefik`/`media-server`/`acme-dns`.

      Побочно найден и исправлен реальный баг: `KUBO_API_URL` в репозитории был захардкожен на
      `5011` (порт другого Kubo-инстанса, `animatrona-pinner`) с самого первого коммита, а живой
      Kubo рядом с pin-queue (`pinner3`) всегда слушал стандартный `5001` — на сервере это когда-то
      поправили руками в обход git, расхождение никогда не попадало в репозиторий. Слепое
      применение старого compose из репо сломало бы связь с Kubo; порт сверен по факту
      (`docker ps`) и по `kubo-config.ts:62`, исправлен в обоих местах (`docker-compose.yml`,
      `main.go` дефолт), закоммичено и запушено (`9259b778`).

      Ещё одна находка по пути: корневой `.gitignore` не покрывал голый `infra/*/.env` (только
      `.env.*` с суффиксом) — секреты `pin-queue` (`AUTH_TOKEN`, `KUBO_AUTH_TOKEN`) чуть не попали
      бы в отслеживаемое дерево при копировании `.env` в клон. Патч `infra/*/.env` в `.gitignore`
      (`8ad44a63`), проверено `git check-ignore`.

      Проверено на живом сервисе (не по `git log`): `docker inspect` — `config_files` теперь
      указывает в `/home/deploy/letar/infra/...`, том `animatrona-pin-queue-data` тот же самый
      (не пересоздан), `Health.Status: healthy`, `ss -ltn` подтверждает `127.0.0.1:42080` —
      `BIND_ADDR`-фикс (§57) теперь реально применён на уровне кода, а не только firewall'ом.
      Старый `/opt/pin-queue` не удалён (root-owned, у `deploy`-пользователя нет прав на `mv`) —
      оставлен как инертный откат, потребует ручной уборки с root-доступом, не блокирует ничего.

      Полный `git pull` на s3 не прошёл — рабочее дерево клона грязное (несвязанные локальные
      изменения: `bun.lock` §50, `playwright/.auth/*.json` от e2e-прогонов, несколько untracked
      каталогов). Не трогала — не моя задача и не моя область понимания. Взяла точечно только
      нужные файлы: `git checkout origin/main -- <3 файла>`. Общая уборка рабочего дерева
      клона на s3 — отдельная, не начатая задача.
- [ ] `wordpress`: пароли из `docker-compose.yml` в `.env` — **до** любого переноса
- [ ] Разобраться с `.env.docker`-директорией у `animatrona-tracker-redis`: чем он на самом деле
      сконфигурирован сейчас
- [ ] kubo (`/opt/letar-ipfs`) — он же последний непристроенный host в §48 M2 (`ipfs.letar.best`),
      удобно делать одним заходом

      ⚠️ **Второй случай нашёлся в первый же день и не поиском** — это довод, что двумя дело не
      ограничится. И он показал вторую грань проблемы: расходится не только код, но и **факты о
      портах**. `infra/animatrona-relay/docker-compose.yml` объявлял `41001:4001/tcp`, на сервере
      — `4001:4001/tcp`. То есть репозиторий не просто «отстал», а активно вводил в заблуждение
      при составлении правил firewall: попади `41001` в allow-list, P2P-связность умерла бы тихо,
      без единой ошибки в логах. Файл поправлен по факту (коммит ниже), но правка ничего не
      применяет — на сервере используется не он.
- [ ] **Классифицировать по одному признаку: есть ли в томе идентичность.** Ключ, PeerId,
      сертификат — то, что нельзя воссоздать. Этот признак делит сервисы на «можно переехать» и
      «трогать только на месте», и он важнее любых соображений об удобстве. Разбор — ниже.
- [ ] **Способ (решение принято 2026-08-08): каталоги делаем обновляемыми на месте, сервисы не
      переносим.** `git init` + `remote add` + sparse-checkout нужного пути, shallow.
- [ ] **Проверка применимости:** после перевода — изменить что-нибудь заметное в репозитории,
      выкатить и убедиться **на самом сервисе**, что доехало. Не по `git log` на сервере.

### Почему на месте, а не переносом в клон репозитория

Напрашивается очевидное: перенести сервис в `/home/deploy/letar/infra/<name>` и забыть. Так делать
**нельзя по умолчанию** — смена каталога меняет имя compose-проекта, а с ним привязку **томов**.
Тома пересоздадутся пустыми.

Для `pin-queue` это терпимо (там очередь заданий). Для `relay` — нет:

```ts
// apps/animatrona/main/services/kubo/kubo-config.ts:17
PRIVATE_RELAY = '/ip4/31.56.180.161/tcp/4001/p2p/12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA'
```

**PeerId relay зашит в бинарник каждого установленного клиента.** Сам ключ лежит в томе
`relay_data` (`IDENTITY_PATH=/data/relay-identity.key`). Потеряли том → сменился PeerId → уже
установленные десктопы перестали находить relay, и обновление приложения им не поможет: адрес
зашит в той версии, что у них стоит.

То есть «уборка техдолга» здесь способна необратимо отрезать пользователей. Отсюда выбранный
способ:

- каталог остаётся на месте, `working_dir` не меняется;
- имя compose-проекта то же → **тома не пересоздаются**;
- контейнер вообще не трогается, пока не решим пересобрать;
- `git pull` начинает работать — следующий фикс доедет.

⚠️ **Порядок обязателен: сначала перепись, потом по одному сервису**, начиная с наименее
рискованного (без идентичности в томе), с проверкой после каждого.

### Побочная находка: код десктопа описывает инфраструктуру, которой нет ✅ ПОЧИНЕНО (2026-08-08)

В том же `kubo-config.ts`:

```ts
GATEWAY_ADDR = '/ip4/185.28.85.195/tcp/42001' // animatrona-gateway на s2
```

Этого узла не существует с июня 2026 (§57). Клиенты до сих пор пытаются к нему подключаться. Не
авария — есть другие пути получения блоков, — но в ту же копилку: расхождение кода с реальностью
здесь не ограничивается серверными каталогами.

При разборе выяснилось, что это не просто мёртвый комментарий: `kubo-daemon.ts` форсировал
`GATEWAY_PEER_ID`/`GATEWAY_ADDR` в `Peering.Peers` **безусловно на каждом старте демона** —
tracker API про gateway не знает вовсе (не pin-сервер), поэтому хардкод не был fallback-веткой,
он выполнялся всегда. Reconnect-цикл `peer-sync-service.ts` каждые 30 минут сам вычищал этот peer
как устаревший (`KNOWN_PINNER_PEER_IDS`, есть в whitelist, но tracker его не подтверждает) — то
есть система самолечилась, но каждый запуск приложения начинался с окна в ~30 минут заведомо
мёртвых попыток подключения.

Починено по уже существующему в файле паттерну (`PINNER2_*` — списанный узел, `@deprecated`):
константы `GATEWAY_PEER_ID`/`GATEWAY_ADDR` остались (нужны whitelist'у для авто-удаления у
клиентов со старым конфигом), но убраны из `KUBO_CONFIG.Peering.Peers` и из безусловной инъекции
в `kubo-daemon.ts`. Остальные адреса в `kubo-config.ts` (pinner1 mail, pinner3 `.38`) трогать не
стала — §57 сам ещё не решил, какая из них соответствует реальности (DoD пункт «чем сейчас
фронтится пиннер на s3» не закрыт), править вслепую нельзя.

### Чего НЕ делать

⛔ Не «чинить» это правкой файлов прямо на сервере как постоянной практикой. Ручная копия и
появилась так — один раз показалось быстрее.

⛔ Не переводить на git в одиночку, без переписи. `/opt/pin-queue` содержит боевой `.env`
(`AUTH_TOKEN`, `KUBO_AUTH_TOKEN` от 18 июня), и наивный `git init` в каталоге с секретами — новый
способ их потерять или закоммитить.

⛔ **Не переносить каталог сервиса, у которого в томе лежит идентичность** (`relay`). Смена имени
compose-проекта пересоздаст том пустым, PeerId сменится, и клиенты с зашитым адресом отвалятся
безвозвратно. Если перенос всё-таки понадобится — сначала явный перенос тома, потом проверка, что
PeerId **не изменился**, и только потом всё остальное.

### Связанное

- §57 — задача, при которой всплыло; там же закрытие `42080` обходным путём.
- §49 — уровень 3 (`iptables INPUT`): правило для `42080` относится туда же.
- Токен `AUTH_TOKEN` этого сервиса лежал открытым текстом в публичном репозитории
  (`apps/animatrona/main/services/ipfs/pin-queue-poller.ts:23`) — вынесен в §61.

---

## §61 — Общий серверный секрет внутри распространяемого desktop-приложения ✅ ЗАКРЫТО (2026-08-10)

**Выделено из §60.** Там задача про то, что фикс не доезжает до сервера; здесь — про то, что
secret'у в этом месте вообще не место, независимо от способа доставки.

### Что найдено

`apps/animatrona/main/services/ipfs/pin-queue-poller.ts` содержал строкой токен доступа к
`pin-queue` — сервису, который принимает CID и **кладёт произвольный контент в наше хранилище**.
Рядом стоял адрес `http://mail.letar.best:42080`.

Три отдельных дефекта в трёх строках:

| Что                       | Почему плохо                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Токен строкой в исходнике | Репозиторий **публичный**, токен там с первого коммита (2026-05-16) — почти три месяца |
| `http://`                 | Токен уходил открытым текстом                                                          |
| `mail.letar.best:42080`   | **Неверный сервер:** сам сервис на s3, на mail этот порт не слушает никто              |

Третий пункт нашёлся по переписи хостовых слушателей mail (§49): там `25/465/587/993`,
`80/81/443`, `4001`/`41080`, `22` — и всё. То есть код обращался в никуда, и заметить это по
самому коду было нельзя.

### Что сделано (коммит `c8bbb7fc`)

Токен вынесен в `PIN_QUEUE_AUTH_TOKEN`, **без значения по умолчанию**: нет переменной — запрос не
отправляется вовсе. Адрес исправлен на `https://ipfsstor4.letar.best` (переопределяется
`PIN_QUEUE_URL`). Семь тестов.

⛔ **Это уменьшает утечку, но не закрывает дыру.** Два независимых остатка:

1. **Ротация.** Удаление из кода токен не отзывает — он остаётся в истории git публичного
   репозитория навсегда. Пока не сменён, считается скомпрометированным.
   → **Снято 2026-08-08 проверкой, см. ниже: утёкшая строка мёртвая.**
2. **Конструкция.** `animatrona` **распространяется** — установщик лежит в GitHub Releases, на
   лендинге есть кнопка скачивания. Любой общий серверный секрет, попавший в сборку, доступен
   каждому, кто её скачал. Переменная окружения от этого не спасает: если её проставляет сборка,
   секрет внутри установщика; если пользователь — секрет всё равно у каждого пользователя.

### ✅ Проверено 2026-08-08: утёкший токен НЕ живой, ротация не нужна

Прежде чем ротировать, сверила три стороны по `md5`, не печатая ни одного значения:

| Сторона                                             | `md5`       |
| --------------------------------------------------- | ----------- |
| строка из публичной истории git (`PIN_QUEUE_AUTH`)  | `fef45eb9…` |
| живой `AUTH_TOKEN` в `/opt/pin-queue/.env` на s3    | `48bb88e7…` |
| `PinServer.pinQueueSecret` (`pinner4`) в БД трекера | `48bb88e7…` |

Вторая и третья совпадают между собой и **обе отличаются от первой**. То есть:

- утёкшая строка сервисом больше не принимается — где-то между 2026-05-16 и сегодня токен уже
  сменили, а десктопный клиент после этого просто перестал работать и никто не заметил (что сходится
  с находкой ниже: клиент не вызывался ниоткуда);
- связка «трекер → pin-queue» при этом **исправна**, обе стороны на одном значении.

**Ротацию отменяю.** Единственным доводом за неё было «живой токен лежит в публичном репозитории» —
посылка ложная. Ротация сейчас не добавила бы безопасности, зато потребовала бы окна, в котором
рабочий пиннинг ломается.

⚠️ **Само совпадение второй и третьей строки — ещё и контроль метода.** `.env` и колонка БД
разбирались разными командами (`cut -d=` против `md5()` в SQL); совпади они случайно с разной
обрезкой кавычек или перевода строки — не совпали бы вовсе. То есть сравнение с первой строкой
велось над одинаково очищенными значениями, а не над артефактами разбора.

Осталась только вторая половина §61 — **конструкция**, и она решена отдельно: пинит только трекер,
клиент удалён (`563f9fb1`).

### ⛔ Переименование `apiUrl` привязано к моменту остановки NPM, раньше нельзя

Напрашивающийся шаг «поменять `apiUrl` у `pinner4` на `pin1.s3.letar.best` прямо сейчас» **сломал
бы пиннинг**: Traefik на s3 до переезда слушает `8443`, а по `https://pin1.s3.letar.best` (то есть
`443`) запрос попадёт в NPM, где такого host'а нет.

Обратный путь тоже закрыт: оставить старое имя работающим уже через Traefik нельзя —
`ipfsstor4.letar.best` лежит вне `*.s3.letar.best`, сертификата на него у s3 нет, и завести его
означало бы ещё один аккаунт acme-dns ради имени, которое мы и так убираем.

Отсюда жёсткое следствие для M2: **`UPDATE` адреса делается в том же окне, что и остановка NPM**, а
не до и не «когда-нибудь после». До этого момента `ipfsstor4.letar.best` через NPM — рабочий путь,
и трогать его не надо.

```sql
UPDATE "PinServer" SET "apiUrl" = 'https://pin1.s3.letar.best' WHERE id = 'pinner4';
```

ℹ️ Попутно из той же выборки: у `animatrona-gateway` в `apiUrl` стоит `https://gateway.letar.best`.
При переезде gateway на mail (§57) строка менять **не надо** — имя остаётся тем же, меняется только
`A`-запись. А вот `relay-mail` записан голым IP по `http://` (`31.56.180.161:41080`) — отдельная
мелочь того же класса, что и §61, но не про секрет; в работу сейчас не беру.

### ⚠️ Находка, меняющая срочность: этот клиент никем не вызывается

`queueRemotePin`, `queueRemotePins`, `cancelRemotePin`, `pollPinQueueStatus`, `checkPinQueueHealth`
— **ни одна не вызывается нигде** в приложении. Через `services/ipfs/index.ts` модуль тоже не
реэкспортируется. То есть весь клиент pin-queue — мёртвый код: написан, но не подключён.

Следствия ровно два, и их важно не перепутать:

- **Утечка настоящая.** Токен рабочий и лежал в публичном репозитории три месяца. Ротация нужна
  независимо от того, вызывается код или нет.
- **Спешки с редизайном нет.** Никакая функциональность не сломается ни от переделки, ни от
  удаления этого клиента. Руки развязаны: можно проектировать правильно, а не латать работающее.

### Что уже построено и годится (проверено чтением, 2026-08-08)

Трекер (`apps/animatrona-tracker`) **уже** имеет всё, из чего собирается правильная схема:

- модель `ApiKey` — ключ **на пользователя**, в базе только SHA256-хэш, есть `lastUsedAt`,
  политика «пользователь видит только свои ключи». Отзыв одного пользователя — удаление строки;
- `UserRole` — `USER` / `MODERATOR` / `ADMIN`, то есть место для политики уже есть;
- `tracker-client.ts` в десктопе уже ходит на трекер с этим ключом по десятку ручек.

То есть «через бэкенд трекера» — не новая архитектура, а использование существующей.

### Суть проблемы

**Клиенту нельзя давать серверный секрет — ни в каком виде.** Не «спрятать получше», а не давать.
Пока `pin-queue` авторизует запросы одним общим bearer'ом, любой владелец копии приложения может
класть произвольные CID в наше хранилище.

Варианты (решение не принято):

- **Через бэкенд трекера.** Приложение уже ходит на трекер с пользовательской сессией
  (`tracker-client.ts`), и там же живёт понятие «кто это». Клиент просит пин у трекера, трекер сам
  зовёт `pin-queue` своим секретом. Секрет не покидает сервер вообще.
- **Токен на пользователя**, выдаётся трекером и отзывается по одному. Дороже, но не требует
  проксировать сам запрос.
- **Оставить как есть + квоты и лимиты.** Не защита, а ограничение ущерба; годится как временная
  мера, не как ответ.

### Definition of Done

- [x] Токен `pin-queue` — ротация решено не делать (см. выше «Проверено 2026-08-08»): утёкшая
      строка из публичной истории git давно не совпадает с живым токеном, ротация не добавила бы
      безопасности, только окно поломки рабочего пиннинга
- [x] Выбрана конструкция авторизации — не «токен на пользователя» и не «прокси через трекер», а
      третий вариант дешевле обоих: клиентский код `queueRemotePin`/`pollPinQueueStatus` и т.д.
      был мёртвым (см. выше), поэтому решение — **удалить его целиком** (`563f9fb1`). Пинит
      только трекер своим секретом, десктоп-клиент больше не умеет пинить напрямую вообще
- [x] Проверено грепом по исходнику `apps/animatrona/main` (2026-08-10, после удаления клиента):
      `kubo-config.ts`/`kubo-service.ts`/`peer-sync-service.ts` содержат только упоминание
      `pin-queue` в комментариях («замена pin-queue логике») и публичный `PINNER4_PEER_ID` — ни
      одного токена, ни одного `Bearer`/`AUTH_TOKEN`-паттерна. Раз секретодержащего кода не
      осталось вовсе, положительный грепа по собранному артефакту избыточен: нечему туда попасть
- [x] Перепись `poster-microtext-desktop` и `label-printer-desktop` (2026-08-10) — оба чисты:
      `poster-microtext-desktop/main` вообще не ходит по сети наружу (только `localhost`/dev-порт
      для собственного Next.js-рендерера); `label-printer-desktop/main/services/settings.service.ts`
      ходит только на свой встроенный сервер (`127.0.0.1:${serverPort}` в проде), общего серверного
      секрета в исходниках обоих приложений нет

### Связанное

- §60 — тот же сервис, но про доставку фиксов; нашлись в одном заходе.
- §52 — тот же принцип fail-closed: молча подставленный «разумный» дефолт превращает «секрета
  негде взять» в неотличимый 401.
- [client-bundle-data-leaks](/.claude/docs/client-bundle-data-leaks.md) — родственный класс
  (утечка через клиентский бандл), там же рецепт проверки с положительным контролем.

## §62 — Красная канарейка 17 дней: почта работала, слеп был датчик 🆕 (2026-08-08)

Найдено попутно при работе над §49 (firewall). `email-canary-state.json` на s2 показывал **1682
подряд неудачи** external-ноги и **596** internal, обе с `alerted: true`. Выглядело как авария
почты длиной в две недели, о которой никто не знал.

**Почта работает. Сломан датчик — причём обе его ноги, по разным причинам.**

### External-нога: никогда не была зелёной

1682 неудачи × 15 минут = 17.5 дней, а самой канарейке на момент разбора было 17.6 дней (коммит
`09fd1a10` от 2026-07-22). То есть счётчик равен **числу всех прогонов с рождения** — нога не
отработала успешно ни разу. Это не регрессия работавшей почты, и одной этой арифметики хватило,
чтобы снять сценарий «две недели назад что-то отвалилось».

Причина — во внешнем ящике (Gmail), read-only проба по IMAP:

```
INBOX          от letar.best=   4   из них НЕ канареечных=  4   канареечных=   0
[Gmail]/Спам   от letar.best=1684   из них НЕ канареечных=  0   канареечных=1684
```

Gmail **принимает все письма** и складывает их в Спам, а канарейка ищет только в INBOX
(`getMailboxLock('INBOX')`). За последние 14 дней в спам легло 1406 канареечных — доставка идёт
непрерывно, включая день разбора.

Существенно, что в спаме **ноль** не-канареечных писем от домена, а обычные письма лежат в INBOX:
фильтруется не репутация домена, а шаблон самой канарейки — одинаковая тема каждые 15 минут и
получатель, приходящий скрытой копией и отсутствующий в `To:`. Проверять внешнюю доставку письмом,
которое само по себе выглядит как спам, — методическая ошибка конструкции, а не сбой.

### Internal-нога: причина была в коде, и мой замер увёл в сторону

Сломалась 2026-08-02 около 10:40 MSK (596 × 15 минут) после 11 дней зелёного — настоящая смена
состояния, в отличие от external. Ошибка `IMAP-операция не завершилась за 105000мс (зависший
сокет)` при `clientError == null` — подвес, а не отказ.

**Развязка: нога ожила сразу после деплоя нового кода 2026-08-08 в 16:16 MSK**, ничего не меняя ни
на почтовом сервере, ни в сети. Значит причина всё это время жила в самой канарейке.

Что её убивало — **накопившийся backlog непрочитанных**. Старый код на каждой итерации опроса
тянул `fetch({ seen: false })`, то есть конверты **всех** непрочитанных писем ящика, и перебирал их
на клиенте. Ящик рос на 96 писем в сутки и не чистился ничем; к 2 августа в нём было около 1050
писем — на этом объёме обход перестал укладываться в 90-секундный таймаут. Новый код спрашивает
серверный `SEARCH` по теме и получает сразу UID нужного письма, поэтому размер ящика на проверку
больше не влияет.

⚠️ **Эту версию я выдвинула первой и сама же ошибочно опровергла.** Замер полного прохода по всем
1695 письмам дал 426мс против таймаута 90000мс, и версия была отброшена как несостоятельная. Ошибка
в том, **откуда** сделан замер: с рабочей машины, а канарейка ходит из контейнера на s2 через канал
до другого датацентра. Мерился не тот путь — ровно та ловушка, о которой я в том же треде писала
BlackCove по поводу `nc -z`, и наступила на неё сама, в тот же час.

Правильная форма проверки была бы «повторить замер из контейнера `dashboard-agent`», а не «замерить
у себя и распространить вывод на прод». Замер, сделанный не тем путём, опаснее отсутствия замера:
он выглядит как факт и закрывает верную гипотезу.

Попутно опровергнуты две другие версии:

- **«DROP пакетов на маршруте контейнер s2 → mail:993»** — проба из контейнера (BlackCove): `nc -z`
  на 993 и 587, оба `rc=0` мгновенно. Оговорка: `nc -z` доказывает только приём TCP-соединения и не
  проверяет TLS, IMAP-логин и `getMailboxLock` поверх него — то есть исключает голый дроп, но не
  подвес выше по стеку.
- **«Зависшая сессия или неотпущенный лок в самом процессе»** — рестарт `dashboard-agent` в
  15:04 MSK, сделанный по другому поводу, ничего не вылечил: через час счётчики продолжали расти,
  обе ноги `false`. Состояние процесса ни при чём, дело было в состоянии ящика.

⚠️ Прямых логов за 22 июля и 2 августа больше нет: тот же рестарт обрезал `docker logs`
`dashboard-agent`. Диагностика по логам этого инцидента невозможна.

### Два побочных дефекта

- **Ящик `canary@letar.best` не чистится вообще.** 96 писем в день, на момент разбора 1695, около
  35 000 в год. Сегодня не мешает (проход 426мс), но растёт линейно и вечно.
- **`\Seen` не проставляется.** Все 1695 писем непрочитаны, хотя нога 11 дней успешно находила
  письмо и звала `messageFlagsAdd`. Отдельной пробой проверено, что Maddy STORE принимает и флаг
  сохраняется — значит дело в вызове: он делается **внутри активного `for await` по `client.fetch`**,
  и сразу за ним идут `return` → `lock.release()` → `logout()`.

### Почему две недели никто не заметил

Исходная версия была «алерты уходили в Telegram, и их не прочитали». Она неверна: **алертов не
было вообще**.

Запрос к БД `dashboard` (BlackCove) по `Alert` с упоминанием canary даёт **ровно одну строку за всё
время — от 2026-07-05**, то есть за две недели до рождения самой канарейки, да ещё с `title` от
чужой задачи при `jobId: email-canary-check`. За 22 июля и 2 августа — **ни одной записи**, хотя в
state-файле у обеих ног стоит `alerted: true`.

То есть `alerted: true` фиксирует «вызов был сделан», а не «уведомление создано»:
`postDashboardAlert` глотает любую ошибку в `console.error` и ничего не возвращает наверх. Дальше
работает второй механизм молчания — флаг `alerted` взводится при первом пересечении порога и
сбрасывается только успехом, которого не было. Даже если бы первый вызов дошёл, повторов не было бы
ни одного за 17 дней.

Два дефекта складываются в полную тишину: **уведомление не создалось, и напомнить об этом было
некому**. Это тот же класс, что §52: канал, который не умеет отличить «доставлено» от
«провалилось», каналом оповещения не является — и в этот раз он молчал целиком, а не частично.

### Definition of Done

Код починен в `dashboard-agent` 0.12.0 (2026-08-08), тесты 65/65 зелёные. На проде не проверено —
нужен деплой.

- [x] External-нога ищет письмо **во всех папках**, а не только в INBOX. Сделано и то, и другое:
      получатель переведён из скрытой копии в `To:` — это был главный спам-признак
- [x] Алерт **повторяется**, пока проблема жива — при каждом удвоении числа неудач (3, 6, 12, 24…)
      вместо булева флага, который взводился один раз и глушил уведомления навсегда
- [x] Факт доставки алерта фиксируется отдельно от факта отправки — `postDashboardAlert` возвращает
      `boolean`, исход пишется в `lastAlertDelivered`, недоставленный алерт повторяется каждый прогон
- [x] `messageFlagsAdd` вынесен из активного `fetch`-цикла (заодно весь поиск переведён с перебора
      конвертов на серверный `SEARCH` — размер ящика больше не влияет на проверку)
- [x] Ящик канарейки чистится за собой: найденное письмо удаляется вместе с канареечным мусором
      старше суток. Только служебный ящик — чужой не трогаем
- [x] Добавлен отдельный сигнал `deliveredToSpam`: письмо дошло, но в спам — доставка формально
      есть, до человека письмо не дойдёт. Раньше это состояние было неотличимо от «нога сломана»
- [x] **Деплой `dashboard-agent` и проверка на живом прогоне** (2026-08-08, 16:16 и 16:25 MSK,
      BlackCove). Проверено независимо от state-файла, прямо по ящикам: свежее письмо во внешнем
      ящике лежит **прочитанным** — значит external-нога его нашла и пометила, чего не случалось
      ни разу за 17 дней; во внутреннем ящике осталось **54 письма вместо 1695** — чистка
      вызывается только из ветки «письмо найдено», так что её срабатывание само по себе
      доказывает, что и internal-нога отработала
- [x] Причина подвеса internal-ноги установлена — backlog непрочитанных против клиентского
      перебора конвертов, см. выше. Лечится тем же переходом на серверный `SEARCH`
- [x] Правило в Gmail «от `canary@letar.best` → не отправлять в спам» — настроено владельцем
      2026-08-08 и **проверено на живых письмах**: письмо в 16:15 MSK (до правила) легло в спам,
      письмо в 16:30 MSK (после) — во входящие. Ящик к тому моменту был вычищен, так что разница
      между двумя одинаковыми письмами объясняется только правилом. Формально правило
      необязательно — код больше не слепнет от спама, — но без него сигнал `deliveredToSpam`
      горел бы постоянно
- [x] Разовая уборка внешнего ящика: ~1685 канареечных писем удалены владельцем 2026-08-08

### Связанное

- §52 — тот же корень: молчаливый провал канала оповещения, неотличимый от тишины.
- §49 — при разборе firewall и нашлось.
- [verification-pitfalls](/.claude/docs/verification-pitfalls.md) — проверять тем же путём, которым
  ходит настоящий потребитель (проба с хоста s2 проходила, из контейнера — нет), и всегда с
  положительным контролем: «в спаме лежат только канареечные, обычные письма домена в INBOX» —
  именно тот контроль, который отличает «фильтруют канарейку» от «фильтруют домен».

---

## §63 — `animatrona-pin-queue` задокументирован в трёх местах, реально работает только один ✅ ЗАКРЫТО (2026-08-08)

Найдено при закрытии `*:42080` (§57/§49/§60). `animatrona-pin-queue` существует в **трёх** местах
одновременно:

1. `infra/animatrona-pin-queue/docker-compose.yml` — «канонический» standalone-деплой сервиса.
2. `infra/animatrona-pinner3/docker-compose.yml` — свой сервис `pin-queue`, собирающий соседний
   каталог как build-контекст (`context: ../animatrona-pin-queue`), с **повторно** прописанными
   переменными окружения.
3. `/opt/pin-queue/` на s3 — вручную развёрнутая копия без `.git`, снимок от 18 июня. Это и есть
   **реально работающий** на s3 сервис (§60).

Сегодняшняя правка `BIND_ADDR` стоила двух промахов: добавила переменную в (1), не подействовало
бы — на s3 сервис поднимается из (2); добавила и туда — тоже не подействовало бы, реальный
контейнер поднят из (3), которого нет в git. Разбор промахов — §60.

### Что уже сделано

- `BIND_ADDR` добавлена и в (1), и в (2) — код корректный, но реальный порт `42080` на s3 в итоге
  закрыт **не** этой переменной, а `iptables`-правилом по внешнему интерфейсу (§49): у сервиса
  оказался легитимный маршрут снаружи через NPM (`ipfsstor4.letar.best → 172.19.0.1:42080`,
  docker-бридж), и loopback-бинд сломал бы этот маршрут.
- §60 уже заводит **общую** задачу «сервисы вне git» (перепись всех трёх серверов, в работе у
  BlackCove, тред `infra-services-outside-git`) — она шире и покрывает и `/opt/pin-queue`, и
  `animatrona-relay` на mail-сервере.
- Оба README (`animatrona-pin-queue`, `animatrona-pinner3`) получили явное предупреждение: реальный
  прод на s3 — `/opt/pin-queue`, вне git, правка файлов в репозитории сама по себе на сервер не
  доезжает.

### Ответ: standalone (1) — единственный когда-либо реально работавший путь

Гипотеза при заведении параграфа была обратной («standalone мёртв, раз pinner1 не существует») —
она не подтвердилась. BlackCove проверила `docker ps -a` + `docker images` на всех трёх серверах
(2026-08-08, тред `pin-queue-dedup-consolidation`):

- **mail и s2** — ни одного контейнера/образа `pin-queue` вообще. Про pinner1 подтверждено ещё
  раз: там никогда ничего не крутилось, README «рядом с pinner1» — просто не обновлённая после
  переезда на единственный пиннер формулировка, а не описание мёртвого, но когда-то живого кода.
- **s3** — контейнер `animatrona-pin-queue` работает **непрерывно с 2026-06-18** (7 недель),
  образ `pin-queue-pin-queue:latest` (имя compose-проекта совпадает с standalone-каталогом (1),
  не с `animatrona-pinner3`) — это и есть `/opt/pin-queue` из §60. Второй образ,
  `animatrona-pinner3-pin-queue:latest` (build-контекст (2)), собран **в день заведения этого
  параграфа** и ни разу не запускался как контейнер.

Вывод: **(1) — реальный, единственный когда-либо работавший путь деплоя**, просто вручную
скопированный на s3 как `/opt/pin-queue` вместо git-checkout. **(2) — задокументированная, но
фактически не задействованная конфигурация** — образ существует только с сегодняшнего дня, ни
разу не был контейнером в проде.

### Сделано по итогам

- README `animatrona-pin-queue`: раздел «Установка» переписан без привязки к несуществующему
  pinner1/mail — как реальный путь (standalone рядом с Kubo на s3), с явной пометкой (2) как не
  разворачивавшегося варианта.
- README `animatrona-pinner3`: шаг `setup.sh`, собирающий pin-queue как build-контекст, помечен
  предупреждением — задокументирован, но не выполнялся на реальном сервере.
- Консолидация `environment:`-блоков (1)/(2) в общий `.env`-шаблон **не делается** — раз (2)
  фактически не эксплуатируется, дублирование не создаёт риска рассинхронизации прод-конфига
  (риск был бы, будь оба варианта живыми одновременно). Решение можно пересмотреть, если владелец
  решит когда-нибудь реально развернуть (2).

### Definition of Done

- [x] Ответ BlackCove получен и записан здесь
- [x] README обоих каталогов приведены в соответствие с фактическим положением
- [ ] `infra/animatrona-pinner` (pinner1, не существует физически с §57) — удалён из репозитория
      или явно помечен как история; входит в DoD §57, здесь не дублируется отдельным пунктом
- [ ] `bootstrap-all.sh` (`animatrona-pinner3/`) приведён в соответствие с реальной топологией —
      входит в DoD §57, здесь только напоминание о связи
- [ ] Решить (не срочно, отдельно от этого параграфа): держать ли build-контекст вариант (2) в
      репозитории как задокументированную, но неиспользуемую альтернативу, или удалить как мёртвый
      код — требует явного решения владельца, самостоятельно не удалять (см. ограничения задачи)

### Связанное

- §57 — источник подтверждения «пиннер один, на s3»; DoD там же закрывает переписывание доки
  топологии целиком (шире, чем этот параграф).
- §60 — общая задача «сервисы вне git», причина, почему правки в (1)/(2) не долетают до (3).
- §49 — `iptables`-правило, которым реально закрыт `*:42080`.

---

## §64 — `docker-user-firewall.sh` (§49) версионирован в git — тот же класс проблемы, что §60 ✅ ЗАКРЫТО (2026-08-08)

Тот же корень, что и §60 (`animatrona-pin-queue`, `animatrona-relay`): скрипт default-deny
`/usr/local/sbin/docker-user-firewall.sh` + systemd-юнит `docker-user-firewall.service`,
реализующие уровень 2 firewall (§49) на s2, s3 и mail-сервере, существовали **только на дисках
трёх серверов**, вне git — ни истории правок, ни ревью, ни резервной копии в репозитории.

### Что сделано

Добавлен `infra/firewall/` — общий параметризуемый скрипт (`docker-user-firewall.sh`) вместо трёх
захардкоженных копий, systemd-юнит-шаблон (`docker-user-firewall.service`, `EnvironmentFile`) и
три конфига портов (`ports.s2.env`, `ports.s3.env`, `ports.mail.env`), собранные по allow-list'ам
из §49/§57. Подробности структуры, деплоя и известных пробелов — в
[infra/firewall/README.md](/infra/firewall/README.md).

### Сверка с реальностью — получена и применена (2026-08-08)

Файлы изначально собирались **по документации** (`PLAN-INFRA.md` §49/§57, `.claude/docs/firewall.md`),
а не копировались побайтово с живых серверов — эта сессия на серверы по SSH не ходит
(`.claude/rules/deploy-coordination.md`). BlackCove прислал реальное содержимое всех трёх
`docker-user-firewall.sh`/`.service` через Agent Mail (`thread_id: firewall-versioning`, только
чтение, ничего на серверах не менял). Найдены и исправлены три расхождения:

- **s3**: не хватало `UDP_PORTS=8443` (HTTP/3/QUIC для пилота Traefik).
- **mail**: неверное предположение «ufw заменяет ip6tables INPUT default-deny» — реальный скрипт
  включает этот блок наравне с s2/s3, ufw (`-P INPUT DROP`) работает как независимый
  дополнительный слой поверх, а не альтернатива.
- **mail**: внешний интерфейс подтверждён — `eth0` (не был задокументирован в §49 ранее).

s2 совпал без изменений. Остаётся одно намеренное структурное расхождение с серверами: реальные
скрипты хардкодят порты в теле, здесь — вынесены в `ports.<server>.env`, скрипт параметризован.
Это сознательный рефакторинг структуры при переносе в git, не факт с сервера — применится при
следующем реальном деплое этого файла на сервер. Подробности — в
[infra/firewall/README.md](/infra/firewall/README.md), раздел «Статус сверки».

### Что сознательно НЕ сделано

Автодоставка изменений из `infra/firewall/` на серверы **не реализована** — решение сознательное,
чтобы не раздувать объём задачи: версионированная копия сама по себе уже закрывает основной риск
(потеря конфигурации при потере сервера или необходимости восстановить с нуля). Деплой правок —
ручная процедура через BlackCove, описана в README. Интеграция в `deploy-affected.sh` — открытый
вопрос на будущее, не блокирует эту задачу.

### Definition of Done

- [x] Ответ BlackCove получен — реальное содержимое трёх скриптов/юнитов сверено с
      `infra/firewall/` построчно, расхождения исправлены (s3 UDP 8443, mail IPv6 INPUT, mail
      интерфейс eth0)
- [x] Внешний интерфейс mail-сервера подтверждён и вписан в `ports.mail.env`
- [x] Пометка «черновик» в README снята после сверки
- [ ] Не сделано осознанно, отдельная задача при желании: фактический деплой этой
      env-параметризованной версии на серверы (сейчас там всё ещё три хардкоженные копии,
      значения совпадают, но механизм подключения конфигурации — нет)

### Связанное

- §49 — источник всех allow-list'ов и обоснования механизма (`DOCKER-USER`, IPv6 INPUT, почему
  `ufw` не годится).
- §60 — тот же класс проблемы («сервисы вне git») на других сервисах; способ решения там
  (`git init` + sparse-checkout на месте) для firewall-скрипта не применялся — здесь просто
  начали версионировать заново и досылать вручную, без попытки превратить серверный каталог
  в git-репозиторий.

## §65 — На s2 не было swap вообще: сборка на прод-сервере может убить чужой продакшен ✅ ЗАКРЫТО (2026-08-10)

Всплыло при деплое `aboi` на прод: `next build` (Turbopack, Next.js 16) дважды подряд убивался OOM
killer'ом, пик `anon-rss` ~8 ГБ. BlackCove добавила временный `/swapfile` на 8 ГБ — третья попытка
прошла.

### Замер

| Параметр                   | Значение                                             |
| -------------------------- | ---------------------------------------------------- |
| RAM на s2                  | 15 Gi                                                |
| Занято постоянно           | ~7 Gi (~20 живых `next-server` + docker)             |
| Свободно до сборки         | ~8 Gi                                                |
| Проседание во время сборки | до ~400 Mi                                           |
| **Swap до 2026-08-08**     | **отсутствовал полностью** (`swapon --show` — пусто) |

### Почему это опаснее, чем «сборка иногда падает»

Провалившаяся сборка — видимый и безобидный исход. Настоящий риск в другом: **OOM killer выбирает
жертву сам**, и выбирает по эвристике, а не по нашим намерениям. На машине, где рядом со сборкой
крутится два десятка продакшен-процессов, ничто не гарантирует, что убьют именно `next build`.

То есть отсутствие swap означало не «деплой может не пройти», а «деплой одного приложения может
уронить другое, работающее». Причём выглядело бы это как случайное падение постороннего сервиса, без
видимой связи с деплоем — то же семейство симптомов, что и остальные тихие поломки в этом файле.

### Решение: swap оставляем постоянным, но это страховка, а не починка

- **`/swapfile` 8 ГБ → в `fstab`.** Дёшево, обратимо, и главное — превращает жёсткое убийство
  постороннего процесса в замедление. Ради этого и держим, а не ради ускорения сборок.
- **`vm.swappiness = 10`.** Дефолт `60` заставляет ядро свопить и без нехватки памяти; нам нужен
  запас на пик, а не постоянное использование.

### ✅ Проверено на живом сервере (2026-08-10)

```
$ swapon --show
NAME      TYPE SIZE USED PRIO
/swapfile file   8G   0B   -2
$ grep swap /etc/fstab
/swapfile none swap sw 0 0
$ sysctl vm.swappiness
vm.swappiness = 10
```

Всё три пункта решения уже стоят постоянно — временный своп, добавленный BlackCove во время
деплоя `aboi`, к этому моменту уже был закреплён в `fstab`, а не только поднят на лету. Отдельных
действий в этой сессии не потребовалось, только подтверждение.

⚠️ **Побочное наблюдение при проверке, не требует действия сейчас:** `df -h /` — 149G из 174G
занято (86%). Не относится к теме swap напрямую, но тот же диск, на котором лежит и `/swapfile`, и
данные всех контейнеров. Отдельная задача на будущее, если понадобится — не заводится здесь как
DoD-пункт §65.

⚠️ **Что swap НЕ решает.** Сборка по-прежнему конкурирует за память с продакшеном на одной машине.
Своп лишь снимает остроту: вместо убийства — деградация всех соседей на время сборки. Настоящие
варианты (по возрастанию стоимости): лимит памяти на сборочный шаг через cgroup, вынос сборки на
отдельный раннер с доставкой готового образа, больше RAM.

⛔ **Вынос сборки — не «когда-нибудь», а следующий кандидат.** Приложений на s2 становится больше,
базовые 7 Gi растут вместе с ними, а пик сборки от этого не уменьшается. Момент, когда 8 ГБ swap
перестанет спасать, наступит без предупреждения — ровно в тот деплой, когда базовое потребление
перешагнёт очередной порог.

---

## §66 — Второй, более ранний канареечный мониторинг email: `infra/canary/` рядом с §62 🆕 (2026-08-08)

Найдено попутно при разборе §62 (починка датчика доставки почты в `dashboard-agent`). В репозитории
есть **вторая, самостоятельная** реализация той же идеи — каталог `infra/canary/` (`canary.ts` +
`docker-compose.production.yml` + README), не связанная с `dashboard-agent` кодом.

### Хронология

- `99e9a570` (2026-06-05) — `infra/canary/` создан первым, тоже помечен «Этап 0.7 корневого
  `PLAN.md`».
- `09fd1a10` (2026-07-22) — в `dashboard-agent` появляется **второй** канареечный датчик, с той же
  меткой этапа, тем же назначением (SMTP round-trip через Maddy → внешний IMAP-ящик → Telegram/
  dashboard-алерт при провале).
- Оба каталога с тех пор существуют параллельно; `infra/canary/` ни разу не удалялся и не
  переименовывался (`git log --diff-filter=D` — пусто).

### Тот же класс бага, что чинили в §62

`infra/canary/canary.ts` ищет письмо только в `INBOX` (`client.mailboxOpen('INBOX')`, без обхода
остальных папок) — ровно тот баг, из-за которого external-нога `dashboard-agent`-канарейки была
красной 17 дней (см. §62): Gmail принимает канареечные письма и кладёт их в Спам мимо INBOX.
Если `infra/canary/` действительно работает, у неё тот же дефект, не тронутый починкой §62 (это
независимый файл, чинили только `apps/dashboard-agent/src/lib/email-canary.ts`).

Плюс отдельная деталь: `infra/canary/` шлёт Telegram-алерт через `TELEGRAM_API_ROOT`
(`tg-proxy.letar.best`) с 2026-06-05 (`54bad19e`) — но сам tg-proxy на mail-сервере, по
`.claude/docs/repo-structure.md` (раздел про `TELEGRAM_API_ROOT`), физически не был поднят до
2026-07-30, когда это обнаружилось на `apps/dashboard` как «первом реальном потребителе». Прямого
подтверждения, что `infra/canary/`-алерты когда-либо реально доходили до Telegram, в доках нет.

### Решение: удалён как забытый артефакт ✅ ЗАКРЫТО (2026-08-08)

Запрос BlackCove (Deploy Agent, thread `infra-canary-crontab-check`) проверить `crontab -l` на s2
остался без ответа. Владелец не помнит, чтобы когда-либо разворачивал этот cron, и допустил, что
это забытый артефакт ранней итерации — решил удалить, не дожидаясь подтверждения. Каталог
`infra/canary/` (`canary.ts`, `docker-compose.production.yml`, `README.md`) удалён из репозитория,
ссылки на него вычищены из `.claude/docs/repo-structure.md` и `.claude/docs/deployment.md`.
Действующий канареечный мониторинг доставки почты — только `dashboard-agent`, см. §62.

⚠️ Если на каком-то сервере всё же стоит cron-запись `infra/canary` — она станет безобидно падать
(`cd: no such file or directory`), поскольку это разовый `docker compose run`, а не постоянный
сервис. Если такая запись обнаружится позже — просто снять из `crontab`.

## §67 — Electron 42.8.1 → 43.3.0 разом во всех Electron-приложениях монорепо ✅ ЗАКРЫТО (2026-08-09)

Затронуты `animatrona`, `kami-key-the`, `label-printer-desktop`, корневой `package.json` и одно
приватное submodule-приложение (детали и обоснование версии — в собственном `PLAN_COMPLETED.md`
каждого приложения).

**Находка, не связанная напрямую с целью апдейта:** `animatrona` до этой сессии вообще не
пиновала свою версию `electron` в собственном `package.json` — неявно наследовала версию из
корневого `package.json`, в отличие от остальных трёх Electron-приложений, каждое из которых уже
пинило точную версию локально (конвенция [electron.md](/.claude/rules/electron.md)). Заодно
вскрылся и уже существовавший рассинхрон: `electron-builder.yml` (`electronVersion`) и ABI-версия
`@electron/rebuild` для `classic-level` в `animatrona` были на `41.0.0`, хотя root уже был на
`42.8.1` — native-модуль пересобирался под версию на два мажора младше реально используемой.

**Проверка в сендбоксе Claude Code** (GUI/Chromium недоступны даже с `--no-sandbox`, см.
electron.md) — headless-запросом нативных модулей через `ELECTRON_RUN_AS_NODE=1 electron -e
"require(...)"` под новым Node ABI: `canvas`, `sharp`, `classic-level` (после пересборки) грузятся
без ошибок. `nx typecheck:tsgo` по всем приложениям зелёный. Реальный GUI-прогон (окна, IPC,
автообновление) не проверялся — стандартное ограничение для Electron-приложений в этой среде,
закладывается на первый живой запуск у пользователя.

**Побочная находка, дочищена отдельной сессией:** `animatrona/electron-builder.yml` дублировал
~65 строк списка `extraResources` (9 native-модулей OrbitDB/Prisma) между блоками `win:` и
`linux:`. Дедуплицировано через YAML-якоря/алиасы (`&anchor`/`*anchor`) на уровне отдельных
элементов списка — `js-yaml@4.1.1` (версия из `app-builder-lib@26.15.2`, реально используемой в
монорепо) резолвит алиасы в структурно идентичные объекты; резолвленный JSON конфига до и после
правки побайтово совпал. `getConfig()`+`validateConfiguration()` из `app-builder-lib` на
итоговом файле проходят без ошибок схемы. Уточнение для будущих похожих правок: js-yaml резолвит
алиас в **тот же объект-референс**, не клон — в данном случае безопасно, потому что
`getFileMatchers()` в `app-builder-lib` только читает `from`/`to`/`filter` и не мутирует объект;
если появится код, который мутирует элементы `extraResources` после парсинга конфига, эта же
техника перестанет быть безопасной без клонирования.

## §66 — Два дефекта, вскрытых деплоем агента на s3 ✅ ЗАКРЫТО (2026-08-08, оба дефекта — 2026-08-09)

Оба нашлись при попытке выкатить бэкап секретов Traefik (§48 M2). Ни один не относится к самому
бэкапу — деплой лишь прошёл по путям, которыми давно не ходили.

### 1. ✅ Недоступный Redis роняет агента на старте (исправлено, 0.15.1)

`routes/deploy.ts` делал `await rehydrateFromRedis()` **при регистрации плагина**. При
недоступном Redis команда не падает: у ioredis `enableOfflineQueue: true` по умолчанию — она
уходит в очередь до успешного подключения, а `retryStrategy` в `@letar/redis-client`
переподключается бесконечно. `await` не завершался никогда, Fastify убивал плагин по своему
10-секундному таймауту (`AVV_ERR_PLUGIN_EXEC_TIMEOUT`), агент уходил в crash loop.

⚠️ **`try/catch` от этого не защищает** — исключения не происходит вовсе, происходит зависание.
Поэтому обещанная библиотекой graceful degradation на старте не работала: не «работаем без
Redis», а смерть приложения.

**Правило шире случая:** сетевой вызов на пути старта приложения обязан иметь границу по времени.
Без неё любая внешняя зависимость получает право не пустить сервис подняться — включая
необязательную, без которой он спроектирован работать. Инструмент — `lib/with-timeout.ts`.

**Почему вскрылось только сейчас:** s3-инстанс агента стоял на версии двухнедельной давности —
он не передеплоивался при бампах на s2. Первый же свежий деплой прошёл по этому коду впервые.
Отсюда отдельный вывод: **редко обновляемая инстанция копит не «отставание», а непроверенные
пути.** Чем дольше не деплоили, тем больше кода выкатывается разом и тем труднее понять, что
именно сломалось.

- [x] `enableOfflineQueue: false` в `libs/redis-client` — корневой фикс (2026-08-08): при
      недоступном Redis команда падает немедленно вместо зависания. Все три потребителя
      (`dashboard-agent`, `animatrona-tracker`, `svoichuzhie`) уже оборачивают Redis-вызовы в
      `try/catch` с fail-open/no-op — для них это строго лучше зависания, поведение не сломано.
      `svoichuzhie` уже задавал этот же override локально через `redisOptions` до этого фикса —
      теперь он просто совпадает с новым дефолтом.
      ⚠️ **Уточнение исходной пометки «затронет хранилище сессий `@letar/auth`» — неверно.**
      `createRedisStorage` в `libs/auth/src/server/redis-storage.ts` не использует
      `@letar/redis-client` вообще — отдельный `new Redis(url, { lazyConnect: true })` с
      дефолтами ioredis. Этот фикс его не касается никак. Тот же класс риска (зависание вместо
      ошибки при недоступном Redis) там по-прежнему не устранён, и там он опаснее: Better Auth
      (`internal-adapter.mjs`) вызывает `secondaryStorage.get/set` без своего `try/catch`, так что
      зависший вызов вешает обработку сессии целиком, а не деградирует. Отдельная, ещё не начатая
      задача — см. пункт ниже.
- [x] `createRedisStorage` (`@letar/auth`) — закрыто (2026-08-08, `libs/auth` 0.11.4). Выбран
      второй вариант: явный таймаут (2с по умолчанию, `CreateRedisStorageOptions.timeoutMs`) +
      `try/catch` вокруг каждого `get/set/delete`, а не `enableOfflineQueue: false` в самом
      клиенте — потому что при `secondaryStorage` без `session.storeSessionInDatabase` (текущий
      конфиг во всех трёх потребителей) сессия хранится **только** в Redis, а не кэшируется поверх
      БД, и это меняет цену ошибки: `get` на таймауте/ошибке возвращает `null` (штатный для Better
      Auth cache-miss — не новый отказ), `set`/`delete` — best-effort без исключения. Заодно добавлен
      `redis.on('error', ...)` — раньше необработанное событие `error` от ioredis валило бы процесс
      отдельно от вопроса таймаута. Потребители: `auth-hub`, `kami`, `svoichuzhie` (только при
      заданном `REDIS_URL`; в dev без него Better Auth уходит на memory-storage) — сигнатура вызова
      не изменилась, `timeoutMs` опционален, разворачивать на проде можно без правок в приложениях.

### 2. ✅ ЗАКРЫТО (2026-08-09, код + живой прогон): `deploy-affected.sh` не знал про `docker-compose.s3.yml`

Скрипт различал только `--staging` → `docker-compose.staging.yml`, иначе брал
`docker-compose.production.yml`. Файла `docker-compose.s3.yml` для него не существовало, поэтому
`--app dashboard-agent` на s3 молча взял продовый compose с портом `127.0.0.1:3100:3100` — а
`3100` на s3 занят `media-api`. Контейнер создался и не стартовал (`port is already allocated`).

**Это было опаснее дефекта №1:** тот чинится кодом и уже починен, а этот повторялся бы у любого,
кто запустит штатную команду. Причём симптом (`port is already allocated`) не подсказывает
первопричину — выглядит как занятый порт, а не как выбор не того файла.

**Пока починка не проверена живым прогоном — `dashboard-agent` на s3 по-прежнему можно
деплоить вручную:**

```bash
docker compose -f docker-compose.s3.yml --env-file .env.docker up -d
```

**Фикс:** `deploy-affected.sh` определяет `SERVER_NAME` по hostname (добавлен паттерн `s3` —
раньше сервер падал в ветку `unknown`) и внутри цикла деплоя, отдельно для каждого приложения,
проверяет `apps/<app>/docker-compose.<SERVER_NAME>.yml`. Если файл существует и деплой не
staging (`--staging` по-прежнему всегда идёт через `docker-compose.staging.yml` независимо от
сервера) — используется он вместо общего `docker-compose.production.yml`. Раньше `COMPOSE_FILE`
был один глобальный на весь прогон; теперь общий дефолт живёт в `BASE_COMPOSE_FILE`, а
`COMPOSE_FILE` пересчитывается на каждой итерации цикла по приложению — все ~20 использований
`$COMPOSE_FILE` ниже по скрипту (build/migrate/compose up/self-deploy dashboard-agent/логи)
получают уже резолвленное для конкретного приложения значение без отдельной правки каждого места.

- [x] Научить `deploy-affected.sh` выбирать compose по серверу (`SERVER_NAME`/hostname).
- [x] **Проверено живым прогоном (BlackCove, 2026-08-09, commit `c8f3c688`).** Деплой
      `dashboard-agent` на s3 прошёл — скрипт не пытался взять `docker-compose.production.yml`,
      контейнер пересобран и стартовал сам (без зависания на self-recreate, как бывало раньше).
      Попутно найден и решён отдельный блокер: коммит `c8f3c688` не был запушен в `origin/main` —
      BlackCove запушила сама (иначе заблокировало бы следующий деплой). `deploy_app(target:
      staging)` через deploy-mcp корректно skip-нул с «No docker-compose.staging.yml found» —
      это ожидаемо, у dashboard-agent на s3 нет staging-конфига, только `docker-compose.s3.yml`,
      деплой шёл резервным SSH-путём. В логах свежего контейнера `[redis] Ошибка: getaddrinfo
      EAI_AGAIN letar-redis` — редис на s3 не настроен, агент не падает (штатная деградация из
      фикса дефекта №1 выше), не новый баг.

## §68 — Плановое обновление s2/s3/mail (apt/Docker/Node/Bun/nx) вскрыло зомби-сеть `premium-network` ✅ ЗАКРЫТО (2026-08-09)

Плановое обслуживание трёх серверов (`apt upgrade`, Docker, Node/Bun, глобальный `nx`) — не
багфикс, а находка живого дефекта, вскрытого самим обслуживанием.

### Что сделано

|             | mail (31.56.180.161) | s3 (188.127.235.141)                   | s2 (185.28.85.195, прод)        |
| ----------- | -------------------- | -------------------------------------- | ------------------------------- |
| apt upgrade | 31→3 пакета          | 57→4 (grub phased)                     | 29→2 (phased)                   |
| Docker      | 29.6.2→29.7.2        | 29.5.3→29.7.2                          | 29.4.0→29.7.2                   |
| Node/Bun    | — (Maddy на Go)      | уже свежие                             | node→v24.19.0, bun уже latest   |
| nx global   | —                    | 22.5.3/23.0.0→**23.1.1** (root+deploy) | 22.5.3→**23.1.1** (root+deploy) |
| reboot      | ✅ (ядро)            | не требовался                          | ✅ (ядро)                       |

**Грабля с DNS под TUN VPN подтвердилась второй раз** (см. `electron-net-fetch-tun-vpn.md`):
`s2.letar.best`/`s3.letar.best` резолвились в Fake-IP `198.18.0.0/15` с рабочей машины —
SSH-попытки по имени либо не проходили, либо тихо били не туда. Работали только по прямому IP.

**Грабля с обрывом SSH-сессии на `apt upgrade`**: обновление `openssh-server` перезапускает
`sshd` посреди собственной команды — `apt-get upgrade` рвёт текущее SSH-соединение с exit 255/127
на стороне клиента, хотя сам apt на сервере продолжает работать в фоне (виден по PID). Разгадывается
поллингом заново по SSH и проверкой, жив ли ещё процесс `apt-get`, а не по коду выхода клиента.

### Инцидент на s2: сеть `premium-network` физически не существовала — 17 контейнеров не поднялись

При рестарте `docker.service` (следствие апгрейда пакета `docker-ce`) 17 контейнеров (в основном
`*-db`, плюс `aira-web-app`, `pravda-app-2`, `form-docs-app-2`) не переподключились и остались в
`Exited (128)`: `network premium-network not found`.

**Причина:** сеть `premium-network` была переименована в `kami-network` ещё в сессии №74
(2026-07-13, см. `infra/nginx-proxy-manager/README.md` § Docker сети). Compose-файлы всех
приложений уже ссылались на `kami-network`. Но эти 17 контейнеров ни разу не пересоздавались с
момента миграции — 29 дней жили на старой сети параллельно с новой, потому что демон Docker не
чистит сеть, пока у неё есть живые endpoint'ы. Как только демон перезапустился и заново собрал
состояние сетей с нуля, старая `premium-network` из состояния пропала (её уже нет в объявленной
конфигурации), а эти 17 контейнеров всё ещё были на неё захардкожены на уровне `HostConfig` —
`docker start` на существующем контейнере не может сменить его сетевой режим, только пересоздание.

**Фикс:** `docker compose -f docker-compose.production.yml --env-file .env.docker up -d <service>`
по каждому задетому приложению — не деплой (образ не менялся), только пересоздание конкретного
контейнера с уже актуальным (на тот момент) описанием сети из compose-файла. Postgres-контейнеры
не потеряли пароли: `POSTGRES_PASSWORD` из env влияет только на `initdb` при пустом volume, при
существующих данных игнорируется.

⚠️ **Побочная ошибка при фиксе, тоже исправлена**: первый прогон `docker compose up -d <service>`
был без `--env-file .env.docker` → куча `variable is not set, defaulting to blank string`. Для уже
инициализированных Postgres-контейнеров не страшно (см. выше), но исправлено повторным прогоном с
`--env-file` до того, как это стало проблемой для сервисов, которые действительно читают секреты
из env при каждом старте (`aira-web-app` и т.п.).

⚠️ **Вторая побочная ошибка**: `pravda`/`form-docs` держат ровно одну реплику `app`, но
контейнер называется `<app>-app-2` (не `-app-1`) — тот же класс именования, что уже
задокументирован в `project_rollout_hardcoded_container_bug` (закрыт commit `1e5e359`,
2026-07-16): суффикс индекса не совпадает с реальным числом реплик после истории
scale-up/scale-down. `docker compose up -d --scale app=2 app` по этому неверному предположению
создал лишний `app-3`. Пойман и откачен тем же прогоном с `--scale app=1` до того, как ушёл в
прод трафик — но резюме: **число реплик приложения нельзя определять по суффиксу имени
контейнера**, нужно явно проверять `docker compose config --services`/фактическое число, а не
предполагать по числу в имени.

**Более широкий вывод, актуальный для любого будущего апгрейда Docker/рестарта демона на s2/s3:**
если на хосте когда-либо переименовывали/пересоздавали общую сеть (как `premium-network` →
`kami-network`), долгоживущие контейнеры (в первую очередь БД — их не пересоздают при обычных
деплоях приложения) могут годами оставаться привязанными к сети, которой формально уже нет в
объявленной конфигурации, и это не проявляется до следующего перезапуска демона/хоста. Разовая
проверка на будущее перед следующим таким апгрейдом: `docker inspect <container> --format
'{{.HostConfig.NetworkMode}}'` по всем `*-db` контейнерам, сверить с `docker network ls`.

- [x] mail-сервер обновлён и перезагружен, 4 контейнера healthy.
- [x] s3 обновлён, 35 контейнеров живы, nx 23.1.1 (root+deploy).
- [x] s2 обновлён и перезагружен, 46 контейнеров живы (кроме предсуществовавших `wordpress-*`,
      упавших 2 месяца назад — не трогали), `kami-network` цела (45/46 контейнеров в ней).
- [x] Битый симлинк `/usr/local/bin/nx` на s2 (указывал на несуществующий путь
      `../install/global/node_modules/nx/bin/nx.js`, не связан с сегодняшним апгрейдом) —
      переставлен на `/root/.bun/bin/nx` по образцу рабочей связки на s3.

## §69 — Зачистка разросшейся документации: аудит + архивация PLAN/CHANGELOG по всему монорепо ✅ ЗАКРЫТО (2026-08-09)

Плановый аудит `.claude/docs/documentation-guidelines.md`-чеклиста (README/PLAN/PLAN_COMPLETED/
PLAN_TESTING/CHANGELOG) по всем ~30 приложениям и ~40 библиотекам, затем архивация выполненных
задач и старых версий CHANGELOG у файлов, разросшихся сверх разумного (порог ~600–800 строк).

### Находки аудита

- **Систематический дрейф версии в README.md**: у ~15 приложений (aboi, aira-web, mandala,
  studio, svoichuzhie, time, kami-key-the, label-printer-desktop, dashboard, archetest,
  driving-school, grandslamcup, pravda и др.) строка «Версия: X.Y.Z» в шапке README не
  обновлялась вместе с релизами — расхождение доходило до нескольких мажорных версий
  (`grandslamcup`: README 2.7.0 / CHANGELOG top 3.37.3 / package.json 3.38.4 — три разных
  числа одновременно). Поправлено точечно по каждому приложению в рамках этой же сессии, но
  причина (ручное дублирование версии в prose-тексте вместо единого источника) не устранена —
  при следующем релизе дрейф начнётся заново.
- **README без содержимого**: `libs/cdek/README.md` (дефолтный Nx-шаблон), `libs/infra-config`,
  `libs/letar-consultant` (README отсутствовал вовсе), `apps/dsperevod/README.md` (1 строка) —
  последний заполнен минимальным README в рамках сессии, остальные три — не тронуты (не входили
  в скоуп архивации).
- **`apps/poster-microtext-desktop`** не имел CHANGELOG.md вовсе — создан ретроактивно (17
  версий) из `PLAN_COMPLETED.md` + дат коммитов git log.

### Архивация

19 приложений (`grandslamcup`, `animatrona`, `archetest`, `studio`, `domwellbes`,
`form-develop-app`, `synth`, `poster-microtext-desktop`, `driving-school`, `aboi`, `svoichuzhie`,
`mandala`, `dsperevod`, `dashboard`, `dashboard-agent`, `kami-key-the`, `label-printer-desktop`,
`pravda`) получили перенос завершённых секций `PLAN.md` → `PLAN_COMPLETED.md`; 8 из них — ещё и
разбиение `CHANGELOG.md` на `CHANGELOG_YYYY_MM_DD.md`-архивы (>20 версий в основном файле).
Плюс `libs/auth/README.md` (1101 строка) разбит на `libs/auth/docs/*.md` (5 подстраниц по
режимам/API/OAuth/tier-миграции), README сокращён до 134 строк с оглавлением-таблицей.

**Механизм работы:** 18 параллельных фоновых агентов (по одному на приложение), каждый со своим
чётким скоупом файлов. Для 7 приватных submodule-приложений агенты коммитили и пушили сами
(отдельный `.git`, без риска гонки с корневым репо); для 11 обычных приложений — только
редактировали, финальный коммит в корневой `letar` сделан оператором последовательно (по одному
`git commit -- <пути>` на приложение), чтобы не столкнуться с гонкой параллельных `git commit` в
одном `.git`, задокументированной в `.claude/rules/git.md` § «Работа рядом с другими агентами»
(разбор — `.claude/docs/git-multi-agent-incidents.md`).

⚠️ **6 из 18 агентов оборвались по сетевой ошибке API (`Connection closed mid-response`)**
на середине правки файла. Все были возобновлены через `SendMessage` с указанием текущего
`git status`/`git diff` и последней фразы агента перед обрывом — каждый перепроверил состояние
файла с нуля (не полагаясь на память) и подтвердил построчной сверкой, что контент не потерян,
прежде чем продолжить. Ни один файл не остался в повреждённом состоянии, но операция заняла
два прохода вместо одного — если это будет повторяться, стоит закладывать retry в сам процесс
делегирования, а не рассчитывать на happy path.

⚠️ **Побочная находка, не новая, но подтверждённая живьём дважды за сессию:** несмотря на
изоляцию по scope, оба submodule-агента (`aboi`, `svoichuzhie`) столкнулись с тем, что
**параллельная сессия одновременно коммитила в тот же submodule** — архивные правки утекли в
чужой коммит (`e2e-хелперы гидратации`, не связанный по смыслу). Контент не потерян (агенты
сверили построчно после факта), но commit message теперь вводит в заблуждение о содержимом
коммита. Тот же класс гонки, что уже описан в `git.md` для корневого репо, — не устранён и,
судя по всему, неустраним без реальной файловой блокировки (file reservation) между
одновременно работающими агентами по одному submodule.

---

## §70 — Трекинг ошибок: GlitchTip на s3 🆕 (2026-08-10)

Сейчас ни одно приложение монорепо не отправляет ошибки никуда. О продовой ошибке узнают двумя
способами: пожаловался пользователь либо агент вручную читает `docker logs`. Стектрейса с номером
строки, версией релиза и счётчиком повторов нет нигде — диагностика инцидентов каждый раз
начинается с археологии по логам.

**Почему GlitchTip, а не Sentry.** Self-hosted Sentry — 40+ контейнеров (Kafka, ClickHouse, Snuba,
Relay, Symbolicator) и ~16 ГБ RAM: на наших VPS это займёт сервер целиком. GlitchTip v6 — три
контейнера (Postgres, Valkey, Django-приложение с `SERVER_ROLE: all_in_one` — web и воркер в
одном процессе, отдельный Celery не нужен при нашей нагрузке), работает в 512 МБ, комфортно в
2 ГБ. Принимает **те же самые** Sentry SDK и тот же формат DSN, поэтому переезд на настоящий
Sentry, если понадобится, — это смена одной строки в конфиге, без правок в коде.

SaaS-Sentry отпадает отдельно: тело ошибки тащит с собой персональные данные (email в контексте
пользователя, содержимое запроса, идентификаторы), а часть приложений монорепо работает под
операторами ПДн — см. `.claude/docs/personal-data.md`.

### Что сделать

1. ✅ **Ресурсы s3 проверены (2026-08-10):** 15 Gi RAM, ~9.8 Gi свободно/available; диск 2.0T,
   840G свободно (56% занято). Блокеров по ресурсам нет.
2. ✅ **Юрисдикция проверена: s3 физически в РФ** (подтверждено владельцем 2026-08-10). Значит
   ошибки с ПДн остаются внутри контура и трансграничной передачи не возникает — именно то, из-за
   чего отпадал SaaS-Sentry. Чистка ПДн через `beforeSend` всё равно полезна (меньше лишнего в
   хранилище), но перестаёт быть обязательным условием запуска.
3. ✅ **Развёрнуто и проверено живьём (2026-08-10)**, `infra/glitchtip/` — GlitchTip v6.2.6,
   3 сервиса (не 4: `SERVER_ROLE: all_in_one` объединяет web+worker, отдельный celery не нужен
   при текущей нагрузке): `postgres:18-alpine`, `valkey:9-alpine`, `glitchtip/glitchtip:6`.
   `https://errors.s3.letar.best` отвечает (проверено HTTP-запросом, отдаёт фронтенд GlitchTip).
   Три грабли по пути, каждая исправлена и закомментирована прямо в `docker-compose.yml`:
   - `postgres:18+` сменил точку монтирования данных (`/var/lib/postgresql`, не `.../data`) —
     со старым путём падает с «PostgreSQL data in ... (unused mount/volume)».
   - В образе `glitchtip/glitchtip` нет `wget`/`curl`, только `python3` — healthcheck по
     паттерну `studio-staging-app` (`wget --spider`) не находит команду и контейнер молча уходит
     в `unhealthy` без единой строки в логах приложения.
   - **Маршрут изначально спланирован неверно** — через NPM host-gateway, по устаревшим
     `infra/traefik/README.md`/`infra/nginx-proxy-manager/README.md` («пилот, NPM держит
     80/443»). Живой сервер (`ss -tlnp`, `docker ps`) показал: NPM на s3 не существует с
     2026-08-08, весь трафик держит Traefik. Доки исправлены отдельным коммитом, маршрут
     переделан на Traefik-labels (тот же паттерн, что у `studio-staging-app`).
   - Первый пользователь (суперюзер) должен зарегистрироваться сам через `/register` — это
     создание аккаунта/пароля, агент этот шаг не выполняет ни при каких обстоятельствах.
     На момент этой правки — не выполнено, ждёт владельца.
4. **SDK — в общую библиотеку `libs/`, не копипастой по приложениям** (shared-first). Обёртка над
   `@sentry/nextjs` с общими настройками: `beforeSend` для чистки ПДн, фильтр шумных ошибок,
   тег окружения prod/staging. Не начато — ждёт DSN первого проекта (`studio`), а тот ждёт
   регистрации выше.
5. `SENTRY_DSN`/`GLITCHTIP_DSN` — DSN не секрет в привычном смысле (предназначен для попадания в
   клиентский бандл, как у настоящего Sentry), поэтому для staging можно класть прямо в
   `environment:` compose-файла, без похода через `.env.staging.enc`. Первым — `studio` (staging,
   PLAN-INFRA.md §70, запрос владельца 2026-08-10 «начнём со studio, я захожу туда часто»).
6. **Загрузка sourcemaps в CI** — без них стектрейс приходит из минифицированного кода и
   бесполезен. Это половина ценности всей затеи, не откладывать «на потом».
7. Подключать по одному приложению, начиная с некоммерческого, и смотреть на объём событий: при
   шумном приложении бесплатный self-hosted быстро упирается в диск.

### Что это даёт агентам

Диагностика инцидента вместо «посмотрю логи контейнера» начинается с файла, строки и релиза.
Отдельно — возможность увидеть, что ошибка началась после конкретного деплоя. MCP-сервера у
GlitchTip нет, но REST API есть: если приживётся, тонкая обёртка по нашему же паттерну
(`.claude/docs/mcp-server-pattern.md`) — задача на пару часов, не раньше.

---

## §71 — Расширения Postgres для Postgres MCP Pro 🆕 (2026-08-10)

2026-08-10 dev-базы studio и driving-school переведены с голого `server-postgres` (умел ровно
`query`) на [Postgres MCP Pro](https://github.com/crystaldba/postgres-mcp): EXPLAIN-планы, подбор
индексов, health-checks — 9 инструментов вместо одного. Подключение — флаг `--pro` у
`.claude/mcp/pg-wrapper.mjs`.

**Половина функций сейчас недоступна из-за отсутствующих расширений.** Проверено запросом к
`pg_available_extensions` dev-базы studio:

- `pg_stat_statements` — доступен, но **не установлен**. Нужен для `get_top_queries` и анализа
  нагрузки. Включение требует `shared_preload_libraries` в конфиге Postgres и **рестарта**
  сервера, то есть правки compose-файла dev-окружения, а не просто `CREATE EXTENSION`.
- `hypopg` — **отсутствует в образе вовсе**. Это главная фича Pro: подбор индексов симуляцией
  тысяч кандидатов вместо угадывания. Нужен образ Postgres с расширением либо установка пакета
  в контейнер.

Без них работают EXPLAIN, `list_objects`, `get_object_details` и часть `analyze_db_health` —
уже полезно, но не то, ради чего инструмент ставился.

### Что сделано (2026-08-10) — только studio, только dev

- [x] `apps/studio/docker-compose.dev.yml` (`studio-postgres-dev`, локальный dev-контейнер,
      порт 5446): `command: postgres -c shared_preload_libraries=pg_stat_statements` +
      пересоздание контейнера + `CREATE EXTENSION pg_stat_statements` (через `docker exec psql` —
      MCP в `--access-mode restricted` сам DDL не пропускает, `cannot execute CREATE EXTENSION in
      a read-only transaction`). Проверено рабочим запросом через `postgres-studio` MCP:
      `SELECT count(*) FROM pg_stat_statements` → 7 строк.
- [ ] `hypopg` для studio по-прежнему недоступен — проверено (`pg_available_extensions` пуст для
      `hypopg` на образе `postgres:16-alpine`), подтверждает исходную находку. Решение не принято:
      нужен либо кастомный образ (собрать `hypopg` из исходников поверх alpine — на alpine нет
      готового пакета в отличие от Debian-based `postgres:16` + `apt install postgresql-16-hypopg`),
      либо смена базового образа на Debian-вариант. Смена базового образа — не мелкая правка:
      затрагивает и `docker-compose.production.yml`/`docker-compose.staging.yml` (см. риск версии
      расхождения с продом ниже), решение владельца.
- [ ] **`driving-school` не тронут.** Его dev-БД слушает `localhost:5432` без
      `docker-compose.dev.yml` в самом приложении — `docker ps` показал, что порт держит контейнер
      **`premium-rosstil-postgres`** (`POSTGRES_DB=lena_premium`, `POSTGRES_USER=lena_user`), то
      есть база `driving_school` живёт как **вторая база внутри инстанса деприкейтнутого
      premium-rosstil** (снят с поддержки 2026-07-05, см. `project_premium_rosstil_imot_removed` в
      памяти), а не в своём изолированном контейнере. Рестарт с новым `shared_preload_libraries`
      затронул бы этот общий инстанс целиком — не блокирующий риск (premium-rosstil мёртв), но вне
      исходного скоупа §71 и заслуживает отдельного решения: держать driving-school на чужом
      контейнере — само по себе долг, а не только вопрос одного расширения.

2. Решить по `hypopg` (см. выше — открытый вопрос).
3. **Прод трогать в последнюю очередь и только read-only.** `pg_stat_statements` на проде даёт
   реальную картину нагрузки, но это рестарт продового Postgres — отдельное окно работ, не входит
   в эту сессию.

⚠️ Проект `postgres-mcp` не обновлялся с января 2026. Из-за этого в `pg-wrapper.mjs` зафиксирован
пин `mcp<2`: без него сервер падает на старте с `ModuleNotFoundError: mcp.server.fastmcp`. Если
проект окончательно заглохнет, альтернатива — pgEdge MCP, он поддерживает несколько инстансов из
одного сервера.

---

## §72 — Ревизия конфигурации агентов: контекст, MCP, барьеры ✅ ЗАКРЫТО (2026-08-10)

Аудит `.claude/` (32 правила, 40 команд, 17 skills, 17 субагентов, 23 MCP-сервера, 6 хуков) на
предмет того, что реально работает, а что только описано. Метод — не оценка полезности на глаз,
а подсчёт: вес always-on файлов в байтах и число фактических вызовов инструментов по 487
транскриптам сессий (`"name":"mcp__*"` в jsonl).

### Найденные дефекты

- **`rules/security.md` не был path-scoped**, хотя выглядел так: `paths: "**/auth/**",
  "**/_actions/**", "**/api/**"` — невалидный YAML (список без скобок), парсится как одна строка
  и не матчится ни с чем. Файл грузился всегда — по случайности, а не по замыслу.
- **`alwaysApply: true`** в `deploy-coordination.md` и `env-files.md` — поле из Cursor, Claude
  Code его не знает. Работало тоже случайно: у файла просто не было `paths`.
- **`install.sh --all-submodules` покрывал 10 submodule из 14.** Скрипт искал git-dir только в
  `.git/modules/<path>`, а submodule, заведённый обычным `git clone`, держит `.git` каталогом у
  себя. Без scope-guard оставались `studio`, `svoichuzhie`, `aprel8008`,
  `poster-microtext-desktop` — то есть ровно те, где 2026-08-09 произошло перемешивание правок
  двух сессий. Барьер, поставленный после инцидента, не стоял в месте инцидента.
- **CI-гейта качества не существовало.** В `.github/workflows/` были только publish и два
  release-workflow: ни одного прогона lint/typecheck/test. При 107 проектах и пушах прямо в main
  единственным слоем защиты была память агента о том, что проверки надо прогнать.
- **Два MCP-сервера были сломаны, а выглядели как неиспользуемые.** `prisma` указывал на
  `@prisma/mcp` — пакета с таким именем в npm нет, 404 (верная команда — `prisma mcp`, подкоманда
  CLI). `nx-mcp` запускался без `--minimal false`, из-за чего не отдавал `nx_workspace` и
  `nx_project_details` — те самые инструменты, которые требует `CLAUDE.md`. Ноль вызовов у обоих
  был следствием, а не диагнозом.
- **Дублирование серверов:** `context-mode` и `context7` поднимались дважды — плагином и записью
  в `.mcp.json`.

### Сделано

**Контекст: 119.5 → 74.9 КБ (−37%).** Индекс документации в `CLAUDE.md` занимал одну строку на
25 079 символов — 59% файла; переписан группировкой по темам, все 73 дока на месте (сверено
скриптом). `git.md` (26 КБ) разделён на правило и
[git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md), `agent-mail.md` — на
правило и [agent-mail-server-quirks](/.claude/docs/agent-mail-server-quirks.md). Разборы
инцидентов нужны при споре о правиле, а не на каждом коммите.

**MCP: 23 → 15 серверов.** Удалены с нулём вызовов: `socraticode` (2 вызова за 487 сессий, при
этом держал Qdrant и Ollama в Docker — освободилось ~10.9 ГБ), `letar-consultant` (0 вызовов,
llama.cpp на 8.5 ГБ VRAM), `sequential-thinking`, `inkeepMcp`, `postgres-kami-prod-write` (0
вызовов при write-доступе к проду), `playwright`. Вместе с ними удалены их always-on правила
`socraticode-first.md` и `consult-local.md` — суммарно 8 КБ, которые грузились в каждую сессию
ради инструментов, вызванных дважды за полгода.

**Postgres MCP Pro** на dev-базах studio и driving-school (флаг `--pro` у `pg-wrapper.mjs`):
9 инструментов вместо одного `query`. Ограничения и что доделать — §71.

**Semgrep в pre-commit** рядом со scope-guard и sops, плюс четыре своих правила в
`.semgrep/letar-rules.yml`. Готовые наборы не знают про Prisma: `$queryRawUnsafe('...' + userId)`
ими не ловится — проверено. Каждое правило проверено на заведомо плохом файле, живой контроль:
коммит со Stripe-ключом блокируется.

**CI** — `nx affected -t lint typecheck:tsgo test` на push в main и PR, base из
`nrwl/nx-set-shas`.

### Урок

Общий знаменатель почти всех находок: **написанное правило не является барьером**. Правило про
scope-guard существовало — хук не стоял в четверти submodule. Правило «спроси SocratiCode до
Grep» существовало — исполнено 2 раза из сотен возможных. Инструкция «используй `nx_workspace`»
существовала — инструмента не было в списке. Работают только те ограничения, которые исполняет
машина: хуки, CI, permissions. Текст объясняет «почему», но не заменяет проверку.

Отсюда практическое следствие для будущих сессий: заводя новое правило, сразу спрашивать, чем
оно проверяется. Если ответ «агент прочитает» — это не правило, а пожелание.

### Продолжение — 7 доследованных находок ✅ ЗАКРЫТО (2026-08-10, сессия 2)

Первая сессия оставила 7 находок «требуют исследования». Каждая измерена, три подтвердились
не в том виде, в каком были сформулированы, — исправлено по факту, не по брифу:

- **Дублирование в `commands/*.md` (~30 файлов)** — вынесено в `.claude/rules/app-workflow.md`
  (Agent Mail-регистрация, чек-лист после задачи, запрет самостоятельного деплоя). Перенос в
  `apps/<app>/CLAUDE.md`, как предполагалось изначально, оказался бы конфликтом: у 6 из 10
  приложений `CLAUDE.md` — генерируемая Next.js 16 заглушка `@AGENTS.md`, переписываемая при
  каждом `next dev`.
- **Деплой-артефакты** — `SKILL.md` (deployment-assistant) на 274 из 368 строк дословно дублировал
  `docs/deployment.md` (368→94); `commands/infra/deploy.md` был не просто дублем, а
  **опасно устаревшим** — учил ручному `docker compose`/прямому `deploy-affected.sh` в обход
  BlackCove, упоминал снятый с поддержки `premium-rosstil` и путь `/opt/lena` вместо актуального
  `/home/deploy/letar`.
- **17 субагентов, использование не проверялось** — 14 из 17 ни разу не вызваны за 492 сессии
  (метод первой сессии, применённый к `subagent_type` вместо `mcp__*`). Из них 3
  (`perf-optimizer`, `seo-auditor`, `docs-auto-sync`) — чистый дубль `/audit:*`-команд, которые
  делают ту же проверку инлайн и ни разу не делегируют агенту (grep по телу команд не нашёл
  вызовов Task/agent) — удалены. Остальные 11 оставлены: часть перекрывается со skill не
  полностью (`db-schema-assistant`/`migration-assistant`/`form-generator` — с `zenstack-helper`/
  `form-pipeline`), часть уникальна (`auth-policy-validator`, `electron-debugger`,
  `kbs-extractor`).
- **`.mcp.json` не версионировался** — версионируется теперь; ключ Context7 вынесен в
  `${CONTEXT7_API_KEY}`. Подстановка `${VAR}` у Claude Code читается из OS-окружения процесса,
  НЕ из project `.env` — на новой машине нужен `setx CONTEXT7_API_KEY "..."` вручную, это не
  решается одним коммитом `.mcp.json`.
- **`env-files.md`** — 3 нарративных разбора инцидентов (ALLOW_DEV_SESSION, aboi meta-robots,
  kami Keystatic) вынесены в `docs/node-env-not-production-signal.md` по образцу git.md
  (116→~80 строк правила).
- **Path-scoped правила молчат на `Write`** (баг claude-code#23478) — заметка добавлена в
  `components.md`/`server-actions.md`/`api-routes.md`, как раньше в `security.md`.
- **Semgrep-правило на path traversal** (`path.join`+`.startsWith()` как наивная защита) —
  добавлено, проверено на позитивном/негативном контроле и прогоном по всему репо (4880 файлов,
  0 ложных срабатываний). Второй кандидат («модель ZenStack без `@@allow`») — **отклонён**:
  проверка на `apps/mandala/schema.zmodel` показала легитимные модели без единого `@@allow`
  (`Verification` — server-only, better-auth токены), блочное правило дало бы систематические
  ложные срабатывания.

Отдельно по ходу работы найдены и поправлены устаревшие ID моделей (`claude-sonnet-4-6`,
`opus-4.7`) в шаблонах `macro_start_session` — заменены на `claude-sonnet-5`/`claude-opus-5`.
