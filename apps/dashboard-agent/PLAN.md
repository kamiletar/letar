# Dashboard Agent — План развития

## Текущая версия: 0.9.7

Легковесный агент мониторинга для удалённых серверов.

---

## Реализовано ✅

- [x] Fastify HTTP сервер
- [x] Сбор системных метрик (systeminformation)
- [x] Мониторинг Docker контейнеров (dockerode)
- [x] Мониторинг PostgreSQL баз
- [x] REST API для метрик
- [x] CORS для Dashboard

---

## В работе 🚧

### Deploy MCP + staging (корневой PLAN.md §18, сессия №49 2026-07-09)

Часть работ §18, относящаяся к dashboard-agent:

- [x] `routes/deploy.ts`: deployId (randomUUID) + ring-buffer истории (20 деплоев) + cap логов (2000 строк) + курсор `sinceLine` + `GET /api/deploy/history` + `staging` в body + spawn аргументами без `bash -c` — **закоммичено `8498c06`**
- [x] `lib/server-config.ts`: s1 убран (сервер выведен 2026-06-20), тип `'s2' | 's3'`, fallback s2 — **закоммичено `8498c06`**
- [x] `lib/cron.ts`: удалены две мёртвые задачи `server: 's1'` — **закоммичено `8498c06`**
- [x] Серверный guard: `getCurrentServer()==='s3'` → только `staging: true`, `'s2'` → только production (defence in depth) — **сделано**
- [x] `@letar/infra-config` как канон + guard-тест сверки (НЕ прямой импорт — Dockerfile изолирован; локальная копия `server-config.ts` + `server-config.guard.spec.ts` ловит дрейф) — **закоммичено `8498c06`**
- [x] `docker-compose.s3.yml`: SERVER_NAME s3, без прод-секретов `/secrets/*.env`, без `~/.ssh`, отдельный AGENT_TOKEN (раскладка через BlackCove при provision) — **сделано**
- [x] Консолидация compose: `docker-compose.s2.yml` удалён как устаревший (живой — `production.yml`, подтвердил BlackCove через `docker inspect`; `driving-school-network` в s2.yml вестигиальный — `driving-school-db` на `kami-network`) — **сделано**
- [x] Роут `routes/e2e.ts`: `POST /api/e2e/run`, `GET /api/e2e/status`, запись `.last-e2e-status/<app>.json` (сессия D) — реализован ранее, но первый живой прогон (2026-07-11, §18 Сессия D) сразу упал: `spawn nx ENOENT` (спавнил `nx` напрямую внутри контейнера, где nx физически нет). Исправлено на `nsenter -t 1 -m -u -n -i` в host-namespace, как в `deploy.ts` — заодно найдена и закрыта command injection (`project` из POST-body шёл в shell-строку без валидации). `0.7.0 → 0.7.1`.
- [x] `docker-compose.s3.yml`: добавлен опциональный (`required: false`) `env_file: .env.s3-e2e.local` — способ прокинуть `DEV_SESSION_TOKEN` в spawn-окружение `run_e2e` (nsenter наследует env процесса dashboard-agent) без попадания секрета в `.env.docker(.enc)`, что запрещено `.claude/rules/env-files.md` для `ALLOW_DEV_SESSION`/`DEV_SESSION_TOKEN`. Файл не коммитится, живёт только на s3. BlackCove, коммит `5f71bd3c` (2026-07-11).
- [x] `routes/e2e.ts`: обнаружен и исправлен баг найденный BlackCove на живом staging-прогоне grandslamcup (2026-07-11) — `nxCommand` не переключался с root на `deploy` (в отличие от `deploy-affected.sh:11-19`), из-за чего каждый `run_e2e` на s3 создавал root-owned `.nx/workspace-data` и `apps/<app>-e2e/test-output`, ломающие следующий `deploy_app`/`run_e2e` (`EACCES`). Добавлен тот же `DEPLOY_AS_ROOT`-гвард (`if [ "$(id -u)" = "0" ]... exec sudo -u deploy -H --`) прямо в собираемую shell-строку. `0.7.2 → 0.7.3`.
- [x] `routes/e2e.ts`: регрессия от предыдущего фикса, найдена BlackCove тем же вечером (2026-07-11) — `sudo -u deploy -H` по умолчанию сбрасывает окружение (та же ловушка, что уже была с `SOPS_AGE_KEY_FILE` в `deploy-affected.sh`), из-за чего `BASE_URL`/`DEV_SESSION_TOKEN` не долетали до `bunx nx e2e` — Playwright не видел staging baseUrl, поднимал свой `nx dev` против dev-БД (`ECONNREFUSED :5453`), 28/28 falsely failed ещё на этапе webServer. Добавлен `--preserve-env=BASE_URL,DEV_SESSION_TOKEN` к `sudo`. `0.7.3 → 0.7.4`.
- [x] `routes/deploy.ts`: `POST /api/deploy/app` принимает `seed?: boolean` → добавляет `--seed` к `deploy-affected.sh` (`nx run <app>:db:seed` после успешного деплоя). Раньше seed после деплоя требовал сырого SSH-резерва (см. `.claude/rules/deploy-coordination.md`) — теперь доступен через `deploy_app({ app, seed: true })` в `libs/deploy-mcp`. `0.7.5 → 0.7.6`, коммит `64e558fc` (2026-07-18, BlackCove).

✅ Передеплой s2 на новый deploy API выполнен (сессия C, см. корневой `PLAN.md` §18). s3-инстанс тоже поднят и живой (staging + e2e-раннер).

### Канареечный мониторинг доставки email (корневой PLAN.md Этап 0.7, 2026-07-22, root-weaver)

- [x] `lib/email-canary.ts` + `routes/email-canary.ts` — `POST /api/cron/email-canary-check` (запускается планировщиком раз в 15 минут) и `GET /api/cron/email-canary-check/status` (последнее состояние без нового прогона). Код готов, `0.7.6 → 0.8.0`. Детали — `CHANGELOG.md`.
- [x] **Internal-нога провижинирована (2026-07-22, root-weaver):** ящик `canary@letar.best` создан на Maddy (`maddy creds create`, пароль — `openssl rand -base64 32`), SMTP+IMAP auth проверены вживую (`nodemailer.verify()` + `ImapFlow.connect()`, оба OK). `EMAIL_CANARY_SMTP_USER`/`EMAIL_CANARY_SMTP_PASSWORD`/`EMAIL_CANARY_INTERNAL_IMAP_*` заполнены в `.env.docker`/`.env.docker.enc` (коммит `2a5aaa0d`), синхронизированы на s1/s2 через `scripts/sync-env-docker.sh dashboard-agent`. Деплой запрошен у BlackCove (thread `deploy-dashboard-agent-email-canary`).
- [x] **External-нога провижинирована (2026-07-22):** получатель `<личный ящик владельца>`, IMAP app-password сгенерирован владельцем (потребовалось сперва включить 2FA — без неё Google скрывает страницу app-passwords). IMAP auth проверен вживую (`ImapFlow.connect()` к `imap.gmail.com:993`, OK). `EMAIL_CANARY_EXTERNAL_*` заполнены в `.env.docker`/`.env.docker.enc`, синхронизированы на s1/s2. Обе ноги теперь `configured: true`.
- [x] **Прод-инцидент найден и починен (2026-07-22, BlackCove + root-weaver, коммит `305c0ec7`, `0.8.0 → 0.8.1`):** первый деплой уронил весь процесс `dashboard-agent` на s2 — необработанный `'error'` на `ImapFlow` (`Socket timeout`) трактуется Node как фатальный, попутно оборвав деплой `aprel8008`, который в этот момент вёл BlackCove. Два слоя фикса: (1) слушатель `client.on('error', ...)` — устраняет краш, но если ошибка приходит вместо reject-а уже начатого `await`, тот `await` виснет навсегда; (2) `waitForCanaryMessage()` обёрнут внешним `Promise.race` с жёстким дедлайном (`POLL_TIMEOUT_MS + 15s`) + `client.close()` по истечении — гарантирует ответ за конечное время независимо от поведения ImapFlow изнутри, плюс `acquireTimeout` на `getMailboxLock()`. Живым прогоном воспроизведён реальный зависший IMAP-сокет (внешняя сетевая проблема до порта 993, не баг Maddy) и подтверждено: вместо зависания — `ok:false` с причиной за ~105с, процесс жив.
- **Примечание по алертингу:** переиспользован существующий `AlertType.CRON_FAILED` (`POST /api/alerts` в dashboard) вместо нового enum-значения — избежали Prisma-миграции на боевой БД ради этой задачи. Если понадобится отдельная фильтрация в UI dashboard/alerts — заводить `EMAIL_DELIVERY_FAILED` отдельной сессией.
- **Не покрыто (сознательно, вне MVP):** Umami-событие (§ Этап 0 упоминает Telegram+Umami как алертинг) — текущий alert-pipeline dashboard поддерживает только Telegram (`sendNotification` в `apps/dashboard/src/lib/notifications.ts`), заводить Umami-канал ради одной этой задачи не стали.
- [x] **Системные находки применены (2026-07-22, `0.8.1 → 0.8.2`):** (1) починена латентная бесконечная рекурсия `loadAllCronJobs ↔ saveCronConfig` в `lib/cron.ts` (обнаружена случайно в dev, не стреляла в проде); (2) `notifyDashboardAlert`/`notifyCanaryAlert` дедуплицированы в общий `lib/dashboard-alert.ts` (+ `lib/app-registry.ts` для `APP_PORTS`/`APP_HOSTS`/`getAppUrl`); (3) `email-canary.ts` переключён на `@letar/email` (`createEmailProvider`) вместо дублирования nodemailer-транспорта — потребовало добавить `bcc?` в `SendEmailParams` (`@letar/email` 0.2.0 → 0.3.0). Первый non-Next.js consumer `libs/*` в приложении на `@nx/esbuild` — проверено живым билдом + смоук-тестом. Детали — `CHANGELOG.md`.

| Задача                         | Статус    | Приоритет |
| ------------------------------ | --------- | --------- |
| Отправка метрик в Dashboard    | ⏳ TODO   | P1        |
| Алерты при превышении порогов  | ✅ Готово | P2        |
| WebSocket для real-time метрик | ⏳ TODO   | P3        |

**Оценка унификации дебаунс-паттерна алертов (2026-07-30, `0.9.5 → 0.9.6`):** проверена
целесообразность единого generic-хелпера поверх `email-canary.ts`/`backup-freshness.ts`/
`health-check.ts` — три реализации «периодическая проверка → дебаунс → `postDashboardAlert()`».
Вывод: унификация не оправдана — email-canary дебаунсит по счётчику подряд-неудач на двух ногах,
backup-freshness — плоским level-triggered флагом, health-check смешивает level-triggered
пороги (per-key) с edge-triggered переходом состояния контейнеров. Единый хелпер либо не
покрыл бы edge-triggered случай, либо стал бы сложнее прямого кода. Подробности и критерий
пересмотра — комментарий в `lib/json-state-file.ts`.

**Уточнение по «Отправка метрик в Dashboard» (аудит 2026-07-30):** архитектурно это уже
частично закрыто — `dashboard` не хранит копий метрик, а тянет их с агента на лету через
`RemoteServerClient` (`apps/dashboard/src/lib/server-client/remote.ts` → `GET /api/system/*`
и т.д.), с кэшем 2-15 сек на стороне агента. Пункт остаётся TODO именно в узком смысле
«pull → push»: агент сам инициирует отправку (нужно, например, если dashboard временно
недоступен и должен получить пропущенное) — этого нет и полноценной пользы от этого без
конкретного сценария использования не выявлено. Не путать с «Алерты при превышении
порогов» ниже — та часть push-модели (агент сам уведомляет о проблеме) уже реализована.

### ✅ Алерты при превышении порогов — закрыто (dashboard-agent-dev, 2026-07-30)

`DashboardAlertType` с самого начала содержал `CPU_HIGH`/`MEMORY_HIGH`/`DISK_HIGH`/
`CONTAINER_DOWN`/`CONTAINER_RESTARTED`/`DATABASE_DOWN`, но их никто не вызывал — метрики
только отдавались по запросу (`routes/system.ts`), без проактивного контроля. Добавлен
`lib/health-check.ts` + `routes/health-check.ts` (`POST /api/cron/health-check`, крон каждые
5 мин на s2): проверяет CPU/память/диск против порогов (`HEALTH_*_THRESHOLD`, по умолчанию
90%), переходы состояний Docker-контейнеров (running→exited/dead, `restarting` как индикатор
crash-loop) и доступность БД (контейнер жив, подключение — нет). Дебаунс через
`json-state-file.ts` — тот же паттерн, что `email-canary.ts`/`backup-freshness.ts`. `0.9.1 →
0.9.2`.

---

## Backlog 📋

### ✅ Self-deploy обрывает сам себя на recreate-шаге — закрыто (dashboard-agent-dev, 2026-07-30, 3-я попытка)

Деплой `dashboard-agent` на прод (s2) был особым случаем: `docker compose up -d` останавливает
старый контейнер `dashboard-agent`, который в этот момент сам обслуживает deploy-mcp туннель
(`:13100`), через который идёт же этот самый деплой. В момент остановки старого контейнера
процесс `deploy-affected.sh` убивался вместе с ним — новый контейнер оставался в статусе
`Created`, но не стартовал. Наблюдалось минимум трижды (2026-07-21/22 дважды, повторно
2026-07-29 при деплое 0.9.7, msg #671/#678/#691/#855 в agent-mail) — каждый раз чинилось
вручную через SSH-резерв.

**Первая попытка (0.9.8, коммит `fd1f8c6a`) не сработала:** обобщён существовавший для
`dashboard` фикс (detached nohup+setsid restart-скрипт) на `dashboard-agent` — но живой
деплой 0.9.8 снова застрял на пересоздании (BlackCove, message #870). Диагноз: `setsid`
отвязывает процесс только от сессии/терминала, а не от **cgroup контейнера** — при
`docker stop`/`docker rm` все процессы в cgroup контейнера убиваются вместе с ним независимо
от сессии. Detached-скрипт обрывался ровно на "Recreate".

**Решение (0.9.9):** заменено на `systemd-run --unit=... --collect` — транзиентный
systemd-юнит выполняется в `system.slice`, полностью отдельной от cgroup докера, с fallback
на nohup+setsid если `systemd-run` недоступен (явное предупреждение в логе, что fallback не
решает self-deploy). Заодно исправлен сопутствующий баг: цикл ожидания healthcheck перед
reload nginx вычислял имя контейнера как `${app}-app`, но `dashboard-agent` в
`docker-compose.production.yml` задаёт `container_name: dashboard-agent` без суффикса —
добавлен явный кейс.

**Вторая попытка (0.9.9, коммит `d689a8d6`) тоже не сработала:** живой прогон упал сразу
после warning-строки, ни разу не дойдя до `✅ ... restart scheduled via systemd-run`.
Диагноз (BlackCove, message #875, проверено вручную на s2): голый `systemd-run` без `sudo`
требует polkit-авторизацию (`Interactive authentication required`) — непривилегированный
`deploy` не может стартовать unit в `system.slice` без интерактивной сессии. Хуже того,
вызов стоял в `then`-блоке `if`, поэтому его ненулевой exit-код под `set -e` (действует всю
жизнь скрипта) убивал весь `deploy-affected.sh`, а не только уходил в fallback.

**Решение (0.9.10) — подтверждено живым прогоном:** вызов перенесён в условие `if`
(падение внутри условия не триггерит `set -e`) + добавлен `sudo -n systemd-run`. Деплой
коммита `12b2ac30` прошёл **полностью автоматически, без ручного вмешательства** (BlackCove,
message #879): контейнер `dashboard-agent` пересоздался штатно (чистое имя, не завис в
`Created`), `/tmp/dashboard-agent-restart-*.log` (владелец `root` — подтверждает, что unit
запущен через `sudo systemd-run`) показывает полный цикл `Creating → Created → Starting →
Started` + успешный старт крон-планировщика и сборщика метрик.

**Три бага, которые пришлось найти по очереди (типичный паттерн detached-процессов в
Docker+systemd): (1) cgroup-принадлежность не меняется `setsid`/`nohup` — нужен реальный
выход через `systemd-run`; (2) polkit требует `sudo` для `system.slice`; (3) вызов внутри
`then`-блока под `set -e` убивает весь скрипт при первой же ошибке, а не только эту ветку —
каждая правилась по факту падения на реальном сервере, ни одна не была очевидна заранее.**

### ✅ Локальный реестр `APP_PORTS`+`APP_HOSTS`+`SERVER_APPS` слит в `APP_REGISTRY` — частично закрыто (dashboard-agent-dev, 2026-07-30, `0.9.11`)

Изначально найдено (LavenderSpring, 2026-07-28) при добавлении cron-задач для `studio`:
приложение отсутствовало в реестре — `APP_PORTS`/`APP_HOSTS` (`lib/app-registry.ts`) и
`SERVER_APPS` (`lib/server-config.ts`) нужно было трогать отдельно друг от друга. Реализовано
предложение №2 (слияние в один объект): `server-config.ts` теперь хранит единый
`APP_REGISTRY: Record<string, { server, port?, host? }>`, `SERVER_APPS`/`APP_PORTS`/`APP_HOSTS`
— производные экспорты (`Object.fromEntries` по `APP_REGISTRY`) для обратной совместимости с
guard-тестами и существующими импортами (`cron.ts`, `database.ts`, `dashboard-alert.ts` не
менялись). Добавление нового приложения для dashboard-agent теперь — одна запись в одном
объекте вместо правки двух файлов.

**Не закрыто (сознательно, вне scope этой сессии):**

- Канон `@letar/infra-config` (`libs/infra-config/src/index.ts`) по-прежнему хранит
  `SERVER_APPS`/`APP_PORTS`/`APP_HOSTS` тремя раздельными экспортами — унификация канона
  затронула бы `apps/dashboard` (`app-metrics.ts`) и `libs/deploy-mcp`, вне файловой
  резервации `apps/dashboard-agent/**` этой сессии.
- `cron-jobs.json` (рантайм-файл, не в git) остаётся третьим местом, о котором reестр не
  знает ничего — предложение генератора `new-app` (`libs/generators`) автоматически заводящего
  запись при скаффолдинге всё ещё не реализовано.

### ✅ `APP_CONFIG.defaults.host` дублировал `containerName` — закрыто (root-weaver, 2026-07-28)

В `src/lib/database.ts` каждая запись `APP_CONFIG` хранила `containerName` и `defaults.host`
как две отдельные строки с одинаковым значением (найдено MagentaGlen 2026-07-28 — та же
категория риска, что инцидент studio 2026-07-04). Поле `host` убрано из `defaults` всех 17
записей; `getAppDbConfig()` теперь выводит `host: config.containerName` — один источник
истины, опечатка при добавлении нового приложения больше не может рассинхронить два поля
одного объекта. `dashboard-agent` 0.8.9.

### ✅ Устаревшее описание cron-задачи `s2-database-backup` — закрыто (root-weaver, 2026-07-28)

`DEFAULT_CRON_JOBS` в `src/lib/cron.ts:115` — описание «Автоматический бэкап всех БД на s2
(driving-school)» вводило в заблуждение: задача бэкапит **все** БД из `APP_CONFIG` (17 приложений
после этой сессии — добавлены `aboi`/`aprel8008`, см. запись про аудит охвата бэкапов ниже),
driving-school был упомянут как исторический пример. Формулировка исправлена на «...из
`APP_CONFIG` (см. `database.ts`)».

### Хвосты imot/premium-rosstil в функциональном коде (найдено root-weaver, 2026-07-22)

Оба приложения удалены из монорепо 2026-07-05 (см. `project_premium_rosstil_imot_removed` в
памяти), но упоминания остались в **25+ файлах**. Один из них — `libs/infra-config/src/index.ts`
(`SERVER_APPS` всё ещё содержит `'premium-rosstil': 's2'` и `imot: 's2'`) — реально ломает
`server-config.guard.spec.ts` в `dashboard-agent` (канон ≠ локальная копия `SERVER_APPS`, которая
их уже не содержит с версии 0.7.5). Остальное — тихий тех-долг, не роняет ничего активно.

**Обнаруженные категории (`grep -rln "imot\|premium-rosstil"`, вне `apps/imot`/`apps/premium-rosstil`):**

- [x] `libs/infra-config/src/index.ts` (`SERVER_APPS` содержал `premium-rosstil`/`imot` — причина
      расхождения с локальной копией `server-config.ts` в dashboard-agent) — убраны, guard-тест и
      typecheck зелёные (dashboard-agent-dev, 2026-07-22, коммит `319381b5`).
- [x] `scripts/sync-env-docker.sh` (`APPS` массив + пример в шапке) и `cron-jobs.example.json`
      (два `imot-*` cron-задания) — убраны (dashboard-agent-dev, 2026-07-22).
      **Важно:** локальный `cron-jobs.json` в корне репо — `/cron-jobs.json` в `.gitignore` (не
      трекается git, `git ls-files` его не показывает) — это личный черновой файл, не часть
      репозитория, коммитить/чистить в нём нечего. Реальный конфиг на сервере — `/home/deploy/letar/
cron-jobs.json` (`deploy-affected.sh:421` копирует туда `cron-jobs.example.json` только если
      файла там ещё нет — на s2 он уже существует с 2026-07, этот коммит его не трогает). Если
      `imot-session-reminders`/`imot-practice-diary-reminders` всё ещё в живом конфиге на s2
      (эндпоинты 404'ят с 2026-07-05), чистить через `dashboard-agent` cron API (`lib/cron.ts` →
      `saveCronConfig`), не прямым SSH-эдитом.
      `deploy-affected.sh` — только `--help`-текст, не трогали (не в `S2_APPS`, уже чисто).
- [x] **Docker-compose проверены (dashboard-agent-dev, 2026-07-22):** `apps/dashboard`/`apps/kami`/
      `apps/mandala` `docker-compose.production.yml` вообще не монтируют `.env.docker` удалённых
      приложений — упоминания `imot`/`premium` там только в port-комментариях-легендах (`# 5432=
premium, 5433=imot, 5434=mandala...`), справочных, ничего не мапят. `infra/nginx-proxy-manager/
docker-compose.yml` держал `imot-network` с комментарием «NPM на s1 всё ещё проксирует живой
      сайт клиента через эту сеть» — **устарело**: s1 больше не существует физически (не просто «вне
      ротации»), клиентский сайт через эту сеть уже не обслуживается. `imot-network` убрана из
      `services.app.networks` и из блока `networks:` (владелец подтвердил, 2026-07-22).
- [x] **`apps/dashboard`** — `prisma/seed.ts` уже был чист (нет реальных записей `DeployedApp` для
      удалённых приложений — предположение backlog не подтвердилось). `src/lib/audit-log.ts`,
      `src/app/api/servers/[id]/apps/discover/route.ts`, `src/app/servers/_components/AppForm.tsx` —
      только JSDoc-примеры и placeholder-подсказки формы, не реальные данные; заменены на
      `driving-school`. Typecheck зелёный. Коммит `914d6f0c`.
- [x] `scripts/pull-env-docker.sh` — держал целый **s1 как активный сервер** (`SERVER_MAP`,
      `S1_APPS`), хотя s1 выведен из ротации 2026-06-20 (`project_server_mapping` в памяти,
      `server-config.ts`/`deploy-affected.sh` это уже отражают); `dashboard-agent`/`aboi` числились
      на s1, хотя реально на s2 — перенесены в `S2_APPS`. `scripts/umami-setup.sh` — убраны сайты
      `premium-rosstil`/`imot` из `SITES`, заголовок поправлен с s1 на s2. Коммит `975f6b65`.
- [x] **`scripts/backup/` удалена целиком** (владелец подтвердил, 2026-07-22) — вся подсистема
      (`db-backup.sh`, `db-restore.sh`, `list-backups.sh`, `.env.example`, `INTEGRATION.md`,
      `QUICKSTART.md`, `README.md`) была написана конкретно под premium-rosstil и осиротела вместе
      с приложением; актуальный канон бэкапов — `dashboard`/`dashboard-agent` API
      (`.claude/docs/backup-architecture.md`), эта папка там не упоминалась.
- [x] `tsconfig.json` — реально мёртвые project references на несуществующие `apps/imot`,
      `apps/imot-e2e`, `apps/premium-rosstil-e2e`; `.socraticodecontextartifacts.json` — индексировал
      `schema.zmodel` обоих удалённых приложений; `libs/letar-consultant/src/prompt.ts` — список apps/
      в системном промпте консультанта. Убраны (dashboard-agent-dev, 2026-07-22, коммит `1fd42dea`).
- [x] **Doc-комментарии, косметика:** `libs/validation-utils/src/lib/{money,password,phone}.ts`
      (`* Используется в: premium-rosstil, imot`) — обновлены на реальных потребителей (только
      `driving-school`, других consumer'ов не нашлось — `grep` по `passwordSchema`/`moneySchema`/
      `phoneSchema` в `apps/`). Коммит `1fd42dea`.
- [x] **Submodule:** `apps/driving-school/src/app/(auth)/_adapters/pin-auth-adapters.ts` — убрана
      отсылка «как в premium-rosstil» из JSDoc. `checkout main` (уже был на нём) → commit `5bd04c4`
      → push в `letar-private-driving-school` → bump SHA в letar коммитом `b81af6c7`.

**Итог (2026-07-22):** все пункты бэклога «Хвосты imot/premium-rosstil» закрыты полностью, включая
`imot-network` — s1 физически не существует, клиентский сайт через эту сеть больше не проксируется.

**Раунд 2 (2026-07-28, root-weaver):** повторный `grep -rln "imot\|premium-rosstil"` (вне `apps/imot`/
`apps/premium-rosstil`, вне `.claude/worktrees`/`.claude/artifacts`) нашёл живые остатки, пропущенные
раундом 1 — тот грепал конкретные категории (docker-compose, sync-env, tsconfig), не сплошным поиском
по всему дереву:

- 🔴 **`apps/kami/prisma/seed.ts`** — реальный битый UX, не косметика: портфолио kami отдавало
  `demoUrl` на мёртвые `https://premium.rosstil.ru/` и `https://imot.letar.best`. `demoUrl` убран у
  обеих карточек (описание/технологии оставлены как история портфолио). Seed idempotent
  (`deleteMany`+`createMany`), но re-seed прод-БД kami не выполнялся — отдельное решение владельца.
- `ecosystem.config.js` (мёртвый PM2-конфиг `start premium-rosstil`, не референсится нигде — вытеснен
  Docker-деплоем) и `scripts/generate-pwa-icons.mjs`/`generate-pwa-screenshots.mjs` (одноразовые
  скрипты, хардкоженные на `apps/premium-rosstil`, вытеснены локальными per-app версиями) — удалены.
- `.gitignore` (мёртвые записи `/apps/premium-rosstil/logs/*.log`), `deploy-affected.sh` (примеры в
  `--help`), `apps/dashboard/schema.zmodel` (doc-пример поля `imageName`/`domain`, regen через
  `zenstack:generate`+`db:generate`), `.claude/hooks/kill-e2e-port.js` (`PORT_MAP` держал мёртвые
  порты imot/premium-rosstil) — поправлены.

Остаток после раунда 2 — десятки упоминаний в `.md` (PLAN/CHANGELOG/README историческая запись самого
decommission'а — не трогать, это архив) и generic-примеры команд в `.claude/skills/*/reference/*.md`
(`nx build premium-rosstil` как иллюстрация синтаксиса, не утверждение что приложение живо) — низкий
приоритет, не функциональный код.

**Не трогать:** `.claude/worktrees/heuristic-roentgen-7645de/` и `.claude/worktrees/jovial-bhabha-baae8b/`
— отдельные git worktree (заброшенные?), не часть основного дерева, требуют отдельного решения (удалить
worktree или разобраться, что это).

### Надёжность deploy-истории (найдено BlackCove, 2026-07-22) — ✅ закрыто (dashboard-agent-dev, 2026-07-22)

`routes/deploy.ts` хранит `deployHistory` (ring-buffer, `MAX_DEPLOY_HISTORY` записей) и стрим логов текущего деплоя **только в памяти процесса** (`const deployHistory: DeployStatus[] = []`). При падении/рестарте контейнера `dashboard-agent` вся история и лог активного деплоя теряются безвозвратно — `deploy_status`/`GET /api/deploy/history` отвечают «not found»/«No deploys yet», хотя сам `deploy-affected.sh` мог быть ещё жив на хосте (через `nsenter`) и продолжать деплой вслепую, без возможности его отследить через deploy-mcp.

**Инцидент-триггер:** 2026-07-22, email-canary (`lib/email-canary.ts`) уронил весь процесс dashboard-agent необработанным `error`-событием `ImapFlow` (`Socket timeout`) прямо во время деплоя aprel8008 — деплой пришлось доливать вручную через SSH-резерв, а прогресс из deploy-mcp пропал.

- [x] Вынести `deployHistory` (и активный лог-стрим по `deployId`) во внешнее хранилище, переживающее рестарт контейнера — **Redis** (`lib/redis.ts` + `routes/deploy.ts`, `0.8.2 → 0.8.3`). Оказалось, что shared-стор Redis (`letar-redis`, `infra/redis`) уже развёрнут на s2 и используется `animatrona-tracker`/`auth-hub`/`kami`/`driving-school`/`svoichuzhie` — заметка в этом же файле от 2026-07-06 («нигде не используется как shared-стор») устарела, переиспользован существующий инстанс. Graceful degradation без Redis (как на s3, где его нет) — деплой работает чисто в памяти, как раньше.
- [x] После рестарта — `rehydrateFromRedis()` при старте процесса восстанавливает историю и помечает записи, застигнутые в `running: true`, как `interrupted: true`.
- [x] Устойчивость `nsenter`-процесса к обрыву родителя — **прояснено** (не исправлено): `nsenter -t 1 -m -u -n -i` не трогает cgroup, только namespace'ы; спавненный `deploy-affected.sh` остаётся в cgroup контейнера `dashboard-agent` и убивается вместе с ним при `docker compose up -d` recreate — тот же корень, что и в backlog-пункте «self-deploy обрывает сам себя» ниже. Детали — `CHANGELOG.md` 0.8.3.

### Логи cron-задач в памяти, `CronExecutionLog` в БД dashboard — мёртвая модель

**Найдено:** 2026-07-28, при проектировании §25 «Еженедельный контроль зависимостей»
(`PLAN-INFRA.md`) — тот же класс проблемы, что и «Надёжность deploy-истории» выше (единый
пар «in-memory стор в dashboard-agent ↔ переживающая рестарт БД в dashboard»), но для cron ещё
не решён. `executionLogs` в `lib/cron.ts` — `Map<string, CronExecutionLog[]>` только в памяти
процесса, `MAX_LOGS_PER_JOB = 50`. При рестарте контейнера история выполнений cron-задач
теряется целиком. При этом в БД `apps/dashboard` уже есть модель `CronExecutionLog`
(`schema.zmodel`), в которую dashboard-agent **не пишет ни разу** — модель существует, но
мертва, `apps/dashboard/src/app/cron/page.tsx` её тоже не читает.

**Решено (dashboard-agent-dev, 2026-07-30, `0.9.3 → 0.9.4`):** выбран путь «Redis в самом
dashboard-agent», не «писать в БД dashboard» — вся остальная архитектура pull-based
(`RemoteServerClient` в dashboard дёргает REST агента на лету, ничего не копирует к себе в
БД: system/docker/database статусы, deploy-история после 0.8.3 — тоже Redis на стороне
агента, не БД dashboard). Заводить для cron-логов вторую модель хранения (POST в БД
`dashboard`) было бы исключением из этого паттерна ради одной фичи.

- [x] `executionLogs` персистится в Redis (`dashboard-agent:cron:logs:<jobId>`, TTL 30 дней),
      тот же паттерн, что `deployHistory` (0.8.3): `persistJobLogs()` на каждый `addLog`/
      `updateLog`, `rehydrateExecutionLogsFromRedis()` при старте процесса восстанавливает
      историю, записи, застигнутые в `running`, помечаются `error`.
- [x] **Модель `CronExecutionLog` в схеме `dashboard` остаётся мёртвой** — решение об её
      удалении миграцией сознательно оставлено вне scope dashboard-agent (это правки в
      `apps/dashboard/schema.zmodel`, чужая зона ответственности/файловая резервация).
      Рекомендация для сессии `dashboard-dev`: удалить модель, раз теперь официально
      подтверждено, что она не часть источника истины ни с одной стороны.

**Зависимости:** пересекается с «Единый источник правды для реестра приложений»
(`apps/dashboard/PLAN.md` → Запланировано) — оба про рассинхрон dashboard/dashboard-agent.

**Оценка унификации (dashboard-agent-dev, 2026-07-30, `0.9.4 → 0.9.5`):** после появления
Redis-персистентности в обоих местах проверено, не пора ли вынести общий
`createRedisBackedHistory<T>` для `deployHistory` и `executionLogs` — на двух потребителях
преждевременно. Формы хранения расходятся по существу: `deploy.ts` — один плоский глобальный
ring-buffer, LIST-индекс, один Redis-ключ на элемент, дебаунсированный персист построчного
лога; `cron.ts` — N независимых per-job ring-buffer, SET-индекс job-id, один ключ на группу
целиком, немедленный персист без дебаунса. Обобщение потребовало бы параметризации по
indexType/гранулярности ключа/стратегии персиста, которая на двух местах не сокращает код, а
прячет разницу за конфигом. Решение и критерий возврата (третий Redis-backed ring-buffer с
совпадающей формой) — комментарий в `lib/redis.ts`. Код не менялся.

### Улучшения сбора метрик

- [x] **Мониторинг сетевого трафика (dashboard-agent-dev, 2026-07-30, `0.9.11`)** — при
      ревизии выяснилось, что live-снимок (`getNetworkInfo()`, `GET /api/system/network`) уже
      существовал, не хватало именно исторического ряда. `lib/history.ts` теперь собирает
      `networkRx`/`networkTx` (байт/сек) в тот же ring-buffer, что cpu/memory/disk —
      `GET /api/system/history` отдаёт их в `stats`/`data`. Отображение графика в UI
      `dashboard` — отдельная задача вне scope (не файловая резервация этой сессии).
- [x] **Мониторинг логов контейнеров (ревизия dashboard-agent-dev, 2026-07-30)** — при
      проверке оказалось, что pull-доступ уже реализован
      (`GET /api/docker/containers/:id/logs` → `lib/docker.ts:getContainerLogs`). Формулировка
      расширена на реальный оставшийся пробел — см. пункт ниже.
- [x] **Проактивное сканирование логов контейнеров на ошибки + алерт (dashboard-agent-dev,
      2026-07-30, `0.9.11 → 0.9.12`)** — `lib/log-scan.ts` + `routes/log-scan.ts`
      (`POST /api/cron/log-scan`, крон каждые 10 мин на s2): хвост логов запущенных
      контейнеров сканируется на строки с ошибками (error/exception/fatal/panic и т.п.),
      алерт `CRON_FAILED` (переиспользован, как в `email-canary.ts` — не заводили новый
      enum-тип ради Prisma-миграции). Курсор "последняя обработанная строка" per-контейнер
      (не boolean-дебаунс — ошибки в логах событийные, не level-triggered).
- [x] История метрик (локальный буфер) — `lib/history.ts`, ring-buffer до 30 дней (1 точка/мин),
      `GET /api/system/history` (найдено при аудите PLAN.md 2026-07-30 — пункт был отмечен TODO,
      хотя реализован уже давно)
- [x] Агрегация за интервалы (dashboard-agent-dev, 2026-07-30, `0.9.6 → 0.9.7`) — `getHistory()`
      при downsampling >500 точек усредняет cpu/memory/disk внутри временных бакетов вместо
      взятия каждой N-й точки (была потеря кратковременных скачков между выбранными точками
      при запросе 7d/30d)

### Безопасность

- [x] API токен авторизация — `lib/auth.ts` (`authMiddleware`, Bearer `AGENT_TOKEN`), все роуты
      кроме `/health` (найдено при аудите PLAN.md 2026-07-30 — пункт был отмечен TODO, хотя
      реализован уже давно)
- [x] Rate limiting — `@fastify/rate-limit` (dashboard-agent-dev, 2026-07-30, `0.9.4`),
      настраивается `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`, по умолчанию 600 запросов/мин на IP
- [x] Whitelist IP адресов — `lib/ip-whitelist.ts` (dashboard-agent-dev, 2026-07-30, `0.9.4`),
      опционально через `ALLOWED_IPS` (точные IP или IPv4 CIDR), не задан — выключено

### Интеграции

- [ ] Prometheus exporter
- [ ] Telegraf совместимость
- [ ] Grafana datasource

---

## Команды разработки

```bash
# Разработка (watch mode)
nx dev dashboard-agent

# Сборка
nx build dashboard-agent

# Запуск
nx start dashboard-agent

# Проверки
nx lint dashboard-agent
nx typecheck dashboard-agent
```

---

**Последнее обновление:** 2026-07-30
