# Changelog

Все значимые изменения в Dashboard Agent документируются здесь.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [Unreleased]

### Planned

- Отправка метрик в Dashboard
- WebSocket для real-time

## [0.13.0] — 2026-08-08

Перенос той же пары дефектов и того же фикса из версии 0.12.0 (email-канарейка) в
`backup-freshness.ts` — проверку свежести бэкапов Maddy и acme-dns. Общая формула повтора
алерта вынесена в `lib/alert-policy.ts` (`shouldRepeatAlert`), используется обоими модулями.

### Fixed

- **Алерт о стухшем бэкапе отправлялся ровно один раз и замолкал навсегда.** Булев флаг
  `alerted` взводился при первом обнаружении и не сбрасывался, пока не появлялся свежий файл —
  даже если бэкап продолжал стареть дальше (или переставал приезжать вовсе много дней подряд).
  Заменён на счётчик `consecutiveFailures` + `alertedAtFailures`: уведомление повторяется при
  каждом удвоении числа подряд-неудачных прогонов (порог — 1, дальше 2, 4, 8… с учётом того, что
  проверка гоняется раз в 6 часов, а не раз в час, как email-канарейка).
- **Факт вызова `postDashboardAlert` не отличался от факта доставки.** Состояние писало
  «уже алертили», даже если dashboard отверг запрос или был недоступен. Теперь исход отправки
  пишется в `lastAlertDelivered`, и недоставленный алерт повторяется на следующем же прогоне.
- **Слияние состояния при первом прогоне после деплоя.** На диске лежит состояние старой формы
  (`{ alerted: boolean }`, без новых полей) — `loadJsonState` теперь мержится с дефолтом
  (`{ ...defaultFreshnessState(), ...loadJsonState(...) }`), а не подставляется как есть, иначе
  новые поля пришли бы `undefined` и логика повтора сравнивала бы с `NaN`.

## [0.12.0] — 2026-08-08

Починка email-канарейки по итогам разбора §62 `PLAN-INFRA.md`: она была красной 17 дней при
полностью исправной почте, и об этом никто не узнал.

### Fixed

- **External-нога искала письмо только в INBOX** и потому не была зелёной ни разу с рождения
  (1682 неудачи = все прогоны с 22.07). Gmail принимал все письма и клал их в спам: 1684 письма
  в папке «Спам», ноль во входящих. Теперь письмо ищется **во всех папках** ящика; найденное в
  спаме считается доставленным и отдельно помечается флагом `deliveredToSpam` + предупреждением
  в dashboard — доставка формально есть, но до человека письмо не дойдёт.
- **Получатель внешней ноги приходил скрытой копией** — отсутствие адреса в `To:`/`Cc:` при
  повторяющейся каждые 15 минут теме и было главным спам-признаком. Оба получателя переведены
  в `To:` одного письма.
- **Алерт отправлялся ровно один раз и замолкал навсегда.** Булев флаг `alerted` взводился при
  первом пересечении порога и сбрасывался только успехом, которого не было. Заменён на
  `alertedAtFailures` — уведомление повторяется при каждом удвоении числа неудач (3, 6, 12, 24…).
- **Факт отправки алерта не отличался от факта доставки.** `postDashboardAlert` глотал ошибку и
  возвращал `void`, поэтому состояние записывало «уже алертили» даже когда в БД dashboard не
  появлялось ни одной записи (проверено: за 22.07 и 02.08 записей нет вовсе). Теперь функция
  возвращает `boolean`, исход пишется в `lastAlertDelivered`, и недоставленный алерт повторяется
  на каждом прогоне.
- **`\Seen` не проставлялся ни разу за 17 дней** — 1695 писем, все непрочитанные. `messageFlagsAdd`
  вызывался внутри активного `for await (… client.fetch())`, за ним сразу шли `return` и
  `logout()`. Вынесен из цикла итерации, выполняется отдельным локом.

### Changed

- **Расписание — раз в час вместо каждых 15 минут.** 96 писем в сутки в оба ящика избыточны для
  проверки «ходит ли почта вообще», и сама по себе такая частота — спам-признак: одинаковые письма
  каждые 15 минут. Порог алерта снижен с 3 неудач до 2, поэтому время до уведомления выросло не
  вчетверо, а с 45 минут до 2 часов.
- Поиск письма переведён с клиентского перебора конвертов (`fetch({ seen: false })`) на серверный
  `SEARCH` по теме — размер ящика больше не влияет на проверку.
- Служебный ящик `canary@letar.best` **чистится за собой**: найденное письмо удаляется, заодно
  сносятся канареечные письма старше суток. Раньше ящик рос на 96 писем в день и не чистился
  ничем. Чужой (внешний) ящик не трогается — только пометка прочитанным.
- `CanaryLegState` расширен полями `alertedAtFailures`, `lastAlertAt`, `lastAlertDelivered`,
  `lastFolder`; булево `alerted` убрано. Состояние старой формы на диске подхватывается слиянием
  с дефолтом — без него новые поля были бы `undefined` и логика повторов молчала бы навсегда.

### Added

- `email-canary.spec.ts` — 10 тестов на логику повторного алерта и распознавание спам-папки
  (по IMAP special-use `\Junk`, независимо от языка имени папки).
- `dashboard-alert.spec.ts` — 3 теста на то, что доставка подтверждается только по 2xx.

## [0.11.1] — 2026-08-07

### Fixed

- **`nx typecheck` падал тремя ошибками** (`TS6305` + два каскадных `TS7006`) — существующий
  техдолг, воспроизводился на чистом HEAD. Причина одна: `references` в `tsconfig.json` вёл на
  solution-конфиг `libs/redis-client`, где `tsconfig.spec.json` стоит последним и потому побеждает
  при выборе цели редиректа — TypeScript перенаправлял исходник библиотеки в `out-tsc/spec/`,
  который не собирает ни один таргет. Провалившийся редирект делал модуль `any`, отсюда
  `TS7006` в `cron.ts`. Убраны `references` на библиотеки, а с ними `rootDir`/`outDir` (дают
  `TS6059` на исходниках либ); `declaration` оставлен — без него `@nx/esbuild` не резолвит entry
  point. Рантайм-код не тронут. Детали — `PLAN_COMPLETED.md`.

## [0.10.0] — 2026-08-07

### Added

- **Бэкап acme-dns** (`lib/acme-dns-backup.ts`, `routes/acme-dns.ts`, PLAN-INFRA.md §48) —
  `POST /api/acme-dns/backup`, `GET /api/acme-dns/backups`. Архивирует базу выданных
  поддоменов (`infra/acme-dns/data/`) и файл аккаунтов lego
  (`/home/deploy/lego/acme-dns-accounts.json`) в `backups/acme-dns/`, ротация 14 авто-бэкапов,
  архив `chmod 600` (содержит учётные данные). Оба источника **обязательны**: отсутствие
  любого — ошибка, а не повод сделать бэкап из того, что нашлось. От сервиса зависит
  продление всех сертификатов зоны `letar.best`, а файл аккаунтов невосстановим —
  регистрация в acme-dns закрыта, новый аккаунт потребовал бы правки боевой `CNAME`.
- Cron-задачи `acme-dns-backup-s2` (`30 3 * * *`) и `acme-dns-backup-freshness-check`
  (`15 */6 * * *`), обе на s2. Разнесены с существующими бэкапами по минутам, чтобы не
  толкаться с `nginx-backup-s2` и `s2-database-backup`.
- `POST /api/cron/acme-dns-backup-freshness-check` — проверка свежести бэкапа acme-dns.
- Монтирование `/home/deploy/lego:ro` в контейнер агента (файл аккаунтов лежит вне workspace).
- Тесты `lib/backup-freshness.spec.ts` (14 кейсов) — выбор самого свежего файла, порог
  устаревания, дебаунс алерта, изоляция целей друг от друга. Раньше модуль тестов не имел.

### Changed

- `lib/backup-freshness.ts` обобщён с одной жёстко зашитой цели (Maddy) на список целей
  (`FreshnessTarget`): каталог, паттерн имени, порог, файл состояния и текст подсказки стали
  параметрами. Поведение проверки Maddy не изменилось — те же env-переменные, тот же путь
  состояния, тот же роут `/api/cron/backup-freshness-check`. Переменные окружения теперь
  читаются при вызове, а не при импорте модуля.

## [0.9.15] — 2026-07-30

### Added

- Cron-задача `studio-check-long-timers` (`*/15 * * * *`, s2) — дёргает
  `/api/cron/check-long-timers` studio: Web Push владельцу «таймер идёт дольше 2 часов»
  (studio Фаза 11 §11.7, блок H; анти-дубль на стороне studio через
  `TimeEntry.longTimerNotifiedAt`, поэтому частота опроса влияет только на задержку
  первого уведомления).

## [0.9.14] — 2026-07-30

### Added

- Структурированный прогресс деплоя (PLAN-INFRA.md §38, Этапы 1–3) — вместо исключительно
  прозы в логе:
  - `DeployStatus.phases[]` — парсится из `::phase:name:start/ok/fail` маркеров, которые
    теперь печатает `deploy-affected.sh` (build/rollout/wait-healthy/nginx-reload), и из уже
    существующих `[step-id]` строк `libs/deploy-engine` (zero-downtime rollout: doctor,
    wait-healthy, smoke-test, nginx-reload-1/2 и т.д.) — обе формы разбирает одна функция
    `applyPhaseLine` (`src/routes/deploy.ts`).
  - `GET /api/deploy/wait?deployId=&waitSeconds=` — long-poll вместо ручного опроса по
    таймеру: держит запрос открытым, отпускает раньше `waitSeconds` (капается сервером на
    120с) при терминальном статусе, смене фазы или смене признака залипания. Возвращает
    хвост лога (20 строк), не полный курсорный лог.
  - `stalled`/`stalledSince` в `/api/deploy/status` и `/api/deploy/wait` — watchdog залипания
    по порогу молчания, специфичному для текущей фазы (`build` легитимно молчит минутами,
    `nginx-reload` — секунды). Только диагностика, не убивает процесс.
  - `libs/deploy-mcp`: новый MCP-инструмент `deploy_wait`, зеркалит `deploy_status`
    (`deploy_status` не изменён).
  - Этап 4 (очередь деплоев на сервере) сознательно не реализован — опционален и рискованнее,
    вне скоупа этой сессии.

## [0.9.13] — 2026-07-30

### Added

- `src/lib/metrics-exporter.ts` + `src/routes/metrics.ts` (`GET /metrics`) — Prometheus
  exporter: CPU/память/диск(per-mount)/сеть(per-iface)/контейнеры(per-name) в текстовом
  формате Prometheus exposition, тонкая обёртка над `system.ts`/`docker.ts` без дублирования
  сбора метрик. Закрывает backlog «Интеграции» (Prometheus exporter) и заодно «Grafana
  datasource» — Grafana читает этот же формат через встроенный Prometheus datasource, Telegraf
  тоже умеет скрейпить его напрямую (`inputs.prometheus`), отдельные реализации под них не
  потребовались. Авторизация — существующий Bearer `AGENT_TOKEN`, без исключений в
  `authMiddleware` (Prometheus поддерживает bearer token в scrape-конфиге).

## [0.9.12] — 2026-07-30

### Added

- `src/lib/log-scan.ts` + `src/routes/log-scan.ts` (`POST /api/cron/log-scan`) — проактивное
  сканирование хвоста логов запущенных контейнеров на строки с ошибками
  (error/exception/fatal/panic/ECONNREFUSED/EACCES/ENOTFOUND/OOM, паттерн настраивается
  `LOG_SCAN_ERROR_PATTERN`) и алерт `CRON_FAILED` при находке — закрывает пробел из backlog
  «Мониторинг логов контейнеров»: pull-доступ к логам уже был
  (`GET /api/docker/containers/:id/logs`), автоматического обнаружения новых ошибок не было.
  Курсор "последняя обработанная строка" на контейнер (ISO timestamp) персистится в
  `/home/deploy/letar/log-scan-state.json` — событийная (edge-triggered) семантика, не
  boolean-дебаунс `health-check.ts`, чтобы не пропускать повторные независимые всплески ошибок.
  Первая встреча контейнера не алертит накопленную историю логов — курсор инициализируется на
  момент первого прогона. Cron-задача `log-scan` добавлена в `DEFAULT_CRON_JOBS`
  (`*/10 * * * *`, s2).

## [0.9.11] — 2026-07-30

### Changed

- `src/lib/server-config.ts`: `SERVER_APPS`/`APP_PORTS`/`APP_HOSTS` слиты в один
  `APP_REGISTRY` (сервер + опциональные порт/host на приложение) вместо трёх параллельных
  `Record`'ов в двух файлах — закрывает backlog «Регистрация нового приложения разбросана по
  3 местам» (частично: `app-registry.ts` стал тонким реэкспортом производных
  `APP_PORTS`/`APP_HOSTS` + `getAppUrl`, канон `@letar/infra-config` по-прежнему хранит их
  раздельно — межпроектная унификация вне scope этой сессии). Guard-тесты
  (`server-config.guard.spec.ts`, `app-registry.guard.spec.ts`) прошли без изменений —
  производные экспорты дают идентичные значения.

### Added

- `src/lib/history.ts`: история сетевого трафика (`networkRx`/`networkTx`, байт/сек) в
  ring-буфере метрик наравне с cpu/memory/disk — `getNetworkInfo()` уже отдавал live-снимок,
  но без исторического ряда. Закрывает backlog «Мониторинг сетевого трафика» на уровне
  сбора/API (`GET /api/system/history` теперь включает `networkRx`/`networkTx` в `stats` и
  `data`); отображение в UI `dashboard` — отдельная задача (не в scope: `apps/dashboard`
  вне файловой резервации этой сессии).

### Note

- Backlog-пункт «Мониторинг логов контейнеров» — при ревизии оказался частично закрыт
  раньше: `GET /api/docker/containers/:id/logs` (`lib/docker.ts:getContainerLogs`) уже
  существовал как pull-based доступ к логам. Реального пробела — только в
  проактивном сканировании логов на ошибки с алертингом (по аналогии с
  `lib/health-check.ts`) — такого пока нет, оставлено в PLAN.md как отдельный, более узкий
  backlog-пункт вместо общего "мониторинг логов".

## [0.9.10] — 2026-07-30

### Fixed

- `deploy-affected.sh`: живой прогон 0.9.9 упал сразу — голый `systemd-run` без `sudo`
  требует polkit-авторизацию (`Interactive authentication required`), непривилегированный
  `deploy` не может стартовать unit в `system.slice` напрямую. Хуже того, вызов стоял в
  `then`-блоке `if`, поэтому его ненулевой exit-код под `set -e` убивал весь
  `deploy-affected.sh`, ни разу не дойдя до fallback (диагностировал BlackCove, message
  #875, проверил вручную: `sudo -n systemd-run` работает на s2, голый — нет). Исправлено:
  вызов перенесён в условие `if` (не убивает скрипт при падении) + добавлен `sudo -n`.
  **Подтверждено живым прогоном** (BlackCove, message #879) — self-deploy `dashboard-agent`
  прошёл полностью автоматически, закрывает backlog «Self-deploy обрывает сам себя»
  (`PLAN.md`).

## [0.9.9] — 2026-07-30

### Fixed

- `deploy-affected.sh`: живой прогон 0.9.8 показал, что предыдущий фикс self-deploy
  (nohup+setsid) не сработал — BlackCove диагностировал (message #870), что `setsid`
  отвязывает процесс только от сессии/терминала, но не от **cgroup**: при `docker stop`/
  `docker rm` собственного контейнера все процессы в его cgroup убиваются независимо от
  сессии. Detached restart-скрипт обрывался ровно на "Recreate", не успев стартовать.
  Заменено на `systemd-run --unit=... --collect` — транзиентный systemd-юнит выполняется
  в `system.slice`, полностью отдельной от cgroup докера, с fallback на прежний
  nohup+setsid, если `systemd-run` недоступен на хосте (с явным предупреждением, что
  fallback не решает self-deploy). Не проверено живым деплоем — следующий self-deploy
  `dashboard-agent` станет проверкой.

## [0.9.8] — 2026-07-30

### Fixed

- `deploy-affected.sh` (корневой скрипт, не код приложения): self-deploy
  `dashboard-agent` обобщён из уже существовавшего для `dashboard` паттерна
  detached-рестарта (nohup+setsid) — раньше `dashboard-agent` попадал в обычную ветку
  `docker compose ... up -d --force-recreate app`, которая пересоздавала контейнер
  синхронно; поскольку сам процесс деплоя запускается через nsenter внутри этого же
  контейнера, `force-recreate` обрывал деплой на середине, новый контейнер застревал
  в статусе `Created` (backlog «Self-deploy обрывает сам себя», найдено BlackCove
  2026-07-22, повторно проявилось при деплое 0.9.7 2026-07-29). Заодно исправлено имя
  контейнера в цикле ожидания healthcheck перед reload nginx — `dashboard-agent` (без
  суффикса `-app`, в отличие от остальных приложений).

## [0.9.7] — 2026-07-30

### Changed

- `lib/history.ts`: `getHistory()` при downsampling (>500 точек в ответе) теперь усредняет
  значения внутри временных бакетов вместо взятия каждой N-й точки. Раньше кратковременные
  скачки CPU/памяти/диска между выбранными точками пропадали из графика при запросе истории
  за 7d/30d; закрывает пункт бэклога «Агрегация за интервалы» (`PLAN.md`).

## [0.9.6] — 2026-07-30

### Docs

- **Оценка унификации дебаунс-паттерна алертов** (`lib/email-canary.ts` vs
  `lib/backup-freshness.ts` vs `lib/health-check.ts`) — по запросу проверена возможность
  вынести общий generic-хелпер `runDebouncedCheck<TState>` поверх `loadJsonState`/`saveJsonState`.
  Вывод: нет — три реализации различаются не деталями, а типом триггера: email-canary — счётчик
  `consecutiveFailures` с порогом `ALERT_THRESHOLD` на две независимые ноги; backup-freshness —
  один плоский `alerted`, level-triggered; health-check — level-triggered `Record<string, boolean>`
  для порогов CPU/память/диск/БД, но ОТДЕЛЬНО edge-triggered переход состояния контейнеров
  (`Record<string, string>` с предыдущим значением, не просто boolean, плюс `restarting` вообще
  не дебаунсится). Единый хелпер либо не покрыл бы edge-triggered случай, либо превратился в
  конфигурационный комбайн сложнее прямого кода. Решение и критерий пересмотра — расширенный
  комментарий в `lib/json-state-file.ts`. Код логики не менялся.

## [0.9.5] — 2026-07-30

### Docs

- **Оценка унификации Redis-backed history (`routes/deploy.ts` vs `lib/cron.ts`)** — по запросу
  проверена, достаточно ли похожи два места с паттерном «ring-buffer в памяти → best-effort
  персист в Redis → rehydrate при старте → пометка running-записей как interrupted/error», чтобы
  оправдать общий `createRedisBackedHistory<T>` уже на двух потребителях. Вывод: нет — формы
  хранения расходятся по существу (плоский глобальный ring-buffer с индексом-LIST и одним ключом
  на элемент в deploy.ts, vs N независимых per-job ring-buffer с индексом-SET и одним ключом на
  группу в cron.ts), плюс разная стратегия персиста (дебаунс vs немедленно). Решение и критерий
  возврата к вопросу — комментарий в `lib/redis.ts`. Код не менялся.

## [0.9.4] — 2026-07-30

### Added

- **`@fastify/rate-limit`** — глобальный лимит `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`
  (по умолчанию 600 запросов/мин на IP) поверх `AGENT_TOKEN`, закрывает Backlog
  «Безопасность → Rate limiting». `127.0.0.1`/`::1` в `allowList` — не режет собственные
  cron-вызовы агента на себя же (`app: 'dashboard-agent'` в `cron.ts`).
- **`lib/ip-whitelist.ts`** — опциональный whitelist `ALLOWED_IPS` (точные IP или IPv4 CIDR
  через запятую), preHandler до `authMiddleware`. Не задан — проверка выключена, поведение
  не меняется. Закрывает Backlog «Безопасность → Whitelist IP адресов».
- **Redis-персистентность логов cron-задач** (`lib/cron.ts`) — `executionLogs` теперь
  персистится в Redis (`dashboard-agent:cron:logs:<jobId>`, TTL 30 дней) по тому же паттерну,
  что `deployHistory` в `routes/deploy.ts` (0.8.3): `rehydrateExecutionLogsFromRedis()` при
  старте восстанавливает историю, записи в статусе `running` при рестарте помечаются `error`.
  Закрывает половину Backlog «Логи cron-задач в памяти, `CronExecutionLog` в БД dashboard —
  мёртвая модель» — выбран путь «переживает рестарт через Redis в самом dashboard-agent»
  вместо записи в БД `dashboard` (та архитектура и так pull-based — `dashboard` не хранит
  копий метрик/логов агента, только на лету запрашивает через `RemoteServerClient`).
  Модель `CronExecutionLog` в схеме `dashboard` при этом остаётся неиспользуемой — решение
  об её удалении миграцией вне scope dashboard-agent (см. PLAN.md Backlog).

## [0.9.3] — 2026-07-30

### Refactor: синхронизация `app-registry.ts` `APP_PORTS` с каноном `@letar/infra-config`

Значения портов в локальной копии `APP_PORTS` (обязательна — `Dockerfile.production` изолирован от `libs/`) теперь сверяются с каноном `@letar/infra-config` guard-тестом `app-registry.guard.spec.ts`, по тому же паттерну, что уже применялся к `SERVER_APPS`/`server-config.guard.spec.ts`. Набор приложений в локальной копии не менялся — только источник истины для номеров портов.

## [0.9.2] — 2026-07-30

### Added

- **`lib/health-check.ts` + `routes/health-check.ts`** — `POST /api/cron/health-check`
  (крон каждые 5 мин, s2), закрывает Backlog «Алерты при превышении порогов» (P2):
  проверяет CPU/память/диск против порогов (`HEALTH_CPU_THRESHOLD`/`HEALTH_MEMORY_THRESHOLD`/
  `HEALTH_DISK_THRESHOLD`, по умолчанию 90%), состояние Docker-контейнеров (переход
  running→exited/dead и состояние `restarting` как индикатор crash-loop) и доступность БД
  (контейнер запущен, но подключение не проходит). Алертит через существующий
  `postDashboardAlert()` типами `CPU_HIGH`/`MEMORY_HIGH`/`DISK_HIGH`/`CONTAINER_DOWN`/
  `CONTAINER_RESTARTED`/`DATABASE_DOWN` — эти типы существовали в `DashboardAlertType` и схеме
  `dashboard` с самого начала, но ни разу не вызывались. Дебаунс (один алерт на непрерывный
  эпизод) через `json-state-file.ts`, тот же паттерн, что `email-canary.ts`/
  `backup-freshness.ts`.

## [0.9.1] — 2026-07-29

### Added

- Крон-задача `studio-check-budget-alerts` (каждые 30 мин, s2) — алерты 75/90/100% по потолку
  часов почасовых проектов studio (Фаза 11 блок D).

## [0.9.0] — 2026-07-28

### Added

- **Таймаут на `POST /api/e2e/run`** (15 мин, SIGTERM → SIGKILL через 10с) — часть hard
  e2e-gate для archetest/dsperevod/svoichuzhie/aboi/aprel8008 (PLAN-INFRA.md §18.7). Без
  таймаута зависший Playwright-прогон никогда не писал `.last-e2e-status/<app>.json`, и
  hard-gate в `deploy-mcp` продолжал бы читать старый (возможно зелёный) статус. По срабатыванию
  таймаута, а также при ошибке самого процесса (`spawn`/`error`), статус явно пишется как
  `passed:false` — раньше при ошибке процесса `lastStatus` не писался вообще.

## [0.8.9] — 2026-07-28

### Changed

- **`APP_CONFIG` в `src/lib/database.ts` — убрано дублирование `host`/`containerName`**
  (Backlog, найдено ранее MagentaGlen как категория риска после инцидента studio 2026-07-04):
  `host` больше не отдельное поле в `defaults`, а всегда выводится из `containerName`
  (`getAppDbConfig()` → `host: config.containerName`). Опечатка при добавлении нового
  приложения (как у aboi/aprel8008 в 0.8.7) больше не может рассинхронить два поля одного
  объекта.
- **Общий `lib/json-state-file.ts`** — `loadJsonState`/`saveJsonState` вынесены из
  задублированного паттерна «читать/писать небольшой JSON-файл состояния, try/catch на
  каждую операцию», который был отдельно в `email-canary.ts` и новом `backup-freshness.ts`
  (0.8.8). Сам дебаунс-паттерн (пороги, `consecutiveFailures` у двух ног email-canary
  против плоского `alerted` у backup-freshness) не унифицирован — разная семантика, только
  низкоуровневое чтение/запись файла было идентично.

## [0.8.8] — 2026-07-28

### Added

- **`maddy-backup-freshness-check`** — новая cron-задача (раз в 6 часов, `s2`): проверяет,
  что самый свежий `maddy_*.tar.gz` в `/home/deploy/letar/backups/maddy` не старше 30 часов.
  Алертит через существующий `BACKUP_FAILED` (дебаунс — один алерт на непрерывный эпизод,
  тот же паттерн, что `email-canary.ts`). Закрывает урок инцидента 2026-07-28 (Этап 0.3
  корневого `PLAN.md`): бэкапы Maddy не шли 26 дней незамеченно, потому что ничего не
  проверяло факт их появления — `email-canary` проверяет доставку писем, не целостность
  самого бэкап-пайплайна. `POST /api/cron/backup-freshness-check`.

## [0.8.7] — 2026-07-28

### Fixed

- **Аудит охвата бэкапов БД (корневой `PLAN.md`, Этап 0.3) нашёл пробел: `aboi` и `aprel8008`
  вообще не бэкапились** — оба развёрнуты на s2 (`SERVER_APPS`), у обоих есть Postgres-БД,
  но `APP_CONFIG` в `src/lib/database.ts` их не перечислял, а `docker-compose.production.yml`
  не монтировал их `.env.docker` в `/secrets/`. Добавлены оба приложения (контейнеры `aboi-db`
  /`aprel8008-db`, БД `neyroaboi_prod`/`aprel8008`) — не только в аудит, но и в реальный
  ежедневный `pg_dump`-бэкап на `/home/deploy/letar/backups`.
  ⚠️ aboi — флагман 152-ФЗ-комплаенса, его БД не бэкапилась ни разу с момента, когда
  реестр `APP_CONFIG` был заведён — гэп не датирован точно, обнаружен только сейчас.
- **Дрейф `SERVER_APPS`: канон `@letar/infra-config` не содержал `studio`** (был только
  в локальной копии `src/lib/server-config.ts`) — `server-config.guard.spec.ts` падал
  красным на `main` до этого коммита. Добавлен `studio` в канон, тест снова зелёный.

## [0.8.5] — 2026-07-22

### Added: grep-фильтр в `POST /api/e2e/run`

Точечный e2e-прогон (проверить фикс одной страницы) гонял весь набор (~120 тестов),
потому что фильтровать было нечем. Добавлен опциональный `grep` в тело запроса,
пробрасывается в `playwright test --grep`. Валидация — deny-лист shell-небезопасных
символов (значение интерполируется в shell-строку на s3 через `nsenter`).

## [0.8.4] — 2026-07-22

### Refactor: Redis-клиент вынесен в @letar/redis-client

`lib/redis.ts` дублировал один и тот же паттерн graceful-degradation, что и
`animatrona-tracker`/`svoichuzhie`. Вынесено в общую библиотеку `libs/redis-client`
(`@letar/redis-client`) — `lib/redis.ts` теперь тонкая обёртка (`createRedisClient()`).
Поведение не изменилось. Проверено изолированной Docker-сборкой (та же схема, что ловит
"Module not found" на транзитивных `@letar/*`-импортах).

## [0.8.3] — 2026-07-22

### Feat: персистентность deploy-истории в Redis

`routes/deploy.ts` хранил `deployHistory` (ring-buffer до 20 деплоев + активный лог) только в
памяти процесса — рестарт/пересоздание контейнера `dashboard-agent` безвозвратно терял историю и
лог активного деплоя (найдено BlackCove 2026-07-22 на инциденте с email-canary, PLAN.md backlog).

- Новый `lib/redis.ts` — клиент `ioredis` с graceful degradation (тот же паттерн, что и
  `apps/animatrona-tracker/src/lib/redis.ts`): без `REDIS_URL` или при недоступности Redis
  деплой продолжает работать чисто в памяти, как раньше, без ошибок.
- `deploy.ts`: каждый деплой персистится в Redis (`dashboard-agent:deploy:item:<id>`, TTL 7 дней) +
  индекс порядка (`dashboard-agent:deploy:index`, список deployId). Лог пишется дебаунсом (не чаще
  раза в секунду на деплой — `appendOutput` может звать построчно на каждый chunk stdout/stderr),
  финальный статус — немедленно (`flushPersist`) на каждом пути завершения (`pull`, `restart`,
  `compose-up`, `deploy-app` close/error, `cancel`).
- При старте процесса `rehydrateFromRedis()` восстанавливает `deployHistory`. Записи, застигнутые
  в `running: true` (агент перезапустился посреди деплоя), помечаются `interrupted: true` —
  реальный исход после рестарта dashboard-agent не отслеживается.
- Redis (`letar-redis`, `infra/redis`) уже развёрнут на s2 и используется другими приложениями
  (`animatrona-tracker`, `auth-hub`, `kami`, `driving-school`, `svoichuzhie`) — переиспользован тот
  же инстанс на `kami-network`, новая инфраструктура не поднималась.
  `docker-compose.production.yml`: `REDIS_URL: ${REDIS_URL:-redis://letar-redis:6379}`. На s3
  (staging) Redis не развёрнут — `REDIS_URL` там намеренно не задан, агент работает в чистом
  in-memory режиме без лишних error-логов о недоступном Redis.

### Docs: устойчивость nsenter-процесса к рестарту контейнера — прояснено

Backlog PLAN.md ставил вопрос: переживает ли `deploy-affected.sh`, запущенный через `nsenter`
(`lib/host-exec.ts`), обрыв родительского процесса dashboard-agent. Разбор флагов: `nsenter -t 1 -m
-u -n -i` НЕ включает `-p` (pid namespace) — не нужен, т.к. контейнер уже поднят с `pid: host` в
compose, поэтому спавненный процесс и так живёт в host PID namespace. Но **cgroup при этом не
меняется** — процесс остаётся в cgroup контейнера `dashboard-agent`, если явно не выполнен cgroup
escape (не делается). При `docker compose up -d` recreate Docker останавливает контейнер через
kill всей его cgroup — уносит с собой и nsenter-порождённый `deploy-affected.sh`, если тот ещё жив.
Это тот же механизм, что и в другом backlog-пункте («self-deploy обрывает сам себя на
recreate-шаге») — оба вытекают из общего factа: nsenter здесь даёт только namespace-изоляцию
(mount/uts/net/ipc), не cgroup-независимость. Полноценный fix (cgroup escape, например через
`systemd-run --scope` на хосте) не сделан в этой сессии — рискованное изменение общего
`deploy-affected.sh`, отдельная задача.

## [0.8.2] — 2026-07-22

### Fix: бесконечная рекурсия `loadAllCronJobs ↔ saveCronConfig` при отсутствующем конфиге

Обнаружено случайно в локальном dev-окружении (43k+ строк лога за секунды) — `loadAllCronJobs()`
при отсутствующем `cron-jobs.json` звала `saveCronConfig()`, которая сама звала `loadAllCronJobs()`
для мержа с другими серверами → взаимная рекурсия до `RangeError: Maximum call stack size
exceeded` (перехватывалась try/catch, не роняла процесс, но впустую жгла CPU и не давала файлу
реально создаться). В проде не стреляло, т.к. `/home/deploy/letar/` смонтирован и файл обычно уже
существует — но при сбое volume/прав это заблокировало бы даже `/health`. Фикс: разорвал рекурсию
через общий низкоуровневый примитив `readCronJobsFile()`/`writeCronJobsFile()`, ни одна из функций
больше не вызывает другую.

### Refactor: устранено дублирование алертинга и SMTP-отправки

- `lib/cron.ts`'s `notifyDashboardAlert` и `lib/email-canary.ts`'s `notifyCanaryAlert` дублировали
  один и тот же POST `/api/alerts` в dashboard — вынесены в общий `lib/dashboard-alert.ts`
  (`postDashboardAlert`). `APP_PORTS`/`APP_HOSTS`/`getAppUrl` вынесены в новый `lib/app-registry.ts`
  (нужны обоим модулям, избегает циклической зависимости).
- `email-canary.ts` дублировал часть SMTP-транспорта из `@letar/email` — переключён на
  `createEmailProvider()`. Библиотека `@letar/email` получила поддержку `bcc` в `SendEmailParams`
  (`0.2.0 → 0.3.0`, обратно совместимо) — понадобилось для canary's internal+external проверки
  одним письмом. Первый non-Next.js consumer `libs/*` в приложении на `@nx/esbuild` — проверено
  живым билдом и смоук-тестом, кросс-lib импорт резолвится корректно.

Прямая зависимость `nodemailer`/`@types/nodemailer` убрана из `dashboard-agent` — используется
только транзитивно через `@letar/email`.

## [0.8.1] — 2026-07-22

### Fix: краш процесса на зависшем IMAP-сокете email-canary (прод-инцидент, найден BlackCove)

После деплоя 0.8.0 необработанный `'error'` event на `ImapFlow` (`Socket timeout`) ронял весь процесс `dashboard-agent` — вместе с cron-планировщиком остальных задач и deploy-mcp API, попутно оборвав в проде деплой другого приложения. Два слоя фикса в `lib/email-canary.ts`: (1) `client.on('error', ...)` перехватывает событие вместо падения процесса, но если ошибка приходит вместо reject-а уже начатого `await`, тот `await` может повиснуть навсегда; (2) `waitForCanaryMessage()` обёрнут внешним `Promise.race` с жёстким дедлайном (`POLL_TIMEOUT_MS + 15s`) + `client.close()` по истечении — гарантирует ответ за конечное время независимо от внутреннего поведения ImapFlow. Плюс `acquireTimeout` на `getMailboxLock()`. Проверено вживую на реально зависшем IMAP-сокете (внешняя сетевая проблема до порта 993) — вместо зависания получен `ok:false` с причиной за ~105с, процесс не падает.

## [0.8.0] — 2026-07-22

### Feat: канареечный мониторинг доставки email (PLAN.md Этап 0.7)

Новый `lib/email-canary.ts` + роуты `POST /api/cron/email-canary-check` / `GET /api/cron/email-canary-check/status`. Раз в 15 минут (`email-canary-check`, s2) отправляет тестовое письмо через SMTP выделенного ящика `canary@letar.best` (Maddy) и проверяет round-trip двумя независимыми ногами: **internal** (письмо появляется во входящих того же ящика по IMAP — жив ли сам Maddy) и **external** (то же письмо доставляется BCC на реальный внешний ящик, напр. Gmail — ловит класс инцидентов «форвард режется gmail», первопричину Этапа 0). Обе ноги опциональны — если соответствующие `EMAIL_CANARY_*` не заданы, нога просто не проверяется, ошибкой не считается. Состояние (счётчик подряд-неудач, история последних 30 прогонов с latency) персистится в `/home/deploy/letar/email-canary-state.json`. При 3 подряд неудачах одной ноги — алерт в dashboard (`POST /api/alerts`, переиспользован тип `CRON_FAILED`, отдельный `AlertType`/миграция схемы признаны непропорциональными ради этой задачи); при первом успехе после провалов счётчик и флаг алерта сбрасываются. Новые зависимости: `imapflow`, `nodemailer`. **Требует провижининга** — ящик `canary@letar.best` на Maddy (`maddy creds create`) и, для external-ноги, внешний почтовый ящик с IMAP-доступом — оба вне скоупа кода, см. PLAN.md Этап 0.7.

## [0.7.5] — 2026-07-15

### Chore: удалены мёртвые ссылки на `premium-rosstil`/`imot`

`APP_PORTS`/`APP_HOSTS` в `cron.ts`, `SERVER_APPS` в `server-config.ts` и `APP_CONFIG` в `database.ts` больше не содержат записи для приложений, удалённых из монорепо 2026-07-05. Удалены две мёртвые cron-задачи (`imot-session-reminders`, `imot-practice-diary-reminders`), которые пытались выполниться против несуществующего контейнера. `docker-compose.production.yml` больше не монтирует несуществующие `apps/premium-rosstil/.env.docker` / `apps/imot/.env.docker`.

## [0.7.0] — 2026-07-10

### Feat: e2e API-роут (PLAN.md §18 Сессия D)

`POST /api/e2e/run` — запускает `nx e2e <app>-e2e` против staging-контейнера (`E2E_BASE_URL=<app>.s3.letar.best`), только на s3 (staging-раннер). Асинхронно, как `/api/deploy/app`: возвращает `runId`, прогресс через `GET /api/e2e/status` (ring-buffer + курсор `sinceLine`, тот же паттерн, что деплой). По завершении пишет персистентный `.last-e2e-status/<app>.json` (`{ commitSha, passed, timestamp, durationMs }`) — читается warn-gate'ом `deploy-mcp` перед production-деплоем.

## [0.5.2] — 2026-07-05

### Feat: алерты в dashboard при провале cron-задач + email health-check dsperevod

`executeJob()` теперь при провале задачи (не-2xx ответ или exception) вызывает `POST /api/alerts` в dashboard (`CRON_FAILED`, `X-Cron-Secret`) — раньше провал только логировался локально in-memory, никакого сигнала наружу не было. Добавлена задача `dsperevod-email-health-check` (`0 */6 * * *`, s2) — проверка SMTP-транспорта dsperevod через `transporter.verify()`. Зарегистрирован `dsperevod` в `APP_PORTS`/`APP_HOSTS` (порт 3019, хост `dsperevod-app`).

## [0.5.0] - 2026-04-04

### Added

- Бэкапы 6 недостающих production БД

## [0.4.0] - 2026-01-XX

### Added

- Мониторинг cron задач
- Улучшенный сбор метрик PostgreSQL

### Changed

- Обновлён Fastify до v5
- Оптимизирован сбор метрик Docker

## [0.3.0] - 2026-01-XX

### Added

- Мониторинг PostgreSQL баз данных
- Endpoint `/databases`

## [0.2.0] - 2026-01-XX

### Added

- Мониторинг Docker контейнеров
- Endpoint `/containers`
- CORS поддержка

## [0.1.0] - 2026-01-XX

### Added

- Fastify HTTP сервер
- Сбор системных метрик (CPU, RAM, Disk)
- REST API (`/health`, `/metrics`)
- Базовая структура проекта
