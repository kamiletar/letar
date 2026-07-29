# Выполненные задачи — Dashboard Agent

Детальное описание всех реализованных фич.

## Версия 0.9.7 — агрегация по бакетам в истории метрик (2026-07-30, dashboard-agent-dev)

Закрыт пункт бэклога «Агрегация за интервалы». `getHistory()` в `lib/history.ts` при
downsampling ответа (>500 точек — случается при запросе 7d/30d с шагом сбора 1 точка/мин)
раньше брал каждую N-ю точку (`points.filter((_, i) => i % step === 0)`), из-за чего
кратковременные скачки CPU/памяти/диска между выбранными точками полностью пропадали из
графика. Заменено на `aggregateIntoBuckets()` — точки делятся на до 500 равных по времени
бакетов, cpu/memory/disk усредняются внутри каждого, timestamp бакета — время последней точки
в нём. Изменение локально в одном файле, `MetricPoint`/публичный контракт `getHistory()` не
менялись. Задеплоено на s2 (коммит `375ab86c`, BlackCove) — self-deploy контейнер снова
завис на recreate-шаге (тот же известный баг, что и в записях 2026-07-22 ниже), добит вручную.

## Версия 0.9.5 — оценка унификации Redis-backed history (2026-07-30, dashboard-agent-dev)

По запросу пользователя проверено, не оправдана ли уже сейчас общая абстракция
`createRedisBackedHistory<T>` над двумя местами с похожим на вид паттерном «ring-buffer в
памяти → best-effort персист в Redis → rehydrate при старте → пометка running-записей как
interrupted/error»: `deployHistory` в `routes/deploy.ts` (0.8.3) и `executionLogs` в
`lib/cron.ts` (0.9.4).

**Вывод: преждевременно, не унифицировано.** Формы хранения расходятся по существу, а не
случайно:

- `deploy.ts` — один плоский **глобальный** ring-buffer (`MAX_DEPLOY_HISTORY` деплоев
  суммарно), каждый элемент — свой Redis-ключ (`deploy:item:<id>`), индекс — **LIST** (порядок
  важен для истории), персист построчного `output` **дебаунсится** (1с) отдельно от
  немедленного `flushPersist()` при значимых переходах статуса.
- `cron.ts` — **N независимых** ring-buffer (по `MAX_LOGS_PER_JOB` на `jobId`), каждый `jobId`
  — один ключ с целым JSON-массивом логов (`cron:logs:<jobId>`), индекс — **SET** job-id
  (порядок не нужен), персист **немедленный** на каждый `addLog`/`updateLog` без дебаунса.

Обобщённый хелпер пришлось бы параметризовать сразу по трём осям (indexType list/set,
гранулярность ключа элемент/группа, стратегия персиста дебаунс/немедленно) — на двух
потребителях это не сокращает код, а прячет реальную разницу за конфигом. Решение и явный
критерий пересмотра (третий Redis-backed ring-buffer с формой хранения, совпадающей с одним
из этих двух вариантов) зафиксированы комментарием в `lib/redis.ts`. Код логики `deploy.ts`/
`cron.ts` не менялся — только документация решения (`PLAN.md`, `CHANGELOG.md`, `lib/redis.ts`).

## Версия 0.9.3 — синхронизация app-registry.ts с каноном @letar/infra-config (2026-07-30, dashboard-dev)

Параллельная сессия (см. запись 0.9.1→0.9.4 ниже) — правка со стороны `dashboard-dev` в рамках
задачи dashboard «единый источник правды для реестра приложений». Значения `APP_PORTS` в
`app-registry.ts` (локальная копия — `Dockerfile.production` изолирован от `libs/`) теперь
сверяются с каноном `@letar/infra-config` новым `app-registry.guard.spec.ts`, тем же паттерном,
что уже применялся к `SERVER_APPS`/`server-config.guard.spec.ts`. Набор приложений в локальной
копии не менялся — только источник истины для номеров портов. Детали — `apps/dashboard/PLAN_COMPLETED.md` v1.20.2.

## Версия 0.9.1 → 0.9.4 — пороговые алерты, безопасность, надёжность cron-логов (2026-07-30, dashboard-agent-dev)

Сессия прошла весь короткий бэклог P1-P3 плюс блок «Безопасность» по приоритету.

**0.9.2 — «Алерты при превышении порогов» (закрыт P2):** новый `lib/health-check.ts` +
`routes/health-check.ts` (`POST /api/cron/health-check`, крон каждые 5 мин на s2). Три
проверки за один прогон: CPU/память/диск против порогов (`HEALTH_CPU_THRESHOLD`/
`HEALTH_MEMORY_THRESHOLD`/`HEALTH_DISK_THRESHOLD`, дефолт 90%), переходы состояний Docker-
контейнеров (running→exited/dead — `CONTAINER_DOWN`; состояние `restarting` как индикатор
crash-loop — `CONTAINER_RESTARTED`), доступность БД (контейнер жив, подключение — нет —
`DATABASE_DOWN`). Алертит через `postDashboardAlert()` — важная находка: типы
`CPU_HIGH`/`MEMORY_HIGH`/`DISK_HIGH`/`CONTAINER_DOWN`/`CONTAINER_RESTARTED`/`DATABASE_DOWN`
существовали в `DashboardAlertType` и схеме `dashboard` с самого начала, но ни разу не
вызывались — метрики только отдавались по запросу, без проактивного контроля. Дебаунс
(один алерт на непрерывный эпизод) через существующий `json-state-file.ts`.

**0.9.4 — Rate limiting + IP whitelist (закрыт блок «Безопасность»):** `@fastify/rate-limit`
(600 запросов/мин на IP по умолчанию, настраивается `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`,
`127.0.0.1`/`::1` в allowList — не режет собственные cron-вызовы агента на себя же) и новый
`lib/ip-whitelist.ts` (опционально через `ALLOWED_IPS`, точные IP или IPv4 CIDR, preHandler
до `authMiddleware`). Заодно аудит PLAN.md вскрыл две ложные записи TODO — «API токен
авторизация» (`lib/auth.ts`) и «История метрик» (`lib/history.ts`) были реализованы давно,
просто не отмечены.

**0.9.4 — Redis-персистентность логов cron-задач (закрыт Backlog «CronExecutionLog — мёртвая
модель»):** `executionLogs` в `lib/cron.ts` теперь персистятся в Redis
(`dashboard-agent:cron:logs:<jobId>`, TTL 30 дней) тем же паттерном, что `deployHistory` в
`routes/deploy.ts` (0.8.3) — `rehydrateExecutionLogsFromRedis()` при старте восстанавливает
историю, записи в статусе `running` при рестарте помечаются `error`. Осознанно выбран путь
«Redis в самом агенте», а не «писать в БД `dashboard`» — вся остальная архитектура pull-based
(`RemoteServerClient` дёргает REST агента на лету, ничего не копирует в БД dashboard).
Модель `CronExecutionLog` в схеме `dashboard` остаётся неиспользуемой — решение об её
удалении миграцией вне scope dashboard-agent (чужая файловая зона), оставлена рекомендация
для сессии `dashboard-dev`.

**Не в фокусе (сознательно):** «Отправка метрик в Dashboard» (P1) и WebSocket (P3) остались
TODO — по итогам разбора выяснилось, что pull-модель (`RemoteServerClient`) уже закрывает
основной сценарий «дать dashboard свежие метрики», push-инициатива от агента не имеет пока
конкретного сценария использования.

**Побочный эффект сессии:** параллельно в этом же приложении работал другой агент
(`app-registry.ts`/`app-registry.guard.spec.ts`, версия 0.9.3, синхронизация `APP_PORTS` с
каноном `@letar/infra-config`) — не входит в этот коммит, оставлено нетронутым в рабочем
дереве для отдельного коммита.

commit `0d9dff39`. Деплой не запрошен на момент записи.

## Версия 0.8.7 → 0.8.8 — аудит охвата бэкапов + canary свежести бэкапа Maddy (2026-07-28, root-weaver)

Сессия «хвосты корневого `PLAN.md`»: сверка охвата ежедневного `pg_dump`-бэкапа БД
(`APP_CONFIG` в `src/lib/database.ts`) с фактическим списком приложений с БД на s2.

**0.8.7 — найден и закрыт реальный пробел:** `aboi` и `aprel8008` развёрнуты на s2
(`SERVER_APPS`), у обоих Postgres-БД, но `APP_CONFIG` их не перечислял, а
`docker-compose.production.yml` не монтировал их `.env.docker` в `/secrets/` — БД **никогда
не бэкапились**. Добавлены оба (`aboi-db`/`neyroaboi_prod`/`aboi_user`,
`aprel8008-db`/`aprel8008`/`aprel8008_user`) — и в `APP_CONFIG`, и в volume-маунты. aboi —
флагман 152-ФЗ-комплаенса, гэп не был замечен ни разу с момента, когда реестр заведён.

Заодно закрыт смежный дрейф: канон `@letar/infra-config` не знал про `studio` в
`SERVER_APPS` (была только в локальной копии `server-config.ts`) — `server-config.guard.
spec.ts` падал красным на `main` до этого коммита. И попутно поправлена устаревшая
формулировка описания cron-задачи `s2-database-backup` (см. Backlog выше — «бэкап
driving-school» → «бэкап всех приложений из APP_CONFIG»).

**0.8.8 — canary свежести бэкапа Maddy:** новая cron-задача `maddy-backup-freshness-check`
(`src/lib/backup-freshness.ts`, раз в 6 часов, `s2`) — читает `/home/deploy/letar/backups/
maddy` (смонтирован 1-в-1 с хостом) и алертит `BACKUP_FAILED` (дебаунс — один алерт на
эпизод, тот же паттерн, что `email-canary.ts`), если самый свежий `maddy_*.tar.gz` старше
30 часов. Закрывает урок инцидента 2026-07-28 (см. корневой `PLAN.md` §Этап 0.3): бэкапы
Maddy не шли 26 дней незамеченно, потому что ничего не проверяло сам факт их появления —
`email-canary` проверяет доставку писем, не целостность бэкап-пайплайна.

commit `bcbaf10c` (0.8.7), `c3d6c527` (0.8.8). Деплой запрошен у BlackCove (тред
`deploy-dashboard-agent-backup-coverage`), не выполнялся на момент записи.

**0.8.9 — рефакторинг по итогам самопроверки сессии:** два системных находки, всплывшие
при работе с `database.ts`/`email-canary.ts`/`backup-freshness.ts`, применены сразу же:

1. `APP_CONFIG.defaults.host` дублировал `containerName` строкой в каждой из 17 записей
   (риск отмечен MagentaGlen 2026-07-28, до этой сессии не был применён) — убран, `host`
   выводится из `containerName` в `getAppDbConfig()`.
2. `email-canary.ts` и `backup-freshness.ts` дублировали паттерн «читать/писать JSON-файл
   состояния с try/catch» — вынесено в `lib/json-state-file.ts`
   (`loadJsonState`/`saveJsonState`). Сама бизнес-логика дебаунса (пороги, счётчики) не
   унифицирована — у email-canary две ноги с `consecutiveFailures`, у backup-freshness
   плоский `alerted`, разная семантика.

## Версия 0.8.6 — регистрация `studio` в реестре приложений (2026-07-28)

`studio` полностью отсутствовал в `lib/app-registry.ts` (`APP_PORTS`/`APP_HOSTS`) и
`lib/server-config.ts` (`SERVER_APPS`) — из-за этого новые cron-задачи studio
(`send-reminders`, `recurring-invoices`) не смогли бы выполниться (`executeJob` бросает
"Неизвестное приложение: studio" при попытке резолвнуть URL). Добавлено: порт 3024,
host `studio-app` (fallback, совпадает с реальным именем контейнера), сервер `s2`.

При деплое BlackCove столкнулся с известным self-deploy багом (агент деплоит себя через
собственный SSH-туннель и обрывается на шаге recreate, см. `.claude/docs/deployment.md`) —
новый контейнер завис в `Created`, добит вручную `docker compose up -d`.

**Ручная чистка `cron-jobs.json` на s2** (не в git, рантайм-файл): удалены 4 мёртвые задачи
для удалённого приложения `imot` (session-reminders, practice-diary-reminders) и
decommissioned-сервера `s1` (nginx-backup, database-backup) — были причиной алерта с
перепутанным именем/jobId («Practice Diary Reminders» при `jobId: email-canary-check»,
похоже на застрявшее in-memory состояние планировщика). Контейнер перезапущен
(`--force-recreate`) для пересборки`scheduledTasks` с нуля из очищенного файла.

commit `ac28fe5e`.

## Версия 0.8.4 → 0.8.5 — grep-фильтр в run_e2e для точечных прогонов (2026-07-22, BlackCove)

По ходу деплой-сессии root-weaver попросил точечно подтвердить фикс `/admin/products` +
`/admin/mandalas` в `mandala` на staging. У `run_e2e`/`POST /api/e2e/run` не было способа
отфильтровать конкретный спек — пришлось гонять весь набор `mandala-e2e` (123 теста, ~2 мин)
вместо нужных 20.

- `POST /api/e2e/run` принимает опциональный `grep` в теле запроса — пробрасывается в
  `playwright test --grep <значение>` (`apps/dashboard-agent/src/routes/e2e.ts`).
- Валидация — deny-лист (`['"` \`$;|&<>\\` и переносы строк запрещены, макс. 200 символов),
  не allow-лист: `grep` может содержать кириллицу/пробелы (искать по русскому названию теста),
  но не может содержать символы, которыми можно вырваться из shell-интерполяции на s3
  (`nsenter -t 1 -- bash -c '...'`, тот же класс риска, что уже был провалидирован для `project`).
  Значение оборачивается в **двойные** кавычки внутри `e2eCommand` — не одинарные, потому что
  сам `e2eCommand` целиком уже обёрнут в одинарные кавычки на уровне `nxCommand`
  (`sudo -u deploy ... bash -c '${e2eCommand}'`) — вложенная одинарная кавычка преждевременно
  закрыла бы внешнюю обёртку.
- Зеркально обновлён `libs/deploy-mcp/src/server.ts` — `run_e2e` MCP-инструмент получил
  `grep`-параметр с той же zod-валидацией на клиентской стороне (defense in depth).

**Проверка:** typecheck/lint/test зелёные для `dashboard-agent` и `@letar/deploy-mcp`. Задеплоено
на s2 (self-деплой dashboard-agent — известный баг recreate-шага, добито вручную
`docker compose up -d`, см. `.claude/docs/deployment.md` §«Self-деплой dashboard-agent
обрывается на recreate-шаге»).

**Коммит:** `fb026cdd`.

## Версия 0.8.3 → 0.8.4 — Redis-клиент вынесен в @letar/redis-client (2026-07-22, dashboard-agent-dev)

После добавления `lib/redis.ts` в прошлой задаче заметили: точно такой же код (Redis-клиент с
graceful degradation) уже был отдельно в `animatrona-tracker` и `svoichuzhie` — три копии одного
паттерна. Вынесли в новую библиотеку `libs/redis-client` (`@letar/redis-client`).

- `createRedisClient(options)` — фабрика, каждый вызов создаёт независимый singleton-геттер
  `() => Redis | null`. Опции: `envVar`, `fallbackUrl`, `silent`, `redisOptions`, `logPrefix`.
- `dashboard-agent/src/lib/redis.ts` теперь — тонкая обёртка в 3 строки.
- Приложения оставляют свои хелперы (`cached`, `rateLimit`, `checkRateLimit`, персист
  deploy-истории) поверх общего клиента — они у каждого свои, не тянут на общую абстракцию.
- Подключение: `paths`/`references` в `tsconfig.json`, `implicitDependencies` в `project.json`,
  `Dockerfile.production` — добавлен `libs/redis-client` в синтетический мини-workspace (по
  аналогии с `libs/email`).

**Проверка:** typecheck/lint/test — зелёные для всех трёх приложений и новой библиотеки. Реальный
`next build` прошёл для `animatrona-tracker`/`svoichuzhie`. Для `dashboard-agent` отдельно прогнали
изолированную Docker-сборку (builder-стейдж) — именно то место, где раньше ловили `Module not
found` на транзитивных `@letar/*`-импортах (прецедент с `SortablePhotoGrid`, см. `.claude/rules/
deploy-coordination.md`).

**Инцидент по пути (исправлен):** `nx format:write` со старым именем проекта (`redis-client`
вместо канонического `@letar/redis-client`) упал с ошибкой и молча переформатировал **весь
репозиторий** — задело 8 чужих файлов вне скоупа задачи. Замечено по diff, откачено
`git restore` до состояния коммита — в итоговый коммит попали только свои файлы.

**Коммиты:** `3f3d15d3` (dashboard-agent + animatrona-tracker + новая либа, основной репо),
`63bb0ff` (svoichuzhie, отдельный коммит в приватном submodule), `db599fe4` (bump submodule SHA).
Деплой запрошен у BlackCove (thread #708) для всех трёх приложений разом.

## Версия 0.8.2 → 0.8.3 — Персистентность deploy-истории в Redis (2026-07-22, dashboard-agent-dev)

Закрытие backlog-пункта «Надёжность deploy-истории», найденного BlackCove в тот же день на
инциденте с email-canary (краш процесса необработанным `error` от `ImapFlow` посреди деплоя
`aprel8008` — прогресс из deploy-mcp пропал, деплой пришлось доливать вручную через SSH).

**Код:** новый `lib/redis.ts` — клиент `ioredis` с graceful degradation (без `REDIS_URL` или при
недоступном Redis все вызывающие продолжают работать чисто в памяти, без ошибок — тот же паттерн,
что и `apps/animatrona-tracker/src/lib/redis.ts`). `routes/deploy.ts`:

- каждый снапшот `DeployStatus` персистится в Redis (`dashboard-agent:deploy:item:<id>`, TTL 7
  дней) + индекс порядка (`dashboard-agent:deploy:index`);
- лог (`appendOutput`, вызывается построчно на каждый chunk stdout/stderr) — дебаунс не чаще раза
  в секунду на деплой; финальный статус на каждом пути завершения (`pull`/`restart`/`compose-up`/
  `deploy-app` close·error/`cancel`) — немедленный `flushPersist`;
- `rehydrateFromRedis()` при старте процесса восстанавливает `deployHistory`; записи, застигнутые
  в `running: true` (агент перезапустился посреди деплоя), помечаются `interrupted: true`.

**Инфраструктура:** переиспользован уже существующий shared Redis (`letar-redis`, `infra/redis`,
живёт на s2) — используется `animatrona-tracker`/`auth-hub`/`kami`/`driving-school`/`svoichuzhie`.
Заметка в этом же `PLAN.md` от 2026-07-06 («Redis нигде не используется как shared-стор») оказалась
устаревшей на момент проверки — новая инфраструктура не поднималась, только
`REDIS_URL: ${REDIS_URL:-redis://letar-redis:6379}` в `docker-compose.production.yml`. На s3
(staging) Redis не развёрнут — `REDIS_URL` там намеренно не задан (graceful degradation, без
лишних error-логов о недоступном инстансе).

**Побочная находка (задокументирована, не исправлена):** прояснена причина, почему
`deploy-affected.sh`, запущенный через `nsenter` (`lib/host-exec.ts`), не переживает рестарт
контейнера `dashboard-agent`. `nsenter -t 1 -m -u -n -i` не включает `-p` (pid namespace) — не
нужен, контейнер и так поднят с `pid: host`. Но **cgroup при этом не меняется**: процесс остаётся в
cgroup контейнера, и `docker compose up -d` recreate убивает его вместе с контейнером. Тот же
корень, что и в соседнем backlog-пункте «self-deploy обрывает сам себя на recreate-шаге» — оба
вытекают из того, что nsenter здесь даёт только namespace-изоляцию, не cgroup-независимость.
Полноценный fix (cgroup escape, например `systemd-run --scope` на хосте) не входил в эту сессию —
требует изменений в общем `deploy-affected.sh`, отдельная задача.

**Деплой:** запрошен и выполнен BlackCove тем же вечером (commit `5698f885`, s2) — self-деплой
снова обрывался на recreate-шаге (та самая непочиненная проблема выше), добит вручную через
`docker compose up -d`. Health-check зелёный.

## Версия 0.8.0 → 0.8.1 — Канареечный мониторинг доставки email + прод-инцидент (2026-07-22)

Реализация корневого `PLAN.md` Этапа 0.7 — автоматическая проверка, что письма реально **доходят**
(round-trip), а не просто «SMTP принял».

**Код (`0.7.6 → 0.8.0`):** новый `lib/email-canary.ts` + `routes/email-canary.ts` — `POST
/api/cron/email-canary-check` (новая cron-задача, раз в 15 минут, s2) и `GET
/api/cron/email-canary-check/status`. SMTP-отправка через выделенный ящик `canary@letar.best` +
IMAP-проверка round-trip двумя независимыми ногами:

- **internal** — письмо приходит обратно в тот же ящик по IMAP (жив ли сам Maddy);
- **external** — то же письмо (BCC) доставляется на реальный внешний почтовик — ловит именно тот
  класс инцидента, что стал первопричиной Этапа 0 («форвард режется gmail»), а не только «SMTP
  принял».

Обе ноги опциональны по конфигу — без секретов просто не проверяются (`configured: false`), ничего
не падает и не алертит. При 3 подряд неудачах одной ноги — алерт в dashboard (переиспользован
`AlertType.CRON_FAILED`, без новой Prisma-миграции ради этой задачи). Umami-канал не заведён —
текущий alert-pipeline dashboard поддерживает только Telegram.

**Провижининг (в этой же сессии, не отдельной задачей):** ящик `canary@letar.best` создан на Maddy
(`maddy creds create`, пароль — `openssl rand -base64 32`), SMTP+IMAP auth проверены вживую.
Внешняя нога — `<личный ящик владельца>`, IMAP app-password (потребовало
включить 2FA на аккаунте — без неё Google скрывает страницу app-passwords). Оба секрета залиты в
`.env.docker`/`.env.docker.enc`, синхронизированы на s1/s2 через `scripts/sync-env-docker.sh`.

**Прод-инцидент и фикс (`0.8.0 → 0.8.1`, найден BlackCove):** первый деплой уронил весь процесс
`dashboard-agent` на s2 — необработанный `'error'` на `ImapFlow` (`Socket timeout`) Node трактует
как фатальный на EventEmitter без слушателя, попутно оборвав в этот момент деплой `aprel8008`
(BlackCove пришлось доливать через SSH-резерв). Два слоя фикса:

1. Слушатель `client.on('error', ...)` — устраняет краш процесса.
2. Оказалось недостаточно: если ошибка приходит **вместо** reject-а уже начатого `await`
   (`connect()`/`fetch()`), тот `await` виснет навсегда — слушатель ловит ошибку, но операция сама
   не завершается. Фикс — `waitForCanaryMessage()` обёрнут внешним `Promise.race` с жёстким
   дедлайном (`POLL_TIMEOUT_MS + 15s`) + `client.close()` по истечении, плюс `acquireTimeout` на
   `getMailboxLock()`.

Живым прогоном воспроизведён реальный зависший IMAP-сокет (внешняя сетевая проблема до порта 993 —
локально на самом сервере Maddy отвечает мгновенно, значит не баг Maddy) и подтверждено: вместо
бесконечного зависания — `{"ok":false,"error":"..."}` за ~105с, процесс не падает, HTTP-запрос
корректно завершается.

**Коммиты:** `09fd1a10` (код), `2a5aaa0d`/`0730d288` (секреты обеих ног), `305c0ec7` (crash-фикс),
`c25d58f3` (docs). Задеплоено на s2, оба этапа деплоя прошли с известным self-deploy артефактом
(контейнер редеплоит сам себя через тот же процесс, что держит deploy-mcp API) — восстановлено
BlackCove через SSH-резерв, отдельный тикет заведён в Backlog.

## Версия 0.7.6 — `--seed` в `POST /api/deploy/app`, закрыт SSH-резерв для сидинга (2026-07-18)

Раньше сидинг после деплоя (`nx run <app>:db:seed`) не поддерживался `deploy-affected.sh`-обёрткой
в `deploy.ts` — единственный путь был сырой SSH: `./deploy-affected.sh --app auth-hub --seed`.
Каждый раз, когда агенту нужно было прогнать seed (например `auth-hub` после регистрации нового
OIDC-клиента), BlackCove падал на SSH-резерв в обход deploy-mcp.

**Фикс:** `POST /api/deploy/app` принимает третий необязательный флаг `seed?: boolean` (наравне со
`staging`), добавляет `--seed` в собираемую команду массивом (`[scriptPath, '--app', appName,
...(staging ? ['--staging'] : []), ...(seed ? ['--seed'] : [])]`) — тем же паттерном, что уже
используется для `--staging`, инъекция структурно невозможна. `libs/deploy-mcp/src/server.ts`
прокидывает `seed` в тело запроса `deploy_app`. Коммит `64e558fc`, задеплоено на s2.

**Само-деплой dashboard-agent на себя нашёл проблему заново:** контейнер, обновляющий сам себя,
успевает остановиться до того, как деплой-скрипт (который выполнялся в его же процессе) дойдёт до
запуска нового контейнера — новый контейнер оказывается в статусе `Created`, но не стартует сам.
BlackCove поднял его вручную (`docker start` + `docker rename` в канонiчное имя `dashboard-agent`).
Известный chicken-and-egg паттерн self-deploy — не пофикшено системно в этой сессии, только
руками разово; если повторится — см. эту запись.

## Версия 0.7.5 — чистка мёртвых ссылок на `premium-rosstil`/`imot` (2026-07-15)

Оба приложения удалены из монорепо 2026-07-05. `cron.ts` продолжал держать их в `APP_PORTS`/
`APP_HOSTS` и, что важнее, в `DEFAULT_CRON_JOBS` — 2 задачи (`imot-session-reminders`,
`imot-practice-diary-reminders`, старый "S1"-блок) реально пытались выполниться по HTTP против
несуществующего контейнера при каждом запуске планировщика. `server-config.ts` (`SERVER_APPS`) и
`database.ts` (`APP_CONFIG` для бэкапов БД) также вычищены.

`docker-compose.production.yml` монтировал несуществующие `apps/premium-rosstil/.env.docker` /
`apps/imot/.env.docker` — убрано (см. связанную запись в `apps/dashboard/PLAN_COMPLETED.md`, тот же
коммит `d7e8e49`).

## Версия 0.7.3 — run_e2e не переключался на deploy-пользователя, root-owned `.nx` ломал деплои (§18 Сессия №60, 2026-07-11)

Найдено BlackCove на живом staging-прогоне grandslamcup: в отличие от `deploy-affected.sh`
(гвард `DEPLOY_AS_ROOT` в самом начале, до любого касания `.nx`), `nxCommand` в `routes/e2e.ts`
запускался через `nsenter` без переключения с root на `deploy` — контейнер dashboard-agent
privileged, `nsenter -t 1` наследует root. Каждый `run_e2e` на s3 создавал root-owned
`.nx/workspace-data` и `apps/<app>-e2e/test-output`, которые потом ломали следующий
`deploy_app`/`run_e2e` (`EACCES` при сборке `zenstack-form-plugin`) — приходилось вручную
`chown -R deploy:deploy` после каждого прогона.

**Фикс:** та же guard-логика, что в `deploy-affected.sh`, встроена прямо в собираемую
shell-строку: `if [ "$(id -u)" = "0" ] && id deploy >/dev/null 2>&1; then exec sudo -u deploy -H
-- bash -c '<nx-команда>'; fi; <nx-команда>` — с фолбэком на прямой запуск, если пользователя
`deploy` нет (например, локальная отладка не от root). `0.7.2 → 0.7.3`.

## Версия 0.7.1 — e2e-раннер: nsenter вместо прямого spawn, закрыта command injection (§18 Сессия D, 2026-07-11)

Первый живой staging-пилот (grandslamcup, домен `grandslamcup-stage.s3.letar.best`) сразу вскрыл баг в `routes/e2e.ts` (реализован в предыдущей сессии, но ни разу не запускался вживую).

### `spawn nx ENOENT`

`POST /api/e2e/run` спавнил `nx` напрямую в процессе dashboard-agent — но внутри контейнера нет ни воркспейса, ни бинарника `nx` (они существуют только на хосте s3). Симметрично багу, который уже чинили в `deploy.ts` (Сессия C) — деплой уже использовал `nsenter -t 1 -m -u -n -i` для выхода в host-namespace, e2e.ts этот приём не переиспользовал.

**Фикс:** `spawn('nsenter', ['-t','1','-m','-u','-n','-i','--','bash','-c', 'cd <repo> && bunx nx e2e <app>-e2e ...'], { env })`. `env: { ...process.env, BASE_URL: baseUrl }` — nsenter наследует env спавна (тот же приём, что `SOPS_AGE_KEY_FILE` в deploy.ts).

### Command injection, найденная по пути

Переход на `bash -c` со строковой интерполяцией сделал параметр `project` из POST-body (ранее безобидный — шёл в `args` массивом для `spawn`) точкой command injection в **root-контекст хоста** (`nsenter -t 1` — полный выход из контейнера). Добавлена валидация `project` тем же regex, что у `app` (`^[a-z0-9-]+$`), до всякой интерполяции.

### Результат первого живого прогона

Инфраструктурно успешен (пайплайн `deploy_app(staging)` → `run_e2e` → `e2e_status` отработал end-to-end впервые). Содержательно 3/28 passed — не относится к dashboard-agent, см. `PLAN.md` §18 в корне репо и `apps/grandslamcup/PLAN.md`.

## Версия 0.6.0 — Deploy API для deploy-mcp (§18 Сессии B/C, 2026-07-10)

Слой, над которым построен `libs/deploy-mcp` (MCP-деплой вместо сырого SSH). Работа велась в связке с BlackCove (deploy agent).

### `POST /api/deploy/app` — переработан под структурированный статус

- **deployId** (`crypto.randomUUID`) + **ring-buffer истории** (последние 20 деплоев) вместо одного глобального `currentDeploy`; лог каждого деплоя капится (`MAX_OUTPUT_LINES=2000`, старые строки вытесняются с учётом `truncatedLines`).
- **Курсор логов** `sinceLine` в `GET /api/deploy/status` — возвращаются только строки после курсора + `totalLines`/`fromLine`, чтобы MCP-поллинг не тащил весь лог каждый раз. Новый `GET /api/deploy/history` (краткая история без логов).
- **staging** в body → `deploy-affected.sh --staging`. **spawn без shell**: аргументы массивом (`nsenter … deploy-affected.sh --app <app> [--staging]`), инъекция структурно невозможна.
- **Серверный guard** (defence in depth): `getCurrentServer()==='s3'` принимает только `staging:true`, `'s2'` — только production. Случайный прод-деплой на staging-раннер / staging-мусор на прод невозможен независимо от вызывающего.

### Два бага `/api/deploy/app`, вскрытые первым реальным вызовом через deploy-mcp

Эндпоинт **никогда не работал** для зашифрованных приложений (а это все) — при сыром SSH маскировалось ручным `export SOPS_AGE_KEY_FILE` у BlackCove:

1. **SOPS-проброс** (`4d970e7`): spawn не передавал `SOPS_AGE_KEY_FILE` → расшифровка `.env.docker.enc` падала. Фикс: `env: { ...process.env, SOPS_AGE_KEY_FILE: <host-путь> }`.
2. **sudo env-reset** (`1160e9e`, в `deploy-affected.sh`): при запуске через `nsenter` от root скрипт делает `exec sudo -u deploy` → sudo сбрасывает окружение → проброшенный токен-ключ теряется. Диагноз BlackCove. Фикс — дефолт `SOPS_AGE_KEY_FILE` в самом скрипте после sudo-блока (без `--preserve-env`, который рискует уронить sudo).

Подтверждено: `deploy_app({app:"time"})` через deploy-mcp → **exitCode 0**, deployId + sinceLine + self-re-exec + SOPS — всё на реальном прогоне.

### server-config.ts — s1 убран, s3 добавлен, guard-тест

- Тип `CronServer` → `'s2' | 's3'` (s1 выведен из эксплуатации 2026-06-20), fallback `getCurrentServer()` → s2.
- `server-config.ts` — **локальная копия** канона `@letar/infra-config` (Dockerfile.production изолирован от монорепо, прямой импорт сломал бы `bun install` в контейнере). Дрейф ловит **guard-тест** `server-config.guard.spec.ts` (сверяет `SERVER_APPS`/`getServerForApp` с каноном на `nx test`). Заведена vitest-инфраструктура (не было): `vitest.config.ts`, `tsconfig.spec.json`, `test`-таргет.
- `cron.ts` — удалены две мёртвые s1-задачи. `types.ts` — `ApiResponse<T = unknown>` (env.ts использовал без аргумента).

### docker-compose: консолидация + s3-инстанс

- **`docker-compose.s2.yml` удалён** — устаревший дубль (живой всегда был `production.yml`, подтверждено `docker inspect`; `driving-school-network` в нём вестигиальный — `driving-school-db` на `kami-network`).
- **`docker-compose.s3.yml`** — staging-инстанс: `SERVER_NAME=s3`, без прод-секретов `/secrets/*.env`, без `~/.ssh`. Токен — `AGENT_TOKEN: ${AGENT_TOKEN_S3:?…}` (отдельный s3-токен из общего `.env.docker.enc`, fail-safe против пустого). Публикация **`127.0.0.1:13103:3100`** (loopback) — host:3100 занят media-api, а loopback-bind разом чинит конфликт порта И закрывает агента от интернета.

**Файлы:** `src/routes/deploy.ts`, `src/lib/server-config.ts` (+ `.guard.spec.ts`), `src/lib/cron.ts`, `src/types.ts`, `vitest.config.ts`, `tsconfig.spec.json`, `project.json`, `docker-compose.s3.yml`, удалён `docker-compose.s2.yml`.

**Связанное (вне apps/dashboard-agent):** `libs/infra-config` (канон), `libs/deploy-mcp` (MCP-слой), `deploy-affected.sh` (харденинг + self-re-exec + SOPS-дефолт). Полная картина — корневой `PLAN.md` §18 Сессия №52.

## Версия 0.5.2

### Алерты в dashboard при провале cron-задач + email health-check dsperevod

`executeJob()` раньше только логировал провал задачи в in-memory `executionLogs` — никакого сигнала наружу не было. Теперь при не-2xx ответе или exception вызывается `POST /api/alerts` в dashboard (`CRON_FAILED`, заголовок `X-Cron-Secret`); ошибки самого уведомления не роняют выполнение задачи, только логируются.

Зарегистрировано приложение `dsperevod` в `APP_PORTS` (3019) / `APP_HOSTS` (`dsperevod-app`) + новая дефолтная задача `dsperevod-email-health-check` (`0 */6 * * *`, `server: 's2'`) — вызывает `dsperevod`'s `/api/cron/email-health-check` (`transporter.verify()` без реальной отправки письма).

**Файлы:**

- `src/lib/cron.ts` — `notifyDashboardAlert()`, вызов в обеих failure-ветках `executeJob()`, новые записи в `APP_PORTS`/`APP_HOSTS`/`DEFAULT_CRON_JOBS`

**Секреты:** `CRON_SECRET` сгенерирован (`openssl rand -base64 32`), прописан в `.env.docker.enc` — ранее не был настроен, `X-Cron-Secret` отправлялся с fallback-значением `'default-cron-secret'`.

## Версия 0.4.0

### Мониторинг cron задач

- Парсинг cron расписаний (cron-parser)
- Отслеживание выполнения задач
- Интеграция с node-cron

### Улучшения PostgreSQL

- Детальная статистика по базам
- Размер баз данных
- Количество подключений

---

## Версия 0.3.0

### PostgreSQL мониторинг

- Подключение к PostgreSQL через pg
- Сбор метрик: размер, подключения, активность
- Endpoint `/databases`

---

## Версия 0.2.0

### Docker мониторинг

- Интеграция с Docker через dockerode
- Список контейнеров со статусом
- Метрики CPU/Memory для контейнеров
- Endpoint `/containers`

### CORS

- Поддержка CORS для Dashboard UI
- @fastify/cors middleware

---

## Версия 0.1.0

### HTTP сервер

- Fastify 5 как основа
- Структурированные роуты
- JSON ответы

### Системные метрики

- systeminformation для сбора данных
- CPU: usage, cores, температура
- Memory: used, total, available
- Disk: used, total, filesystem

### API Endpoints

| Endpoint   | Описание            |
| ---------- | ------------------- |
| `/health`  | Health check        |
| `/metrics` | Все метрики системы |

---

## §18.7 Тираж M1 batch2 — фикс Docker-сборки после email-canary (2026-07-22, root-weaver)

**Проблема:** деплой падал на `bun install` — `@letar/email@^0.3.0` не резолвился (404), пакет
`private: true` и никогда не публиковался на npm (внутренняя SMTP-обвязка для Maddy, не должен
публиковаться). Найдены и починены 4 связанных бага, коммит `ac8d5fbf`:

1. **`package.json`** — `@letar/email` переведён с semver-диапазона (`^0.3.0`) на `workspace:*`
   — правильный протокол для внутренней монорепо-зависимости.
2. **`Dockerfile.production` builder-стейдж** — вместо изолированного `bun install` только по
   `apps/dashboard-agent/package.json` собирает синтетический мини-workspace (копирует
   `libs/email` + генерирует root `package.json` с `workspaces: ["apps/dashboard-agent",
"libs/email"]`) — резолвит `@letar/email` из монорепо, не с npm registry.
3. **`libs/email/package.json`** — добавлен `punycode` как explicit dependency. `provider.ts`
   импортирует `punycode/`, но пакет не был объявлен — маскировалось случайным хостингом в общем
   монорепо-`node_modules`, в изолированной Docker-сборке падало отдельной ошибкой.
4. **`bun build --external cpu-features`** — `ssh2` (транзитивно через `dockerode`→
   `docker-modem`) имеет опциональную нативную зависимость `cpu-features`, которую Alpine-билдер
   без `python3/make/g++` не может собрать; `bun build` пытался статически её заинлайнить. `ssh2`
   оборачивает `require('cpu-features')` в `try/catch` (см. `lib/protocol/constants.js`) —
   безопасно исключить из бандла.
5. **Копирование `dist`/`node_modules` в прод-стейдж** — bun-воркспейс кладёт относительные
   symlink'и прямых зависимостей (`../../../node_modules/…`) во вложенный
   `apps/dashboard-agent/node_modules`, рассчитанные под исходную глубину вложенности. Плоское
   копирование в один уровень их ломало (падало на рантайм-загрузке `pino-pretty` — динамический
   transport-worker pino, не инлайнится бандлом). Исправлено сохранением исходной вложенности
   (`outdir` → `apps/dashboard-agent/dist`, копирование обеих директорий как есть).

**Проверено полностью локально** — `docker build` + `docker run` + `curl /health` → `200
{"status":"ok",...}`. Подтверждено BlackCove живым деплоем на s2 (msg #691) — health-check
прошёл, cron поднялся.

**Побочная находка (в Backlog):** self-deploy dashboard-agent на себя рискует зависнуть на
recreate-шаге (deploy-mcp туннель живёт в том же контейнере, что деплоится) — не починено в этой
сессии, требует правки общего `deploy-affected.sh`.

---

**Последнее обновление:** 2026-07-22
