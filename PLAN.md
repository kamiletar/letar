# PLAN — Глобальная унификация авторизации и верификации в монорепо

> **✅ Тираж hub-client на aprel8008 (2026-07-16):** админка для владелицы (управление фото баз) +
> вход через Ключницу, `createAuth({ mode: 'hub-client' })`. Роль ADMIN — простой whitelist по
> email через `databaseHooks.user.create.after` (не `createAuthGuards`/`requireRole` из
> `@letar/auth` — та фабрика типизирована под единичное поле `role: string`, а во всех hub-client
> приложениях монорепо реально используется `roles: string[]`; аpel8008 повторил тот же
> ручной `hasRole`/`isAdmin`/`requireAuth`/`requireAdmin`-паттерн, что уже в kami и auth-hub —
> см. находки в конце сессии). Клиент `aprel8008-prod` зарегистрирован в
> `apps/auth-hub/prisma/seed.ts`. **Попутно найден и починен баг `deploy-affected.sh`:** шаг
> `db:seed` (флаг `--seed`) резолвил `DATABASE_URL` с docker-internal хостнеймом вместо
> `localhost:<port>` — падал с `getaddrinfo ESERVFAIL` на любом приложении, где сеялись клиенты
> после первого деплоя auth-hub с этим флагом (commit `bcd3f01`). Проверено на проде: BlackCove
> повторил только seed-шаг без полного редеплоя, все 8 OIDC-клиентов Ключницы пересозданы.
>
> **✅ Этап 8.5 — вход по любому linked-email СДЕЛАН (2026-07-16, auth-hub v0.6.4):** без
> перехвата core-резолва Better Auth — оказалось, что email+password и magic-link входы в
> Ключнице идут только через её собственные server actions (`loginUser`, `sendMagicLinkAction`),
> downstream-приложения попадают на них через OIDC-редирект на hub UI. `resolveLoginEmail()`
> резолвит подтверждённый `UserEmail` → основной `User.email` ДО вызова Better Auth; core
> auth-flow не тронут, риск для ~10 downstream снят конструктивно. Совпадение с чьим-то
> основным адресом приоритетнее linked-записи; неподтверждённые привязки не резолвятся.
> **Попутно найдены и закрыты 2 бага:** (1) вход по linked-адресу + пароль уводил `loginUser`
> в auto-sign-up и молча создавал дубль-аккаунт (уникальность `UserEmail.email` не пересекается
> с `User.email`); magic link с `disableSignUp: false` — та же дыра; (2) `verifyAddedEmail` не
> перепроверял занятость адреса на момент подтверждения (токен живёт 24ч — за это время адрес
> мог стать чьим-то основным через обычную регистрацию). Проверено вживую: вход по linked-адресу
> через UI даёт сессию primary-аккаунта; резолв-матрица (verified/unverified/primary/unknown +
> UPPERCASE) прогнана скриптом на dev-БД, дубль-аккаунт не создаётся. Известное ограничение:
> magic-link письмо при вводе linked-адреса уходит на ОСНОВНОЙ адрес владельца (оба адреса его,
> задокументировано в коде). Passkey/OAuth-входы не затронуты (identity не по email).
>
> **✅ Этап 8.5 — self-service несколько email на аккаунт, частично (2026-07-16, auth-hub
> v0.6.0):** `/profile/emails/` — добавление доп. адреса с подтверждением по ссылке (свой
> токен, 24ч TTL, не пересекается с core Better Auth `Verification`), удаление, назначение
> подтверждённого адреса основным. **Не покрыто:** вход по любому linked-email (нужен перехват
> резолва sign-in Better Auth — риск для core auth-flow ~10 downstream-приложений, отдельная
> задача) и merge двух уже существующих РАЗНЫХ аккаунтов (остаётся ручным скриптом владельца,
> необратимо, как и раньше — см. §14.1). Проверено вживую end-to-end (тестовый пользователь,
> add→verify→list→set-primary→remove), два бага найдены и пофикшены по пути: (1)
> `revalidatePath` вызывался во время рендера страницы подтверждения (не через форму/
> transition) — Next.js это запрещает, страница падала 500 после уже применённого обновления
> БД; (2) смена `User.email` напрямую в БД не инвалидировала `cookieCache` Better Auth (до 5
> минут в hub-provider) — активная сессия и OIDC `id_token` для downstream-приложений временно
> отдавали бы устаревший email; исправлено принудительным `signOut` сразу после смены основного
> адреса (пользователь перелогинивается).
>
> **✅ Этап 8 — тираж на driving-school, частичный (2026-07-16):** только
> `/owner/settings/auth-mode/` (informed-consent Tier1/Tier2, `AuditLog` action
> `OWNER_AUTH_MODE_MIGRATION_REQUEST`) — уже на `createAuth()` фабрике, без описанной у aboi
> находки про plugins/spread. **`/admin/social-providers/` осознанно НЕ перенесён:** VK/Yandex
> используют кастомные `getUserInfo`-колбэки (день рождения/пол/телефон из soc-сетей), DB-loader
> сериализует только `clientId`/`clientSecret` — перенос сломал бы боевой соц-вход
> мультитенантной платформы (ученики/инструкторы/автошколы). **Побочно найден и пофикшен бага:**
> `AuditLog` не имел ни одной `@@allow`-политики (ZenStack deny-all по умолчанию) — молча блокировал
> запись ВСЕХ owner-действий в аудит (`OWNER_USER_ROLE_CHANGE`, `OWNER_TICKET_*` и т.д., гасилось
> `try/catch` вызывающего кода) с момента создания модели; обнаружено при живой проверке новой
> страницы. Проверено вживую (временный тестовый пароль на dev-БД, не коммитился): логин owner,
> сабмит запроса, запись видна и в своей истории, и в общем `/owner/audit/`.
>
> **✅ Этап 8 — тираж на aboi (2026-07-15):** `/admin/social-providers/` +
> `/admin/settings/auth-mode/` перенесены с dsperevod (модели `SocialProvider` +
> `AuthModeMigrationRequest` — у aboi не было своего `AuditLog`, минимальная модель вместо полного
> журнала). **Отклонение от эталона:** соц-провайдеры грузятся вручную через
> `createSocialProviderLoader` в raw `betterAuth()`, БЕЗ перехода на `createAuth()`/`createAuthAsync`
> фабрику — фабрика собирает `plugins` через spread внутри своей функции и стирает tuple-тип
> массива, из-за чего TypeScript терял типизацию `auth.api.signInAnonymous` (anonymous-плагин,
> критичен для гостевой корзины aboi, живой e-commerce). Это системная находка — вероятно
> ограничивает будущий тираж на другие приложения, использующие plugin-specific API поверх
> `auth.api`, не только aboi. Проверено вживую: сид-логин, создание/редактирование/decrypt-round-trip
> провайдера, informed-consent запрос, каталог/сессия/корзина после миграции — все зелёные.
> `AUTH_ENCRYPTION_KEY` добавлен в `.env.local`+`.env.docker`+`docker-compose.production.yml`
> (два места — deploy-request BlackCove ещё не отправлен, ждёт своей очереди).
>
> **✅ Этап 8 — Tier 1/Tier 2 UI + self-service OAuth-админка: пилот на dsperevod (2026-07-15):**
> `/admin/social-providers/` (Tier 2 — свои OAuth-ключи, `SocialProvider` модель, secret
> шифруется AES-256-GCM) + `/admin/settings/auth-mode/` (сравнение Tier 1/Tier 2 с рисками §2.3,
> informed-consent запрос в `AuditLog`, сам переход не автоматизирован). `createAuthAsync`+
> `createSocialProviderLoader` из `@letar/auth` впервые реально подключены (раньше были только в
> докстрингах). Encrypt→store→decrypt round-trip, auth-путь и enum-миграция AuditLog проверены
> вживую/скриптами. **Не сделано:** миграция driving-school на DB-backed соц-секреты (риск для
> боевого VK/Yandex — сознательно не трогали), тираж обоих UI на другие Tier 2 приложения, реальное
> исполнение Tier 1-перехода (отдельная задача класса §8.5, когда появится первый запрос). Побочно
> найден и вынесен в отдельную задачу баг сид-скрипта dsperevod (bcrypt vs scrypt хеш пароля).
> Подробности — раздел «Этап 8» ниже.
>
> **✅✅ Этап 1.5 (`createAuth(profile)`) ПОЛНОСТЬЮ ЗАВЕРШЁН (2026-07-15):** DoD закрыт — README
> `libs/auth` описывает все 3 режима, E2E dsperevod (behavior-parity standalone-миграции) прогнан
> локально 2/2 зелёных, контракт §4 переписан под реальный API. Фабрика в проде на 6 приложениях
> (dsperevod/time/kami/auth-hub/driving-school/archetest) во всех 3 режимах (`standalone`/
> `hub-client`/`hub-provider`). Подробности — раздел «Этап 1.5» ниже. `premium-network` на s2
> подтверждённо удалена BlackCove (2026-07-15, треды #477→#481) — не реликт для чистки, а
> завершённая миграция.
>
> **✅ Этап 8.5 — merge двух аккаунтов, скрипт готов и проверен (2026-07-16):**
> `infra/migrations/auth-hub-merge-accounts.ts` — параметризованный ручной инструмент
> (`CANONICAL_EMAIL`/`DUPLICATE_EMAIL`/`DRY_RUN`, dry-run по умолчанию — инверсия дефолта
> относительно owner-миграций, т.к. merge затрагивает потенциально живые сессии). Переносит
> `Account`/`Passkey`/`OauthApplication`/`OauthAccessToken`/`OauthConsent`/`ProjectProfile`/
> `TelegramToken`/`ConsentLog`/`UserEmail` с duplicate на canonical внутри одной транзакции,
> email duplicate сохраняется как доп. подтверждённый `UserEmail` у canonical (по прецеденту
> `setPrimaryEmail`), roles объединяются, обе `Session` принудительно инвалидируются
> (cookieCache Better Auth иначе отдаст устаревший email/userId в OIDC `id_token` ~10
> downstream-приложениям). Проверен вживую на локальной БД: dry-run, реальный merge с тремя
> edge-cases (конфликт `Account` по `providerId`+разный `accountId` — не конфликт, оба Account
> сохранены; конфликт `ProjectProfile` по `projectSlug` — roles объединены, metadata canonical
> сохранена; конфликт `OauthConsent` по клиенту — дубль убран), повторный запуск — идемпотентен
> (exit 0, без изменений). AuditLog-модель для auth-hub заведена не была — непропорционально
> ради разового скрипта, вместо этого structured консоль-лог с инструкцией перенаправлять в
> файл при реальном запуске. **Прод-запуск не выполнялся** — конкретной пары аккаунтов для
> склейки пока нет, скрипт ждёт первого реального кейса.
>
> **➡️ Следующий старт:** Этап 8.5 закрыт целиком (self-service email + вход по linked-email +
> merge-скрипт) и **задеплоен** (2026-07-16, BlackCove msg #488, `b7b8635`, zero-downtime;
> попутно применилась миграция `UserEmail` — v0.6.2 до этого на проде не была, весь этап уехал
> одной пачкой). E2e-предупреждение гейта закрыто: staging s3 передеплоен BlackCove на
> `6935f11` (msg #490), e2e прогнан — 10/10 зелёных, `lastStatus` обновлён на актуальный
> коммит. Свободные концы: (1) реальное исполнение Tier 1-перехода когда появится первый
> запрос (Этап 8); (2) 🔴 `svoichuzhie` прод-баг (запись ниже) — если ещё актуален.
>
> **✅ Находка сессии v0.6.4 — GET-утечка пароля — ЗАКРЫТА (2026-07-16):** аудит логин-форм
> монорепо подтвердил и расширил скоуп находки (не только raw-формы точечных приложений, но и
> оба корневых `<form>` в `@letar/forms` — риску были подвержены **все** потребители
> библиотеки, включая driving-school). `method="post"` добавлен в 15 местах (libs/forms ×2,
> auth-hub ×3, aboi ×3, dsperevod ×3, svoichuzhie ×4); mandala/animatrona-tracker уже были на
> `@letar/forms`, закрыты фиксом библиотеки. Typecheck зелёный, lint без новых ошибок. Детали
> и коммиты — apps/auth-hub/PLAN.md «Бэклог».
>
> **✅✅ Тираж method=post задеплоен целиком, попутно найдено и закрыто ещё 3 бага
> (2026-07-16):** (1) **`libs/deploy-engine/src/rollout.ts`** хардкодил имя нового контейнера
> как `<project>-app-2`, вычисляя его ДО scale-up без проверки против реального состояния
> Docker — Compose выбирает следующий свободный индекс, не гарантированно 2 (после нескольких
> rollout-циклов старый контейнер был `-app-3`, новый стал `-app-4`); `wait-healthy` 5 минут
> опрашивал несуществующее имя и падал по таймауту (инцидент на деплое auth-hub, BlackCove
> вручную довёл rollout). Фикс — `resolveNewContainer()` резолвит новое имя ПОСЛЕ scale-up через
> `docker ps`, вычитая уже известное старое (аналог `resolveOldContainer`); новый гейт
> `resolve-new-container` (10 гейтов вместо 9). Regression-тест воспроизводит инцидент напрямую.
> Подтверждено в бою на деплое svoichuzhie. Коммит `1e5e359`. (2) **`aboi`** — `next build`
> ложно падал на TS-ошибке `rootDir` при импорте `@letar/forms` (internal TS-чекер Next.js не
> полностью поддерживает project references) — фикс `typescript.ignoreBuildErrors: true`, тот
> же паттерн, что уже в 7 других приложениях. Коммит `27af8d0`. (3) **`dsperevod`** —
> `AUTH_ENCRYPTION_KEY` отсутствовал в проде целиком (ни в `.env.docker.enc`, ни в
> `docker-compose.production.yml`) — сгенерирован через `openssl rand -hex 32`, добавлен в оба
> обязательных места. Коммит `251b22c`. Отдельно — **`svoichuzhie`** зависание страницы у
> пользователя оказалось клиентским Service Worker без таймаута сети (не сервером): подвисшее
> TCP-соединение вешало fetch-event навечно, обычный хард-рефреш не спасал (SW продолжал
> контролировать вкладку) — фикс `fetchWithTimeout()` (8с) с откатом на кэш. Коммит `a95e768`.
> Все 4 приложения (auth-hub/aboi/dsperevod/svoichuzhie) в проде на актуальных коммитах.

> **🔴 `svoichuzhie` — прод-баг, НЕ связанный с rollout (2026-07-14, BlackCove, msg #453):**
> rollout-пилот безопасно откатился на гейте `wait-healthy` (без даунтайма, `nginx-reload-1` не
> наступил) — но новый контейнер `svoichuzhie-app-2` воспроизвёл **ту же проблему**, что уже
> **4 дня** у прод-контейнера `svoichuzhie-app` (`unhealthy` в `docker ps`). `/api/health`
> отвечает нормально сразу после старта, но через ~3 минуты сервис перестаёт принимать соединения
> на `:3021` — даже изнутри собственного контейнера через `localhost`. Процесс не падает, ошибок
> в логах нет (`next-server` жив, `Ready in 0ms`). Похоже на зависший event loop, блокирующую
> операцию или утечку file descriptor на слушающем сокете — воспроизводится одинаково и в
> 4-дневном старом контейнере, и в свежесобранном новом. **`svoichuzhie-app-2` оставлен запущенным
> для отладки** (не удалён). Rollout `svoichuzhie` отложен до разбора первопричины — это
> приоритетнее самого тиража (боевой e-commerce с реальными клиентами уже 4 дня в нездоровом
> состоянии).
>
> **⚠️ Уточнение (2026-07-15, Ками проверил вживую):** `svoichuzhie.ru` у реального пользователя
> открылся нормально в браузере, несмотря на `unhealthy` в Docker — расхождение между
> «недоступен по healthcheck» и «реально работает для людей». Код-аудит внешних `fetch()` без
> таймаута (`/api/video/proxy`, `media.ts`, `alfabank.ts`) — исправлено защитно
> (`AbortSignal.timeout(15s)`, commit `83af83f` submodule + `faf1a16` letar), но это не
> подтверждённая причина: тестовый контейнер BlackCove уходил в unhealthy БЕЗ реального
> пользовательского трафика, так что fetch-пути пользователей физически не могли быть виноваты
> в этом конкретном тесте. **Новая гипотеза:** `mem_limit: 512m` + `memswap_limit: 512m` (без
> доп. swap) в compose — возможен cgroup memory throttling, из-за которого процесс формально жив,
> но не принимает новые соединения, без OOM-килла и ошибок в логах. Запрошена диагностика у
> BlackCove (`docker stats`, поиск OOM-событий в `dmesg`/`journalctl`).
>
> **✅✅ ROOT CAUSE НАЙДЕН И ЗАКРЫТ (2026-07-15, BlackCove, msg #456):** память ни при чём —
> `docker stats` показал 30–38% от лимита на обоих контейнерах, OOM-событий в `journalctl` за
> 4 дня нет вообще. **Реальная причина:** `/etc/hosts` внутри контейнера резолвит `localhost` в
> `::1` (IPv6) РАНЬШЕ `127.0.0.1` — а Next.js слушает только `0.0.0.0` (IPv4), IPv6-listener'а
> нет. `busybox wget` (healthcheck-команда) не делает fallback на IPv4 → `wget
> http://localhost:3021/...` стабильно получал `connection refused`, хотя `wget
> http://127.0.0.1:3021/...` отвечал мгновенно. Внешний трафик через nginx идёт по отдельному
> сетевому пути (IPv4 к опубликованному порту контейнера), не завязанному на `/etc/hosts` —
> отсюда парадокс «unhealthy 4 дня, но сайт реально работает у пользователей» (подтверждено
> Ками вживую в браузере). **Фикс (commit `0b1a017` submodule + `8466afc` letar):** healthcheck
> `http://localhost:3021/...` → `http://127.0.0.1:3021/...`, один символ. Проверено — паттерн
> `wget http://localhost:` в healthcheck нигде больше в монорепо не встречается (все остальные
> приложения уже используют `0.0.0.0`), баг был изолирован к svoichuzhie. Таймауты на внешние
> `fetch()` (`83af83f`/`faf1a16`) остаются в коде как легитимное защитное улучшение, но не были
> причиной. Запрошен повторный rollout-пилот у BlackCove (msg #457) — **ждёт выполнения**.
>
> **✅✅ ROLLOUT-ПИЛОТ ЗАВЕРШЁН (2026-07-15, BlackCove, msg #461, thread `deploy-svoichuzhie`):**
> commit `fcb4689cd` (letar) / `f8c5bba` (submodule) — фикс healthcheck `localhost`→`127.0.0.1`
> в проде. Подтверждено через `deploy_status` (deploy-mcp, exitCode 0): все 9 гейтов пройдены —
> `doctor` → `resolve-old-container` → `scale-up` → `wait-healthy` (`svoichuzhie-app-2` healthy) →
> `smoke-test` (реальный HTTP, не-5xx) → `nginx-reload-1` → `stop-old` → `rm-old` →
> `nginx-reload-2`, `docker ps`: `svoichuzhie-app-2 — Up (healthy)`, даунтайма не было. IPv6/
> `localhost` healthcheck-баг подтверждён закрытым. ⚠️ Повторный запрос (msg #460) оказался
> дубликатом — исходный (#457) BlackCove обработал на ~5 минут раньше, ответ (#458) ушёл другому
> агенту (RubyBear), не инициатору — источник путаницы «он ответил на другое имя агента».
> **16/~19 SERVER_APPS на rollout.**
>
> **✅ Risk-check интеграций СДЭК/каталога — ЗАКРЫТ С ОГОВОРКОЙ (2026-07-15, BlackCove msg #463 +
> проверка в браузере, thread `deploy-svoichuzhie`):** каталог/`delivery` — ✅ реальный HTML
> (`/merch` 143955 байт, `/delivery` 164558 байт), общий health 5×curl `svoichuzhie.ru` → 200,
> даунтайма нет. **СДЭК:** креды (`CDEK_CLIENT_ID`/`CDEK_CLIENT_SECRET`) внутри контейнера заданы
> корректно (подтверждено `docker exec ... env`), но end-to-end расчёт доставки (Server Action
> `shipping.action.ts`, недоступен для curl) проверить не удалось — **`/merch` на проде пуст**
> («Скоро будет», товаров нет), страница оформления заказа физически недостижима, пока владелец
> не опубликует товары. Не блокер rollout — интеграция задеплоена корректно, живой end-to-end тест
> откладывается до наполнения каталога (появится естественным образом в логах при первом реальном
> заказе).

> **✅ `deploy-affected.sh` — молчаливый пропуск миграций ПОФИКШЕН (2026-07-14, RubyBear, commit
> `8e34f17`):** найдено BlackCove/RainyMarsh (msg #447/#450) при staging e2e для driving-school —
> хардкод `SCHEMA_PATH="src/generated/schema.prisma"` не совпадал с shared-lib паттерном
> driving-school (schema.prisma генерируется в `libs/driving-school-db/`, migrations лежат в
> `apps/driving-school/prisma/migrations/`), скрипт молча писал `⚠️ Schema not found` и
> пропускал весь шаг применения миграций без ошибки — подтверждено на staging (БД пустая при
> зелёном build-логе), вероятно актуально и для production.
> **Разбор перед фиксом:** первая идея (распарсить `output` из `schema.zmodel`) была бы неверна —
> Prisma тогда искал бы `migrations/` рядом со сгенерированной `schema.prisma` (в `libs/`), а не
> там, где они реально лежат (`apps/driving-school/prisma/migrations/`). Правильный источник —
> `prisma.config.ts` (Prisma 7, есть у всех server-приложений кроме `label-printer-desktop`),
> который держит `schema`+`migrations.path` согласованными. Рабочие nx-таргеты
> `db:migrate`/`db:migrate:deploy` уже вызывают `prisma migrate deploy` БЕЗ `--schema`, полагаясь
> на автообнаружение конфига — тот же паттерн применён и в `deploy-affected.sh`.
> **Итог:** если у приложения есть `prisma.config.ts` — миграции запускаются без `--schema` флага
> (как в nx-таргетах); иначе — старый хардкод-путь как fallback. Проверено на всех 18
> приложениях с `schema.zmodel` — меняет поведение только для `driving-school`, остальные
> получают эквивалентный вызов. Сообщено BlackCove — стоит последить за логом первого прогона
> после этого коммита.

> **`svoichuzhie` rollout-миграция — 🟡 первая попытка ❌, повтор запрошен (2026-07-14):** compose
> смигрирован (commit `1f73ab1` submodule + `649167b` letar) — нет `container_name`/`ports` у
> `app`, alias `svoichuzhie-app`, healthcheck уже был, `letar.rollout`, `DEPLOY_TAG`.
> **Первая попытка (msg #448, BlackCove) упала до докер-стадии** — не из-за compose:
> `.env.docker` содержал `CDEK_FROM_ADDRESS=Рождественская ул., 8` без кавычек;
> `deploy-affected.sh` делает `source .env.docker` при сборке, запятая+пробел ломали
> bash-парсинг (`ул.,: command not found`, exit 127). Прод не пострадал (падение до докера).
> **Пофикшено (RubyBear, свой SOPS-ключ):** `.env.docker.enc` → `CDEK_FROM_ADDRESS="Рождественская
> ул., 8"` (commit `bc8b595` submodule + `5c2a333` letar), проверено локально — `source` парсит
> чисто. Повторный запрос отправлен (msg #451) — **ждёт выполнения**.
> ⚠️ Побочная находка (не блокер, не связана с этой миграцией): `svoichuzhie-app` в текущем
> проде уже 4 дня в статусе `unhealthy` — существовало до попытки деплоя, требует отдельного
> разбора независимо от rollout.

> **`animatrona-tracker` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-14, BlackCove, msg #442/#443, thread
> `deploy-animatrona-tracker-rollout-J`):** commit `78b7db8`, сервер s2, zero-downtime, все 9
> гейтов пройдены, curl-мониторинг `animatrona-tracker.letar.best` 200×5 без сбоев. **15/~19
> SERVER_APPS на rollout.**
> ⚠️ Побочная находка (не блокирует): в логе `zenstack:generate` рассинхрон версий ZenStack —
> `@zenstackhq/runtime@2.22.3` при остальных пакетах на `3.8.3`. Предсуществующий техдолг в
> `package.json`, не трогали.
>
> **➡️ Следующий старт:** `svoichuzhie` rollout-пилот ЗАВЕРШЁН (см. запись выше, msg #461,
> **16/~19 SERVER_APPS на rollout**), risk-check СДЭК/каталога закрыт с оговоркой (см. запись
> выше). Продолжен тираж на `form-example`/`mandala` (2026-07-15, commit `3b4f732` — включён
> `letar.rollout` в обоих compose).
>
> **`mandala` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-15, BlackCove, msg #467/#468, thread
> `deploy-form-example-mandala-rollout-J`):** первый rollout для mandala, все 9 гейтов зелёные,
> `mandala-app-2` healthy, `curl mandala.letar.best` → 200. **17/~19 SERVER_APPS на rollout.**
>
> **`form-example` rollout-пилот 🟡 ЗАБЛОКИРОВАН, root cause найден и пофикшен (2026-07-15,
> BlackCove, msg #467):** деплой упал на шаге миграций (`P1001: Can't reach database server at
> localhost:5432`) — `form-example-db`, единственная БД в монорепо без `ports:` в compose;
> `deploy-affected.sh` мигрирует с хоста через `localhost:$DB_PORT`, слушать было нечего. Старый
> контейнер не тронут, риска не было. **Пофикшено (commit `d0c5cfc`):** добавлен `ports:
> '5443:5432'` (первый свободный порт, проверены все занятые 5434–5455) в
> `apps/form-example/docker-compose.production.yml`. Повторный запрос деплоя отправлен BlackCove
> (thread `deploy-form-example-mandala-rollout-J`) — **ждёт выполнения**. Известный некритичный
> баг `/products ECONNREFUSED` не проверялся — деплой упал раньше, на миграциях.
>
> **`form-example` rollout-пилот 🟡 повторный root cause #2 (2026-07-15, BlackCove, msg #470):**
> после фикса порта деплой дошёл до аутентификации и упал на `P1000` — `deploy-affected.sh`
> строит `DATABASE_URL` для миграций из переменной `DB_PASSWORD` (не `POSTGRES_PASSWORD`),
> а в `apps/form-example/.env.docker` её никогда не было (единственное такое приложение в
> монорепо). **Пофикшено (commit `fd67766`):** добавлен `DB_PASSWORD` (то же значение, что
> `POSTGRES_PASSWORD`) в `.env.docker`, пересобран `.env.docker.enc` через `sops --encrypt`.
>
> **`form-example` rollout-пилот 🟡 root cause #3, архитектурный пробел (2026-07-15, BlackCove,
> msg #472):** пароль починился, деплой дошёл до реальной проверки миграций — упал на `P3005`
> (`The database schema is not empty` / `No migration found`). `apps/form-example/prisma/
> migrations/` **никогда не существовала в репозитории** — схема на проде была накатана через
> `prisma db push`, а не `prisma migrate`; `deploy-affected.sh` безусловно вызывает `migrate
> deploy`, который требует историю миграций против непустой БД (baseline). Не архитектурная
> находка BlackCove (не его профиль трогать состояние прод-БД) — решение пользователя: baseline
> вместо исключения из миграционного пути (риск молчаливого пропуска будущих реальных
> schema-изменений, прецедент driving-school commit `8e34f17`).
> **✅ Baseline-миграция сгенерирована и провалидирована (2026-07-15):** локальный dev reset
> (временный Postgres-контейнер, не трогал `docker-compose.yml`) → `prisma migrate dev --name
> init --create-only` из текущей `prisma/schema.prisma` → `prisma/migrations/
> 20260715163011_init/migration.sql` (2 таблицы `Product`/`Contact`, 2 enum). Применена к чистой
> тестовой БД через `migrate deploy` — прошла без ошибок, `migrate status` подтвердил «up to
> date». Закоммичена в репо. **На проде миграцию НЕ применять DDL-ом** (схема там уже такая) —
> нужен `prisma migrate resolve --applied 20260715163011_init` перед повторным `migrate deploy`,
> это должен выполнить BlackCove (затрагивает состояние прод-БД, вне профиля этой сессии).
>
> **✅✅ `form-example` rollout-пилот ЗАВЕРШЁН — ТИРАЖ §18.6 ЗАКРЫТ ПОЛНОСТЬЮ (2026-07-15,
> BlackCove, msg #474/#475, thread `deploy-form-example-mandala-rollout-J`):** `migrate resolve
> --applied 20260715163011_init` выполнен на прод-БД (без DDL, только пометка в
> `_prisma_migrations`), `migrate status` подтвердил «up to date». Четвёртая попытка деплоя
> прошла целиком — все 9 гейтов зелёные, `form-example-app-2 healthy`, `nginx-reload` ×2,
> `form-example-app-1` убран. **19/~19 SERVER_APPS на rollout** (`form-example` + `mandala` —
> оба закрыты одним заходом, три независимых бага устранены: host-порт БД `d0c5cfc`,
> `DB_PASSWORD` `fd67766`, baseline-миграция `b63b132`). Единственные приложения вне активного
> тиража — `dashboard`/`dashboard-agent` (структурно исключены, спецпуть деплоя, не кандидаты).
>
> **✅✅ `premium-network` УДАЛЕНА ОКОНЧАТЕЛЬНО (2026-07-15, ~17:07, BlackCove, threads #477→#478,
> #479→#481):** миграция доведена до конца. Все 27 контейнеров (все app/infra compose-файлы в
> репо уже ссылались только на `kami-network` — dual-connect с сессии №74 был чисто избыточным
> техдолгом) по одному отключены от старой сети, с проверкой healthcheck/connectivity после
> каждого шага; `nginx-proxy-manager` — последним, с baseline-проверкой до/после. Сеть опустела
> (`containers_left: 0`) → `docker network rm premium-network`. Смоук-тест по 5 приложениям после
> удаления — все 200, ни одного сбоя связности за всю миграцию. Подтверждено повторной проверкой
> `docker network ls` на s2 (2026-07-15, 17:32) — сети в списке нет. Ранее было расхождение (msg
> #477/#478): CalmBasin утверждал, что сеть уже пуста и не используется, но `docker network
> inspect` на тот момент показал обратное (~28 контейнеров, включая nginx-proxy-manager) — отсюда
> двухэтапная (сначала диагностика, потом безопасная миграция) процедура удаления.

> **➡️ Следующий старт:** тираж §18.6 Сессии J и удаление `premium-network` полностью завершены.
> Кандидаты: (1) `driving-school` — `@socket.io/redis-adapter` для Socket.IO перед включением
> rollout для этого сервиса (§10, отложено пользователем, не блокер); (2) Этап 1.5 `createAuth
> (profile)` или Этап 8 (соц-секреты per-владелец) — следующий содержательный этап Фазы B/C.

> **`aprel8008` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-14, BlackCove, msg #436/#437, thread
> `deploy-aprel8008-rollout-J`):** commit `8cbdfbe` (submodule) + `d855683` (letar), сервер s2,
> zero-downtime, все 9 гейтов пройдены. Сборка заняла дольше обычного (~4 мин, экспорт слоёв
> 107с) — build cache на s2 разросся до 52GB, диск был под нагрузкой параллельно с driving-school
> — на корректность деплоя не повлияло. **14/~19 SERVER_APPS на rollout.**
>
> **➡️ Следующий старт:** продолжить тираж — оставшиеся кандидаты `animatrona-tracker`,
> `svoichuzhie` (оба без rollout-профиля пока), `form-example`/`mandala` (label намеренно
> выключен — form-example статус не проверялся давно, mandala ждёт периода стабильности);
> `dashboard`/`dashboard-agent` структурно исключены. Стоит присмотреться к 52GB build cache на
> s2 — не блокирует, но растёт с каждым деплоем.

> **`auth-hub` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-13, BlackCove, msg #420/#421, thread
> `deploy-auth-hub-rollout-J`):** commit `7c355d7`→`20684fc`, сервер s2, zero-downtime rollout,
> все 9 гейтов пройдены (doctor → resolve-old-container → scale-up → wait-healthy → smoke-test →
> nginx-reload-1 → stop-old → rm-old → nginx-reload-2), даунтайма не было. Пост-проверка сверх
> обычного HTTP 200: OIDC-редирект с hub-client (`kami`, «Войти» → корректный redirect на
> `auth.letar.best` с рендером формы логина) подтверждён рабочим — блast radius (SSO для ~10
> приложений) не сработал. **12/~19 SERVER_APPS на rollout.**
> ⚠️ Находка BlackCove: для auth-hub ещё ни разу не гонялся staging e2e — завести перед
> следующими rollout-изменениями Ключницы (не блокирует, задел на будущее).
>
> **✅ Staging e2e для auth-hub заведён (2026-07-14, RubyBear, commit `3043014`):** новый
> `apps/auth-hub-e2e` (Playwright, по образцу `grandslamcup-e2e`) + dev-session роут
> (`createDevSessionRoute` из `@letar/auth/server`). 3 спека: `01-public` (sign-in/sign-up без
> авторизации — email/password форма, magic-link, OAuth-кнопки), `02-admin` (dashboard/users/
> clients с dev-session-сессией), `03-oidc-authorize` (смоук authorize-редиректа с произвольными
> query — не привязан к конкретному seeded client_id, только «не 500»). Только `chromium` первым
> заходом. `nx lint`/`nx typecheck:tsgo` чисто.
>
> **✅ Первый прогон прошёл зелёным (2026-07-14, BlackCove, msg #428, 2м55с, chromium)** — но
> вручную: BlackCove настроил `.env.local` + прогнал `nx e2e auth-hub-e2e` по SSH напрямую,
> потому что `run_e2e`/`deploy_app(staging)` требуют `docker-compose.staging.yml`, которого у
> auth-hub не было. Такой прогон не пишет `.last-e2e-status/auth-hub.json` и не участвует в
> warn-gate перед production-деплоем — цель находки BlackCove (msg #420) не достигнута полностью.
>
> **✅ docker-compose.staging.yml добавлен (2026-07-14, RubyBear, commit `5ab4186`):** по образцу
> `grandslamcup-staging` — `auth-hub-staging-db` (host `5455:5432`), `auth-hub-staging-app` (host
> `3019:3010`, внутренний порт из `Dockerfile.production`). `playwright.config.ts` менять не
> потребовалось — уже структурно совпадал с эталоном (`baseURL` из `BASE_URL`,
> `webServer.reuseExistingServer: true`). ⚠️ Порты 5455/3019 подобраны по аналогии, не проверены
> на реальную занятость на s3. Запрос отправлен BlackCove (thread `auth-hub-e2e-setup`, msg #429,
> low priority): подтвердить порты → `deploy_app(staging)` → `run_e2e` → `.last-e2e-status`
> появится, warn-gate заработает.
>
> **✅✅ ЗАКРЫТО ПОЛНОСТЬЮ (2026-07-14, BlackCove, msg #431):** порты `5455`/`3019` подтверждены
> свободными и задеплоены. `run_e2e` → **10 passed за 8.3с** — `.last-e2e-status/auth-hub.json`
> теперь пишется и читается warn-gate'ом перед каждым production-деплоем Ключницы, как у
> остальных приложений. Находка BlackCove из msg #420 закрыта. По пути найдены и исправлены два
> общих бага тиража (не специфичны для auth-hub, важны для следующих staging e2e):
>
> 1. Комментарий между `ports:` и первой строкой порта ломал парсинг `DB_PORT` в
>    `deploy-affected.sh` (`grep -A 1 "ports:"` буквально берёт следующую строку) — комментарии
>    нужно ставить НАД блоком `ports:`, не между ключом и значением. Пофикшено (commit `6ee1751`).
> 2. **`DEV_SESSION_TOKEN` — общий секрет для ВСЕХ приложений, не per-app:** `dashboard-agent`
>    передаёт в `nx e2e` один и тот же токен из своего собственного окружения на s3
>    (`--preserve-env`), не читает `.env.staging` конкретного приложения. Генерировать новый
>    токен per-app (как сделала эта сессия изначально) — ошибка, ломает dev-session с 403.
>    Если понадобится сменить общий токен — обновлять сразу везде: во всех `.env.staging` +
>    в окружении `dashboard-agent`.
>
> **`driving-school` — 🔴 rollout ОТЛОЖЕН (2026-07-13, находка BlackCove, thread
> `driving-school-websocket-rollout-check`, msg #422, решение пользователя):** живой NPM-конфиг
> (`proxy_host/9.conf`) для WebSocket-порта `3004` резолвит `driving-school-app` в IP один раз при
> старте воркера (нет sticky-балансировки, нет `upstream`-блока). Хуже — `apps/driving-school/
> src/app/api/socket/route.ts` **не использует Redis-адаптер** (`@socket.io/redis-adapter`),
> Socket.IO держит комнаты in-memory per-process. Итог: в rollout-окне с 2 живыми репликами
> сообщения чата между собеседниками на разных репликах **молча теряются**, без ошибки на
> клиенте — не просто краткий обрыв, а тихая потеря данных. Один контейнер обслуживает и HTTP
> (`3003`), и Socket.IO (`3004`) — разделить их на уровне compose нельзя, только на уровне кода.
> **Решение:** rollout для driving-school отложен целиком до отдельной задачи — добавление
> `@socket.io/redis-adapter` (общий room-state между репликами). Не в скоупе текущего тиража.
> driving-school остаётся на обычном (non-rollout) деплое.
>
> **✅ Redis-адаптер добавлен в код (2026-07-14, driving-school v0.234.0, commit `b29ca4b`):**
> `src/app/api/socket/route.ts` подключает `createAdapter` на `ioredis`, если задан `REDIS_URL`
> (compose: `${REDIS_URL:-redis://letar-redis:6379}`, тот же общий Redis-инстанс, что у auth-hub/
> kami).
>
> **✅ BlackCove подтвердил инфру (2026-07-14, тред `424`):** `letar-redis` жив и доступен
> с `driving-school-app` (nc -zv → open) — ничего донастраивать не нужно. По NPM `proxy_host/9.conf`
> для `:3004` — upstream-блок НЕ нужен: с общим room-state в Redis не важно, на какую реплику физически
> попадёт TCP-сокет при rollout, встроенный reconnect Socket.IO восстановит комнату из Redis без потери
> сообщений (короткий реконнект-блип у активных чатов в момент `stop-old` — ожидаемо, не блокер).
>
> **✅ Rollout-профиль включён (2026-07-14, driving-school v0.235.0, commit `8189504`):** убраны
> `container_name`/`ports` у `app`, добавлены network alias `driving-school-app`, `healthcheck`,
> `image: driving-school:${DEPLOY_TAG:-latest}`, `stop_grace_period: 30s`, `labels.letar.rollout: 'true'`.
> `deploy-engine doctor --app driving-school` — 8/8 ✅ READY. Deploy-request отправлен BlackCove.
>
> **✅✅ Rollout-пилот ЗАВЕРШЁН (2026-07-14, BlackCove, msg #434, инициатор RainyMarsh):**
> zero-downtime, включая Redis-адаптер Socket.IO для WS-чата — первый WS-сервис в тираже. Curl-
> мониторинг во время финального `nginx-reload`: 200×5 без сбоев. **13/~19 SERVER_APPS на
> rollout.** Оба последних высокорисковых кандидата §18.6 Сессии J (`auth-hub`, `driving-school`)
> закрыты.
>
> ⚠️ По пути найден и исправлен баг сборки, не связанный с rollout напрямую: коммит `b02bf2e`
> (nx 23.1.0 migration) пин `rootDir: "."` в `tsconfig.json`, хотя `paths`/`references` указывают
> на `libs/*` вне этой директории — `tsc` терпит (project references + noEmit), `next build` — нет.
> Первый деплой после rollout-конфига упал на TS-чекере ещё до докер-стадии (старый контейнер не
> тронут, даунтайма не было). Фикс: `rootDir: "../.."` (как у auth-hub/kami) — commit `b33cb9e`.
>
> **✅ Staging e2e — код готов (2026-07-14, driving-school v0.236.0, driving-school-e2e
> `b747adf`), провижининг на s3 не запрошен.** BlackCove отметил отсутствие staging e2e как риск
> первого rollout-пилота с Redis-адаптером (msg #433) — по аналогии с auth-hub добавлены:
> `src/app/api/auth/dev-session/route.ts`, `docker-compose.staging.yml` (БД `:5456`, app
> `:3020`/`:3021`, `REDIS_URL` на `e2e-redis` через `172.17.0.1:6380`), `.env.staging.example`,
> новый Playwright-проект `staging-smoke` в `driving-school-e2e` (3 файла: публичные страницы,
> dev-session дашборд, Socket.IO handshake через Redis-адаптер — последний пока `test.skip` без
> `SOCKET_BASE_URL`). Порты `5456`/`3020`/`3021` не проверены на занятость на s3 — подтвердить
> перед первым `deploy_app(staging)`. Нужен NPM proxy host для `driving-school-stage.s3.letar.best`
> и, отдельно, для порта Socket.IO. `.env.staging` с реальными секретами создаётся на s3, не в git.
>
> **Провижининг сделан, первый staging-деплой упал (2026-07-14, BlackCove, msg #441):** порты
> подтверждены свободными, `.env.staging` создан на s3 (секреты через `openssl rand`, общий
> `DEV_SESSION_TOKEN` переиспользован), `docker-compose.staging.yml` парсится верно. NPM public
> domain и `SOCKET_BASE_URL` осознанно не настроены — `run_e2e` бьёт по `BASE_URL` напрямую на том
> же хосте s3, домен нужен только для будущего ручного QA; `SOCKET_BASE_URL` требует правки
> allowlist `--preserve-env` в самом `dashboard-agent` (не провижининг конкретного приложения) —
> тест и так грациозно `test.skip` без неё. Сам билд упал: `GoogleCalendarService` конструировался
> на уровне модуля и бросал исключение при пустых `AUTH_GOOGLE_ID`/`SECRET` (staging их намеренно не
> задаёт) — `next build` падал на статическом сборе `/api/calendar/feed/[token]`.
>
> **✅ Исправлено (2026-07-14, driving-school v0.236.1, commit `b320bb4`):** ленивый singleton
> `getGoogleCalendarService()` вместо эагерного `export const`. Проверено локально: `nx build
> driving-school` с намеренно пустыми `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` — чисто. Попросил
> BlackCove повторить staging-деплой.
>
> **➡️ Следующий старт:** (1) `aboi` уже задеплоен (см. исправленную запись выше) — реально
> оставшиеся кандидаты: `animatrona-tracker`, `svoichuzhie`, `aprel8008`; `form-example`/`mandala`
> — обычный (non-rollout) деплой уже закрыт, `letar.rollout` пока намеренно выключен (mandala —
> период стабильности после инцидента Сессии №70, form-example — не проверено в этой сессии,
> нужно свериться со статусом); `dashboard`/`dashboard-agent` структурно исключены из rollout
> (спецпути деплоя); (2) когда все активные SERVER_APPS на rollout — можно просить BlackCove
> удалить старую `premium-network`.

> **`grandslamcup` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-13, BlackCove, msg #414, thread
> `deploy-grandslamcup-rollout-J`):** commit `841e9338e`, сервер s2, zero-downtime rollout,
> smoke-test (реальный HTTP, не-5xx) прошёл, `Ready in 0ms`, миграций не было. **Живой пример
> параллельного деплоя одного приложения двумя агентами** — почти одновременно с моим
> compose-запросом другой агент (StormyBear, msg #412) отправил свой deploy-request с фиксом двух
> багов telegram-напоминаний (`venue.lat/lng → latitude/longitude`, убрана несуществующая роль
> `PLAYING_COACH`). BlackCove не деплоил дважды — оба коммита уже были на `origin/main` к моменту
> старта, `deploy-affected.sh` подтянул HEAD и задеплоил всё одним прогоном.
> ⚠️ **Не закрыто, требует внимания StormyBear:** e2e-gate предупредил — последний прогон e2e для
> grandslamcup упал, на старом коммите `50d72bc` (>24ч, не совпадает с задеплоенным) — фикс
> напоминаний тренерам автоматически не проверен. BlackCove рекомендует ручную проверку на проде.
> **11/~19 SERVER_APPS на rollout.**
>
> **`archetest` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-13, BlackCove, msg #409, thread
> `deploy-archetest-rollout-J`, 4-я попытка):** commit `f61d654`, сервер s2, zero-downtime rollout
> с реальным smoke-test (HTTP-запрос к `archetest-app-2`, не только TCP). Путь до успеха был
> непростым: (1) failed-миграция `20260321000000_baseline` (висела с марта) — диагностирована как
> дубликат уже применённого `20260321075436_baseline`, резолв `--rolled-back` не сработал (Prisma
> заново попыталась применить DDL и упала на той же строке), верный резолв — `--applied`; (2) после
> резолва миграций деплой упал ещё раз — но уже не на archetest, а на **несвязанном инфра-инциденте**
> (см. ниже, случайный коммит `ceb09c8` со сторонней nx-миграцией сломал 7 submodule-ссылок,
> исправлено в течение той же сессии). После устранения обоих блокеров — 5 новых миграций archetest
> накатились штатно (`question_bank_version`, `session_validity`, `add_mood_check_in`,
> `professional_lead`, `add_quiz_session_locale`), rollout прошёл чисто. Психоданные BlackCove не
> трогал — только диагностика через `\dt`/`_prisma_migrations`. **11/~19 SERVER_APPS на rollout.**
> Следующий — `grandslamcup` (compose готов, `f6fb9ca`, `doctor` 8/8), запрос пилота отправлен.
>
> **🟡 Инцидент этой сессии — случайно закоммичены и запушены чужие staged-изменения (nx
> 23.0.1→23.1.0), временно заблокировавшие деплой всех приложений:** при частых
> `git add PLAN.md && git commit && git push` не проверялся `git status` перед каждым коммитом
> (нарушение `.claude/rules/git.md` про staged-файлы других агентов в общем репо) — в индекс
> затесались чужие изменения параллельного агента (nx-миграция ~140 `tsconfig*.json` + bump 7
> submodule на **ещё не запушенные** submodule-коммиты). Итог — commit `ceb09c8` со смешанным
> содержимым, деплой archetest/любого приложения на s2 встал на `git submodule update` ("not our
> ref" для 7 submodule). Автор nx-миграции сам исправил ситуацию (`f61d654`, докоммитил и запушил
> submodule-коммиты) — к моменту 4-й попытки деплоя блокер снят, урона данным/сервисам не было.
> **Правило на будущее: всегда `git status` перед `git commit` в этом репо, особенно при частых
> последовательных коммитах.**
>
> **`kami` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-13, BlackCove, msg #392, thread
> `deploy-kami-rollout-J`):** zero-downtime rollout (label `letar.rollout`), commit `42720aa`
> (fast-forward с `0fcd9f0`), сервер s2. Прошёл штатно: scale-up → wait-healthy → smoke-test →
> nginx reload → stop/rm старого контейнера → повторный reload. Новый `kami-app-2` healthy,
> `Ready in 0ms`. Миграций не требовалось.
> ⚠️ Побочная находка про `kami-postgres` vs `kami-db` — **закрыта, ложная тревога**: в реальном
> логе деплоя `DATABASE_URL: lena_user@kami-db:5432/lena_kami` резолвится корректно,
> ECONNREFUSED/ENOTFOUND не наблюдалось. Похоже дефолт в локальном compose-файле где-то
> переопределяется в рантайме — раз работает, BlackCove оставил как есть, вне скоупа деплоя.
> **10/~19 SERVER_APPS на rollout.**
>
> **`umami` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-13, BlackCove, msg #389, thread
> `deploy-umami-rollout-J`):** прошёл как infrastructure-деплой (вендорский образ
> `ghcr.io/umami-software/umami`, `pull + recreate` напрямую, без zero-downtime scale=2 — ожидаемо
> для этого кандидата), commit `c119c66`, сервер s2. Миграции не требовались («No pending
> migrations»). `umami-app-1` и `umami-db` оба в `kami-network`. Домен `stats.letar.best` — 5/5 curl
> HTTP 200, `/api/heartbeat` → `{"ok":true}`, ошибок в логах нет. На будущее: откат umami — только
> ручной `docker pull` вендорского тега, обычный `rollback --to-sha` не работает (нет своих тегов
> образа).
>
> **➡️ Следующий старт (следующая сессия):** (1) `archetest`+`grandslamcup` оба закрыты — следующие
> кандидаты тиража §18.6 Сессии J: `auth-hub`/`driving-school` последними, риск выше — не
> мигрировать с ходу без дополнительного анализа, сверяться с пользователем; (2) когда все ~20
> приложений подтверждённо переехали на `kami-network` — попросить BlackCove удалить старую
> `premium-network`; (3) StormyBear ещё не подтвердил ручную проверку telegram-напоминаний
> grandslamcup (msg #415) — не мой скоуп, но если попадётся на глаза, можно спросить статус.

> **`dsperevod` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-13, BlackCove, msg #383, thread
> `deploy-dsperevod-rollout-J`):** zero-downtime (submodule `a8491ca` + `adf4e40` в letar, сервер
> s2). Первый rollout с БД со времён `time` — `depends_on: service_healthy` отработал корректно,
> `dsperevod-app-2` дождался healthy `db`, ни одного ECONNREFUSED. Домен `dsperevod.ru` — 5/5 curl
> HTTP 200. **7/~19 SERVER_APPS на rollout.**
> **`aboi` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-13, BlackCove, msg #387, thread
> `deploy-aboi-rollout-J`, инициатор VioletGrove):** commit `bf9c54b` (submodule) + `5e4f3ef`
> (letar), сервер s2, zero-downtime — первый боевой e-commerce в тираже (T-Bank эквайринг, СДЭК).
> BlackCove проверил не только HTTP 200, но и реальные интеграции: СДЭК-токен получен, webhook
> `https://neyroaboi.ru/api/webhooks/cdek` зарегистрирован без ошибок в логах `aboi-app-2`; каталог
> `/catalog/` реально отдаёт контент (106KB HTML, цены в ₽, не пустая страница). `depends_on:
> service_healthy` снова сработал корректно (как в dsperevod). Ни одной ошибки. **Обнаружено
> задним числом (2026-07-14, RubyBear) — PLAN.md не обновлялся после успеха, аналогично сессии
> №73 с aprel8008: не доверять статусу «ждёт выполнения» в PLAN.md без проверки inbox.**

> **`animatrona-landing` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-13, BlackCove, msg #381, thread
> `deploy-animatrona-landing-rollout-J`):** zero-downtime (commit `986d8da`, сервер s2).
> `animatrona-landing-app-2` подтверждён в `kami-network`. Домен `animatrona.letar.best` — 5/5 curl
> HTTP 200, ошибок в логах нет. **6/~19 SERVER_APPS на rollout** (`time`, `form-docs`, `pravda`,
> `kami-key-the-landing`, `letar-landing`, `animatrona-landing`).

> **`letar-landing` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-13, BlackCove, msg #379, thread
> `deploy-letar-landing-rollout-J`):** zero-downtime (commit `05f3628`, сервер s2) — первый деплой
> на новую сеть `kami-network` (см. Сессию №74 ниже), прошёл без сюрпризов, `letar-landing-app-2`
> подтверждён в `kami-network` (`docker network inspect`). Домен `letar.best`, 5/5 curl HTTP 200.
> **5/~19 SERVER_APPS на rollout** (`time`, `form-docs`, `pravda`, `kami-key-the-landing`,
> `letar-landing`). Значит и rename сети `premium-network → kami-network` (msg #377) уже выполнен
> BlackCove на сервере к этому моменту.

> **Сессия №74 (2026-07-13, переименование Docker-сети `premium-network` → `kami-network`):**
> Закрыт долгоживущий TODO из `.claude/docs/deployment.md` (см. Сессию №73 и раньше — имя сети
> осталось от decommissioned `premium-rosstil`/`imot`, хотя используется ~20+ текущими
> приложениями). Переименовал во всех `docker-compose.production.yml`, `libs/deploy-engine`
> (`doctor.ts`, `rollout.spec.ts`), документации и правилах деплоя — commit `7fd18c8` в letar.
> Submodule-приложения (aboi, driving-school, dsperevod, studio, aprel8008, svoichuzhie) обновлены
> отдельными коммитами в своих репо, SHA зафиксированы в letar. Проверил ловушку из TODO
> (коллизия с «сетью kami-network приложения kami») — коллизии нет, отдельной сети не существовало,
> `kami` сам сидел в `premium-network`.
> ⚠️ Сеть `external: true` — переименование в коде не переименовывает её на сервере. Отправлен
> deploy-request BlackCove (msg #377, thread `deploy-kami-network-rename`, ack required) на
> фактическое пересоздание `kami-network` на s2 и передеплой всех затронутых приложений.
> **Ответ получен (msg #378):** шаги 1–2 выполнены недеструктивно — `docker network create
> kami-network`, все 44 контейнера с `premium-network` подключены и к `kami-network` (без
> отключения от старой, zero-downtime — каждый контейнер временно в обеих сетях). Шаги 3–5
> (передеплой ~20 приложений на алиас `kami-network` + удаление старой `premium-network` в конце)
> BlackCove катит партиями с проверкой после каждой — см. записи `letar-landing`/
> `animatrona-landing` rollout-пилотов выше в шапке файла, где это уже происходит вживую.
>
> **🟡 ИСПРАВЛЕНИЕ (2026-07-15, BlackCove, msg #478, thread `477`):** предыдущая формулировка
> «все SERVER_APPS подтверждённо переехали на `kami-network`» (см. записи rollout-пилотов ниже)
> была **неточна** — тираж §18.6 пересоздаёт только **app-контейнеры** (новый `app-2` физически
> создаётся только на `kami-network`), но **БД-контейнеры и инфра** (`nginx-proxy-manager`,
> `dashboard-app`, `studio`, `media-*` — всего **28 контейнеров**) остались с dual-connect шага 2
> и никогда не были явно отключены от `premium-network`. Обнаружено при попытке удаления сети
> (msg #477) — BlackCove корректно отказался выполнить `docker network rm` с живыми критичными
> контейнерами (включая `nginx-proxy-manager`, точку входа всего прод-трафика), проверил
> `docker network inspect` перед действием вместо доверия статусу в PLAN.md. **План завершения
> (msg #479):** по каждому контейнеру — сверить, что compose в репо уже не ссылается на
> `premium-network`, отключить (`docker network disconnect`) по одному с проверкой связности,
> `nginx-proxy-manager` — отдельно и последним (максимальный risk), удалить сеть только когда
> `docker network inspect` покажет пустой список. Low-priority, не блокер — в работе у BlackCove.
>
> **➡️ Следующий старт:** (1) продолжить тираж §18.6 Сессии J (кандидаты: `pravda` ✅,
> `kami-key-the-landing` ✅, `letar-landing` ✅, `animatrona-landing` ✅, `dsperevod`, `aboi`,
> `umami`, `kami`); (2) когда все ~20 приложений подтверждённо переехали на `kami-network` —
> попросить BlackCove удалить старую `premium-network`; (3) проверить статус ротации
> `aprel8008`/`form-example`, если не закрыто предыдущей сессией.

> **Сессия №73 (2026-07-13, ротация `aprel8008` + фикс `form-example /products` — закрыто BlackCove):**
> Запрос на ротацию `DB_PASSWORD` для `aprel8008` (реальная утечка, см. Сессию №71 ниже) на момент
> проверки не находился через `search_messages`/`fetch_inbox`/`fetch_summary` (0 результатов) —
> отправлен повторно (msg id 367, thread `deploy-aprel8008-db-password-rotation`).
> **Результат по отчёту BlackCove (очередь разобрана, скриншот пользователю):** `aprel8008` — пароль
> Postgres ротирован, задеплоено, HTTP 200; `form-example` — пароль ротирован **и** зафиксирован
> фикс `/products` (`ECONNREFUSED`, открытый с Сессии №72), задеплоено, HTTP 200.
> **Уточнение (BlackCove, msg #372, thread `deploy-aprel8008-db-password-rotation`):** запрос на
> ротацию `aprel8008` на самом деле **уже был отправлен и выполнен раньше** — другим агентом
> (CloudyOtter, msg #357/#360, ~16:19), тем же коммитом `5143dc0`/`3f752b6`, тем же паролем.
> Повторная отправка была не нужна (хотя и безвредна — идемпотентно, тот же пароль). Корень —
> не «запрос не отправляли», а **PLAN.md не обновился после первого запроса** + `search_messages`
> почему-то не нашёл существовавшие messages #357/#360 при проверке (~17:18, уже после их отправки) —
> причина расхождения не выяснена (возможно, задержка индексации FTS или разница в scope/project_key
> у отправителя); при следующем похожем случае перепроверять через `fetch_summary` с более широким
> `since_hours` и не считать 0 результатов `search_messages` окончательным доказательством отсутствия.
>
> **➡️ Следующий старт:** (1) продолжить тираж §18.6 Сессии J (кандидаты: `pravda`,
> `kami-key-the-landing`, `letar-landing`, `animatrona-landing`, `dsperevod`, `aboi`, `umami`, `kami`).

> **`pravda` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-13, BlackCove, msg #373, thread
> `deploy-pravda-rollout-J`):** zero-downtime через `libs/deploy-engine` без ручного вмешательства
> (commit `bf79514`, сервер s2) — doctor → scale-up `pravda-app-2` → healthy → smoke-test →
> nginx-reload ×2 → stop-old. 5 внешних curl на `pravda.letar.best` после деплоя — все HTTP 200,
> даунтайма не было.

> **`kami-key-the-landing` rollout-пилот ✅ ЗАВЕРШЁН (2026-07-13, BlackCove, msg #375, thread
> `deploy-kami-key-the-landing-rollout-J`):** zero-downtime (commit `fa50fa9`, сервер s2). BlackCove
> проверил живой конфиг NPM перед деплоем (`/data/nginx/proxy_host/26.conf`) — Forward Host уже
> резолвил по имени контейнера, alias совместим без правок NPM; сеть `nginx-proxy-manager_default`
> на механизм rollout не повлияла. 5 внешних curl на `kamikeythe.letar.best` — все HTTP 200.
> **4/~19 SERVER_APPS на rollout** (`time`, `form-docs`, `pravda`, `kami-key-the-landing`).
> **`letar-landing`** — compose смигрирован (commit `05f3628`), `doctor` 8/8 READY, запрос пилота
> отправлен BlackCove (thread `deploy-letar-landing-rollout-J`) — **ждёт выполнения**.

> **Сессия №71 (2026-07-12, применение находок сессии №70 — аудит секретов + smoke-test):**
> По итогам инцидента mandala предложила пользователю 3 системных находки, применила все.
>
> **1. Аудит хардкод-паролей в `docker-compose.production.yml`.** Расширенный grep
> (`${VAR:-fallback}` с секретом в default-значении) нашёл паттерн в **8** приложениях:
> `animatrona-tracker`, `aprel8008`, `auth-hub`, `driving-school`, `grandslamcup`, `kami`,
> `mandala`, `studio`. Проверила через `sops --decrypt` каждый `.env.docker.enc` — в **7 из 8**
> `DB_PASSWORD`/`POSTGRES_PASSWORD` уже реальный сгенерированный секрет, fallback никогда не
> используется (мёртвый код). Убрала текст fallback без затрагивания сервера/секретов
> (commits: `e51623f` — 5 приложений, `2752938` — driving-school submodule, `ee274d1` — studio
> submodule, `5088891` — bump SHA обоих submodules).
>
> **🔴 `aprel8008` — реальная утечка:** `DB_PASSWORD` в `.env.docker.enc` буквально совпадал с
> хардкод-fallback (`aprel8008_password`) — не мёртвый код, настоящий слабый пароль в открытом
> виде в публичном репо. Сгенерирован новый (`openssl rand -hex 24`), обновлён в
> `.env.docker.enc` (commit `5143dc0` в submodule + `3f752b6` bump SHA). Запрошена ротация у
> BlackCove по образцу form-example (сессия №70): `ALTER USER` на живой БД **до** редеплоя —
> **ответ ещё не пришёл** на момент записи, следующая сессия должна проверить статус.
>
> **2. Smoke-test в `libs/deploy-engine`.** Docker healthcheck (`wget --spider`) не всегда ловит
> 5xx — это объясняет, почему mandala была "healthy" по Docker при реальных 500 (sharp/libvips).
> Добавлен шаг `smoke-test` в `rollout.ts` между `wait-healthy` и `nginx-reload-1`: извлекает URL
> из `healthcheck.test` (`serviceHealthcheckUrl` в `compose.ts`), дёргает его через `wget`
> **без** `--spider` (реально скачивает тело, ненулевой exit code на 4xx/5xx). Не блокирует
> rollout, если URL не извлекается (defense-in-depth, не новая точка отказа). 4 новых/изменённых
> теста, 24/24 зелёные. Commit `855e11e`.
> ⚠️ **Известное ограничение:** защищает только rollout-путь. Обычный `--force-recreate` путь
> (`deploy-affected.sh`, bash) — которым был задеплоен сломанный `mandala` — остаётся без этой
> защиты. Будет закрыто по мере тиража rollout-профиля на остальные приложения (§18.6 Сессия J).
>
> **3. `form-example /products` 500** — не тронула, уже была попытка фикса (откачена
> `outputFileTracingIncludes`, не помогло) в фоновой задаче до этой сессии. Остаётся открытым,
> см. флаг для отдельной сессии — причина глубже стандартной проблемы file-tracing, возможно
> специфика Prisma 7 driver-adapter + Turbopack.
>
> **➡️ Следующий старт:** (1) проверить статус ротации `aprel8008` у BlackCove — если ответа всё
> ещё нет, повторно запросить; (2) продолжить тираж §18.6 Сессии J (следующие кандидаты:
> `pravda`, `kami-key-the-landing`, `letar-landing`, …); (3) когда будет время — `form-example
> /products`, если кто-то захочет копнуть глубже Prisma 7 + Turbopack.

> **Сессия №72 (2026-07-12, §18.6 Сессия J — `form-example` обычный деплой закрыт, найден
> отдельный баг Prisma/`ECONNREFUSED` на `/products`):**
> Закрыла зависший из Сессии №70 пункт — задеплоила `form-example` с двумя изменениями сразу
> (коммиты линейны, конфликта резервации не было): compose-миграция под rollout-профиль
> (`098eb75`, IvoryPrairie) + вынос захардкоженного `POSTGRES_PASSWORD` в `.env.docker.enc`
> (`df5602179`, BronzeForge). Ротация пароля требовала ручного шага **до** пересборки: достала
> новый `POSTGRES_PASSWORD` из расшифрованного `.env.docker.enc`, выполнила `ALTER USER forms
> WITH PASSWORD ...` на уже работающем `form-example-db`, только потом обычный деплой (пересоздал
> `db`+`app` с новым паролем без потери доступа). Подтвердила подключение вручную через `psql`.
> `letar.rollout` остаётся выключенным (по плану BronzeForge/IvoryPrairie) — supervised-пилот
> отдельным шагом позже.
>
> **✅✅ ЗАКРЫТО (2026-07-12, commit `bd498ed`, не задокументировано вовремя — обнаружено задним
> числом 2026-07-15):** ошибочная гипотеза про Turbopack/file-tracing (см. ниже) отменена в
> `16471b4`. **Реальная причина:** конфликт версий пакета `pg` под bun-hoisting — `db.ts` создавал
> `new Pool()` вручную через одну резолвнутую копию `pg`, а `@prisma/adapter-pg` внутри резолвит
> свою собственную копию; `instanceof Pool`-проверка между разными экземплярами класса не
> проходит, адаптер тихо не распознаёт переданный Pool и создаёт свой **без `connectionString`**
> (дефолт `localhost:5432`) — отсюда обманчивый generic `ECONNREFUSED` (известный баг Prisma,
> `github.com/prisma/prisma/issues/28055`). **Фикс:** передавать `connectionString` напрямую в
> `PrismaPg` вместо готового `Pool`-инстанса. Проверено вживую на s2 — до фикса ECONNREFUSED на
> `::1`/`127.0.0.1:5432`, после — успешный запрос к `form-example-db`.
>
> **Побочная находка (историческая, ошибочная гипотеза, оставлена для контекста):** `/products`
> (единственная страница `form-example` с реальным Prisma-запросом) стабильно падала с
> `ECONNREFUSED` в `prisma.product.findMany()`. Ручная диагностика (прямой `pg.Pool`,
> `PrismaPg`-адаптер, полный `PrismaClient` — все через `docker exec` с теми же версиями/путями,
> что использует рантайм) отработала **без единой ошибки** — расхождение с реальным упавшим
> запросом от скомпилированного Turbopack-чанка не нашла. По аналогии с sharp/mandala
> (Сессия №70) заподозрила недокопированный `.prisma/client` (WASM query-compiler) в per-chunk
> alias-копии `@prisma/client-0443beb3620eded9` — добавила `outputFileTracingIncludes`, файлы
> в образе стали полными (подтвердила `find` внутри контейнера), но ошибка не исчезла. Не
> нашла корень за разумное время (это demo/showcase-приложение библиотеки форм, не критичный
> сервис) — **откатила фикс** (`outputFileTracingIncludes` раздул билд с 17с до 2.6мин без
> результата, плохой размен). Передала находку BronzeForge/IvoryPrairie как отдельный
> незаблокированный баг, не гнала дальше самостоятельно.
>
> **➡️ Следующий старт:** (1) кто-то (не обязательно BlackCove) разбирается с `/products`
> `ECONNREFUSED` в `form-example` — вероятно специфика Prisma 7 driver-adapter + Turbopack
> per-chunk алиасинга, не тривиальная трассировка файлов, как было со sharp; (2) продолжить
> тираж §18.6 Сессии J — `mandala` пропущена в этой волне (инцидент Сессии №70, нужен период
> стабильности), следующие кандидаты: `pravda`, `kami-key-the-landing`, `letar-landing`,
> `animatrona-landing`, `dsperevod`, `aboi`, `umami`, `kami`.

> **Сессия №71 (2026-07-12, нормализация sharp/libvips-фикса после инцидента mandala):**
> Заменила хрупкий хотфикс (Сессия №70, commit `8ba37d8f`) на устойчивое решение —
> `outputFileTracingIncludes` в `next.config.js` с глобом `./node_modules/.bun/@img+sharp-libvips-*/**/*.so*`
> вместо хардкода версии `1.3.2` в `Dockerfile.production`. Next.js standalone tracer теперь
> сам подхватывает `libvips-cpp.so` на этапе `next build` (в `.next/standalone`), явный `COPY`
> в Dockerfile больше не нужен — убрала его из `apps/mandala/Dockerfile.production`.
>
> **Проверила через grep** (`from 'sharp'`/`require('sharp')` в `src/`, вне `scripts/` — те
> билд-тайм, не в runtime-контейнере), баг не специфичен для `mandala`: тот же фикс применён
> ко всем приложениям с runtime-использованием sharp — `mandala`, `driving-school` (submodule),
> `aboi` (submodule), `kami`, `grandslamcup`. `pravda` использует sharp только в
> `scripts/generate-icons.js`/`generate-og-images.ts` (build-time, не runtime) — фикс не нужен.
>
> **Изолированный тест механизма** (Docker `node:24-alpine` + bun workspace вне монорепо,
> т.к. локальная машина — Windows и линуксовый `sharp-libvips-linuxmusl-x64` тут не ставится):
> подтвердила, что (1) в bun workspace (несколько `package.json` в `workspaces`) действует
> isolated-store layout `node_modules/.bun/@img+sharp-libvips-*@<version>/...` — тот же, что
> в `bun.lock` монорепо; (2) `outputFileTracingIncludes` с глобом реально затягивает
> `libvips-cpp.so` в `.next/standalone` при `next build` — воспроизвела на минимальном
> Next.js 16.2.10 App Router проекте с `sharp` в зависимостях, до и после фикса. Полную сборку
> `mandala` на Linux локально не гоняла (тяжело — весь монорепо-workspace) — просит проверки
> BlackCove изолированной сборкой перед следующим деплоем `mandala`/`driving-school`/`aboi`/
> `kami`/`grandslamcup`, как он уже делал для хотфикса (Сессия №70).
>
> **Не сделано:** общий Dockerfile-шаблон/скрипт (второе направление, предложенное BlackCove) —
> не понадобился, `outputFileTracingIncludes` в `next.config.js` каждого приложения решает
> задачу проще и без нового инструмента.

> **Сессия №70 (2026-07-12, §18.6 Сессия J — тираж #3/#4, 🔴 прод-инцидент mandala закрыт):**
> Смигрировала `form-example` (compose, commit `098eb75`, host-порт `3022` был реально
> опубликован — та же схема, что form-docs: сначала обычный деплой перед rollout-label) и
> `mandala` (compose, commit `6aa10fd`, host-порт `${PORT:-3004}` тоже реально опубликован,
> Forward Host в NPM уже задокументирован как `mandala-app` — совпал с новым alias).
>
> Заодно фоновая задача пользователя (спавнена мной ранее при обнаружении секрета) вынесла
> захардкоженный `POSTGRES_PASSWORD` из `apps/form-example/docker-compose.production.yml` в
> `${POSTGRES_PASSWORD}`/`.env.docker.enc` (commit `df5602179` поверх моей миграции) — не
> моя работа в этой сессии, но повлияла на деплой ниже.
>
> **🔴 Прод-инцидент:** обычный (не-rollout) деплой `mandala` формально завершился успешно
> (`exitCode 0`), но `mandala.letar.best` отдавал **500 на каждой странице** — нативный модуль
> `sharp` падал (`ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3`). Дала команду на откат к
> `84dc5080` (последний коммит без изменений в `apps/mandala/`) как самое быстрое надёжное
> восстановление под давлением — не хотела гадать про Dockerfile/toolchain в моменте.
>
> **BlackCove проявил инициативу и остановил откат до применения**, протестировав `84dc5080`
> в изолированном worktree — краш воспроизводился **и там**, значит откат не решил бы проблему
> (не регрессия от моих правок; `bun.lock` для `sharp` идентичен в обоих коммитах). Нашёл
> настоящую причину: Next.js standalone output tracer не копирует `libvips-cpp.so.8.18.3` в
> `.next/standalone` (баг трассировки `dlopen()`-зависимостей — sharp грузит `.so` динамически,
> не через `require()`). Латентный баг, ждал первой полноценной пересборки образа (которую
> спровоцировал мой compose-деплой) — раньше просто не всплывал, потому что образ `mandala`
> давно не пересобирался с нуля. Применил хотфикс — явный `COPY` недостающего `.so`-файла в
> `Dockerfile.production` (commit `8ba37d8f`), протестировал изолированно перед деплоем на
> прод. **Простой ~17 минут (13:13–13:32 MSK).** Прод восстановлен, независимо подтверждено
> (200 OK).
>
> ⚠️ **Хотфикс хрупкий** — путь `@img+sharp-libvips-linuxmusl-x64@1.3.2` захардкожен, версия
> может съехать при следующем апдейте `sharp`/`bun.lock`, баг вернётся. BlackCove предложил
> два направления для устойчивого решения: `outputFileTracingIncludes` в `next.config.js`
> (глоб вместо хардкода версии) ИЛИ вынести фикс в общий Dockerfile-шаблон — баг не специфичен
> для `mandala`, могут словить любые приложения с `sharp` при следующей полной пересборке.
> **Не сделано в этой сессии** — экстренный хотфикс закрыл инцидент, нормализация отдельной
> задачей.
>
> **`mandala.letar.best` пока НЕ на rollout-профиле** — `letar.rollout` в compose остаётся
> закомментированным. После сегодняшнего инцидента приложению нужен период стабильности перед
> следующим риском (supervised rollout-пилот), не гнать сразу следом.
>
> **➡️ Следующий старт:** (1) нормализовать хрупкий sharp/libvips фикс (`outputFileTracingIncludes`
> или общий Dockerfile-паттерн) — самостоятельная задача, затрагивает потенциально все
> приложения с `sharp`, не только `mandala`; (2) проверить статус обычного деплоя `form-example`
> (запрошен, ответ от BlackCove ещё не пришёл на момент конца сессии); (3) продолжить тираж
> §18.6 Сессии J дальше по списку (`pravda`, `kami-key-the-landing`, `letar-landing`, …) —
> `mandala` пока пропустить, вернуться к её rollout-пилоту отдельно, не в этой волне.

> **Сессия №69 (2026-07-12, §18.6 Сессия J — тираж, form-docs ✅ второй пилот закрыт):**
> Первое приложение тиража после `time`. Смигрировала `apps/form-docs/docker-compose.
production.yml` под rollout-профиль (`147c5fe`) — в отличие от `time`, `form-docs` реально
> публиковал host-порт `3020:3020`, поэтому сначала прогнала label выключенным через обычный
> деплой, чтобы отдельно проверить гипотезу «снятие host-port publish не ломает NPM-роутинг»
> без риска путать её с рисками самого rollout-механизма.
>
> Обычный деплой (`deployId a91b3e2c`) неожиданно упал — но не по моей гипотезе: нашла баг в
> `deploy-affected.sh` — наивный `grep -qE "letar\.rollout..."` матчил закомментированную
> строку `#   letar.rollout: 'true'` тоже, ложно заворачивал на rollout-путь, где `doctor`
> корректно, но зря блокировал (label реально не установлен). Прод не пострадал. Пофикшено
> (`grep -v '^\s*#'` фильтрует строки-комментарии до проверки label), commit `4fbc414`.
> Попутно BlackCove подтвердил в NPM: `forms.letar.best` → Forward Host уже `form-docs-app`
> (проверено по `proxy_host/15.conf` на сервере) — гипотеза про alias подтверждена независимо.
>
> Ретрай обычного деплоя (`deployId 78b31444`) прошёл чисто — `forms.letar.best` 307 (i18n
> редирект), 41ms, без прерываний. Гипотеза про host-port publish подтверждена полностью.
>
> Включила `letar.rollout: 'true'` (`9cec89f`), `doctor --app form-docs` — 8/8 ✅ READY.
> Supervised rollout-пилот (`deployId c80afa44`) прошёл **чисто с первой попытки** — все 8
> шагов ✅, без единого бага: `resolveOldContainer()` сразу нашёл `form-docs-app-1` без
> легаси-путаницы (в отличие от `time`, все контейнеры уже были в правильной схеме имён с
> самого начала). `forms.letar.best` 307, 42ms — без прерываний трафика.
>
> **Итог:** rollout-механизм подтверждён на двух разных типах приложений — stateful `time`
> (с БД, легаси-контейнер) и stateless `form-docs` (без БД, host-port publish). Оба фикса из
> пилота `time` (`resolveOldContainer`, `parseArgs strict:false`) сработали штатно без
> повторных багов. Найден и закрыт третий баг (детект label в `deploy-affected.sh`) — не
> специфичен для конкретного приложения, поэтому важен для всего тиража.
>
> **➡️ Следующий старт:** продолжить тираж §18.6 Сессии J пачками 3–5 приложений (см. таблицу
> DoD, PLAN.md строка J). Кандидаты по возрастанию риска: `form-example`, `mandala`, `pravda`,
> `kami-key-the-landing`, `letar-landing`, `animatrona-landing`, `dsperevod`, `aboi`, `umami`,
> `kami` — затем `archetest`/`grandslamcup` (активная разработка, выше риск конфликта с текущими
> сессиями), затем `auth-hub`/`driving-school` (критичные, самый высокий риск — последними).
> Для каждого: проверить наличие/отсутствие `ports:` в текущем compose (как с form-docs — если
> порт реально опубликован, сначала обычный деплой с выключенным label, потом supervised-пилот;
> если порта уже нет — можно сразу пилотировать, как было готово у `time`).

> **Сессия №68 (2026-07-12, §18.6 Сессия G — ✅ ЗАКРЫТА, живой пилот пройден чисто):**
> Раскомментировала `letar.rollout: 'true'` в `apps/time/docker-compose.production.yml`,
> `doctor --app time` — 7/7 ✅ READY. Запросила деплой через BlackCove (Agent Mail,
> thread `time-rollout-pilot-18-6-g`), супервизировала непрерывным curl-мониторингом
> `time.letar.best`.
>
> Первая попытка упала до rollout-логики на постороннем конфликте (untracked
> `apps/driving-school/next-env.d.ts` на s2 блокировал submodule checkout) — расчищено
> с разрешения владельца (стандартный автогенерируемый Next.js файл).
>
> Вторая попытка дошла до `runRollout()` (label сработал, ветвление подтверждено) и упала
> на реальном баге: `libs/deploy-engine/src/cli.ts` — `requireApp()` вызывал `parseArgs()`
> в strict-режиме, который отвергал `--deploy-tag` до того, как его парсит второй
> `parseArgs()` в ветке `rollout`. Пофикшено (`strict: false` + typeof-guard), commit
> `6618e3e`.
>
> Третья попытка дошла до `stop-old` и упала там: `oldContainer` был захардкожен как
> `${projectName}-app-1`, но легаси-контейнер `time-app` (создан ещё под старым compose
> с явным `container_name`, до миграции на rollout-профиль) под эту конвенцию не подходил
> — `docker stop time-app-1` → "No such container". **Прод не пострадал** — на этом шаге
> `nginx-reload-1` уже прошёл, поэтому оба контейнера (`time-app` старый + `time-app-2`
> новый healthy) временно жили под общим nginx-балансом, `time.letar.best` всё время
> отдавал 200. Та же категория бага, что чинили в `dashboard` (`findContainerByName`,
> commit `8de3029`), теперь и в `deploy-engine`. Добавлен `resolveOldContainer()` —
> резолвит единственный существующий контейнер сервиса `app` по compose-лейблам
> (`com.docker.compose.project`/`service`) **до** scale-up, пока их ровно один; требует
> точно 1 совпадение, иначе останавливает rollout, не гадая. 2 новых юнит-теста
> (legacy-имя без суффикса, 0/>1 найденных контейнеров), обновлены существующие под новый
> шаг `resolve-old-container`. 22/22 зелёных, typecheck/lint чисто. Commit `77d023b`.
>
> Попросила BlackCove вручную долить прерванный прогон (`docker stop/rm time-app` +
> повторный `nginx -s reload`) вместо полного ретрая — свежий `resolveOldContainer()`
> увидел бы оба живых контейнера сразу и отказался бы выбирать. Дочистка прошла чисто,
> `docker ps -a` на s2 без зависших пар. **Финальный чистый ретрай** (`deployId`
> `1b6fd716`) прошёл все 8 шагов rollout без единого ❌ — `doctor` →
> `resolve-old-container` → `scale-up` → `wait-healthy` → `nginx-reload-1` → `stop-old`
> → `rm-old` → `nginx-reload-2`. `time-app-3` (финальный, `time:77d023bd3`) healthy,
> `time.letar.best` 200 OK на протяжении всего пилота (независимо проверено мной и
> BlackCove).
>
> **Итог: DoD §18.6 Сессии G выполнен.** Zero-downtime rollout-механизм `deploy-engine`
> подтверждён живым прогоном на production, 2 найденных бага закрыты и покрыты тестами.
> Механизм готов к обычной эксплуатации для `time` и, вероятно, для остальных приложений
> после их миграции на rollout-профиль compose (по образцу `apps/time/docker-compose.
production.yml`).
>
> **➡️ Следующий старт:** тираж rollout-профиля на другие приложения (по одному, с тем же
> паттерном doctor-гейта) — начать с определения приоритета (какое приложение следующим:
> высокий трафик выигрывает больше всего от zero-downtime, но и риск выше). Отдельно —
> неделя warn-only e2e-gate (сессия F, независимая ветка) продолжается до 2026-07-18.

> **Сессия №67 (2026-07-12, §18.6 Сессия G — 🟢 блокер снят, `time` мигрирован, живой пилот
> ЕЩЁ НЕ проведён):** Закрыл блокер, найденный в сессии №66. Добавил
> `apps/dashboard/src/lib/server-client/find-container.ts` — `findContainerByName()` резолвит
> контейнер по точному имени (как раньше) ИЛИ по `<name>-N` с числовым суффиксом (дефолтная
> нумерация docker compose без `container_name`), не любому префиксу — это исключает
> ложные совпадения вроде `<name>-worker`. При нескольких живых репликах (окно rollout) берёт
> `-1` детерминированно. Подключил в 4 местах, где раньше было точное сравнение имени:
> `api/apps/[app]/{status,stats,logs}/route.ts`, `api/docker/containers/by-name/[name]/status/
route.ts`, `api/servers/[id]/apps/[appId]/deploy/route.ts` (последний — локальный restart-путь,
> тот же класс бага). Sanity-check вручную (6 кейсов: точное имя, одна реплика без
> container_name, обе реплики во время rollout, отсутствие совпадения, не-ложное срабатывание на
> `-worker`, экранирование спецсимволов в имени приложения для regex) — все ожидаемо.
> `nx typecheck:tsgo`/`nx lint dashboard` зелёные. **Юнит-тестов на `findContainerByName` нет** —
> у `dashboard` до сих пор не настроен vitest вообще (известный преэкзистентный пробел,
> `.claude/docs/unit-testing.md`), заводить его целиком — отдельная задача не в скоупе этой сессии.
>
> ⚠️ Заодно поймал: `nx run dashboard:format` реформатировал 109 файлов сразу (§20 —
> рассинхрон форматтера, уже задокументированная проблема) — не закоммитил, откатил всё кроме
> 6 файлов, которые редактировал сам (`git checkout --` по списку, не bulk).
>
> Пересоздал миграцию `apps/time/docker-compose.production.yml` под rollout-профиль (тот же
> контент, что готовил и откатывал в сессии №66) — теперь безопасна: `doctor --app time` даёт
> 6/7 required ✅ (только `letar.rollout`-label намеренно не выставлен). Закоммичено и запушено —
> **и dashboard-фикс, и time-compose** (в сессии №66 либо код без побочных эффектов, либо явно
> не коммитился; здесь коммичу обе части).
>
> **Живой пилот rollout НЕ проведён** — сознательно. Первое включение label + реальный
> `docker compose --scale app=2` + `nginx -s reload` на проде требует непрерывного curl-
> мониторинга в реальном времени (собственный DoD сессии G) — риск (непроверенное мультиIP-
> поведение NPM, см. §18.6) оправдывает супервизируемый заход, а не автономный fire-and-forget
> в рамках одного хода.
>
> **➡️ Следующий старт:** включить `letar.rollout: 'true'` в `apps/time/docker-compose.
production.yml` (раскомментировать) → супервизируемый живой прогон: закоммитить/запушить →
> запросить продовый деплой `time` (через deploy-mcp или BlackCove) → параллельно curl-цикл на
> `https://time.letar.best` → наблюдать `deploy_status`/логи rollout → подтвердить 0 отказов
> перед закрытием сессии G (таблица DoD, PLAN.md §18.6). Параллельно продолжается неделя
> warn-only e2e-gate до 2026-07-18 (сессия F, независимая ветка).

> **Сессия №66 (2026-07-12, §18.6 Сессия G — 🟡 `rollout` реализован, живой пилот НЕ проведён,
> найден блокер миграции):** По разрешению владельца («деплой можешь сам дёргать без деплой
> агента») продолжил без остановки на BlackCove. Реализовал `runRollout()` в `@letar/deploy-engine`
> — полный docker-rollout-паттерн из §18.6 (doctor-гейт → `scale app=2` → poll healthy нового
> контейнера `<project>-app-2` → `nginx -s reload` в `nginx-proxy-manager` (канонический
> `container_name` подтверждён по `infra/nginx-proxy-manager/docker-compose.yml`) → stop+rm
> старого `<project>-app-1` → повторный reload), каждый шаг короткозамкнут на первом провале.
> 5 новых unit-тестов на мокнутом executor (полная последовательность, gate без doctor, провал на
> каждом шаге, таймаут healthy) — 20/20 в либе. `deploy-affected.sh` (строка ~977) заветвлён по
> label `letar.rollout: 'true'` в compose (grep по файлу) → вызывает `rollout` вместо
> `--force-recreate`; ветка сейчас dead code — ни один compose ещё не выставляет label. Коммит
> синтаксис проверен (`bash -n`).
>
> **🔴 Найден блокер (не в исходном плане §18.6):** `doctor`'ская проверка `no-container-name`
> требует убрать `container_name` из compose (нужно для `--scale app=2`), но `apps/dashboard`
> ищет контейнер приложения по **точному** имени (`DeployedApp.containerName` из
> `prisma/seed.ts` + legacy `CONTAINER_NAME_MAP`, роуты `api/apps/[app]/{stats,status,logs}`) —
> без `container_name` реальное имя становится `<project>-app-1` (дефолт compose), точное
> совпадение ломается, Dashboard тихо теряет stats/logs/status для приложения. **Это ломается уже
> на старом force-recreate пути**, не только при живом rollout — значит убирать `container_name`
> небезопасно для ЛЮБОГО приложения, пока Dashboard не научится резолвить контейнер по network
> alias/label вместо точного имени. Подготовил и локально проверил (`doctor --app time` — 6/7 ✅,
> только label намеренно не выставлен) миграцию `apps/time/docker-compose.production.yml` под
> rollout-профиль — **не закоммитил**, откатил (`git checkout --`), чтобы не сломать мониторинг
> `time` в Dashboard следующим же обычным деплоем. Задокументировано в README `deploy-engine`.
>
> Код запушен (`libs/deploy-engine` + `deploy-affected.sh`), Dashboard/compose-миграция — нет.
> Продакшен не трогал: и rollout, и branching в bash — код без побочных эффектов сегодня (label
> нигде не установлен, `time` compose не менялся).
>
> **➡️ Следующий старт:** новая задача перед продолжением G — научить Dashboard резолвить
> контейнер приложения по network alias (`<app>-app`) или Docker label вместо точного имени
> (`apps/dashboard/src/app/api/apps/[app]/{stats,status,logs}/route.ts` + `CONTAINER_NAME_MAP` +
> `DeployedApp.containerName`). Только после этого — миграция `time` (файл уже готов в этой
> сессии, нужно будет пересоздать) → включение label → живой пилот rollout с непрерывным
> curl-мониторингом (исходный DoD сессии G). Параллельно продолжается неделя warn-only e2e-gate
> до 2026-07-18 (сессия F, независимая ветка).

> **Сессия №65 (2026-07-11, §18.6 Сессия E — ✅ каркас `libs/deploy-engine`):** Реализован
> Nx-lib `@letar/deploy-engine` (`libs/deploy-engine/`) по спецификации §18.6: интерфейс
> `DeployEngineExecutor` (`runCommand`/`readFile`/`writeFile`/`fileExists`, продакшен-реализация
> `createNodeExecutor()` через `execFile`, не shell `exec`) — вся docker/git/файловая логика
> движка тестируется без живого Docker. `runDoctor(executor, app)` читает
> `apps/<app>/docker-compose.production.yml` и проверяет 6 обязательных условий готовности к
> rollout (нет `container_name`/`ports`, network alias `<app>-app` на `kami-network`,
> `healthcheck`, image через `${DEPLOY_TAG:-latest}`, label `letar.rollout: 'true'`) + 1
> info-проверку (`stop_grace_period`, не блокирует). Схема deploy-manifest (`zod`,
> `.deploy-manifest/<app>.json`: `deployId`/`sha`/`imageTag`/`migrationsApplied[]`/`timestamp`)
>
> - `readManifest`/`appendManifestEntry`/`latestEntry`/`entryBySha`. `getStatus()` — сводка
>   последнего деплоя. CLI (`src/cli.ts`, `bun run libs/deploy-engine/src/cli.ts doctor|status
--app <app>`) выходит с кодом 1 при not-ready — на этом позже завяжется `rollout`
>   («отказывается работать без пройденного doctor», сессия G).
>
> **DoD подтверждён вживую:** `doctor --app grandslamcup` на текущем (немигрированном)
> `apps/grandslamcup/docker-compose.production.yml` корректно репортует NOT READY с 5
> проваленными обязательными проверками (container_name/ports/alias/DEPLOY_TAG/label) и 1
> прошедшей (healthcheck, есть с сессии №53) — ровно то поведение, которое ожидалось от ещё не
> подключённого к rollout приложения. `status --app grandslamcup` корректно возвращает
> `latest: null` (ещё ни одного деплоя через движок). 15/15 unit-тестов (`doctor`/`manifest`/
> `executor`, in-memory executor в спеках — без реального Docker/ФС), `lint`
> (0 ошибок, 4 некритичных `no-console` warning в CLI-выводе), `typecheck:tsgo` — все зелёные.
> README задокументирован. Деплой не запускался и не менялся — движок пока не подключён ни к
> `deploy-affected.sh`, ни к dashboard-agent (это strangler-шаг сессии G).
>
> **➡️ Следующий старт:** сессия G — команда `rollout` + пилот на `time` (compose-миграция
> `time`: healthcheck, alias `time-app`, минус `container_name`/`ports`, `DEPLOY_TAG`, label;
> ветвление в `deploy-affected.sh` по label). Параллельно продолжается неделя warn-only e2e-gate
> до 2026-07-18 (нужен ≥1 живой warn-деплой grandslamcup для сессии F — независимая от E/G ветка).

> **Сессия №64 (2026-07-11, §18.6 — Фаза 3 решена и спроектирована: `libs/deploy-engine`):**
> Подтверждён итог сессии №63 через deploy-mcp и тред `grandslamcup-staging-pilot` (24/28,
> auth-цепочка зелёная). Владелец принял решения по Фазе 3: **(а) `libs/deploy-engine`**
> (TS + docker-rollout-паттерн), не Kamal; **hard gate без обхода** (fail-closed, без
> force-флага); тираж staging-e2e пока только grandslamcup; **пилот rollout — `time`**;
> каркас (сессия E) можно начинать сразу, gate (F) — после недели warn-only (2026-07-18).
> Архитектура проработана (исследование кода + ресёрч docker-rollout/agentic-практик) и
> записана в §18.6: network alias `<app>-app` (NPM Forward Host не меняется), strangler
> через opt-in compose-label, `E2E_GATED_APPS` в infra-config, rollback с deploy-manifest
> и `migrationWarning`, doctor как enforcement healthcheck-стандарта (сейчас 5/23). План
> сессий E–J с DoD — таблицей в §18.6. Коммит `e11527a`. Задача на 4 оставшихся e2e-теста —
> `apps/grandslamcup/PLAN.md` п.37 (закоммичено в `7e34567` вместе с итогами №63).
>
> **➡️ Следующий старт:** сессия E — каркас `libs/deploy-engine` (`doctor`+`status`, executor-
> инъекция, схема манифеста, юнит-тесты); можно сразу, деплой не трогает. Параллельно: неделя
> warn-only до 2026-07-18 (нужен ≥1 живой warn-деплой grandslamcup для сессии F).

> **Сессия №63 (2026-07-11, §18 — ✅ ЗАКРЫТО: живой staging-пайплайн grandslamcup, 24/28 passed):**
> BlackCove передеплоил `dashboard-agent` 0.7.4 (подтверждён рабочим — `--preserve-env` доставляет
> `BASE_URL`/`DEV_SESSION_TOKEN` корректно, root-owned `.nx` не возникает). Прогон `run_e2e` упал на
> последней мелочи: `apps/grandslamcup-e2e/src/global-setup.ts` искал cookie
> `better-auth.session_token` точным именем, не учитывая `__Secure-` префикс из `useSecureCookies`
> (0.8.2, сессия №60) — `dev-session` ставил cookie корректно (`__Secure-better-auth.session_token`),
> но global-setup её не находил и падал ещё до тестов. С разрешения Ками BlackCove поправил файл
> напрямую (не свой контур, но простой однострочный фикс) — заменил точное сравнение на поиск по
> суффиксу (`cookie.name.endsWith(...)`), коммит `50d72bc`.
>
> **Итог: 24/28 passed.** `03-admin.spec.ts` зелёный (было 0/7 из-за трёх auth-багов сессий
> №58–60). Оставшиеся 4 — все тестовые, не инфраструктура: 2 locator strict-mode violations
> (несколько совпадающих элементов на странице), 1 — «Ближайшие матчи» не рендерится (вероятно нет
> будущих дат в анонимизированном снепшоте), фикс редиректа/cookie эти три не блокирует.
>
> **§18 Сессия D (живой staging-пайплайн grandslamcup) закрыта.** Паттерн `createDevSessionRoute`
>
> - `useSecureCookies` + suffix-based cookie lookup в `global-setup.ts` — эталон для тиража на
>   будущие staging-e2e приложения (§18.6), задокументирован в `.claude/docs/e2e-testing.md`.

> **Сессия №62 (2026-07-11, §18 — регрессия dashboard-agent: `sudo -u deploy` сбросил env):**
> BlackCove задеплоил фикс root-owned `.nx` (0.7.3) — сработал, root-owned файлов больше нет. Но
> `sudo -u deploy -H` по умолчанию **сбрасывает окружение процесса** (та же ловушка, что уже была
> задокументирована для `SOPS_AGE_KEY_FILE` в `deploy-affected.sh`) — `BASE_URL`/`DEV_SESSION_TOKEN`
> не долетали до `bunx nx e2e` после `exec sudo`. Playwright не увидел уже поднятый staging (не
> нашёл `baseUrl` живым), поднял свой `nx dev grandslamcup` (`webServer.command` в
> `playwright.config.ts`), который подключился к **dev-БД** (порт 5453 из закоммиченного `.env`,
> не staging) → `ECONNREFUSED` каскадом на все 28 тестов ещё на этапе поднятия webServer, до
> реальных тестов.
>
> **Fix (`dashboard-agent` 0.7.3→0.7.4):** `sudo -u deploy -H --preserve-env=BASE_URL,DEV_SESSION_TOKEN`
> вместо голого `sudo -u deploy -H`.
>
> **➡️ Следующий старт:** BlackCove — передеплоить dashboard-agent (0.7.4) + grandslamcup (0.8.2,
> из сессии №60, если ещё не подтянут), повторить `run_e2e`. Инфраструктура (staging-снепшот,
> admin-фикстура) стабильна, дело за самим прогоном.

> **Сессия №61 (2026-07-11, §18 — итог + зафиксирован технический долг `createDevSessionRoute`):**
> Wrap-up сессий №58–60. Обновлены `apps/grandslamcup/PLAN.md`/`PLAN_COMPLETED.md`,
> `apps/dashboard-agent/PLAN_COMPLETED.md` итогами трёх фиксов. Agent-mail сессия завершена
> (`retire_agent`). По пути дважды поймал и откатил постороннее переформатирование от
> `.claude/hooks/auto-format.js` (см. §20) — коммит `74c1082`.
>
> **🟡 Технический долг записан как TODO в коде (`createDevSessionRoute`):** фабрика вручную
> реплицирует внутренний формат подписи cookie `better-call` (не публичный API Better Auth,
> найдено чтением исходников при разборе бага №3) вместо вызова `auth.api.signInEmail`/аналога.
> Архитектурный компромисс ради простоты — если Better Auth сменит формат подписи или имя cookie в
> будущей версии, фабрика молча разойдётся с ним: тот же класс бага, что уже трижды ловили здесь
> (баг выглядит снаружи валидным — cookie есть, — но `getSession()` её не находит). **Нет теста**,
> который бы это ловил заранее. Предложение (не реализовано, вне скоупа сессии): unit/integration-
> тест, создающий сессию через `createDevSessionRoute` и проверяющий, что реальный
> `auth.api.getSession()` (или тестовый `betterAuth()`-инстанс) её распознаёт.
>
> **➡️ Следующий старт:** BlackCove — передеплоить staging (после коммита №60 версия 0.8.2),
> повторить `run_e2e`. Отдельно, не срочно: завести тест на распознавание dev-session cookie
> настоящим Better Auth (см. TODO выше) — предохранит от тихой поломки при апгрейде `better-auth`.

> **Сессия №60 (2026-07-11, §18 — третий баг dev-session: `__Secure-` cookie-префикс):**
> BlackCove задеплоил фикс редиректа (0.8.1), подтвердил `location` теперь верный, но
> `03-admin.spec.ts` всё ещё падал — `/admin` со свежепоставленной cookie редиректило на
> `/sign-in`. Проверка БД показала: сессия реальна и валидна (`userId`/`token`/`expiresAt` в
> порядке), значит проблема не в данных, а в том, как Better Auth читает cookie.
>
> Разобрал исходники `better-auth`/`better-call` (не документировано публично): Better Auth сам
> вычисляет имя cookie через `createCookieGetter` — если `baseURL` (обычно `BETTER_AUTH_URL`)
> начинается с `https://` (staging/prod), реальное имя `__Secure-better-auth.session_token`,
> а не голое `better-auth.session_token`; без атрибута `Secure` браузер вообще не примет такую
> cookie (`__Secure-` prefix requirement, RFC 6265bis). `createDevSessionRoute` ставил cookie под
> именем без префикса — cookie физически создавалась и была валидна в БД, но `getSession()` искал
> её под другим именем и не находил → защищённые страницы решали, что сессии нет.
>
> **Fix (`@letar/auth` 0.8.1→0.8.2):** новая опция `useSecureCookies` (по умолчанию —
> `BETTER_AUTH_URL?.startsWith('https://')`, тот же источник, что передают как `baseURL`)
> добавляет `__Secure-` префикс и `Secure`-атрибут, повторяя логику самого Better Auth.
>
> **➡️ Следующий старт:** BlackCove — передеплоить staging (подтянет 0.8.2), повторить `run_e2e`.
> Три инфраструктурных бага dev-session (NODE_ENV, редирект 0.0.0.0, cookie-префикс) должны быть
> закрыты — ожидаем зелёный `03-admin.spec.ts`.

> **Сессия №59 (2026-07-11, §18 — второй баг dev-session: редирект на `0.0.0.0`):** BlackCove
> прогнал сессию №58 на живом s3 и нашёл ещё один реальный баг (не инфра) — потратил время на
> ложные следы (root-owned `.nx`/Nx daemon от чужого пользователя, Chromium sandbox), но настоящая
> причина падений `03-admin.spec.ts` после фикса NODE_ENV: `createDevSessionRoute` строил редирект
> через `new URL(redirect, request.url)`, а `request.url` за Docker port-forward/NPM reverse-proxy
> резолвится во **внутренний bind-адрес контейнера** (`http://0.0.0.0:<port>/...` — Next.js
> standalone слушает `0.0.0.0`), не в клиентский host:port. Cookie сессии ставилась корректно
> (`curl -v` подтвердил `Set-Cookie`), но браузер получал `307 → http://0.0.0.0:3016/admin` →
> `ERR_CONNECTION_REFUSED`.
>
> **Fix (`@letar/auth` 0.8.0→0.8.1):** base URL для редиректа резолвится из заголовков
> `x-forwarded-host`/`host` (+ `x-forwarded-proto` для схемы) вместо `request.url`, с фолбэком на
> `request.url` если заголовков нет (локальный `nx dev` без прокси).
>
> Побочные находки BlackCove для будущих staging-e2e (§18.6, не блокируют, отдельная задача): Nx
> daemon на s3 может залипнуть от случайного непривилегированного запуска и потом обслуживать все
> вызовы через IPC независимо от того, кто их делает (`bunx nx daemon --stop` перед важными
> прогонами); headless Chromium sandbox требует root/CAP_SYS_ADMIN — работает только через
> dashboard-agent; `.nx`/`test-output` на s3 становятся root-owned при root-стартующих прогонах —
> нужно поправить сам механизм переключения на `deploy` в deploy-скриптах.
>
> **➡️ Следующий старт:** BlackCove — передеплоить staging (подтянет `@letar/auth` 0.8.1),
> повторить `run_e2e`. Ожидается закрытие всех 7 `03-admin.spec.ts`.

> **Сессия №58 (2026-07-11, §18 — системное решение по dev-session/NODE_ENV):** Закрыт
> архитектурный блокер из сессии №57 (7 падений `03-admin.spec.ts`) — **системно, не точечным
> фиксом в grandslamcup**, потому что §18.6 планирует тиражировать staging-e2e пайплайн на другие
> приложения и следующий кандидат наступил бы на те же грабли.
>
> Роут `/api/auth/dev-session` вынесен в переиспользуемую фабрику **`createDevSessionRoute`** в
> `@letar/auth/server` (0.7.0→0.8.0, `libs/auth/src/server/factories/create-dev-session-route.ts`).
> Решение по защите (выбрано пользователем из 3 вариантов): **флаг + секретный токен**.
> `ALLOW_DEV_SESSION === 'true'` включает роут, `DEV_SESSION_TOKEN` сравнивается constant-time
> (`node:crypto timingSafeEqual`) с параметром `token`/заголовком `x-dev-session-token`. Fail-closed:
> если флаг включён, но токен не задан — 403, а не открытый доступ. Даже случайная утечка флага в
> прод-конфиг не открывает бэкдор без отдельно сгенерированного токена.
>
> **Новое правило в `env-files.md`:** `ALLOW_DEV_SESSION`/`DEV_SESSION_TOKEN` — только
> `.env.staging`/`.env.local`, никогда `.env.docker`/`.env.docker.enc`.
>
> Заодно починена ложноположительная проверка в `apps/grandslamcup-e2e/src/global-setup.ts` —
> `waitForURL('**/admin**')` совпадал с URL и успешного, и провального (403) запроса из-за
> `redirect=/admin` в query dev-session; теперь проверяется факт установки cookie
> `better-auth.session_token`.
>
> Паттерн (проблема + решение + анти-паттерн `waitForURL`) задокументирован в
> `.claude/docs/e2e-testing.md` — новый раздел «E2E-логин без OIDC на staging». `apps/grandslamcup/
PLAN.md` (пункт про `03-admin.spec.ts`) и `.env.staging.example`/`.env.local` обновлены.
>
> **➡️ Следующий старт:** BlackCove — сгенерировать `DEV_SESSION_TOKEN` (`openssl rand -base64 32`)
> и прописать `ALLOW_DEV_SESSION=true`+`DEV_SESSION_TOKEN` в `.env.staging` на s3, пересобрать
> staging-образ (подтянет `@letar/auth` 0.8.0), повторить `run_e2e` — ожидается закрытие всех 7
> `03-admin.spec.ts`. Локаторные (2) и данные-related (1) провалы — отдельная небольшая задача.

> **Сессия №57 (2026-07-11, §18 — снепшот пересобран, 3/28→18/28, найден архитектурный блокер):**
> BlackCove пересоздал staging-снепшот с фиксом анонимизации. По пути найдено ещё 2 бага:
> (1) в `.env.staging` не было `DATABASE_URL` — скрипты подхватывали закоммиченный dev `.env`
> (прод-порт 5453) → `ECONNREFUSED`; (2) **🔴 критично** — `POSTGRES_PASSWORD` через
> `openssl rand -base64 32` содержал `+`/`/`/`=`, ломавшие парсинг `DATABASE_URL` при
> интерполяции в `docker-compose.staging.yml` → **все страницы staging отдавали 500** с самого
> первого деплоя (прогон 3/28 шёл на неработающем приложении, а не на «недостающих данных»).
> Перегенерирован через `openssl rand -hex 32`. **Урок на будущее для любого staging-провижена:**
> значения, интерполируемые в connection string/URL — генерировать через `-hex`, не `-base64`
> (спецсимволы `+`/`/`/`=` не экранируются автоматически).
>
> Также найден `admin@grandslamcup.ru` — оказался НЕ seed-данными, а ручным staging-fixture из
> старой БД (создан кем-то вручную, ни один скрипт его не воспроизводит); BlackCove пересоздал
> вручную (роль ADMIN + `CityOrganizer` на оба города).
>
> **Результат: 18/28 passed** (было 3/28). Осталось 10, разбито на 3 категории:
>
> - **7 — `03-admin.spec.ts` (архитектурный блокер, НЕ тривиальный фикс):** `/api/auth/dev-session`
>   проверяет `NODE_ENV === 'production'`, но Next.js standalone-сборка **всегда** выставляет
>   `NODE_ENV=production` вне зависимости от env — dev-session структурно не может работать на
>   собранном staging-образе. Плюс `global-setup.ts` `waitForURL('**/admin**')` ложно совпадает с
>   самим URL dev-session (`redirect=/admin` в query) — все прошлые прогоны показывали «Admin
>   авторизован» даже получив 403, маскируя проблему всё время.
> - 2 — locator strict-mode violations («Расписание», «Команды») — не продакшн-баги.
> - 1 — «Ближайшие матчи» не рендерится на `/spb` — вероятно, нет матчей с датой в будущем
>   относительно текущего времени сервера в снепшоте.
>
> **➡️ Следующая задача (по решению владельца):** архитектурное решение по dev-session/NODE_ENV —
> заменить проверку `NODE_ENV === 'production'` на отдельный явный флаг (например
> `ALLOW_DEV_SESSION=true` в `.env.staging`, отсутствует в прод-конфиге по умолчанию) — нужно
> тщательно спроектировать, чтобы не открыть дверь для обхода авторизации на реальном проде.
> Заодно почистить `global-setup.ts`: `waitForURL('**/admin**')` даёт ложноположительный результат
> из-за совпадения с query-строкой самого dev-session URL — заменить на более строгую проверку
> (например `page.waitForURL(url => url.pathname === '/admin')` вместо wildcard-паттерна).
> Подробности — `apps/grandslamcup/PLAN.md` пункт 37, `PLAN_COMPLETED.md`, тред agent-mail
> `grandslamcup-staging-pilot`.

> **Сессия №56 (2026-07-11, §18 — разбор e2e-провалов, настоящая причина найдена):** Гипотеза про
> отсутствие активного сезона (сессия №55) **не подтвердилась**. Реальная причина: скрипт
> `anonymize-staging-db.ts` анонимизировал **все** email в `User`, включая служебный
> e2e/dev-session fixture `admin@grandslamcup.ru` (`global-setup.ts` логинится через
> `/api/auth/dev-session?email=admin@grandslamcup.ru`, без OIDC). Без существующего юзера
> `dev-session` создаёт **новый несвязанный** аккаунт (без `CityOrganizer`/`Player`-связей) →
> `getByText('Claude Admin')` не находит имя → каскад по всем admin-зависимым тестам (сезоны/
> команды не видны новому несвязанному admin'у, не из-за отсутствия данных). **Fix:**
> `admin@grandslamcup.ru` исключён из анонимизации (`WHERE email != ...`). Коммит `ace1f8d`.
>
> **Alt-баг подтверждён по логу и починен:** `getByAltText('Grand Slam Cup')` резолвился ровно в
> 2 элемента (`header` + hero на `/`) — оба легитимны для доступности (одно и то же изображение).
> Тест `01-public.spec.ts` теперь скоупит через `page.locator('header')`.
>
> **Найдено, но не починено (нужна проверка BlackCove):** `/teams` (глобальный, без city-фильтра)
> показывает 0 команд на staging — `Team` не анонимизируется и не исключён из `pg_dump`, должен
> был восстановиться как `Player` (849 строк). Либо частичный `pg_restore`, либо реально 0 строк
> в проде (маловероятно) — просьба отправлена BlackCove, тред `grandslamcup-staging-pilot`.
>
> **✅ Закрыто:** `01-public.spec.ts` обновлён под мультигород (коммит `8817da8`). `/` — city-
> selector без меню (`buildNavItems` возвращает `[]` на root, nav-config.ts), секции «Ближайшие
> матчи»/«Таблица»/«Последние результаты» и меню навигации живут только на `/[citySlug]` —
> тесты теперь делают `goto('/spb')` перед проверкой (вынесено в отдельный describe «Дашборд
> города»). Команды/Поэты/Стадионы (`/teams`, `/players`, `/venues`) не тронуты — это намеренно
> глобальные страницы без city-фильтра, их провал — отдельный вопрос данных (см. ниже).
>
> **➡️ Следующий старт:** дождаться пересозданного BlackCove staging-снепшота (с фиксом
> анонимизации) → повторный `run_e2e` → должны остаться зелёными все тесты кроме тех, что упираются
> в `/teams`-пустоту (отдельная находка выше, ждёт проверки BlackCove).

> **Пост-пилот (2026-07-11, BlackCove):** Три пункта из «следующего старта» сессии №55 закрыты.
> (1) NPM на s3 задокументирован в `infra/nginx-proxy-manager/README.md`. (2) `deploy-affected.sh`
> теперь всегда собирает `libs/zenstack-form-plugin` перед `zenstack:generate` (nx-кэш делает
> повторные вызовы бесплатными) — закрывает баг, найденный при первом деплое на свежий s3.
> Коммит `fc832df`. (3) **Найдена и закрыта PII-утечка:** leftover `grandslamcup-staging-app/-db`
> на s2 (создан ещё 18.04.2026, я ошибочно предположил в предыдущей записи, что это свежий тест
> FrostySnow — нет, гораздо старше) оказался **необезличенной копией прод-БД** (16 пользователей,
> 0 анонимизированы), публично открытой на `0.0.0.0:5454`/`0.0.0.0:3018` несколько месяцев. Не
> просто «прибрался» — переспросил Kami явно, получил подтверждение, `docker compose down -v` +
> удалён osиротевший том другого compose-проекта (`grandslamcup_grandslamcup-staging-data`, тоже
> с данными, без привязанного контейнера). Оба тома с данными удалены безвозвратно.
>
> **Осталось из следующего старта:** (1) владельцу фичи grandslamcup — E2E-провалы (25/28,
> вероятно отсутствие активного сезона в анонимизированном снепшоте + дублирующийся `alt` на
> логотипе); (2) hard gate §18.6 Фаза 3 — после недели наблюдения warn-only.

> **Сессия №55 (2026-07-11, §18 Сессия D — живой пилот доведён до конца, BlackCove):**
> Выполнен полный чек-лист из `grandslamcup-staging-pilot` (расширенный коммитом `8564663` —
> реальный HTTPS-домен + анонимизированный прод-снепшот вместо localhost/пустой БД).
>
> **Домен переименован** `grandslamcup.stage.s3` → **`grandslamcup-stage.s3.letar.best`**
> (дефис вместо точки) — двухлейбловый вариант не матчит существующий DNS wildcard
> `*.s3 CNAME s3.letar.best` (wildcard матчит только один лейбл). Правки в
> `apps/auth-hub/prisma/seed.ts`, `.env.staging.example`, `deployment.md` — коммит `adcdb4b`.
> Заодно найден и исправлен PORT-баг в `docker-compose.staging.yml`: `${PORT:-3018}`
> интерполировался и в маппинг портов, и (через `env_file`) внутрь контейнера — хостовый порт
> захардкожен, `PORT` теперь однозначно внутренний.
>
> **Инфраструктурные баги, найденные и починенные по пути (все не специфичны для grandslamcup —
> блокировали бы любое приложение на s3):**
>
> 1. Untracked-файлы (`next-env.d.ts`, Playwright auth-фикстуры, `test-output/`) в submodule
>    `driving-school`/`driving-school-e2e` валили **весь** `git pull --recurse-submodules` на s3 →
>    падал любой деплой, не только grandslamcup. Вычищено.
> 2. `libs/zenstack-form-plugin/dist` (gitignored) не был собран на свежем s3 — `zenstack:generate`
>    падал с «Cannot find plugin module». Собран вручную (`nx run @letar/zenstack-form-plugin:build`).
> 3. `apps/dashboard-agent/src/routes/e2e.ts` спавнил `nx` напрямую внутри контейнера, где nx
>    физически нет (`spawn nx ENOENT`) — первый живой e2e-прогон падал сразу. Переделано на
>    `nsenter -t 1 -m -u -n -i` в host-namespace (как в `deploy.ts`). Заодно найдена и закрыта
>    **command injection**: параметр `project` из POST-body шёл в shell-строку без валидации —
>    добавлена та же regex-проверка, что у `app`. Коммит `2124454`, dashboard-agent `0.7.0→0.7.1`.
>
> **Прод-снепшот и анонимизация:** `pg_dump` на s2 (исключены `Account`/`Session`/`Verification`/
> `consentLog`/`PushSubscription` флагами `-T`) → TRUNCATE + `pg_restore --data-only` на s3 →
> `anonymize-staging-db.ts`. Найден и исправлен баг скрипта: `DATABASE_URL` с base64-паролем без
> URL-энкодинга падал на парсинге (пароль содержал `+`/`/`/`=`) — исправлено `encodeURIComponent`.
> Проверено: email вида `user-*@staging.invalid`, `Account`/`Session` — 0 строк, `Player` 849 /
> `Match` 316 на месте.
>
> **Публичный домен:** NPM на s3 уже был поднят (не задокументирован в
> `infra/nginx-proxy-manager/README.md` — TODO на будущее). DNS не трогали — wildcard уже
> покрывал новый домен (подтверждено внешним DoH-резолвером с самого s3, локальный DNS в
> sandboxed-окружении не соответствует реальности). NPM-креды нашлись в памяти
> (`reference_npm_s3.md`) — дефолт `admin@example.com/changeme` не подошёл. Proxy Host создан
> через NPM API: форвард на `172.17.0.1:3018` (хост-гейтвей docker0, не `docker network connect` —
> NPM и staging-compose в разных Docker-сетях). Let's Encrypt HTTP-01 сертификат выпущен с первого
> раза (истекает 2026-10-09). `https://grandslamcup-stage.s3.letar.best` → 200, валидный TLS.
>
> **E2E — инфраструктурно успешен, содержательно 3/28 passed.** Пайплайн `deploy_app(staging)` →
> `run_e2e` → `e2e_status` отработал end-to-end первый раз в истории. Но большинство тестов
> ожидают контент активного текущего сезона на `/` (ближайшие матчи/таблица/результаты) —
> анонимизированный снепшот, похоже, не содержит такого сезона (исторические данные). Один
> найденный баг похож на настоящий: `getByAltText('Grand Slam Cup')` матчит 2 элемента
> (дублирующийся `alt` на логотипе в шапке) — не чинил, вне скоупа деплой-агента.
>
> **Gate:** production НЕ деплоился — e2e не прошёл, содержательного повода не было.
> `checkE2eGate` на реальном прод-деплое покажет warn «e2e упал», не заблокирует.
>
> **Не блокирует, но замечено:** на s2 остался leftover `grandslamcup-staging-app/-db`
> (докер>3ч) — вероятно, остаток раннего локального теста FrostySnow до пивота на домен, не
> тронут, стоит почистить отдельно.
>
> **➡️ Следующий старт:** (1) владельцу фичи grandslamcup — разобраться с E2E-провалами
> (недостающий активный сезон в снепшоте / дублирующийся alt на логотипе); (2) почистить leftover
> staging на s2; (3) документировать NPM на s3 в `infra/nginx-proxy-manager/README.md`
> (сейчас там только s1/s2); (4) решить, стоит ли добавить сборку `zenstack-form-plugin` в
> `deploy-affected.sh` явно, чтобы не полагаться на ручной прогрев нового сервера; (5) после
> недели наблюдения warn-only gate — решение по hard gate (§18.6, Фаза 3).

> **Сессия №53 (2026-07-10, §18 Сессия D — код готов, ждём s3):** Продолжение с того места, где
> остановилась сессия №52. **Отправлен формальный `deploy-request` BlackCove** (тред
> `provision-s3-dashboard-agent`) на подъём dashboard-agent на s3 — конфиг-часть (`AGENT_TOKEN_S3`,
> `docker-compose.s3.yml`) была готова с сессии №52, но физически контейнер ещё не поднят
> (`agent_health({server:"s3"})` → `fetch failed` через SSH-туннель, подтверждено). Предыдущие
> переговоры BrownRaven↔BlackCove зависли на взаимном «жду отдельного захода» без явного ack —
> сформулирован явный чеклист из 3 шагов, ack_required.
>
> **Пока ждём s3, сделана кодовая часть Сессии D (не требует живого s3 для написания):**
> ✅ `apps/dashboard-agent/src/routes/e2e.ts` — `POST /api/e2e/run` (async, ring-buffer как в
> deploy.ts, guard «только на s3», пишет `.last-e2e-status/<app>.json` по завершении) +
> `GET /api/e2e/status` (курсор `sinceLine` + персистентный `lastStatus`). Зарегистрирован в
> `index.ts`. ✅ `libs/deploy-mcp`: tools `run_e2e`/`e2e_status` + `checkE2eGate()` — warn-only
> e2e-gate внутри `deploy_app(production)` (проверяет наличие/успех/коммит/свежесть e2e-статуса на
> s3, **предупреждает, не блокирует**). `nx lint`+`nx typecheck` на dashboard-agent и deploy-mcp
> зелёные. Версии: dashboard-agent `0.6.0→0.7.0`, `@letar/deploy-mcp` `0.1.0→0.2.0`. Доки:
> README deploy-mcp (таблица инструментов + workflow-пример), CHANGELOG dashboard-agent,
> deployment.md (раздел «E2E-ранер и деплой» переписан под staging-gated пайплайн).
>
> **s3 поднят ✅ (BlackCove, тред `provision-s3-dashboard-agent`, 2026-07-10):** конфликт порта 3100
> (занят `media-api` на s3) решён loopback-биндингом `127.0.0.1:13103:3100` в `docker-compose.s3.yml`
> (`infra-config` разделил `agentPort`(3100)/`hostPort`(туннель, s3:13103), HEAD `16420ef`). BlackCove
> подтвердил вживую на HEAD `f21334bf`: `docker compose -f docker-compose.s3.yml --env-file .env.docker
up -d --build` → Started, healthy; `curl http://127.0.0.1:13103/health` → `{"status":"ok"}`. ⚠️ Попутно
> найдено: `git pull` на s3 не смог обновить submodule `driving-school`/`driving-school-e2e` (untracked
> dev-артефакты конфликтуют с checkout) — не блокирует dashboard-agent, submodule на s3 сейчас отстаёт,
> не разобрано. Диагностика и исправление → [deployment.md § Submodule на сервере отстаёт](/.claude/docs/deployment.md#submodule-на-сервере-отстаёт--untracked-файлы-блокируют-checkout).
>
> **Сессия №54 (2026-07-10, §18 Сессия D — живой пилот запущен, найдены и починены 2 бага):**
> `agent_health({server:"s3"})` подтверждён из MCP. При подготовке пилота на grandslamcup найдено:
> (1) `e2e.ts` слал `E2E_BASE_URL`, а **все** `playwright.config.ts` в монорепо читают `BASE_URL` —
> e2e бил бы по `localhost` вместо staging, никогда не долетев до реального контейнера; `run_e2e`
> теперь принимает `baseUrl` явным параметром, хардкод-домен `<app>.s3.letar.best` убран (публичного
> домена/NPM proxy host для staging пока не существует — нужна отдельная инфра-задача); (2)
> `docker-compose.staging.yml` grandslamcup ссылался на внешнюю сеть `kami-network` (только на
> s2) — на s3 `docker compose up` упал бы; убран `external: true`. Также поправлены
> `.env.staging.example` (мёртвый домен `gsc-test.letar.best` s1 → `http://localhost:3018`) и
> `apps/auth-hub/prisma/seed.ts` (redirect URI для `grandslamcup-prod`). Коммит `7027d0a`.
>
> Отправлен deploy-request BlackCove (тред `grandslamcup-staging-pilot`, ack_required) — первая
> версия на `localhost`.
>
> **Пивот в этой же сессии (по требованию владельца):** localhost недостаточен для уверенности,
> что релиз не сломает прод — другой security-контекст браузера, не проверяет cross-origin
> cookie/OIDC-поведение между приложением и `auth.letar.best`. Решено: staging должен быть
> максимально близко к прод-окружению.
>
> - **Домен:** `https://grandslamcup.stage.s3.letar.best` (реальный HTTPS, не localhost) — требует
>   wildcard DNS + NPM proxy host + TLS-сертификат (инфра-задача, делегирована BlackCove/владельцу).
>   `redirectUrls` в `apps/auth-hub/prisma/seed.ts` и `BETTER_AUTH_URL` в `.env.staging.example`
>   обновлены под новый домен.
> - **Данные:** по выбору владельца — **анонимизированный снепшот прод**, не пустая БД и не seed-
>   фикстуры. Написан `apps/grandslamcup/scripts/anonymize-staging-db.ts`: секретные таблицы
>   (`Account`/`Session`/`Verification`/`consentLog`/`PushSubscription` — OAuth-токены,
>   session-токены, 152-ФЗ-аудит согласий) исключаются из `pg_dump` флагами `-T`, не
>   анонимизируются (нет смысла анонимизировать то, что не должно копироваться вообще);
>   `User.email/name/image/telegramChatId` псевдонимизируются детерминированно;
>   `RosterApplication` (неподтверждённые заявки) — контактные поля очищены. Публичные турнирные
>   модели (`Player`/`Team`/`Match`/`Standings`/`Poem`, везде `@@allow('read', true)`) копируются
>   как есть — это ровно то, что e2e/QA должны увидеть. Скрипт отказывается работать, если
>   `DATABASE_URL` не похож на staging-хост (защита от случайного прогона на проде). Коммит `8564663`.
>
> Обновлённый чеклист отправлен BlackCove тем же тредом (7 шагов: редеплой dashboard-agent →
> DNS/NPM/TLS → `.env.staging` с секретами (OIDC-секрет **тот же**, что у прод-клиента) →
> `db:seed` auth-hub → `pg_dump`(-T секретные)+`pg_restore`+анонимизация → `deploy_app(staging)` →
> `run_e2e`). Явно предупредил: шаг DNS/сертификат может быть не в доступе BlackCove — тогда
> эскалация к владельцу напрямую. Ждём ответа.
>
> **➡️ Следующий старт:** проверить инбокс треда `grandslamcup-staging-pilot`; если DNS/NPM —
> не в доступе BlackCove, спросить владельца напрямую (кто держит DNS-провайдера для
> `letar.best`); когда чеклист выполнен — `e2e_status`, затем прочитать поведение `checkE2eGate`
> (не обязательно реально деплоить в прод ради теста); после успешного пилота — разобраться с
> отставшим submodule driving-school/driving-school-e2e на s3 (untracked-конфликт при checkout,
> отдельная задача, не блокирует grandslamcup).

> 📌 **Отдельная кросс-приложенческая UI-задача (вне темы этого файла, для следующей сессии):**
> «Липкая CTA» — тираж `StickyActionBar`/`useScrollGate` (`@letar/ui@0.7.0`) на длинные интро/формы
> aboi, mandala, svoichuzhie, dsperevod, kami (+ разбор лендингов animatrona-landing, kami-key-the-landing,
> aprel8008). Полный план, приоритизация и чек-лист по файлам →
> [`PLAN_STICKY_CTA.md`](./PLAN_STICKY_CTA.md). Реализация не начата.

> 📌 **Отдельная инфраструктурная задача (вне темы этого файла): TypeScript 7 GA — тираж на остальные
> проекты.** Пилот на `time` подтвердил паритет (см. сессию №51 ниже). Полный план тиража, найденная
> ловушка с коллизией bin `tsc` и порядок действий → **§19** (конец файла).

> **Сессия №51 (2026-07-10, TS7 GA — пилот на `time`):** ✅ вышел стабильный `typescript@7.0.2` (Go-порт,
> GA 2026-07-08). Добавлен таргет `typecheck:ts7` в `apps/time/project.json` — `bunx --bun typescript@7.0.2
--noEmit`, **изолированно** от workspace `tsc`/`tsgo` (обычный `bun install` пакета в корневой
> `package.json` тут же подменяет общий `node_modules/.bin/tsc` версией 7.0.2 **для всех** проектов молча,
> несмотря на алиас-имя — поймано и отменено до коммита). Результат на `time`: **байт-в-байт идентичный**
> вывод с `tsc` 6.0.3 и `tsgo` dev-preview (одни и те же 4 pre-existing ошибки — не хватает сгенерённых
> Prisma-файлов, не про компилятор); скорость 0.62s — паритет с `tsgo`, ~4.4x быстрее `tsc` 6.0.3 (2.71s).
> Полный план тиража → §19. commit `4698c97`.

> **Сессия №52 (2026-07-10, §18 Deploy MCP — Сессии A/B/C реализованы):** ✅ **Сессии A, B, C плана §18
> сделаны и подтверждены на реальных прогонах.** Работал агент **BrownRaven** в связке с **BlackCove** (deploy).
>
> **Сессия A** (харденинг `deploy-affected.sh`): sha-теги образов (rollback без пересборки), pre-migrate pg_dump
>
> - fail=abort при падении миграции. Задеплоено на `time`. Попутно найден и починен **self-modifying-скрипт баг**
>   (BlackCove): git pull внутри скрипта обновлял его же, bash доигрывал по старому буферу → фикс **self-re-exec**
>   (`63bcada`, хеш до/после pull → `exec` себя; sentinel против цикла). Подтверждён вживую на деплое `time`.
>
> **Сессия B** (`8498c06`, `a1772cf`): новый `libs/infra-config` (`@letar/infra-config`) — канон SERVER_APPS +
> `SERVERS` (host/agentPort/**hostPort**/role) + резолверы. dashboard-agent: deploy API (deployId + ring-buffer +
> курсор `sinceLine` + `/api/deploy/history` + серверный guard staging/production + spawn без shell), `server-config.ts`
> = локальная копия канона (Dockerfile изолирован → **guard-тест** `server-config.guard.spec.ts` сверяет с каноном,
> не прямой импорт), `docker-compose.s3.yml` создан, устаревший `docker-compose.s2.yml` удалён (живой — production.yml).
>
> **Сессия C** (`2f4805c` + фиксы): `libs/deploy-mcp` (`@letar/deploy-mcp`) — MCP-слой над REST API dashboard-agent
> через **SSH-туннель**. 6 tools: `list_servers`, `agent_health`, `git_status`, `deploy_status` (deployId+sinceLine),
> `deploy_cancel`, `deploy_app` (target production|staging). Токен из `.env.docker`(SOPS), не из `.mcp.json`.
> ⚠️ **zod запинен 4.3.6** (не `^`, иначе 4.4.3 несовместима с zod-compat SDK). Зарегистрирован в `.mcp.json`
> (файл gitignored — локально). Доки: README deploy-mcp, mcp-servers.md, deploy-coordination.md, deploy-agent.md, CLAUDE.md.
> **BlackCove задеплоил `time` через `deploy_app` (exitCode 0)** — deployId+sinceLine+self-re-exec+SOPS подтверждены.
> Попутно вскрыто и починено **2 бага `/api/deploy/app`** (никогда не работал для зашифрованных app): проброс
> `SOPS_AGE_KEY_FILE` в spawn (`4d970e7`) + дефолт в скрипте после sudo env-reset (`1160e9e`, диагноз BlackCove:
> `nsenter`→root→`sudo -u deploy` сбрасывает env). Полное описание gotcha и правило на будущее →
> [deployment.md § Env-переменные пропадают при self-deploy](/.claude/docs/deployment.md#env-переменные-пропадают-при-self-deploy-через-dashboard-agent-nsenter--sudo-сбрасывает-env).
>
> **s3-инстанс ✅ поднят** (BlackCove, thread `provision-s3-dashboard-agent`): сгенерил
> `AGENT_TOKEN_S3`, добавил в `.env.docker.enc` (`1dbb131`). Подъём упёрся в **конфликт порта 3100** (занят
> `media-api` на s3) → решено loopback-биндингом: `docker-compose.s3.yml` = `127.0.0.1:13103:3100` (чинит конфликт
> И закрывает порт от интернета даром). В infra-config разделены `agentPort`(3100) и **`hostPort`** (туннель; s2:3100,
> s3:**13103**), deploy-mcp тоннелит в hostPort (фикс в репо-вайд dprint-коммитах, HEAD `16420ef`). Подтверждено
> вживую (HEAD `f21334bf`): `curl http://127.0.0.1:13103/health` → `{"status":"ok"}`. Подробности и продолжение — см.
> сессию №53 ниже.
>
> **➡️ Следующий старт (устарело, см. актуальный список в сессии №53 выше):**
>
> ~~1. Проверить инбокс — поднял ли BlackCove dashboard-agent на s3~~ ✅ сделано. 2. **Обновить локальный `apps/dashboard-agent/.env.docker`** (перекачать `.env.docker.enc` из origin +
> расшифровать sops, там теперь `AGENT_TOKEN_S3`) → проверить `mcp__deploy-mcp__agent_health({server:"s3"})` через туннель. 3. **s2: закрытие порта 3100** — отдельная задача (тем же приёмом `127.0.0.1:3100:3100` при следующем передеплое, без ufw).
> 3b. **submodule driving-school/driving-school-e2e на s3 отстают** — untracked-конфликт при checkout,
> исправление → [deployment.md § Submodule на сервере отстаёт](/.claude/docs/deployment.md#submodule-на-сервере-отстаёт--untracked-файлы-блокируют-checkout). 4. Затем — **Сессия D** (§18): роут `apps/dashboard-agent/src/routes/e2e.ts` (`POST /api/e2e/run` nx e2e с
> `E2E_BASE_URL` против staging + `GET /api/e2e/status` + запись `.last-e2e-status/<app>.json`), tools `run_e2e`/`e2e_status`
> в deploy-mcp, warn-gate в `deploy_app(production)`, пилот **grandslamcup** (staging-комплект уже есть; `.env.staging`
> домен s1→s3 на `grandslamcup.s3.letar.best`, Playwright `E2E_BASE_URL` скипает webServer, redirect URI в auth-hub).
> Требует живого s3 (шаг 1-2). Детали — §18 таблица «Сессии» строка D + §18.5.
>
> **Agent Mail:** новая сессия регистрируется через `macro_start_session` (human_key `C:/web/letar`,
> project_key `c-web-letar`) — см. `.claude/rules/agent-mail.md`. Тред координации s3: `provision-s3-dashboard-agent`.

> **Сессия №42 (2026-06-21, Этап 6.11 — Pressable-компоненты):** ✅ **`@letar/ui` 0.5.0** —
> `Pressable`, `PressableButton`, `ExternalLink`, `pressableConfig` (ripple + spring + iOS-фикс).
> ✅ **kami** полностью переведён: `nav-links`→`AppLink`, `sign-in-button`→`Button`, `mobile-menu`→`AppLink`+`Pressable`,
> `social-links`→`ExternalLink`, `projects/page`→`Pressable`, `pressable.tsx`→re-export, `theme-provider`→`pressableConfig`.
> ✅ **aprel8008** (сабмодуль): `BrandButton`→`PressableButton`+asChild-режим, `providers.tsx` iOS-фикс,
> `tsconfig.json` project references для `@letar/ui`. Lint и typecheck чистые. Коммиты `d88d362`, `5928798`.
> **➡️ Осталось:** тираж ещё на 1+ приложение (driving-school, grandslamcup и др.).
>
> **Сессия №41 (2026-06-14, инфра-планирование — сервер s3):** Добавлен **§15 «Сервер s3 — медиа, e2e, IPFS, бэкап»**.
> Выбран конфиг **HDD S16** (12 ядер, 16 ГБ) — обоснован замером: пик `nx affected --target=e2e --parallel=3`
> с driving-school (98 spec, 17 projects) ≈ 8–9 ГБ; 16 E2E-сюитов в монорепо подтверждено (glob).
> §15 охватывает: медиа-сервер (upload API + ffmpeg + nginx HTTP Range, URL-схема `media.letar.best`);
> E2E-ранер (PostgreSQL per-suite, cron/webhook, Telegram-нотификации);
> IPFS: один Kubo — и піннер (:5001 API) и шлюз (:8080→nginx→`ipfs.letar.best`);
> **Pin Registry** (PostgreSQL в піннере): `Pin{cid,nodeId}` + `PinRef{appId,entityType,entityId}` —
> мультитенантность, ref-counted unpin, задел под распределённые пинеры через `nodeId`;
> гибридная видеодоставка: IPFS-gateway основной + nginx-fallback; Kubo chunk 1 МБ для seek;
> UX «маркетинг IPFS» — CID-бейдж в плеере, тултип, кнопка; Resilio s3 как третья offsite-нода.
> **➡️ Следующий старт:** **Этап 8** — Соц-секреты per-владелец + админка.
>
> **Статус:** ✅ план утверждён, реализация идёт. **Сделано:** Этап 1 + код-часть Этапа 0 (сессия №1); Этап 2 эталон aboi (сессия №5) + тираж на dsperevod (сессия №6); реестр hub-клиентов → БД (сессия №7); **Этап 0.1 ✅ ПОЛНОСТЬЮ** (сессия №8); **Этап 1.5 ✅ ПОЛНОСТЬЮ** — фабрика + эталоны + README + E2E 3/3 (сессии №9–10).
> **Сессия №12 (2026-06-04, инфра — риски 0.2 + 0.3):** ✅ **Этап 0.2 основная защита** — fail2ban jail
> `maddy-submission` (Docker json-log regex, maxretry=5/bantime=24h, iptables port 587); пароли
> `kami@letar.best` и `admin@letar.best` сменены на 32-символьные. ✅ **Этап 0.3 частично** — скрипт
> `/opt/maddy/backup.sh` (tar maddy.conf + dkim*keys + credentials.db + aliases, cron 03:00, ротация 14д);
> rsync mail→s2→Resilio offsite-цепочка; Resilio R/O ключи убраны из публичного `backup-architecture.md`
> → `OPS_JOURNAL.local.md §14.4`. Коммиты `eff3f36`, `88f8773`.
> **Сессия №13 (2026-06-04, ремедиация + архитектурные решения):** зафиксированы 4 решения: Ключница в РФ
> (152-ФЗ локализация ✅ закрыт), Redis для rate-limit store (решение принято), `lena*_`БД не переименовывать,
> DKIM`направа.рф`не трогать (driving-school отправляет через`letar.best`). **Этап 2 п.3 ✅ ПОЛНОСТЬЮ** —
> ремедиация застрявших: aboi 0/2, dsperevod 0/3, auth-hub bulk-верификация 12→0 (OAuth VK-аккаунты апреля).
> **Этап 2 — ПОЛНОСТЬЮ закрыт.**
> **Сессия №14 (2026-06-04, Этап 0.3 — дочистить бэкапы):** ✅ Nginx NPM offsite подтверждён —
> бэкапы создавались на обоих серверах до мая; обнаружен баг `WORKSPACE_PATH=/home/deploy/lena`внутри контейнера (должен быть`/home/deploy/letar`) → nginx backup не создавался с 18 мая (s2)
> и 27 мая (s1, контейнер упал exit 127). Фикс: хардкод в `docker-compose.production.yml`;
> коммит `27960b3`, деплой запрошен у BlackCove. ✅ Ротация nginx бэкапов реализована
> (MAX_AUTO_BACKUPS=14); старые бэкапы почищены вручную (27 удалено на s2, 35 на s1). ✅ IgnoreList
> обновлён на s1 + s2: добавлены `.env.docker`/`.env.local`/`.env`→ секреты не идут в Resilio.
> ✅ Dry-run восстановления: nginx архив (737 файлов, sqlite+certs) и Maddy архив (DKIM 8 доменов)
> валидны. ✅ Стратегия локальных credentials задокументирована в`backup-architecture.md`(KeePassXC для секретов, git для кода, Resilio для uploads+backups). Stub-файлы созданы на s1
> для s2-only apps. Деплой выполнен BlackCove (сессия №14 продолжение): s2 — nginx backup 8 KB ✅;
> s1 — remote lena→letar исправлен, контейнер поднят, nginx backup 7.9 MB ✅.
> **Этап 0.3 — ПОЛНОСТЬЮ закрыт.**
> **Сессия №15 (2026-06-04, Этап 4 — шаги 1–2):** разведка premium-rosstil (schema.zmodel, auth.ts,
> register-form, signin-form, auth-client). ✅ **Шаг 1:** `register-form.tsx`— заменить`fetch('/api/auth/register')`на`authClient.signUp.email({ name, email, password })`;
> удалён `/api/auth/register/route.ts`. ✅ **Шаг 2:** `signin-form.tsx`resend —`fetch('/api/auth/resend-verification')`→`authClient.sendVerificationEmail()`; удалён
> `/api/auth/resend-verification/route.ts`. Коммит в submodule `4d389d8`+ bump SHA`20af8d5`.
> **Сессия №16 (2026-06-04, Этап 4 — шаги 3–6):** ✅ **Шаг 3:** `forgot-password-form.tsx`→`authClient.requestPasswordReset()`(в BA 1.6.11 метод`requestPasswordReset`, не `forgetPassword`);
> `reset-password-form.tsx`→`authClient.resetPassword()`;
> удалены кастомные API routes `/request-reset`, `/reset-password`. ✅ **Шаг 4:** удалены
> `lib/tokens.ts`, `lib/rate-limit.ts` и все потребители (`verify-email/route.ts`,
> `cleanup-rate-limits/route.ts`). ✅ **Шаг 5:** schema.zmodel — убрано поле `type`из`Verification`,
> дропнута `LoginAttempt`; migration `20260604155648_remove_custom_auth_fields`создана и применена.
> ✅ **Шаг 6:** `verify-email/page.tsx`переписан на`authClient.verifyEmail()`+ resend UI при
> ошибке (ResendVerificationButton + поле email по эталону dsperevod). bump 0.73.4→0.74.0;
> коммит`51a465c`+ bump SHA`230a07b`. **Этап 4 — ПОЛНОСТЬЮ завершён.**
> **Сессия №17 (2026-06-04, Этап 5 ✅ ПОЛНОСТЬЮ):** богатый pin-auth флоу в premium-rosstil:
> хук `sendVerificationEmail`генерирует PIN + отправляет письмо через`@letar/email`с кодом и ссылкой;`lib/pin-auth-adapters.ts`—`PinValidatorAdapter`(namespace через identifier, без поля type);
> SSE endpoint`/api/auth/verification-stream/[email]`— cross-tab синхронизация;
> server actions:`verify-pin`, `resend-verification-pin`(через BA API),`verify-login`(HMAC-signed cookie);
> страница`/auth/verify-pin`с Chakra`PinInput`+`usePinVerification`hook;
> register-form → редирект на verify-pin; signin EMAIL_NOT_VERIFIED → resend + редирект;
> rate limit`/send-verification-email {60,3}`; tsconfig paths + references для `@letar/pin-auth`.
> bump 0.74.0→0.75.0; коммит `7b0fcda`+ bump SHA`7b67109`. **Этап 5 — ПОЛНОСТЬЮ завершён.**
> **Сессия №18 (2026-06-05, инфра + Этап 6 ✅):** ✅ **Redis** — `infra/redis/docker-compose.production.yml`(Redis 7-alpine, 256mb LRU, kami-network);`createRedisStorage(url)`в`@letar/auth/server`;
> auth-hub + kami → `secondaryStorage`+`rateLimit.storage='secondary-storage'`; задеплоено BlackCove.
> ✅ **§13.7** — `offline_access`scope добавлен в kami + фабрику (проактивно для refresh_token).
> ✅ **0.4** — решение принято: SOPS + age (self-hosted, KeePassXC, без нового сервиса).
> ✅ **0.7 canary** —`infra/canary/canary.ts`(SMTP→Maddy, IMAP→Яндекс kaspergreen@yandex.ru);
> cron каждые 15 мин через`docker compose run`; запрос деплоя у BlackCove.
> ✅ **Этап 6** — kami/auth.ts мигрирован на `createAuth({ mode: 'hub-client' })`(241→125 строк);
> фабрика расширена:`rateLimit`, `account`, `secondaryStorage`для hub-client; деплой запрошен.
> **Сессия №19 (2026-06-05, Этап 6 + 8.5 ✅):** OIDC flow kami отлажен (5 последовательных багов: docker-compose env,
> nextCookies() порядок, cookies() в Server Component, oidc-capture redirect, name_is_missing); кнопка Войти → сразу
> Ключница;`mapProfileToUser`fallback в фабрике hub-client. Миграция данных kami выполнена:
> 4 AudioFile + ADMIN →`kami@letar.best`; `letarkami@gmail.com`и`kaspergreen@gmail.com`удалены.
> **Сессия №20 (2026-06-05, Этап 8.5 скрипты):** Созданы скрипты миграции для dashboard/archetest/animatrona-tracker:`infra/migrations/dashboard-owner-migration.ts`(role ADMIN, нет контента),`archetest-owner-migration.ts`(QuizLeaderboard+Sessions+Achievements, roles[]),`animatrona-tracker-owner-migration.ts`(Anime/UserLibrary/Distribution/PinJob/Content). Подход: raw pg без ZenStack, dry-run режим.
> ⏳ **Запустить на s2** после логина в каждое приложение через Ключницу.
> **Сессия №21 (2026-06-05, Этап 6.5 ✅ ПОЛНОСТЬЮ):** Passkeys / WebAuthn в auth-hub:
> @simplewebauthn/server@13.3.1 + @simplewebauthn/browser@13.3.0; кастомный Better Auth плагин`passkeyPlugin()`(createAuthEndpoint + getSessionFromCtx + internalAdapter.createSession + setSessionCookie);
> таблица`passkey`в schema.zmodel + миграция`20260605154458_add_passkey`;
> baseline-миграция `20260101000000_init_baseline`(resolve --applied на prod перед деплоем);
> компоненты`PasskeySignInButton`+`PasskeyRegisterButton`; кнопка на странице /sign-in.
> rpID=letar.best (дефолт), origin=BETTER_AUTH_URL. typecheck ✅ lint ✅.
> ✅ **Деплой выполнен BlackCove** (5858b0c): baseline resolved + passkey таблица создана, auth-hub Ready.
> **Сессия №22 (2026-06-05, UX-анализ passkeys + logout):** обнаружены 2 UX-проблемы по скриншотам:
> (1) Passkey кнопка падает с ошибкой при 0 passkeys, нет Conditional UI, нет управления ключами → задокументирован
> детальный план Этап 6.5.1. (2) "Выход" в kami не выходит из Ключницы → тихий ре-логин → задокументирован
> Этап 6.51 (RP-initiated logout через end_session_endpoint).
> **Сессия №23 (2026-06-06, Этап 6.51 ✅ код):** RP-Initiated Logout реализован для всех hub-client приложений через
> `createLogoutAction(auth, { oidcLogout: { endSessionUrl, clientId, postLogoutRedirectUri } })`.
> Подход: `client_id`+`post_logout_redirect_uri`без`id_token_hint`(BA oidcProvider принимает;`id_token`не нужно хранить).
> Обновлены:`kami/auth.actions.ts`+`.env`(создан);`animatrona-tracker/auth.actions.ts`+`.env`.
> `BETTER_AUTH_OIDC_ISSUER=https://auth.letar.best` добавлен в `.env.docker` всех 6 через SCP.
> Задеплоено BlackCove: s1 kami ✅, s2 animatrona-tracker/dashboard/archetest/grandslamcup/time ✅.
> **Этап 6.51 — ПОЛНОСТЬЮ ЗАВЕРШЁН.**
> **Сессия №24 (2026-06-06, Этап 6.5.1 ✅ ПОЛНОСТЬЮ):** UX passkeys реализован: Шаг A — plugin.ts
> discoverable credential flow (`allowCredentials: []`) + try/catch + `DELETE /passkey/delete` endpoint;
> Шаг B — `usePasskeyConditionalAuth` хук (conditional UI autofill при загрузке страницы),
> `autoComplete="username webauthn"` на email-инпуте, `PasskeySignInButton` → только fallback
> (скрыта когда `browserSupportsWebAuthnAutofill()=true`); Шаг C — `PasskeyPromptBanner` в `/profile`
> (1 показ после входа, localStorage `passkey_prompt_dismissed`, dismissable); Шаг D — `/profile/passkeys`
> (список ключей + добавить + удалить, `PasskeysManager`); ссылка в навигации профиля.
> commit `812d518`, деплой запрошен у BlackCove.
> **Этап 6.5.1 — ПОЛНОСТЬЮ ЗАВЕРШЁН.**
> **Сессия №25 (2026-06-08, Этап 6.6 ✅ ПОЛНОСТЬЮ):** Telegram deep-link авторизация в auth-hub:
> кастомный `telegramPlugin()` (BA-плагин, 4 эндпоинта: start/webhook/status/unlink);
> таблица `telegramToken` + миграция `20260608192428_add_telegram_token`; `TelegramSignInButton`
> на /sign-in (условный рендер по env); email-заглушка `<id>@telegram.local`.
> commit `461abde`, деплой + webhook зарегистрированы BlackCove. **Этап 6.6 — ПОЛНОСТЬЮ ЗАВЕРШЁН.**
> **Сессия №26 (2026-06-10, план + env):** `.env.docker` auth-hub дополнен Telegram-кредами
> (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME=letar_best_bot`, `TELEGRAM_WEBHOOK_SECRET`);
> sync-env push + перезапуск + webhook-регистрация выполнены BlackCove. Добавлены в roadmap:
> **Этап 6.7** (гео-блокировка зарубежных OAuth для RU-IP, 149-ФЗ, GeoIP2 через NPM) и
> **Этап 0.8** (аудит соответствия 152-ФЗ — cookie-баннеры, согласия, РКН, тираж на все приложения).
> **Сессия №27 (2026-06-10, фикс passkeys):** ✅ Исправлена ошибка «Нет активной сессии» на странице
> `/profile/passkeys` — `getSessionFromCtx(ctx)` в Better Auth плагин-эндпоинтах возвращал `null`
> в Next.js App Router контексте. Три затронутых операции (register/options, register/verify, delete)
> перенесены в стандартные Next.js Route Handlers (`/api/passkey/register-options`,
> `/api/passkey/register-verify`, `/api/passkey/delete`) с правильным чтением сессии через
> `auth.api.getSession({ headers: await headers() })`. Также улучшены сообщения об ошибках.
> commit `69fb496`. typecheck ✅ lint ✅. Деплой запрошен BlackCove (msg #753).
> **Сессия №28 (2026-06-10, Этап 0.8 — уведомления РКН):** ✅ Зафиксированы поданные уведомления РКН:
> **letar** (`_.letar.best`+ driving-school — то же ИП владельца) рег. № 100306050 от 02.06.2026;
> **aboi** (ИП Гаева) рег. № 100286690 от 16.05.2026. ✅ Решение: «трансграничная передача не осуществляется»
> корректно — 152-ФЗ касается граждан РФ, для RU-IP зарубежные провайдеры скроет гео-блокировка →
> **Этап 6.7 обязателен** для соответствия уведомлению. Не подано: premium-rosstil, imot, dsperevod
> (операторы — их владельцы). Коммиты`506f7cc`, `a43aae0`, `5db9241`.
> **Сессия №29 (2026-06-10, Этап 6.7 ✅ код):** Гео-блокировка иностранных OAuth для RU-IP.
> `auth-hub/src/lib/geo.ts`—`getCountryCode()`через`x-forwarded-for`+`geoip-lite`(MaxMind GeoLite2 локально).`sign-in/page.tsx`— фильтрует google/github/facebook/telegram для RU-IP; VK/Yandex/passkeys остаются.`oauth-buttons.tsx`— принимает проп`providers`. Fallback: нет заголовка → показывать всё (dev).
> Также: fix TS2322 в passkey-prompt-banner + passkeys-manager (`PublicKeyCredentialCreationOptionsJSON`).
> typecheck ✅ lint ✅. commit `b80de69`. Деплой запрошен BlackCove (msg #754).
> **Сессия №30 (2026-06-10, Этап 0.8 — cookie-баннер + DRY):** ✅ Общие компоненты `@letar/ui@0.3.0`:
> `CookieBanner`, `CookieSettingsButton`, `DeleteAccountZone`, `CookieConsentState`, `createConsentConfig`, `readConsentState`.
> `auth-hub`: ConsentLog в БД, POST `/api/consent`, `deleteAccountAction`, CookieBanner в layout. `aboi`: рефакторинг на shared компоненты.
> `dsperevod`: рефакторинг на shared компоненты (cookie-banner, yandex-metrika-consent, lib/consent).
> Коммиты `045bc31`(ui),`6088286`(auth-hub),`67212ae`(aboi),`791b665`(dsperevod),`1081c70`(submodule bump).
> **Сессия №31 (2026-06-10, Этап 0.8 ✅ ПОЛНОСТЬЮ):** ✅ Тираж 152-ФЗ на 4 оставшихся приложения.
> **premium-rosstil**: ConsentLog + миграция,`/api/consent`, YandexMetrikaConsent (consent-aware обёртка),
> CookieBanner в layout, deleteAccountAction → DeleteAccountZone в settings/page.tsx.
> **imot**: ConsentLog + миграция (reset drift: scope/Verification), `/api/consent`, deleteAccountAction,
> DeleteAccountZone в my-profile/page.tsx, CookieBanner в layout.
> **driving-school**: ConsentLog + миграция (reset drift: StudyGroup/TheoryTopic), `/api/consent`,
> deleteAccountAction (soft-delete через deletedAt), DeleteAccountSection в settings/page.tsx, CookieBanner.
> **grandslamcup**: ConsentLog + миграция, `/api/consent`, deleteAccountAction, DeleteAccountSection
> в profile/page.tsx, CookieBanner в layout. Все субмодули запушены, SHA обновлены в letar.
> **Сессия №32 (2026-06-11, Этап 7 ✅ ПОЛНОСТЬЮ):** `driving-school/auth.ts`мигрирован на`createAuth({ mode: 'standalone' })`(~607→~330 строк);`@letar/auth`расширен полями`socialProviders`, `databaseHooks`, `password`(v0.5.0→v0.6.0); pin-auth адаптеры обновлены на namespace-подход без поля`type` (как в premium-rosstil Этап 5); SSE endpoint обновлён (`autologin:email`namespace); добавлен`magicLink` плагин BA + UI на /sign-in (`MagicLinkForm`+ server action).`magicLinkClient()`добавлен в`auth-client.ts`.
> **Сессия №33 (2026-06-11, Этап 8 ✅ ПОЛНОСТЬЮ):** `auth-hub/auth.ts`мигрирован на`createAuth({ mode: 'hub-provider' })`(~401→~205 строк без хелперов);`@letar/auth`расширен:`buildHubProviderAuth`(oidcProvider авто-включён, rate-limit с OIDC-правилами, secondaryStorage, account-linking),`OidcProviderConfig`в types; 8 новых тестов hub-provider (nextCookies последний, oidcProvider с defaults и кастомом, rate-limit, accountLinking);`@letar/auth`v0.6.0→v0.7.0;`auth-hub`v0.4.0→v0.5.0.
> **Сессия №34 (2026-06-11, OIDC Pending Auth Cookie ✅):** Новый route`api/auth/oauth2/authorize/route.ts`перехватывает BA authorize,
> сохраняет полные OIDC-параметры в`oidc*pending`cookie до BA-обработки (клонирует Response с Set-Cookie).`consent/page.tsx`читает cookie → передаёт`oidcParams`в`AccountChooser`. `AccountChooser`при смене аккаунта
> редиректит`/sign-in?...полные params...`вместо усечённых consent params. commit`1fc3ab1`. typecheck ✅ lint ✅.
> Деплой запросить у BlackCove.
> **Сессия №35 (2026-06-11, Этап 0.4 ✅ ПОЛНОСТЬЮ):** age v1.3.1 + sops v3.12.2 установлены через winget;
> age-ключ сгенерирован (публичный `age1v0vhymhfxupa66zvrmqxv2yz4q0d8xxazh2m4k87tl0wk3ccmu4sftywza`), приватный в KeePassXC;
> `.sops.yaml`настроен в корне репо;`auth-hub/.env.docker`зашифрован →`.env.docker.enc`добавлен в git;`.gitignore` расширен (`!**/.env.docker.enc`); `deploy-affected.sh`— функция`decrypt_sops_env()`авто-расшифровывает
> при наличии`SOPS_AGE_KEY_FILE`; документация `secret-manager.md`. Commit `5365647`.
> ✅ Тираж завершён (сессия №35 продолжение): 22 приложения зашифрованы (16 публичных + 5 submodules + auth-hub);
> все `.env.docker.enc`в git; root + 5 submodule запушены. Commit`eb21137`.
> ✅ age-ключ установлен на s2 (`/home/deploy/.age/letar-key.txt`chmod 600 +`SOPS_AGE_KEY_FILE`в`.bashrc`);
> деплой auth-hub `c0ed40c` через SOPS прошёл успешно — подтверждено BlackCove (agent-mail msg #762). **Этап 0.4 — ПОЛНОСТЬЮ закрыт.\*\*
> **Сессия №36 (2026-06-11, статус + подтверждение инфры):** `/repo` — сводный отчёт плана; уточнено что
> age-ключ на s2 установлен BlackCove в сессии деплоя (msg #762); все деплои сессий №32–35 подтверждены.
> **Сессия №37 (2026-06-11, Этап 8.5 ✅ ПОЛНОСТЬЮ + animatrona-tracker auth UX + UserMenu):**
> ✅ **Этап 8.5 — ПОЛНОСТЬЮ:** owner-миграция animatrona-tracker выполнена BlackCove (1155 Anime, 144 UserLibraryItem,
> 2901 Distribution, 1144 PinJob, 1226 ModerationLog → `kami@letar.best`; старые аккаунты удалены).
> ✅ **Rate limit fix** — глобальный `rateLimit.max` 10→100 в animatrona-tracker/auth-config.ts (`useSession()` исчерпывал
> лимит при каждом рендере). commit `5214f0d`.
> ✅ **Auth UX** — кнопка «Войти» в хедере теперь сразу редиректит на Ключницу (OIDC); `returnTo` фиксирован
> `/browse`→`/` (страница не существует). commit `9fe6f7c`.
> ✅ **`UserMenu` в `@letar/ui`** — универсальный компонент меню пользователя для всего монорепо (кнопка «Войти»,
> dropdown с профилем, Ключницей, доп. пунктами и Выйти); применён в animatrona-tracker вместо разрозненных элементов.
> Экспорт из `libs/ui/src/index.ts`; dist пересобран (`tsc --build libs/ui/tsconfig.lib.json`). commit `ef8fdf0`.
> **Сессия №38 (2026-06-11, Этап 1.5 DoD + Этап 6.7 деплой + Этап 6.8 UserMenu rollout):**
> ✅ **Этап 1.5 DoD** — `libs/auth/README.md` обновлён до v0.7.0: добавлены hub-client (kami-паттерн с Redis), hub-provider (auth-hub), standalone+org (driving-school), `createLogoutAction` с oidcLogout, `createRedisStorage`. commit `2968059`.
> ✅ **Этап 6.7 деплой** — auth-hub `b80de69` задеплоен BlackCove (geo-blocking иностранных OAuth для RU-IP).
> ✅ **sync-env animatrona-tracker** — файлы идентичны, `.env.docker.enc` валиден.
> ✅ **Этап 6.8 UserMenu rollout** — kami, grandslamcup, archetest, time переведены на `UserMenu` из `@letar/ui`; добавлены tsconfig references. dashboard-agent пропущен (backend без UI). commit `badcd95`.
> **Сессия №39 (2026-06-12, Этап 6.8 standalone ✅ ПОЛНОСТЬЮ):** `@letar/ui UserMenu`: добавлен `showAuthHub` (default true) — скрывает «Аккаунт в Ключнице» для standalone-приложений.
> **aboi**: `AuthButton` переведён на `UserMenu` из `@letar/ui` (Client Component, `useSession()`, `showAuthHub=false`, `isAdmin` через userExt cast). `Suspense` убран вокруг AuthButton.
> **dsperevod**: N/A — нет auth UI в хедере (landing-сайт с кнопкой «Заказать перевод»).
> **premium-rosstil**: N/A — уже есть собственный `UserMenuClient` (Server wrapper + i18n Links + `colorPalette="fg"`).
> typecheck ✅ lint ✅. commits `c72e05c` (aboi), `d6b2edb` (letar).
> **Сессия №40 (2026-06-12, план):** в roadmap добавлен **Этап 6.9** — подвал «Сделано в studio.letar.best»
> со ссылкой (UTM) на всех публичных сайтах монорепо; общий компонент `StudioCredit` в `@letar/ui`;
> для коммерческих submodules — предварительное согласование с владельцами.
> **Сессия №42 (2026-06-15, план):** в roadmap добавлен **Этап 6.10** — версия сборки в подвале на всех сайтах;
> общий компонент `BuildVersion` в `@letar/ui` читает `version` из `package.json` (билд-тайм проброс через
> `NEXT_PUBLIC_APP_VERSION`/серверный импорт); рядом со `StudioCredit`, тираж одной правкой футера.
> **Сессия №43 (2026-06-15, Этап 8 ✅ ПОЛНОСТЬЮ):** Admin UI OAuth-клиентов + at-rest шифрование.
> Tier 1: `/admin/clients` CRUD (список, создание через RisksConsent → ClientForm, детали, редактирование);
> `SecretBanner` (plaintext один раз через `?secret=`); `RotateSecretButton`, `DeleteClientButton`, `ToggleClientButton`.
> Tier 2: `libs/auth/server/crypto.ts` (AES-256-GCM секреты + AES-256-CBC детерминированные токены);
> `social-loader.ts` (OAuth-провайдеры из БД); `createAuthAsync({ social: { source: 'db' } })`;
> `auth-hub/lib/db.ts` — encryption proxy для oauthApplication/oauthAccessToken/account;
> `scripts/encrypt-client-secrets.ts` — backfill скрипт; обратная совместимость с plaintext.
> `libs/auth/tsconfig.lib.json` — исключение spec-файлов из lib-сборки.
> typecheck ✅ lint ✅ tests ✅. commit `4e70c76`. **⏳ Следующее:** деплой + backfill скрипт на проде.
> **Сессия №44 (2026-06-18, Этап 9 — деплой Этапа 8 ✅ ПОЛНОСТЬЮ):** ✅ `AUTH_ENCRYPTION_KEY` в `.env.docker.enc` (commit `2ed6f12`) + деплой auth-hub BlackCove + `/sync-env`. Ключница была недоступна после деплоя (500 — ключ не попал в контейнер без `/sync-env`), исправлено срочным запросом BlackCove. auth.letar.best восстановлен. Ключ сохранён в KeePassXC. ✅ Backfill `encrypt-client-secrets.ts --execute` выполнен BlackCove (msg #918). ✅ `kami@letar.best` повышен до ADMIN (msg #919). ✅ Admin UI `/admin/clients` верифицирован: 7 клиентов активны. **Этап 9 — ПОЛНОСТЬЮ закрыт.**
> **Сессия №46 (2026-06-26, Этап 0.6 — lena-хвосты + owner-migrations + OIDC offline_access + MobileAuthSection):**
> ✅ Owner-migrations (dashboard/archetest/animatrona-tracker) — dry-run: уже выполнены, kami@letar.best — ADMIN.
> ✅ OIDC `offline_access` scope добавлен в 4 приложения (dashboard, archetest, grandslamcup, studio) — refresh_token теперь сохраняется в `account`.
> ✅ Dockerfile-комментарии `C:\web\lena` → `C:\web\letar` в imot/driving-school/premium-rosstil (submodule коммиты).
> ✅ `lena-form-sync-queue` → `letar-form-sync-queue` с однократной миграцией. `@letar/forms` 1.4.0→1.4.1 (commit `f7bea2e`).
> ✅ §17 Kamal (zero-downtime деплой) — план добавлен в PLAN.md (commit `3fbfb9d`).
> ✅ Этап 6.8 UserMenu — svoichuzhie добавлен (header.tsx); `MobileAuthSection` создан в `@letar/ui` и тираж на 4 приложения (animatrona-tracker, grandslamcup, archetest, svoichuzhie). commit `f94d28c`, `e2b1701`, `6f324fe`.
> **➡️ Следующий старт:** Этап 8 — Соц-секреты per-владелец (§8) или §17 Kamal pilot на grandslamcup.
>
> **Сессия №47 (2026-07-03, вывод из эксплуатации premium-rosstil + imot):** владельцы обоих приложений больше
> не клиенты letar. ✅ Полный бэкап передан заказчику: git-история (bundle) обоих submodules + их e2e, реальные
> дампы БД и uploads с живого сервера (92/32 таблицы, 272 МБ фото у premium-rosstil; imot без загруженных
> файлов — подтверждено, не баг). Попутно найдено: обе площадки все время работали на `s1.letar.best`
> (не отдельный сервер клиента, как казалось сначала) — Resilio Sync на s1 был неделями в состоянии `paused`,
> BlackCove перезапустил сервис. ✅ Снесены протухшие артефакты недоделанной миграции на s2 (пустые
> контейнеры/БД, миграция никогда не была завершена). ✅ Submodules (`premium-rosstil`, `premium-rosstil-e2e`,
> `imot`, `imot-e2e`) убраны из `.gitmodules`/индекса/директорий; `deploy-affected.sh` (`S2_APPS`), `.mcp.json`
> (`postgres-premium-rosstil`), `.claude/rules/deployment.md`, `infra/nginx-proxy-manager/README.md` (домены,
> сети) почищены. **⚠️ `infra/nginx-proxy-manager/docker-compose.yml` НЕ тронут** — NPM на s1 всё ещё физически
> проксирует живой сайт клиента через `imot-network`/`kami-network`; убирать сеть из compose нельзя, иначе
> следующий redeploy NPM молча оборвёт клиенту трафик (сайт продолжает работать, клиент сам разберётся дальше).
> Удалены `.claude/commands/premium-rosstil.md`, `imot.md`, `.claude/rules/premium-rosstil.md`, `imot.md`.
> Матрица §3.1 и таблица 0.8 обновлены. Не тронуто: `apps/dashboard` (cron-мониторинг imot-эндпоинтов),
> `apps/umami` (трекинг сайтов) — точечный follow-up для их владельцев.
>
> **Сессия №45 (2026-06-19, §15 E2E-ранер — ввод в строй):** ✅ **E2E-ранер s3 полностью операционен.**
> Postgres (5499) + Redis (6380) поднят в Docker на s3; лог заполняется через systemd user timer (02:00, `Persistent=true`).
> ✅ **driving-school-e2e — ключевые фиксы:** (1) `skipInstall: true` в ВСЕХ target'ах `project.json` — решает
> корневую причину «nx e2e не запускает тесты»: executor `@nx/playwright:playwright` прерывался
> при webkit-предупреждении от `playwright install` и выходил 0 без прогона тестов;
> (2) локаторы «Войти» — `page.locator('form').getByRole('button', { name: 'Войти', exact: true })`
> во всех трёх местах: `global-setup.ts`, `01-auth.spec.ts` (3 вхождения), `form.helpers.ts`.
> ✅ **Результат прогона shard-core через `nx e2e:core driving-school-e2e`:** 36 passed, 5 skipped, 10 failed.
> Failures: 3 auth-navigation (E2E-1.1.104/105/107 — реальные баги UI) + 7 instructor profile (cookie consent
> banner перекрывает контент; student profile работает — требует отдельного дебага).
> ✅ **animatrona pinner4:** добавлены константы и конфиг для pinner4 (s3) в `kubo-config.ts`,
> `peer-sync-types.ts`, `peer-sync-service.ts` — s3 вошёл в Bootstrap и Peering.Peers Kubo.
> ⏳ **Осталось в §15:** instructor profile failures; Telegram BOT_TOKEN/CHAT_ID (нотификации); `nx affected --target=e2e`.
> **➡️ Следующий старт:** следующий этап roadmap (Этап 10 или по приоритету).
>
> **Сессия №49 (2026-07-09, план — §18 🆕 Deploy MCP + staging-пайплайн):** добавлен **§18** — полный план
> в 4 сессии (A–D): харденинг `deploy-affected.sh` (миграции fail=abort, pg_dump перед миграцией, sha-теги
> образов → ручной rollback), `libs/infra-config` (единый маппинг app→server), `libs/deploy-mcp` (MCP-обёртка
> над REST API dashboard-agent: deploy_app/deploy_status/…, SSH-туннель вместо публичного порта 3100),
> dashboard-agent на s3 → **staging-gated пайплайн** (staging → e2e → warn-gate → production, реализует Этап A
> §15.3.1; cross-server gap решён проверкой в deploy-mcp). Пилот — grandslamcup (staging-комплект уже есть).
> Уже сделано в коде (не закоммичено): deploy.ts (deployId+ring-buffer+sinceLine+staging+spawn без shell),
> server-config.ts (s1 убран), cron.ts (мёртвые s1-задачи удалены). Staging-домены: `<app>.s3.letar.best`.
> §17 (Kamal) не отменён — выбор «deploy-engine TS + docker-rollout vs Kamal» отложен до Фазы 3 (§18.6).
> **➡️ Следующий старт:** §18 Сессия A (харденинг deploy-affected.sh).
>
> **Сессия №50 (2026-07-09, деплой-очередь + найден блокер submodule-pointer):** BlackCove разгребал накопившуюся
> deploy-очередь (10+ запросов с 3 июля, часть авторов уже retired). Приоритет — archetest v0.23.0 (id 275):
> деплой упал на этапе `git pull` submodules — **два битых pointer'а** в `letar/main`: `apps/driving-school`
> (bump `a84013b3b`) ссылается на `11cd91c6`, `apps/aboi` (bump `84dc5080c`) — на `f550da36`; оба SHA
> отсутствуют в приватных submodule-репо (не запушены или потеряны при force-push/rebase). Это блокирует
> **любой** деплой на s2, не только archetest — `deploy-affected.sh` тянет все submodules перед фильтрацией по
> `--app`. Авторы bump-коммитов (SapphireGlacier, AzurePeak) — retired, писать некому. Фикс найден, но не
> применён (ждёт коммита): pointer'ы нужно перевести на актуальный `origin/main` submodule-репо
> (`driving-school` → `e5664f6`, `aboi` → `99c2cea` — оба уже содержат тот же логический фикс под другим SHA).
> Добавлено в §18 «Проблема» п.4 — валидация submodule-pointer'ов перед bump-коммитом. **➡️ Следующий старт:**
> закоммитить исправленные pointer'ы в `letar/main`, перезапустить деплой archetest → обработать остаток
> очереди (grandslamcup hotfix 3.37.2, container_name batch — umami/auth-hub/animatrona-tracker/mandala/
> aboi/aprel8008, dsperevod+dashboard+dashboard-agent, pravda, svoichuzhie v0.10.16; studio DATABASE_URL и
> grandslamcup uploads permissions — инфра-фиксы руками на сервере, не через deploy-affected.sh;
> premium-rosstil/imot teardown — вероятно уже неактуально, приложения выведены из эксплуатации 2026-07-05).
>
> **Сессия №48 (2026-07-06, план — §15.3.1 🆕):** добавлен раздел **§15.3.1 «Prod-снепшот + анонимизация —
> pre-deploy gate»**: ночной pipeline `pg_dump` прод-БД → детерминированная анонимизация PII (152-ФЗ,
> `personal-data.md`) → restore в `e2e_<app>` на s3 → прогон e2e на срезе, близком к прод-данным, вместо
> пустой схемы. `deploy-affected.sh` получает `check_e2e_gate()` (сначала warn-only, потом hard gate) —
> деплой блокируется, если последний e2e упал. Отдельно — обратный граф зависимостей от `libs/**`
> (`blast-radius.ts`): правка общей либы гоняет e2e у всех приложений-потребителей, не только у изменённого.
> Только план, реализация не начата. **➡️ Следующий старт:** пилот на driving-school (DoD 15.3.1).
> **Уточнение (2026-07-06, тот же день):** пилот переназначен на **grandslamcup** — свой пет-проект (не
> коммерческий клиент, ниже юридический риск чем driving-school с документами учеников автошколы), уже есть
> ConsentLog + auth-флоу + e2e с реальными прод-данными участников/матчей, схема проще driving-school → быстрее
> провалидировать `anonymize.sql` и весь цикл snapshot→restore→e2e перед тиражом на более сложные приложения.
> **Этап 0.5 ✅ ПОЛНОСТЬЮ** (owner:letar теги + ESLint-граница + owner:commercial теги 10 submodules + реципрокный constraint — см. сессию №3 ниже).
> **Режим:** реализация поэтапная (§7); все точки решения закрыты или отложены с обоснованием (§9).
> **Дата ревизии:** 2026-05-30 (архитектурная проработка с UI/UX-архитектором, все §13 вопросы закрыты).
> **Операционная сессия 2026-05-30:** разовая склейка email владельца в Ключнице **ВЫПОЛНЕНА** (§14.1);
> добавлен Telegram-вход (Этап 6.6); выявлены инфра-задачи — брутфорс Maddy, форвард, MCP kami (§14).
> **Финализация:** добавлен периодический canary-мониторинг доставки email (Этап 0.7) — план полный.
> **Ревизия №2 (2026-05-30, инцидент-реагирование):** инфра-задачи §14.2 подняты в roadmap (Этап 0.1 ротация
> утёкших OIDC-секретов 🔴, Этап 0.2 защита почты + DKIM/SPF/DMARC); добавлены критический путь и фазы (§6),
> DoD по этапам, ремедиация застрявших юзеров (Этап 2), заметки про rate-limit store / SSE-масштабирование (§8).
> **Сессия реализации №1 (2026-05-30, только код в публичном дереве):** ✅ Этап 1 (security-hardening
> `@letar/pin-auth` + `@letar/auth`) и ✅ код-часть Этапа 0 (централизованный лог `@letar/email` + фикс
> игнорируемого результата в mandala). Этап 0.5 (Nx owner-теги) и инфра-часть (0.1/0.2/DKIM/canary) — следующие сессии.
> **Сессия реализации №2 (2026-05-30, публичное дерево):** ✅ **Этап 0.1 код-часть** — 6 OIDC `clientSecret`
> вынесены из `auth-hub/src/lib/auth.ts` в `process.env.OIDC*\*\_SECRET`(fail-fast хелпер); значения добавлены в`.env.local`/`.env.docker`(не коммитятся). ✅ **Этап 0.5 публичная часть** — тег`owner:letar` в 60 project.json
>
> - depConstraint `owner:letar → [scope:shared, owner:letar]` в `eslint.config.mjs` (0 нарушений границ).
>   **Сессия реализации №3 (2026-05-30, submodules + публичное дерево):** ✅ **Этап 0.5 завершён** — тег
>   `owner:commercial` в 10 submodule-проектов (коммиты внутри submodules + bump SHA в letar); реципрокный
>   depConstraint `owner:commercial → [scope:shared, owner:commercial]` в `eslint.config.mjs`; module-boundary чист.
>   ✅ Этап 0.1 инфра закрыт (сессия №8). Осталось по Фазе A: 0.2/DKIM/0.7 (инфра).
>   **Сессия реализации №4 (2026-05-30, submodules — гигиена lint):** ✅ устранены предсуществующие падения
>   `nx lint` в 3 коммерческих submodules (обнаружены при Этапе 0.5, к тегам отношения не имеют — код в `src/`):
>   **aboi** — curly-автофикс + осиротевшие `eslint-disable` для незарегистрированных правил заменены
>   (`no-img-element` → `oxlint-disable`, `exhaustive-deps`/`no-danger` удалены); **driving-school** — исправлен
>   нерабочий идентификатор `oxlint-disable` для `no-img-element` (data-URL превью + внешние логотипы); **dsperevod** —
>   `rules-of-hooks` (`useMDXComponents` вынесен в константу `baseMdxComponents`) + curly-автофикс (был скрыт за
>   падением oxlint). Коммит внутри каждого submodule + bump SHA в letar. `nx run-many -t lint -p aboi
driving-school dsperevod` зелёный. ⏳ Заведена отдельная задача на предсуществующий `typecheck:tsgo` TS2883 в
>   `dsperevod/src/lib/auth-client.ts` (непортируемый тип better-auth — вне scope lint-сессии).
>   **Сессия реализации №5 (2026-05-31, submodules aboi + aboi-e2e):** ✅ **Этап 2 — эталон aboi** (resend
>   email-верификации): блок resend на `/sign-in` (EMAIL*NOT_VERIFIED) и форма на `/verify-email`; захват
>   `SendEmailResult` + rate-limit `/send-verification-email {60,3}` (`lib/auth.ts`); Umami-события §13.9
>   (`lib/analytics.ts`); E2E `email-verification.spec.ts` зелёный (chromium, полный флоу включая верификацию по
>   токену). bump aboi 0.23.2→0.24.0; коммиты в submodules aboi + aboi-e2e + bump 2 SHA. Follow-up: email-уровень
>   rate-limit ip+email; порядок `nextCookies()` (warning Better Auth — должен быть последним).
>   **Сессия реализации №6 (2026-06-02, dsperevod submodule + letar публичное):** ✅ **Этап 2 — тираж resend на dsperevod**
>   (по эталону aboi): миграция email на `@letar/email` (`sendVerificationEmail`/`sendPasswordResetEmail` + `reportEmailFailure`);
>   `rateLimit /send-verification-email {60,3}` + `autoSignInAfterVerification: true`; `lib/analytics.ts` (KPI §13.9);
>   `sign-in` перехват `EMAIL_NOT_VERIFIED` + `<ResendVerificationButton>`; `verify-email` resend-форма при ошибке токена;
>   `next.config.mjs` `skipTrailingSlashRedirect: true` (fix: better-auth API в dev с trailingSlash: true);
>   E2E `email-verification.spec.ts` зелёный (chromium, 3/3 passed). bump dsperevod 0.4.0→0.5.0.
>   ✅ Создана команда `/repo` (`.claude/commands/repo.md`) — статус глобального плана из PLAN.md.
>   Follow-up: `SMTP_FROM_EMAIL` для dsperevod (сейчас `SMTP_FROM`, инфра-задача); email-уровень rate-limit ip+email.
>   **Ревизия №3 (2026-06-03, абстракция авторизации — основная цель, проработка плана без реализации):**
>   зафиксирована **единая ось из 3 режимов** (`standalone` / `hub-client` / `hub-provider`) и слияние «профиля» (§2.2)
>   с «Tier» (§2.3) — переписаны §2.2/§2.3/§4. Решения сессии: (1) «переход коммерса на letar.best» = **OIDC-клиент
>   Ключницы** (не CNAME, не шаринг ключей); (2) форма абстракции = **серверная фабрика `createAuth(profile)`** в
>   `@letar/auth/server`; (3) выделен **новый Этап 1.5** (абстракция) в Фазе B перед тиражом; (4) **Tier 2 = только
>   standalone** (свои ключи из БД при старте, без runtime-динамики → D8 не блокирует основную цель). Найдены и внесены
>   недочёты: «переход режима = миграция identity» (§10, связь с §8.5), hub-client отдаёт домен письма Ключнице (§2.4),
>   регистрация hub-клиента = операционная процедура (`trustedClients` хардкод). Это **проработка**, код не тронут.
>   **Сессия реализации №7 (2026-06-03, auth-hub публичное дерево):** ✅ **реестр hub-клиентов → БД** (под-вопрос Этапа 1.5 п.4):
>   `trustedClients` (7 клиентов) и `requireOidcSecret()` удалены из `auth.ts`; добавлен `prisma/seed.ts` — upsert 7 клиентов
>   из `OIDC*\*\_SECRET`env vars через raw ZenStack ORM (обходит`@@deny('all', true)`); nx target `db:seed`; обновлена
>   `/admin/clients`(redirect URLs, toggle disabled, пустой стейт с инструкцией);`docker-compose.dev.yml`для локальной БД;
>   seed выполнен и проверен (7/7 ✓). Особенность BA v1.6.11:`skipConsent`не читается из БД → studio покажет consent 1 раз.
>   ✅ Деплой на s2 выполнен: seed 7/7 + перезапуск auth-hub (BlackCove).
>   **Сессия реализации №8 (2026-06-04, инфра — Этап 0.1 ✅ ПОЛНОСТЬЮ):** ротация 6 утёкших OIDC-секретов:
>   сгенерированы новые значения; обновлены`.env.docker`auth-hub + 6 клиентов (kami, dashboard, archetest, time,
>   grandslamcup, animatrona-tracker) локально и на s2; добавлен`OIDC_STUDIO_SECRET`(studio-prod, новый клиент);
>   повторный seed на s2 — upsert 7/7; рестарт всех контейнеров в порядке (auth-hub → клиенты). Старые литералы
>   из публичной git-истории отозваны. Риск 🔴 «секреты в публичном репо» закрыт.
>   **Сессия реализации №9 (2026-06-04, Этап 1.5 ⏳):** фабрика`createAuth(profile)`в`@letar/auth/server`:
>   типы `AuthProfile`(3 режима), generic build-функции, 16 Vitest тестов; bump 0.3.0→0.4.0. Эталоны:
>   dsperevod (standalone, 90→35 строк) + time (hub-client, 84→20 строк, без DB). Ограничение Better Auth:`additionalFields`не выводятся через фабрику — 3 cast-сайта dsperevod исправлены через`as unknown as`.
>   Осталось по DoD: README + E2E behavior-parity.
>   **Сессия реализации №11 (2026-06-04, Этап 3 ✅ ПОЛНОСТЬЮ):** admin/users с VerifyButton во всех 5 приложениях:
>   aboi (новая страница + AdminNav), kami (новая страница + AdminSidebar), auth-hub (VerifyButton в существующую),
>   dsperevod (verifyUserAction + logAudit + VerifyButton), premium-rosstil (verifyUserAction + VerifyButton + колонка).
>   Коммиты в 3 submodule + bump SHA + корневой репо.
>   **Сессия реализации №10 (2026-06-04, Этап 1.5 ✅ DoD):** README `@letar/auth`полностью переписан —
>   добавлен раздел`createAuth()`с контрактом`AuthProfile`, всеми тремя режимами, примерами dsperevod/time,
>   ограничением `additionalFields`; обновлена дата и версия (0.4.0). Создан `docker-compose.dev.yml` для dsperevod
>   (postgres:17, порт 5442). E2E behavior-parity: 3/3 passed chromium — поведение standalone через фабрику
>   идентично эталону сессии №6. **Этап 1.5 закрыт полностью.**

## Как читать документ

1. §1 Видение. 2. §2 Модель владения + **3 режима `createAuth()`** ⭐ (ось абстракции). 3. §3 Состояние (факты).
2. §4 Целевая архитектура + **контракт `createAuth(profile)`** ⭐. 5. §5 Карта auth. 6. §6 Критический путь и DoD. 7. §7 Этапы (**1.5 — абстракция** ⭐).
3. §8 Сквозные требования. 9. §9 Точки решения (D10 — абстракция). 10. §10 Риски. 11. §11 Документация. 12. §12 Агенты.

---

## 1. Видение и цель

Единая переиспользуемая система авторизации и email-верификации для всего монорепо, на библиотеках,
с сохранением лучших наработок (эталон — `driving-school`) и без дублирования:

- **`@letar/auth`** — сессии, клиент (Better Auth), OAuth-кнопки, guards **+ серверная фабрика `createAuth(profile)`**
  ⭐ (новое, Этап 1.5): единая точка, инкапсулирующая выбор **режима** (`standalone` / `hub-client` / `hub-provider`)
  и **источника соц-секретов** (env / БД-админка / Ключница). Конфигом, не хардкодом; убирает дублирование `auth.ts`.
- **`@letar/pin-auth`** — верификация email: **коды + ссылки в одном письме**, **синхронизация вкладок**
  (SSE), **resend с cooldown**, авто-логин. Уже существует и зрелая.
- **`@letar/email`** — отправка через Maddy; `SendEmailResult` для логирования SMTP-ошибок.
- **Ключница (`auth-hub`)** — централизованный **OIDC-провайдер** для пет-проектов одного владельца.

**Ключевой принцип — мульти-владельческая природа.** В монорепо вперемешку **коммерческие проекты разных
владельцев** и **личные пет-проекты**. Поэтому единой схемы auth быть не может: авторизация, секреты и
email-домен — **по владельцу проекта**; Ключница — дефолт только для петов, для коммерции **не обязательна**.

**Ключевой принцип — абстракция через режим, а не через копирование.** Различие приложений сводится к **одному
объекту `AuthProfile`** (владелец, режим, источник секретов, домен письма), который передаётся в `createAuth()`.
Приложение не собирает `betterAuth({...})` руками (сейчас `auth-hub/lib/auth.ts` — ~390 строк, копируемых при тираже)
— оно **декларирует профиль**. Смена режима (коммерс «переходит на letar.best») = смена профиля, а не переписывание `auth.ts`.

> **Первопричина инцидента:** неверный `SMTP_FROM_EMAIL` (письма молча не доходили) + тупик
> неверифицированного пользователя на `/sign-in` без resend. Resend лечит симптом, доставку чинит Этап 0.

---

## 2. Модель владения, auth-профили и соц-секреты ⭐

### 2.1 Классификация проектов

Признак коммерческого проекта: **приватный submodule** (`kamiletar/letar-private-*`) + **свой домен в `.env.docker`**.

- **Коммерческие (разные владельцы):** `driving-school` (направа.рф), `aboi` (neyroaboi.ru), `dsperevod` — все
  приватные submodules. Git-изоляция уже есть. (`premium-rosstil`, `imot` выведены из эксплуатации — см. сессию
  вывода из эксплуатации в шапке файла.)
- **Личные петы (владелец — letar):** `kami`, `dashboard`, `auth-hub` (Ключница), `mandala`, `archetest`,
  `time`, `grandslamcup`, `animatrona-*` и пр. — публичное дерево `letar`, домены `*.letar.best`.

### 2.2 Три режима авторизации (`AuthProfile.mode`) ⭐ РЕШЕНО (ревизия №3)

Единая ось абстракции. Каждое приложение выбирает **ровно один** режим, передавая его в `createAuth(profile)`.
«Профиль владельца» и «Tier секретов» (§2.3) сведены в эту ось — отдельных классификаций больше нет.

| Режим              | Кому                                                        | Соц-вход                       | Email/pass  | Секреты                       | Identity (user.id) |
| ------------------ | ----------------------------------------------------------- | ------------------------------ | ----------- | ----------------------------- | ------------------ |
| **`standalone`**   | коммерсы (дефолт); кому нужен свой бренд/контроль           | свои OAuth-приложения (Tier 2) | локально    | владельца: env или БД проекта | своя БД приложения |
| **`hub-client`**   | петы `*.letar.best`; коммерс, осознанно перешедший (Tier 1) | через Ключницу (OIDC-редирект) | на Ключнице | общие letar                   | **Ключницы**       |
| **`hub-provider`** | только `auth-hub`                                           | сам выдаёт (для всех клиентов) | сам         | общие letar                   | мастер-источник    |

- **`standalone`** — приложение само себе Better Auth. Свой домен, своя БД пользователей. Соц-вход опционален:
  без него — только email/password (дефолт); с ним — владелец вводит **свои** ключи (Tier 2, §2.3).
- **`hub-client`** — приложение делегирует вход Ключнице (как сейчас kami/dashboard/archetest/time/grandslamcup/
  animatrona-tracker). `createAuth()` подключает `genericOAuth` на OIDC-discovery Ключницы; локальные соц-провайдеры
  не нужны. **Это и есть «переход коммерса на авторизацию letar.best»** (решение ревизии №3).
- **`hub-provider`** — единственный экземпляр: `auth-hub`. `createAuth()` подключает `oidcProvider`-плагин.

> ⚠️ **Смена режима — не бесплатна.** `standalone → hub-client` меняет источник identity (user.id Ключницы вместо
> локальных) → требует **миграции/перепривязки данных** существующих пользователей (тот же класс задачи, что перенос
> данных в петах §14.1 и merge §8.5). Закладывать как миграцию, а не как флаг. См. риск в §10.

> **Multi-tenant Ключница (CNAME + изоляция тенантов)** — отдельная далёкая опция для гипотетической «SaaS Ключницы»,
> **не** входит в основную цель и НЕ является способом «перехода коммерса» (его покрывает `hub-client`). См. D8 §9.

### 2.3 Соц-секреты: два Tier = выбор режима (§2.2) — РЕШЕНО (уточнено в ревизии №3)

Tier — это **не отдельная ось**, а проекция выбора режима §2.2. В админке коммерческого проекта владелец делает
**один informed-consent выбор**, который и определяет режим:

|                         | **Tier 1 — «наши ключи»** = `hub-client`     | **Tier 2 — «свои ключи»** = `standalone` + BYO  |
| ----------------------- | -------------------------------------------- | ----------------------------------------------- |
| Что происходит          | проект становится OIDC-клиентом Ключницы     | проект остаётся standalone, вводит свои ключи   |
| Соцтокены               | общие letar, через Ключницу                  | владелец вводит свои OAuth-приложения в админке |
| Морока настройки        | letar, **разово на всех**                    | **владелец** (letar лишь хранит secret)         |
| Брендинг consent-экрана | letar / Ключница                             | владельца                                       |
| Домен письма верифик.   | **letar.best** (Ключница) — теряет свой      | **домен клиента** (контроль у владельца)        |
| Владение, риск бана     | letar (общий риск)                           | владельца                                       |
| Identity / данные       | user.id Ключницы → **миграция при переходе** | свои user.id, миграции нет                      |
| Когда                   | старт, MVP                                   | дорос, хочет владеть/брендировать               |

- **Требование:** UI в админке — «ввести свои ключи» ИЛИ «перейти на авторизацию letar.best» с **явным показом
  рисков** (бренд, домен письма, риск бана, миграция identity, letar = обработчик ПДн §2.6).
- **Честное ограничение:** брендинг consent-экрана Google в Tier 1 не обходится (показывает владельца
  OAuth-приложения); кастомный домен Ключницы (CNAME) брендирует только URL. Бренд клиента → только Tier 2.
- **Хранение Tier 2:** secret шифруется at-rest в БД **его** проекта (не в общей); читается `createAuth()` при
  старте/reload приложения.
- **✅ D8 не блокирует основную цель (решение ревизии №3):** Tier 2 живёт **только на standalone-инстансе** →
  провайдеры собираются из БД при старте/reload, **без runtime-динамики в Ключнице**. Динамическая регистрация
  провайдеров/клиентов (D8) нужна лишь для гипотетической multi-tenant «SaaS Ключницы» — вынесена из scope (§9-D8).

### 2.4 Email/password — локальный, но инфраструктура per-владелец

Не требует внешних секретов → почти всегда локальный. Но тянет за собой:

- **Домен писем** — верификация/сброс уходят с **домена клиента** (`SMTP_FROM` на его домене), иначе спам-флаги
  (прямая связка с первопричиной `SMTP_FROM_EMAIL`).
- **Изоляция пользователей** — БД/таблица юзеров клиента отдельно.
- **Ссылки/PIN** — ведут на домен клиента.
- **⚠️ Режим `hub-client` ломает это для коммерса:** при переходе на Ключницу email-верификация и письма уходят с
  `letar.best`, а не с домена клиента → потеря брендинга письма + риск спам-флагов на чужом домене. Явный trade-off
  Tier 1, показывать в consent (§2.3). У `standalone` (Tier 2) контроль над доменом письма остаётся у владельца.

### 2.5 Структура монорепо

Изоляция уже обеспечена submodules. Для логического разделения — **Nx tags** (`owner:letar` / `owner:commercial`)

- module-boundaries (ESLint запретит кросс-импорты твоё↔клиентское). Физические папки (`apps/letar/…`) — дорого
  (ломает paths/CI/docker/`deploy-affected.sh`/submodules) и без выгоды сверх тегов; только при потребности в
  отдельных деплой-пайплайнах → `@nx/workspace:move`.

### 2.6 Правовая сторона (152-ФЗ, владение, согласия)

> Детали и шаблоны — `.claude/docs/personal-data.md` (152-ФЗ, РКН, cookie-согласия, чекбоксы ПДн).

- **Оператор vs обработчик ПДн.** `standalone`-коммерс (Tier 2) = **оператор** ПДн своих пользователей. Как только
  проект переходит в `hub-client` (Tier 1) — вход и данные сессии идут через Ключницу, letar становится
  **обработчиком** → нужен **договор поручения обработки** (ст. 6 152-ФЗ) между letar и владельцем проекта.
  Это юридическое следствие «переход коммерса на letar.best» — показывать в consent (§2.3) и оферте.
- **Согласия и политики per-домен.** Чекбоксы согласия на обработку ПДн при регистрации; Политика
  конфиденциальности и cookie-согласие (РКН) — на домене **каждого** проекта, от имени его оператора.
- **Локализация (ст. 18 152-ФЗ) ⛔ блокер, проверить РАНО.** ПДн граждан РФ — на серверах в РФ. Где хостятся
  Ключница и БД? Если вне РФ — влияет на архитектуру (перенос инфраструктуры) → решить ДО Этапов 6–8, а не в конце.
- **Tier 1 — владение OAuth.** Закрепить в оферте/ToS, что соц-вход обслуживается инфраструктурой letar
  (§2.3) — клиент принимает осознанно.
- **Account-merge (склейка email).** Объединение ПДн из разных аккаунтов — фиксировать основание и аудит;
  сохранять право на удаление/выгрузку. См. Этап 8.5.
- **Разные владельцы → разные операторы** → изоляция данных и раздельная ответственность обязательны.

---

## 3. Текущее состояние (проверено по коду)

### 3.1 Матрица приложений

| App                | Владелец      | Auth-механизм                        | Верификация email                                   | Роли                | `admin/users`             | DB в admin             |
| ------------------ | ------------- | ------------------------------------ | --------------------------------------------------- | ------------------- | ------------------------- | ---------------------- |
| **aboi**           | commercial    | Better Auth + `anonymous`            | link, `sendOnSignUp` (тупик `EMAIL_NOT_VERIFIED`)   | `roles: string[]`   | ❌ создать                | `prismaAuth`           |
| **kami**           | letar pet     | Better Auth + OIDC-клиент Ключницы   | link (`requireEmailVerification: true`)             | `roles: UserRole[]` | ❌ создать                | `prisma` (+обогащ.)    |
| **dsperevod**      | commercial    | Better Auth standalone               | link (`requireEmailVerification: true`)             | `role` (single)     | ✅ есть (+статус+actions) | `getEnhancedPrisma`    |
| **auth-hub**       | letar (инфра) | **Ключница — OIDC provider**         | link, **только в production**                       | `roles: UserRole[]` | ✅ есть (+статус)         | `prisma` (plain)       |
| **driving-school** | commercial    | Better Auth + `organization` (teams) | **`@letar/pin-auth`: коды + ссылки + cross-tab** ⭐ | `roles: UserRole[]` | (своя)                    | `prismaAuth`           |
| **mandala**        | letar pet     | PIN                                  | PIN (`resend-pin.action`)                           | —                   | (своя)                    | —                      |
| **svoichuzhie**    | letar pet     | Better Auth standalone + 2FA         | link + resend, `/verify-email` ✅                   | `role` (single)     | ✅ создан (2026-06-26)    | `prisma` (ZenStack v3) |

**OIDC-клиенты Ключницы** (`trustedClients`): kami, dashboard, archetest, time, grandslamcup, animatrona-tracker.

### 3.2 Состояние библиотек

- **`@letar/pin-auth`** — уже реализует всё ценное: `server` (`generatePin/generateToken`, `createPinValidator`
  с `maxAttempts`, `createTokenManager` с cooldown), `client` (`usePinVerification`, `useResendCountdown`,
  `useVerificationStream` — SSE cross-tab), `email` (`formatVerificationEmail` — PIN + ссылка), `schemas`.
  **БД-агностична** (адаптеры-callbacks); эталон-потребитель — `driving-school`.
  ⚠️ Спроектирована под `emailVerified: DateTime` + модель `verificationToken`; Better Auth — `Boolean` +
  таблица `verification`. Адаптеры разруливают, но это работа Этапа 1.
- **`@letar/auth/client`** — фабрики клиента, `OnlyFor`, `SessionProvider`, OAuth-кнопки, connected-accounts,
  ✅ `ResendVerificationButton` (добавлен в Этапе 1).
- **`@letar/auth/server`** — есть session-helpers, guards, checks, logout/unlink-actions. **🔴 Серверной фабрики
  `createAuth()` НЕТ** → каждое приложение собирает `betterAuth({...})` руками (auth-hub ~390 строк, копируются при
  тираже). Это корневой пробел абстракции — обоснование **Этапа 1.5**.
- **`@letar/email`** — `sendVerificationEmail()` → `SendEmailResult`; результат теперь захватывается (Этап 0/2).

### 3.3 Болевые точки

- aboi `/sign-in` `EMAIL_NOT_VERIFIED` — только текст, нет resend.
- ~~premium-rosstil — параллельная кастомная верификация (дублирует Better Auth, ничего не гейтит).~~
  ➖ приложение выведено из эксплуатации (2026-07-05), пункт неактуален.
- ✅ auth-hub — OIDC client secrets **ротированы** (сессия №8): литералы убраны из кода (сессия №2), новые значения
  сгенерированы и загружены в БД через seed. Старые значения из git-истории отозваны.
- Три модели ролей, три способа DB-доступа в admin, auth-hub без i18n.

---

## 4. Целевая архитектура

| Слой                 | Зона ответственности                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@letar/auth` сервер | ⭐ `createAuth(profile)` — фабрика `betterAuth`-инстанса по режиму (§2.2); + session-helpers, guards, checks. |
| `@letar/auth` клиент | `authClient`, OAuth-кнопки, `ResendVerificationButton`, `OnlyFor`, `SessionProvider`, connected-accounts.     |
| `@letar/pin-auth`    | Верификация: коды+ссылки, cross-tab (SSE), resend+cooldown, авто-логин, шаблоны.                              |
| `@letar/email`       | Транспорт (Maddy), `SendEmailResult`, **централизованный лог** SMTP-ошибок.                                   |
| Ключница (auth-hub)  | Единственный `hub-provider`; (Этап 8) управление соц-секретами; реестр hub-клиентов (`trustedClients`).       |
| Приложение           | **Декларирует `AuthProfile`** + тонкая интеграция: страницы, server actions, адаптеры БД, i18n, rate-limit.   |

**Контракт `createAuth(profile)` ✅ ФИНАЛИЗИРОВАН (Этап 1.5, `libs/auth/src/server/create-auth/types.ts`,
`@letar/auth` 0.7.0+). Дискриминированное объединение по `mode`, а не единый плоский интерфейс —
финальный API разошёлся с исходным эскизом (не `emailVerification`/`hub`/`roleField`, а
`email`/`oidc`/`user.additionalFields` — ближе к сырому `BetterAuthOptions`, чем предполагалось на
старте). Уже используется в проде 6 приложениями (dsperevod, time, kami, auth-hub, driving-school,
archetest) во всех трёх режимах.**

```ts
// Общее для всех режимов
interface AuthProfileBase {
  baseURL: string
  trustedOrigins?: string[]
  user?: BetterAuthOptions['user'] // additionalFields (role/roles и т.д.)
  session?: Partial<BetterAuthOptions['session']>
  plugins?: BetterAuthOptions['plugins']
  pages?: { signIn?: string; signUp?: string; error?: string; resetPassword?: string }
  secondaryStorage?: BetterAuthOptions['secondaryStorage'] // createRedisStorage(url)
}

// standalone — локальная авторизация (§2.2), коммерс со своим доменом
interface StandaloneAuthProfile extends AuthProfileBase {
  mode: 'standalone'
  database: BetterAuthOptions['database'] // prismaAdapter(...)
  email: {
    // инжектируется приложением, не библиотекой
    sendVerificationEmail: (p: { to; userName?; verificationUrl }) => Promise<{ success; error? }>
    sendPasswordResetEmail?: (p: { to; userName?; resetUrl }) => Promise<{ success; error? }>
    reportEmailFailure: (p: { type; to; error }) => void
  }
  rateLimit?: { customRules?: Record<string, { window: number; max: number }> }
  social?: { source: 'env'; providers } | { source: 'db'; load: () => Promise<SocialKeys | null> } // Tier 2, Этап 8
  databaseHooks?: BetterAuthOptions['databaseHooks']
  password?: { hash; verify } // напр. bcrypt для legacy-хешей (driving-school)
}

// hub-client — OIDC-клиент Ключницы, петы *.letar.best
interface HubClientAuthProfile extends AuthProfileBase {
  mode: 'hub-client'
  database?: BetterAuthOptions['database'] // опционально — time не имеет локальной БД
  oidc: { clientId: string | undefined; clientSecret: string | undefined; discoveryUrl?: string }
  rateLimit?: { storage?: 'memory' | 'database' | 'secondary-storage'; customRules? }
  account?: { accountLinking?: { enabled?: boolean; trustedProviders?: string[] } }
}

// hub-provider — единственный экземпляр, сама Ключница (auth-hub)
interface HubProviderAuthProfile extends AuthProfileBase {
  mode: 'hub-provider'
  database: BetterAuthOptions['database']
  email: StandaloneAuthProfile['email']
  socialProviders?: BetterAuthOptions['socialProviders'] // общие для всех hub-client приложений
  oidcProvider?: { loginPage?; consentPage?; requirePKCE?; accessTokenExpiresIn?; refreshTokenExpiresIn?; scopes? }
  account?: HubClientAuthProfile['account']
}

type AuthProfile = StandaloneAuthProfile | HubClientAuthProfile | HubProviderAuthProfile
```

Полная документация с примерами по каждому режиму: [`libs/auth/README.md`](libs/auth/README.md).

- `standalone` → собирает `socialProviders` из `social.source`; `hub-client` → `genericOAuth` на `hub.issuerURL`,
  локальных провайдеров нет; `hub-provider` → подключает `oidcProvider`-плагин (только auth-hub).
- Resend-кнопка — тонкая обёртка, **принимает `authClient` параметром** (aboi/kami строят клиент из `better-auth/react`).
- ⚠️ Контракт **не финализирован** — точная сигнатура, типы ролей и подключение pin-auth уточняются в Этапе 1.5 (spike).

---

## 5. Карта auth монорепо

- **Богатый флоу (эталон):** driving-school (pin-auth). **Тупик без resend:** aboi, kami, dsperevod, auth-hub.
- ~~**Кастомная верификация:** premium-rosstil (мигрируем — §9-D4).~~ ➖ premium-rosstil выведен из
  эксплуатации (2026-07-05) — миграция (Этап 4) была выполнена до этого, но пункт больше не актуален. **PIN:** driving-school, mandala.
- **OIDC-клиенты Ключницы:** kami (гибрид), dashboard (только Ключница), archetest/time/grandslamcup/animatrona-tracker.

---

## 6. Критический путь, фазы и DoD

**Фазы:**

- **Фаза A — Инцидент-реагирование и инфра (0.x):** доставка писем, ротация утёкших секретов, защита почты,
  **ревизия бэкапов (0.3)**, **secret-manager (0.4)**, теги, **завершение ренейма lena→letar (0.6)**, canary.
  Делается первой; этапы 0.x параллелятся между собой.
- **Фаза B — Фундамент, абстракция и тираж (1–5):** библиотеки → resend → **абстракция `createAuth()` (1.5)** →
  admin → premium-миграция → богатый pin-auth флоу. ⭐ Этап 1.5 — основная цель ревизии №3, ставится перед тиражом.
- **Фаза C — Продвинутое (6–8.5):** kami (первый `hub-client` на фабрике), passkeys, Telegram, driving-school на
  библиотеку, соц-секреты, merge.

**Критический путь (что блокирует что):**

| Этап                  | Зависит от            | Можно параллельно с |
| --------------------- | --------------------- | ------------------- |
| 0, 0.1, 0.2, 0.5      | —                     | друг с другом       |
| 0.3 бэкапы            | —                     | 0.2 (Maddy), 0.4    |
| 0.4 secret-mgr        | — (research)          | 0.1, 0.3            |
| 0.6 ренейм-хвост      | —                     | 0.3 (пути бэкапов)  |
| 0.7 canary            | 0                     | 0.1, 0.2            |
| 1 libs                | — (публичные `libs/`) | 0.x                 |
| **1.5 createAuth ⭐** | **1**                 | **0.x, 2, 3**       |
| 2 resend              | 1                     | 3, 1.5              |
| 3 admin               | частично 1            | 2, 1.5              |
| 4 premium             | 1, 2, **1.5**         | 3, 5                |
| 5 pin-флоу            | 1                     | 3, 4                |
| 6 kami (`hub-client`) | 1, **1.5**            | —                   |
| 6.5 passkeys          | 6                     | 6.6                 |
| 6.6 telegram          | auth-hub              | 6.5                 |
| 7 driving-school      | 1, 5, **1.5**         | 6.x                 |
| 8 секреты             | **1.5**, 1–7          | —                   |
| 8.5 merge             | auth-hub              | 8                   |

> **1.5 не блокирует уже идущий тираж жёстко:** resend (2) и admin (3) могут идти параллельно. Но **новые потребители
> режимов** (4 premium, 6 kami как `hub-client`, 7 driving-school, 8 секреты) встают **на фабрику** → завязаны на 1.5.
> Поэтому 1.5 — раньше них. Эталон самой фабрики обкатывается на 1 standalone (dsperevod) + 1 hub-client (kami) — см. §7.

**Definition of Done — глобальный минимум на каждый этап:** (1) код + тесты (Vitest/Playwright, TDD) зелёные;
(2) `nx format && nx lint && nx typecheck:tsgo` чисто; (3) затронутая документация (§11) обновлена; (4) bump версии
и CHANGELOG; (5) для коммерсов — коммит в submodule + bump SHA. Доп. критерии приёмки — в этапах ниже («✓ DoD»).

---

## 7. Этапы (roadmap)

> Каждый этап автономен и тестируется отдельно. Коммерческие — приватные submodules (коммит внутри + bump SHA).

### Этап 0 — Доставка писем (первопричина) ⏱ первым

- Аудит `SMTP_FROM_EMAIL`/SMTP на всех (`/sync-env`, `email-maddy`); для коммерсов — домен письма = домен клиента (§2.4).
- **DKIM/SPF/DMARC per-домен (явный deliverable).** Техн. первопричина «форвард режется gmail» (§14.2): валидные
  DNS-записи для каждого отправляющего домена (`letar.best`, `premium.rosstil.ru`, …). Без них письма в спам/режутся
  даже при верном `SMTP_FROM`.
- **Baseline-метрики (снять ДО правок).** Зафиксировать старт: % доставки, % верификации, число застрявших
  аккаунтов (`emailVerified` пусто/false). Иначе успех Этапа 0/2 недоказуем.
- ✅ **Централизованный лог `success === false` в `@letar/email`** (сессия №1): `reportEmailFailure({ type, to, error })`
  → `[email] send failed {...}` (виден в `docker logs`); `setEmailFailureAlerter` — env-gated точка расширения
  для Telegram/Umami (интеграции — инфра-сессия); bump 0.1.0→0.2.0 + CHANGELOG. ✅ Фикс игнорируемого результата
  в mandala (register/resend actions). aboi — submodule, отдельная сессия.
- **Алертинг (Вариант B + C — §13.4):**
  - **B — Telegram-webhook:** при `success === false` опциональный вызов в `@letar/email`;
    дебаунс — алерт только на 3 подряд `success === false` одного типа;
    конфигурация: `TELEGRAM_ALERT_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID` в `.env.docker` (токен **не хранить в коде/плане**).
  - **C — Umami event:** `umami.track('smtp-failure', { type, appId, errorCode })` для трендов и % ошибок.
  - Оба варианта — опциональные (пустые переменные = отключено), без ломающих изменений API `@letar/email`.
- **✓ DoD:** canary (0.7) зелёный ≥ 3 суток подряд; 0 проигнорированных `SendEmailResult`; baseline зафиксирован.
- **Зависимости:** нет. Без доходящих писем resend бессмыслен.
- ℹ️ **Смежная инфра готова (2026-07-05):** `dashboard`'s `Alert`/`sendTelegramNotification` pipeline существовал с самого создания, но нигде не вызывался (мёртвый код) — теперь впервые задействован через `POST /api/alerts` (`dashboard-agent` → `CRON_FAILED` при провале cron-задач). dsperevod получил проактивный `/api/cron/email-health-check` (`transporter.verify()` каждые 6ч). Это ДРУГОЙ механизм, чем `setEmailFailureAlerter` из этого этапа (проверка живости SMTP по расписанию, а не алерт на каждый неудавшийся send) — но при реализации B/C variant для `@letar/email` стоит переиспользовать уже рабочий `dashboard`'s `/api/alerts` вместо отдельной Telegram-интеграции. Детали: `apps/dashboard/PLAN_COMPLETED.md`, `apps/dashboard-agent/PLAN_COMPLETED.md`, `apps/dsperevod/CHANGELOG.md` (v0.5.4).

### Этап 0.1 — Ротация утёкших OIDC-секретов Ключницы ✅ ПОЛНОСТЬЮ (сессии №2 + №7 + №8)

- **Проблема (подтверждено по коду):** 6 `clientSecret` в `trustedClients` записаны литералами в `auth.ts:193-281`;
  auth-hub — публичное дерево → секреты в публичной git-истории.
- ✅ **Код-часть (сессия №2):** литералы заменены на `requireOidcSecret('OIDC_<APP>_SECRET')` из `process.env`
  (fail-fast хелпер); переменные добавлены в `.env.local` (dev) и `.env.docker` (prod, не коммитятся) с текущими
  значениями. Grep по `clientSecret: '` чист. bump auth-hub 0.3.1→0.3.2.
- ✅ **Инфра-часть (сессия №8, 2026-06-04):** сгенерированы новые секреты для 6 старых клиентов + добавлен
  `OIDC_STUDIO_SECRET` (новый); обновлены `.env.docker` auth-hub + всех 6 клиентов на s2; seed 7/7; рестарт.
  Старые значения из git-истории отозваны.
- ⚠️ Очистка git-истории НЕ возвращает конфиденциальность (репо публичный) → **ротация обязательна**, filter-repo опционален.
- **✓ DoD:** в `auth.ts` нет строковых секретов (grep чисто); старые секреты отозваны; все клиенты логинятся на новых.
- **Зависимости:** нет. Делать в первой сессии вместе с Этапом 0.

### Этап 0.2 — Защита почтового сервера ✅ ОСНОВНАЯ ЗАЩИТА (2026-06-04)

- ✅ **fail2ban jail `maddy-submission`** настроен (2026-06-04): фильтр читает Docker json-log
  (`/var/lib/docker/containers/<id>/<id>-json.log`), regex `\\\"src_ip\\\":\\\"<HOST>:\d+\\\"`;
  `maxretry=5 / findtime=120s / bantime=86400s`; action `iptables-multiport port=587`; тест-бан прошёл.
- ✅ **Пароли сменены** для `kami@letar.best` и `admin@letar.best` (были атакуемые, сгенерированы 32-символьные).
  Новые значения — только в менеджере паролей владельца (не в коде/PLAN).
- ⏳ **Форвард на gmail** режется (DKIM/SPF) — чинится DKIM/SPF/DMARC Этапа 0; DKIM DNS-записи для
  `letar.best`, `neyroaboi.ru`, `premium.rosstil.ru` уже есть; `направа.рф` — **DKIM пока не трогать**:
  driving-school использует `letar.best` для отправки писем (SMTP_FROM на letar.best), собственный домен не отправляет.
  Конкретные хосты/ящики/пути конфигов — в приватном `.claude/OPS_JOURNAL.local.md` (§14.2).
- **✓ DoD:** ✅ brute-force IP банятся автоматически; ✅ пароль ящика сменён; ⏳ доставка на канареечный ящик подтверждена (0.7).
- **Зависимости:** нет (горящее). Пересекается с DKIM-настройкой Этапа 0.

### Этап 0.3 — Ревизия системы бэкапов (прод + локальные) ✅ ПОЛНОСТЬЮ (2026-06-04)

> **Проблема:** сейчас бэкапится много лишнего, а часть критичного — нет. Нужна единая продуманная стратегия.

- ✅ **Сузить scope синхронизации (Resilio Sync).** `.sync/IgnoreList` обновлён на s1 + s2
  (добавлены `.env.docker` / `.env.local` / `.env` → секреты не уходят в offsite Resilio).
- **Базы данных** ⏳ — проверить полноту охвата (все БД s1/s2), расписание и **ротацию**.
- ✅ **Конфиги Maddy** (2026-06-04): `/opt/maddy/backup.sh` тарует `maddy.conf` + `docker-compose.yml` +
  `credentials.db` + `aliases` + `dkim_keys/` → `/root/backups/maddy/maddy_YYYY-MM-DD.tar.gz`;
  cron 03:00 ежедневно, ротация 14 дней. Документировано в `backup-architecture.md`.
  ✅ rsync mail→s2 после каждого бэкапа → Resilio тянет на Windows/pinner2 (offsite).
- ✅ **Nginx Proxy Manager** (2026-06-04): бэкапы создавались штатно до мая; обнаружен баг
  `WORKSPACE_PATH` → nginx backup молча падал (HTTP 200, success=false). Фикс в `27960b3`,
  деплой ожидается от BlackCove. Ротация реализована (MAX=14 авто-бэкапов). Старые бэкапы
  почищены (27 удалено на s2, 35 на s1). Dry-run: nginx archive (737 файлов) валиден.
- ✅ **Локальные credentials** — стратегия задокументирована в `backup-architecture.md`
  (KeePassXC для секретов; git для кода; Resilio только для uploads+backups).
- ✅ **Resilio Sync R/O ключи** убраны из публичного `backup-architecture.md` → перенесены в
  `.claude/OPS_JOURNAL.local.md §14.4` (2026-06-04).
- **✓ DoD:** задокументирована единая стратегия (что/откуда/куда/ротация); IgnoreList синхронизирует только
  `uploads`+`backups`; Maddy-конфиги и DKIM в бэкапе; локальные креды защищены; восстановление проверено dry-run;
  Resilio-ключи убраны из публичного дерева.
- **Зависимости:** пересекается с Этапом 0.2 (Maddy) и 0.4 (secret-manager). Документация — `backup-architecture.md`.

### Этап 0.4 — Выделенный secret-manager для кредов ✅ ПОЛНОСТЬЮ (2026-06-11)

> **Идея:** сейчас креды (личные владельца и прод) разбросаны по `.env.docker`/`.env.local` на разных машинах.
> Вынести в единый инструмент управления секретами.

- ✅ **Инструмент выбран: SOPS + age** (2026-06-05). Обоснование: self-hosted s2, один владелец, нет нового
  сервиса на s2. Файлы `.env.docker.enc` шифруются и хранятся в git. Приватный age-ключ — в KeePassXC.
  Расшифровка при деплое: `sops exec-env .env.docker.enc 'docker compose up'`. 152-ФЗ ✅.
  Infisical/Vault отклонены: избыточны при одном операторе.
- **Что покрыть:** прод-секреты (`.env.docker` всех приложений), OIDC client secrets (Этап 0.1), соц-секреты (Этап 8).
- **Связи:** Этап 0.1 (ротация OIDC), Этап 0.3 (бэкап), Этап 8 (соц-секреты per-владелец).
- **✓ DoD:** age-ключ сгенерирован; `.sops.yaml` настроен; пилот на одном приложении; процесс деплоя обновлён.
- **Зависимости:** не блокирует, желателен до Этапа 8.

### Этап 0.6 — Завершение ренейма `lena` → `letar` (исторические хвосты)

> Косметика и битые пути уже исправлены (сессия ренейма). Осталась **корзина C — load-bearing идентификаторы**:
> по части из них «добраться нужно, если не до всех». Каждый — отдельное решение (мигрировать / оставить с обоснованием).

- ✅ **PostgreSQL DB/user `lena_*`** — **решение: не переименовывать** (2026-06-04, §13): исторический идентификатор,
  риск/downtime не оправданы. Работает без изменений.
- **Пути бэкапов** `C:\BackupSync\lena` / `/home/backups/lena` — завязаны на Resilio (пересекается с Этапом 0.3). ⏳ открыто.
- ✅ **Ключ localStorage** `lena-form-sync-queue` → `letar-form-sync-queue` (2026-06-26): переименован в `offline-service.ts`
  с однократной миграцией (читает старый ключ → пишет в новый → удаляет старый). Тест миграции добавлен. `@letar/forms` 1.4.1.
- **Root-имя пакета** `@lena/source` (`package.json` + `bun.lock`) — ренейм требует регенерации lockfile; low-impact. ⏳ открыто.
- ✅ **Хвосты (публичное дерево):** submodule Dockerfile-комментарии (`imot`, `driving-school`, `premium-rosstil`) —
  исправлены (2026-06-26), коммиты внутри submodule'ов + bump SHA в letar.
- **✓ DoD:** по каждому идентификатору зафиксировано решение; где мигрируем — выполнено с бэкапом; `grep -i lena`
  чист либо остаток обоснован в этом этапе.
- **Зависимости:** БД-ренейм пересекается с бэкапами (0.3) и миграциями (§8 сквозные).

### Этап 0.5 — Nx module-boundary теги (§13.10)

- ✅ **Публичная часть (сессия №2):** тег `owner:letar` добавлен в 60 `project.json` публичного дерева
  (петы + infra + все `libs/*`); submodules исключены. depConstraint `owner:letar → [scope:shared, owner:letar]`
  в `eslint.config.mjs` — ESLint запрещает импорт коммерческого кода в петах. Проверено: 0 нарушений границ.
- ✅ **Submodule-часть (сессия №3, 2026-05-30):** тег `owner:commercial` добавлен в **10** коммерческих
  submodule-проектов (`nx show projects --with-tag owner:commercial`): aboi (+e2e), driving-school (+e2e +db),
  premium-rosstil, imot (+e2e), dsperevod (+e2e). Коммит внутри каждого submodule + bump SHA в letar.
  `premium-rosstil-e2e` пропущен (нет `project.json` → Nx не видит проект). Реципрокный constraint
  `owner:commercial → [scope:shared, owner:commercial]` добавлен в `eslint.config.mjs`; module-boundary чист (0 нарушений).
- **Зависимости:** нет. Делается до начала тиражирования библиотек.

### Этап 0.7 — Периодический canary-мониторинг доставки email

- **Цель:** ловить инциденты доставки (как сегодняшний — форвард режется gmail, неверный `SMTP_FROM`, брутфорс)
  **автоматически**, а не по жалобам. Проверять, что письмо реально **доходит** (round-trip), а не только «SMTP принял».
- **Механизм:** scheduled-задача (cron на сервере / health-скрипт) — раз в N минут:
  1. отправляет тестовое письмо через реальный `@letar/email` на канареечный ящик;
  2. читает входящие по **IMAP**, подтверждает получение в пределах таймаута;
  3. пишет метрику latency доставки.
- **Покрытие:** ключевые отправители per-домен (`noreply@letar.best`, `noreply@premium.rosstil.ru`, …) +
  проверка форвардов (напр. `kami@letar.best` → реальная доставка адресату).
- **Алерт при провале:** Telegram-webhook + Umami (переиспользуем алертинг Этапа 0); порог — N подряд неудач.
- **Реализация:** лёгкий скрипт/сервис (не e2e-фреймворк) — SMTP send + IMAP receive, запуск через cron/scheduled.
- **Зависимости:** Этап 0 (лог `SendEmailResult` + алертинг). Закрывает класс «письма молча не ходят».

### Этап 0.8 — Аудит соответствия 152-ФЗ (комплексная проверка)

> **Контекст:** требования 152-ФЗ уже частично выполнены (эталон aboi, cookie-баннер, согласия в формах, чекбоксы ПДн,
> страница /privacy). Документация — `.claude/docs/personal-data.md`. Этот этап — сквозной аудит **всех приложений**,
> которые собирают ПД, на полное соответствие закону.

**Охват:** все публичные приложения монорепо, собирающие ПД граждан РФ:

| Приложение      | ПД собирает?                    | Аудит нужен? |
| --------------- | ------------------------------- | ------------ |
| auth-hub        | ✅ email, имя, IP, OAuth-данные | ✅ done с30  |
| aboi            | ✅ эталон — уже реализовано     | ✅ done с30  |
| dsperevod       | ✅ email, имя                   | ✅ done с30  |
| driving-school  | ✅ email, имя                   | ✅           |
| kami            | ❌ только владелец              | —            |
| grandslamcup    | ✅ email, имя игроков           | ✅           |
| time            | ❌ только владелец              | —            |
| animatrona-\*   | ❌ внутренние инструменты       | —            |
| dashboard-agent | ❌ внутреннее                   | —            |

**Чеклист для каждого приложения** (из `personal-data.md §7`):

- [ ] Страница `/privacy` с политикой ПДн (оператор, цели, сроки, права субъекта, контакт `privacy@<domain>`)
- [ ] Дисклеймер в футере
- [ ] Cookie-баннер с opt-in для аналитики/маркетинга (функциональные — всегда вкл)
- [ ] Кнопка «Настройки cookie» в футере (повторное открытие)
- [ ] `ConsentLog` в БД + `/api/consent` эндпоинт
- [ ] Чекбокс согласия в форме регистрации (**не предотмечен**, `consentAccepted: false` как default)
- [ ] Чекбокс в каждой форме, собирающей новые ПД (чекаут, заявка)
- [ ] Аналитика (Я.Метрика, Umami) — инициализируется **только после** `analytics: true` (consent-aware обёртка)
- [ ] Право на удаление аккаунта в ЛК (`deleteAccountAction`)
- [ ] Сервер находится в России ✅ (s1/s2 — RU-серверы, ст. 18 ч. 5 ФЗ-152)
- [ ] **Уведомление в РКН** подано (pd.rkn.gov.ru — авторизация через Госуслуги ИП/ЮЛ) — **блокер публичного запуска**

**Что нового (сверх уже реализованного в aboi):**

1. **Уведомление в РКН** — подать через pd.rkn.gov.ru для каждого оператора. Получить PDF с номером → занести в README/PLAN приложения.
   - ✅ **aboi (neyroaboi.ru):** подано 16.05.2026 оператором-владельцем (ИП), рег. № 100286690. PDF у владельца.
     ⚠️ Проверить при аудите aboi: заявленный ЦОД (ООО «Цифровые решения», Москва) — сверить с фактическим хостингом s2.
     Трансграничная передача — по тому же принципу, что у letar (см. ниже): для RU-IP зарубежных провайдеров быть не должно.
   - ✅ **letar (`*.letar.best`: auth-hub, grandslamcup и пр.) + driving-school (направа.рф — тот же оператор-ИП
     владельца letar):** подано 02.06.2026 оператором-владельцем (ИП),
     рег. № 100306050. Дата начала обработки 22.04.2026. 3 цели (договор, продвижение, регистрация на сайте);
     СКЗИ КС1 (TLS); ЦОД — ООО «Цифровые Решения», Москва. PDF у владельца.
     ✅ **Решение (2026-06-10):** «трансграничная передача не осуществляется» корректна — 152-ФЗ/уведомление
     касаются ПДн граждан РФ; для RU-IP зарубежные провайдеры (Google/GitHub/Facebook, Telegram) скрываются
     гео-блокировкой (Этап 6.7), а поведение для иностранных IP — вне сферы уведомления. Уточнение уведомления
     не требуется; **Этап 6.7 становится обязательным** для соответствия заявленному.
   - ✅ **dsperevod:** подано (2026-06-26), номер оператора зафиксирован в apps/dsperevod/PLAN.md.
   - ➖ premium-rosstil, imot — выведены из эксплуатации letar (см. сессию decommission в шапке файла), больше не
     наш вопрос соответствия.
2. **Тираж cookie-баннера** на все ПД-собирающие приложения (сейчас только aboi — эталон).
3. **Проверка чекбоксов** — убедиться, что нигде нет `consentAccepted: true` как defaultValue (нарушение ФЗ).
4. **Consent-aware аналитика** — убедиться, что Umami/Я.Метрика нигде не грузится до согласия.
5. **Право на удаление** — `deleteAccountAction` во всех аккаунт-имеющих приложениях.
6. **Трансграничная передача** — проверить: Telegram (мессенджер), Google OAuth, Facebook OAuth — передача ПД
   за рубеж (при Этапе 6.7 скроем для RU-IP, но нужна оговорка в /privacy пока они доступны).

**DoD:**

- [ ] По каждому приложению из таблицы выше: все пункты чеклиста ✅ или обоснованно N/A
- [ ] Уведомление в РКН подано, номер оператора зафиксирован
- [ ] Нет `consentAccepted: true` как default нигде в кодовой базе (Grep-проверка)
- [ ] Аналитика везде consent-aware

**Зависимости:** независим. Можно делать параллельно с другими этапами. Рекомендуется перед масштабным ростом аудитории.

### Этап 1 — Фундамент библиотек ✅ ВЫПОЛНЕНО (сессия №1, 2026-05-30)

- `@letar/pin-auth`: совместимость с Better Auth (`emailVerified: Boolean`, таблица `verification`); хуки
  переиспользуемы вне driving-school; брендинг шаблонов в конфиг. _(совместимость/брендинг — частично, по мере тиража)_
- ✅ `@letar/auth/client`: `<ResendVerificationButton authClient email callbackURL/>` со встроенным cooldown;
  «лёгкий путь» — обёртка над `authClient.sendVerificationEmail`. bump 0.2.0→0.3.0 + CHANGELOG.
  ⏳ Реэкспорт pin-auth хуков **отложен**: на уровне `libs/` нет cross-lib резолва по имени пакета
  (нет `node_modules/@letar`, paths только в приложениях) — cooldown инлайнен в кнопке. Отдельная задача.
- **Security hardening (§13.1–13.2–13.8) — ✅ сделано:**
  - ✅ **SSE-токен вместо email в URL (§13.1):** `streamToken` генерируется в `token-manager`, передаётся в адаптер
    `createToken`, `useVerificationStream` принимает его. **Аддитивно** — email-путь сохранён; полное удаление
    email-ключа + SSE-роут на `${streamToken}` — при cutover driving-school (Этап 7).
  - ✅ **Timing-safe PIN compare (§13.2):** `crypto.timingSafeEqual` в `pin-validator.ts` (+null-guard). Тесты.
  - ✅ **Single-use авто-логин токен (§13.8):** усилён контракт адаптера `updateTokenForAutoLogin` (атомарная
    замена + одноразовость, док/типы). Полная enforcement (`used`-флаг у потребителя) — Этап 7.
  - ✅ **UX при SMTP-ошибке (§13.4):** в `ResendVerificationButton` cooldown стартует только при `success`.
  - ✅ Добавлена тест-инфраструктура pin-auth (project.json/vitest/tsconfig.spec) + 11 тестов; bump 0.1.0→0.2.0 + CHANGELOG.
- **Зависимости:** нет (публичные `libs/`). Стартовая сессия реализации.

### Этап 1.5 — Серверная абстракция `createAuth(profile)` ⭐ ✅ ПОЛНОСТЬЮ (сессия №9, 2026-06-04; DoD закрыт 2026-07-15)

> **Зачем:** сейчас каждое приложение собирает `betterAuth({...})` руками (auth-hub ~390 строк, копируются при
> тираже). Цель — свести различие приложений к объекту `AuthProfile` (§2.2/§4), убрать дублирование, сделать смену
> режима (коммерс «переходит на letar.best») конфигом, а не переписыванием `auth.ts`.

1. ✅ **Spike + реализация `createAuth()` в `@letar/auth/server`** (сессия №9): режимы `standalone` / `hub-client` /
   `hub-provider`; email-коллбэки инжектируются приложением; DB-адаптер остаётся app-side; generic-перегрузки;
   16 Vitest тестов; bump 0.3.0→0.4.0. Совместимость с ZenStack v3 ORM (`as never`) подтверждена.
   Ограничение: `additionalFields` не выводятся автоматически через фабрику (Better Auth generic inference ограничен) →
   приложения используют `as unknown as SessionUser`. Задокументировано в коде.
2. ✅ **Эталон-миграция standalone** → **dsperevod**: `auth.ts` заменён декларацией профиля (90→35 строк).
3. ✅ **Эталон-миграция hub-client** → **time**: `auth.ts` 84→20 строк, без DB-адаптера.
4. ✅ **DoD закрыт (2026-07-15):** `libs/auth/README.md` описывает все 3 режима с примерами по каждому
   приложению-эталону (dsperevod/time/kami/auth-hub/driving-school), API Reference, актуально на
   `@letar/auth` 0.7.0. E2E `dsperevod-e2e/src/email-verification.spec.ts` (behavior-parity после
   миграции standalone на `createAuth()`) прогнан локально — 2/2 зелёных (регистрация →
   `EMAIL_NOT_VERIFIED` → resend → cooldown; верификация по токену → автологин). Контракт §4
   переписан под реальный API (`libs/auth/src/server/create-auth/types.ts` — дискриминированное
   объединение по `mode`, разошёлся с исходным эскизом). Реестр hub-клиентов закрыт сессией №7.
   **Этап 1.5 ПОЛНОСТЬЮ ЗАВЕРШЁН** — фабрика в проде на 6 приложениях во всех 3 режимах.

- **✓ DoD:** `createAuth()` покрыт тестами; dsperevod (`standalone`) + archetest/time (`hub-client`) работают на
  фабрике, E2E зелёный; их `auth.ts` сократился до декларации профиля; `libs/auth/README.md` описывает 3 режима;
  контракт §4 финализирован; решены под-вопросы п.4.
- **Зависимости:** Этап 1. **Блокирует** постановку новых потребителей на режимы (Этапы 4, 6, 7, 8).

### Этап 2 — Resend email-верификации (исходная боль) — 🟢 эталон aboi ✅ (auth-hub ✅)

> **Сессия 2026-05-30 (auth-hub):** ✅ resend на `/sign-in` через `<ResendVerificationButton>` (@letar/auth/client)
> для обоих сценариев — авторегистрация и вход неверифицированного (`verifyEmailSent` в `login.action.ts`);
> ✅ захват `SendEmailResult` + `reportEmailFailure` в `emailVerification.sendVerificationEmail` (`lib/auth.ts`);
> ✅ rate-limit `/send-verification-email` `{60,5}`. bump 0.3.2→0.4.0 + CHANGELOG. ⏳ Follow-up: у auth-hub нет
> vitest/e2e инфраструктуры — unit/Playwright для resend не написаны; точечный per-email rate-limit (кастомный ключ).
>
> **Сессия 2026-05-31 (aboi — ЭТАЛОН ✅):** ✅ resend на `/sign-in` при `EMAIL_NOT_VERIFIED` (`<ResendVerificationButton>`,
> email из формы, cooldown только при успехе §13.4); ✅ resend-форма на `/verify-email` при ошибке (email вводится
> заново — токен Better Auth 1.6.x это stateless JWT, контекста формы не несёт); ✅ захват `SendEmailResult` +
> `reportEmailFailure` для verification и password-reset (`lib/auth.ts`); ✅ rate-limit `/send-verification-email`
> `{60,3}`; ✅ Umami-события (§13.9) `verification-email-{sent,resent}` + `email-verified` (`lib/analytics.ts`);
> ✅ **E2E зелёный (chromium):** регистрация → тупик → resend → cooldown → верификация по токену → автологин на
> `/profile` (`aboi-e2e/email-verification.spec.ts`). bump aboi 0.23.2→0.24.0 + CHANGELOG; коммит в 2 submodule + bump SHA.
> ⏳ Follow-up: email-уровень rate-limit `{3600,5}` с ключом ip+email (Better Auth не умеет per-email ключ нативно).
> ✅ **dsperevod (сессия №6, 2026-06-02):** resend на `/sign-in` + resend-форма на `/verify-email` + analytics.ts +
> rate-limit + autoSignInAfterVerification + миграция на @letar/email + E2E зелёный. bump 0.5.0.
> ✅ **Этап 2 п.3 ремедиация завершена (2026-06-04):** aboi — 0 застрявших, dsperevod — 0 застрявших.
> auth-hub — 12 застрявших (все зарегали до деплоя resend-фикса, большинство через VK OAuth) → bulk `UPDATE "User" SET "emailVerified"=true` выполнен на prod. Итог: 27/27 верифицированы.

1. ✅ **aboi (эталон):** `/sign-in` `EMAIL_NOT_VERIFIED` → блок + resend (email из формы); `/verify-email` error →
   resend; захват `SendEmailResult`; `rateLimit.customRules['/send-verification-email'] = { window: 60, max: 3 }`.
2. **Тираж:** dsperevod → auth-hub (i18n нет → ru-хардкод; гейт только prod → тест с принудительным флагом).
   kami — Этап 6; premium-rosstil — Этап 4.
3. ✅ **Ремедиация бэклога застрявших (2026-06-04).** aboi: 0 застрявших (2 юзера — все верифицированы).
   dsperevod: 0 застрявших (3 юзера — все верифицированы). auth-hub: bulk-верификация 12 застрявших
   (OAuth VK-аккаунты от апреля, до resend-фикса) → 27/27 верифицированы.

- **✓ DoD:** на эталоне (aboi) E2E «регистрация → тупик → resend → cooldown → верификация» зелёный ✅ (chromium);
  ✅ бэклог застрявших (п.3) — закрыт (2026-06-04). **Этап 2 — ПОЛНОСТЬЮ.**
- **Зависимости:** Этап 1.

### Этап 3 — Admin «Пользователи» + ручная верификация ✅ ПОЛНОСТЬЮ (2026-06-04)

- ✅ **aboi:** `admin/users` страница (фильтр `isAnonymous: false`) + `VerifyButton` + `verifyUserAction` + «Пользователи» в `AdminNav`.
- ✅ **kami:** `admin/users` страница + `VerifyButton` + `verifyUserAction` + «Пользователи» в `AdminSidebar`.
- ✅ **auth-hub:** `VerifyButton` + `verifyUserAction` добавлены в существующую `admin/users`.
- ✅ **dsperevod:** `verifyUserAction` добавлен в `user.action.ts` (с `logAudit`) + `VerifyButton` в колонку «Действия».
- ✅ **premium-rosstil:** `verifyUserAction` + `VerifyButton` + колонка «Верификация»; запрос переведён на `select`.
- Server actions под `requireAdmin`, меняют **только `emailVerified`**; DB-клиент по паттерну приложения (§9-D7). ✅ enhanced Prisma (dsperevod, premium) — политики `@@allow('all', auth().role == ADMIN)` разрешают обновление.
- **Зависимости:** частично Этап 1; можно параллельно с Этапом 2.

### Этап 4 — premium-rosstil: миграция на Better Auth (§9-D4 = «мигрировать») ✅ ПОЛНОСТЬЮ (сессии №15–16)

> ➖ **Приложение впоследствии выведено из эксплуатации (2026-07-05)** — этап сохранён как исторический
> результат, дальнейшие действия по premium-rosstil не требуются.

- ✅ **Шаг 1:** `register-form.tsx` → `authClient.signUp.email()`; удалён `/api/auth/register/route.ts`.
- ✅ **Шаг 2:** `signin-form.tsx` resend → `authClient.sendVerificationEmail()`; удалён `/api/auth/resend-verification/route.ts`.
- ✅ **Шаг 3:** `forgot-password-form.tsx` → `authClient.requestPasswordReset()` (BA 1.6.11: метод `requestPasswordReset`, не `forgetPassword`); `reset-password-form.tsx` → `authClient.resetPassword()`; удалены `/api/auth/request-reset`, `/api/auth/reset-password`.
- ✅ **Шаг 4:** удалены `lib/tokens.ts`, `lib/rate-limit.ts` + все потребители (`verify-email/route.ts`, `cleanup-rate-limits/route.ts`).
- ✅ **Шаг 5:** schema.zmodel — убрано `Verification.type`, дропнута `LoginAttempt`; migration `20260604155648_remove_custom_auth_fields`.
- ✅ **Шаг 6:** `verify-email/page.tsx` переписан на `authClient.verifyEmail()` + ResendVerificationButton при ошибке (по эталону dsperevod).
- `requireEmailVerification` **не включаем** (§9-D3). Пароли совместимы (bcrypt).
- **Зависимости:** Этапы 1–2 ✅.

### Этап 5 — Богатый pin-auth флоу (коды+ссылки+cross-tab) ✅ ПОЛНОСТЬЮ (2026-06-04)

- ✅ **premium-rosstil:** хук `sendVerificationEmail` → PIN + ссылка в одном письме; адаптеры
  `PinValidatorAdapter` (namespace через `identifier`, без поля type); SSE endpoint; server actions
  (verify-pin, resend через BA API, auto-login с HMAC-cookie); страница `/auth/verify-pin` +
  Chakra PinInput + `usePinVerification`; cross-tab sync; register → verify-pin редирект;
  sign-in EMAIL_NOT_VERIFIED → resend + редирект. bump 0.74.0→0.75.0.
- **Зависимости:** Этап 1 ✅; эталон driving-school.

### Этап 6 — kami: авторизация ✅ ПОЛНОСТЬЮ (2026-06-05, сессии №18–19)

- ✅ **§13.7** — `offline_access` scope в kami + фабрику. Коммит `93f713e`.
- ✅ **Фабрика расширена** — `rateLimit`, `account`, `secondaryStorage`, `mapProfileToUser` для hub-client. Коммиты `3649f19`, `10acacd`.
- ✅ **kami/auth.ts** — 241→125 строк на `createAuth({ mode: 'hub-client' })`.
- ✅ **Кнопка Войти** — сразу редиректит на Ключницу, без промежуточной страницы. Коммит `576f00f`.
- ✅ **OIDC flow отлажен** (5 последовательных багов): `OIDC_CLIENT_ID` не в docker-compose; `nextCookies()` не последним;
  `cookies().set()` в Server Component → `OidcPendingCapture`; oidc-capture снимал OIDC params с URL → убран redirect;
  `name_is_missing` → `mapProfileToUser` fallback. Коммиты `83583af`, `35e41b0`, `557ae0f`, `6dec301`, `10acacd`.
- ✅ **auth-hub** — все фиксы задеплоены; OIDC flow работает end-to-end.
- **Зависимости:** Этап **1.5** ✅; Этап 1 ✅.
- ⏳ **Проверка OIDC refresh на проде** — убедиться что refresh_token сохраняется в `account` после первого входа.
- ✅ **Этап 6.51 — RP-initiated logout ✅ ПОЛНОСТЬЮ (2026-06-06, сессия №23):** `createLogoutAction` расширен `OidcLogoutOptions`;
  после `signOut()` → редирект на `https://auth.letar.best/api/auth/oauth2/endsession?client_id=...&post_logout_redirect_uri=...`;
  auth-hub удаляет oauthAccessTokens + сессию → реальный выход. `id_token_hint` не нужен — `client_id` достаточен по spec.
  Все 6 hub-client приложений обновлены (kami `.env` создан + `auth.actions.ts`; animatrona-tracker `.env` + `auth.actions.ts`;
  archetest/grandslamcup/time/dashboard — код уже был с предыдущих сессий). `BETTER_AUTH_OIDC_ISSUER=https://auth.letar.best`
  добавлен в `.env.docker` всех 6. Задеплоено BlackCove (s1: kami ✅; s2: animatrona-tracker/dashboard/archetest/grandslamcup/time ✅).

✅ **Этап 6.5.1 — UX passkeys ✅ ПОЛНОСТЬЮ (2026-06-06, сессия №24):** commit `812d518`, деплой у BlackCove.

✅ **Этап 6.6 — Telegram-авторизация ✅ ПОЛНОСТЬЮ (2026-06-08, сессия №25):** commit `461abde`, деплой запрошен у BlackCove.
Реализовано: `telegramPlugin()` (BA-плагин), таблица `telegramToken`, кнопка `TelegramSignInButton` на /sign-in.
После деплоя: добавить `TELEGRAM_BOT_TOKEN/USERNAME/WEBHOOK_SECRET` в `.env.docker`, зарегистрировать webhook.

**➡️ Следующий старт:** **Этап 7** (driving-school на общую библиотеку) или **Этап 8.5** (Mini App-кабинет).

### Этап 6.5 — Passkeys / WebAuthn ✅ инфраструктура (2026-06-05, сессия №21) + ✅ UX (Этап 6.5.1, сессия №24)

- **Реализовано:** кастомный `passkeyPlugin()` (@simplewebauthn/server v13) для auth-hub; таблица `passkey`;
  компоненты `PasskeySignInButton` / `PasskeyRegisterButton`; кнопка на /sign-in. Задеплоено BlackCove ✅.
- **Passkey не заменяет email** — fallback при смене устройства остаётся.
- **rpID** = `letar.best`, **origin** = `https://auth.letar.best`. HTTPS ✅.

#### 🔴 Текущие проблемы (обнаружены после деплоя)

1. **"Не удалось получить параметры входа"** — `authenticate/options` возвращает ошибку когда в БД 0 passkeys.
   Надо: возвращать `allowCredentials: []` → браузер переходит в **discoverable credential flow** (resident key).
2. **Кнопка показывается всем** — при клике без зарегистрированного passkey → ошибка вместо внятного сообщения.
3. **Нет пути регистрации** — `PasskeyRegisterButton` создан, но нигде не встроен в UI (нет в профиле/настройках).

#### ⏳ Этап 6.5.1 — UX passkeys: правильное поведение как у GitHub/Google

> **Источники:** [web.dev conditional UI](https://web.dev/articles/passkey-form-autofill),
> [WebAuthn W3C Level 3](https://www.w3.org/TR/webauthn-3/), Google passkey UX guidelines.

**Ключевой инсайт:** GitHub/Google **не показывают кнопку** — браузер сам предлагает passkey
в дропдауне автозаполнения поля email. Это называется **Conditional UI** (`mediation: 'conditional'`).
Явная кнопка нужна только как fallback для браузеров без Conditional UI.

##### Шаг A — Починить сервер (быстрый фикс)

```typescript
// plugin.ts: passkeyAuthOptions
// Всегда возвращать 200 с options, даже если passkeys = 0
// allowCredentials: [] → discoverable/resident key flow
const options = await generatePasskeyAuthenticationOptions(passkeys) // passkeys может быть []
return ctx.json(options)
// Убрать throw/error, только return ctx.json(options)
```

##### Шаг B — Conditional UI (главная фича, «как GitHub»)

```
Что происходит с Conditional UI:
1. Страница загружается → в фоне стартует navigator.credentials.get({ mediation: 'conditional' })
2. Пользователь кликает на поле email → браузер показывает дропдаун с passkeys рядом с обычными паролями
3. Пользователь выбирает passkey → браузер показывает Touch ID / Face ID / Windows Hello
4. Сессия создана → редирект
Кнопки нет вообще. Всё бесшовно.
```

**Изменения:**

- `LoginForm`: добавить `autoComplete="username webauthn"` на поле email
- `PasskeySignInButton` → переименовать в `usePasskeyConditionalAuth` (хук)
- Хук запускается при монтировании страницы: `startAuthentication({ optionsJSON, useBrowserAutofill: true })`
- При успехе → сессия + редирект на callbackUrl
- Явная кнопка остаётся как fallback (с проверкой `PublicKeyCredential.isConditionalMediationAvailable`)

##### Шаг C — Регистрация: «Добавить passkey» после входа

Паттерн Google/Apple: **после успешного входа** (через пароль/OAuth/magic-link) → ненавязчивый
баннер внизу:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔑 Войдите быстрее в следующий раз                          │
│ Добавьте ключ доступа — Touch ID / Face ID / Windows Hello  │
│                          [Добавить]  [Не сейчас]            │
└─────────────────────────────────────────────────────────────┘
```

- Показывать **один раз** (localStorage-флаг `passkey_prompt_dismissed`)
- Не показывать если: уже есть passkey на этом устройстве / пользователь отказался
- Компонент `PasskeyPromptBanner` — появляется на `/auth/post-login` или в профиле

##### Шаг D — Управление ключами в профиле

Новая секция `/profile` или `/settings` → **«Ключи доступа»**:

```
Ключи доступа
├── MacBook Pro (Touch ID)         Добавлен 05.06.2026  [Удалить]
├── iPhone 15 Pro (Face ID)        Добавлен 05.06.2026  [Удалить]
└── [+ Добавить ключ доступа]
```

- Таблица passkeys из БД (by userId)
- Переименование (name field)
- Удаление: `DELETE /api/auth/passkey/delete` (эндпоинт нужно добавить в плагин)
- `PasskeyRegisterButton` встроить сюда

##### DoD Этапа 6.5.1 ✅ ВЫПОЛНЕНО (сессия №24, 2026-06-06)

- ✅ **A**: `authenticate/options` возвращает 200 при 0 passkeys (`allowCredentials: []` discoverable flow)
- ✅ **B**: `autocomplete="username webauthn"` на email-инпуте; хук `usePasskeyConditionalAuth`
- ✅ **B**: явная кнопка скрыта когда conditional UI доступен, показывается только как fallback
- ✅ **C**: `PasskeyPromptBanner` в `/profile` (1 показ, dismissable, localStorage)
- ✅ **D**: `/profile/passkeys` — список + добавить + удалить; ссылка в навигации профиля
- ✅ `DELETE /passkey/delete` добавлен в плагин
- ✅ typecheck ✅ lint ✅

**Зависимости:** Этап 6.5 инфраструктура ✅. Можно делать без блокеров.

- **Целевые приложения:** kami ✅, time ✅, grandslamcup ✅; archetest ❌ (разовые пользователи).
- **Зависимости оригинального этапа:** Этап 6 (kami auth) ✅.

### Этап 6.6 — Telegram-авторизация в Ключнице ✅ ПОЛНОСТЬЮ (2026-06-08, сессия №25)

- **Реализовано:** `telegramPlugin()` — кастомный BA-плагин; таблица `telegramToken`; кнопка на /sign-in.
  Флоу: сайт генерит one-time token → `t.me/<bot>?start=<token>` → START → webhook → polling → сессия.
- **Заглушка email:** `<telegramId>@telegram.local` (аналог VK `${id}@vk.com`).
- **Сейчас не было** (в auth-hub: github/google/facebook/vk/yandex/magic-link/OIDC). Добавлено.
- **Прообраз в монорепо:** driving-school уже имеет модели `TelegramLink` + `TelegramLinkToken` (привязка
  через токен) — взять за основу, как pin-auth.
- **Подход (комбинируемо):**
  - **Бот + deep-link токен (ядро):** сайт генерит one-time токен → `t.me/<bot>?start=<token>` (или QR) →
    Start → бот связывает Telegram-identity с сессией → вход. Идеален для cross-device.
  - **Mini App (TMA):** WebApp в Telegram отдаёт `initData` (HMAC по bot-token) → сервер валидирует → сессия;
    внутри — кабинет identity (профиль, активные сессии, управление email/склейка, 2FA).
  - **Login Widget:** опционально.
- **Отдельный бот для auth_hub** (владелец готов завести). Bot-token = секрет → та же Tier-модель (общий бот
  Ключницы = Tier 1 / свой бот клиента = Tier 2, §2.3).
- **Безопасность:** серверная валидация `hash`/`initData` (HMAC-SHA256 по bot-token). Встроенного
  Telegram-провайдера в Better Auth нет → кастомный плагин/эндпоинт (сверить community-плагины).
- **Команды бота:** `/start` (с payload — подтверждение входа/привязки), `/login`, `/link`/`/unlink`, `/help`,
  кнопка-меню «Открыть кабинет» (Mini App).
- **Зависимости:** Ключница (auth-hub); пересекается с Mini App-кабинетом (управление email — Этап 8.5).

### Этап 6.7 — Гео-блокировка зарубежных провайдеров для российских IP ✅ КОД (2026-06-10, сессия №29)

> **Правовой контекст:** по 149-ФЗ (ред. 2024–2025) и подзаконным актам РКН российские ресурсы обязаны ограничивать
> использование иностранных сервисов для аутентификации пользователей из РФ. Под ограничение попадают:
> Google, Facebook (Meta\*), GitHub, а также Telegram. VK, Яндекс — российские, под ограничение не попадают.

**Реализация (сессия №29):**

- `auth-hub/src/lib/geo.ts` — `getCountryCode()`: читает `x-forwarded-for` (NPM уже выставляет), lookupv через `geoip-lite` (MaxMind GeoLite2 бандлится в пакете, без внешних API и без изменений NPM).
- `sign-in/page.tsx` — Server Component: фильтрует `google/github/facebook` из OAuth-провайдеров, скрывает `TelegramSignInButton` для RU-IP. Fallback: нет заголовка → показывать всё.
- `oauth-buttons.tsx` — принимает проп `providers` (раньше хардкод).
- Passkeys оставлены доступными — локальный механизм без иностранного сервиса.
- typecheck ✅ lint ✅. commit `b80de69`. Деплой запрошен BlackCove (msg #754).

**Не реализовано (опционально):**

- ⏳ `proxy.ts` блокировка `/api/auth/callback/{google,facebook,github}` для RU-IP — UI-мера достаточна, API-эндпоинты остаются (обход через прямой запрос теоретически возможен).
- ⏳ NPM-уровень (`X-Country-Code` через `ngx_http_geoip2_module`) — требует пересборки NPM-образа, не даёт преимущества над текущим решением.

**DoD:**

- ✅ `/sign-in` скрывает Google/Facebook/GitHub/Telegram для RU-IP
- ✅ Для dev-окружения показывается всё (нет заголовка → fallback)
- ⏳ `proxy.ts` блокировка API-эндпоинтов (опционально, не блокирует)
- N/A GeoIP2 заголовок через NPM — заменено `geoip-lite` (лучше)

**Зависимости:** Этапы 6.5, 6.6 ✅.

### Этап 6.8 — Тираж `UserMenu` из `@letar/ui` на все приложения ✅ ПОЛНОСТЬЮ (сессии №37–39)

> Компонент создан в сессии №37 (animatrona-tracker — эталон). Нужно заменить самодельные
> кнопки/меню пользователя в остальных hub-client приложениях.

**Hub-client приложения (OIDC через Ключницу):**

| Приложение         | Текущее решение          | Статус        |
| ------------------ | ------------------------ | ------------- |
| animatrona-tracker | разрозненные элементы    | ✅ сессия №37 |
| kami               | своё меню / кнопка Войти | ✅ сессия №38 |
| dashboard-agent    | backend Express (нет UI) | ✅ не нужно   |
| grandslamcup       | своё меню / кнопка Войти | ✅ сессия №38 |
| archetest          | своё меню / кнопка Войти | ✅ сессия №38 |
| time               | своё меню / кнопка Войти | ✅ сессия №38 |

**Standalone приложения (при наличии хедера с авторизацией):**

| Приложение      | Примечание                                          | Статус        |
| --------------- | --------------------------------------------------- | ------------- |
| aboi            | своя авторизация + хедер                            | ✅ сессия №39 |
| dsperevod       | landing, нет auth в хедере                          | ✅ N/A        |
| premium-rosstil | собственный UserMenuClient (i18n + colorPalette=fg) | ✅ N/A        |
| svoichuzhie     | самодельные auth-кнопки в header.tsx                | ✅ сессия №46 |

**Мобильный drawer (все приложения):**

> Самодельные auth-секции в drawer'ах вынесены в `MobileAuthSection` (`@letar/ui`).
> API зеркалит `UserMenu`: session, onSignIn, onSignOut, onClose, profileHref, extraItems, showAuthHub.

| Приложение         | Статус                                  |
| ------------------ | --------------------------------------- |
| animatrona-tracker | ✅ сессия №46                           |
| grandslamcup       | ✅ сессия №46                           |
| archetest          | ✅ сессия №46                           |
| svoichuzhie        | ✅ сессия №46                           |
| kami               | ✅ N/A (нет auth в mobile drawer)       |
| time               | ✅ N/A (UserMenu в toolbar, нет drawer) |

**Паттерн замены (эталон — animatrona-tracker/header.tsx):**

```tsx
import { UserMenu } from '@letar/ui'
<UserMenu
  session={session?.user ?? null}
  onSignIn={() => signInWithLetarAuth(pathname)} // hub-client
  onSignOut={() => signOut()}
  profileHref="/profile"
  extraItems={isAdmin ? [{ value: 'admin', label: 'Админ', href: '/admin', icon: LuSettings }] : []}
/>
```

**DoD:** во всех приложениях из таблицы хедер использует `UserMenu`; поведение «Войти» одинаково — прямой OIDC без промежуточной страницы.

**Зависимости:** `@letar/ui` ✅ (сессия №37). Не блокирует другие этапы — можно делать итерационно.

### Этап 6.9 — Подвал «Сделано в studio.letar.best» на всех сайтах ✅ (2026-06-26)

> **Цель:** кросс-промо студии — каждый публичный сайт монорепо указывает в футере, что сделан в
> [studio.letar.best](https://studio.letar.best), со ссылкой. Трафик на студию + живое портфолио.

- **Общий компонент `StudioCredit` в `@letar/ui`** (по образцу `CookieBanner`/`UserMenu`, сессии №30/№37):
  текст «Сделано в studio.letar.best» + ссылка; пропсы: вариант текста, размер/тон под тему приложения
  (в футере обычно `fg.muted`).
- **Ссылка с UTM:** `https://studio.letar.best/?utm_source=<app>` — переходы видны в Umami студии.
  Обычный dofollow `<a>`, `target="_blank" rel="noopener"`.
- **Охват (публичные сайты):**

| Группа                         | Приложения                                                                         | Примечание                                     |
| ------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| Петы `*.letar.best`            | kami, grandslamcup, time, archetest, mandala, pravda, animatrona-landing, auth-hub | без согласования                               |
| Лендинги letar                 | letar-landing, kami-key-the-landing                                                | решить: нужен ли self-credit на letar.best     |
| Коммерческий (ИП владельца)    | driving-school (направа.рф)                                                        | оператор тот же — без внешнего согласования    |
| Коммерческие (чужие владельцы) | aboi, dsperevod, svoichuzhie                                                       | **согласовать с владельцами** + submodule-флоу |

> ➖ `premium-rosstil`, `imot` исключены из охвата — выведены из эксплуатации (2026-07-05).

Полный список уточнить по `nx show projects` при реализации; приложения без публичного UI
(dashboard-agent и т.п.) — N/A.

- **✓ DoD:** компонент в `@letar/ui`; каждый сайт из охвата показывает credit-ссылку либо обоснованный N/A;
  для submodules — коммит внутри + bump SHA; UTM-переходы фиксируются в Umami.
- **Зависимости:** нет (UI-тираж, можно итерационно — как Этап 6.8).

### Этап 6.10 — Версия сборки в подвале на всех сайтах ✅ (2026-06-26)

> **Цель:** в футере каждого приложения показывать версию сборки из его `package.json` (`version`).
> Упрощает диагностику («какая версия сейчас на проде?»), привязывает баг-репорты к релизу, видно при
> деплое что выкатилась нужная сборка.

- **Общий компонент `BuildVersion` в `@letar/ui`** (по образцу `StudioCredit`/`UserMenu`):
  принимает версию пропсом (`version: string`), рендерит ненавязчивый текст (`v{version}`, тон `fg.subtle`,
  `fontSize="xs"`); опционально — короткий git-SHA и дата сборки.
- **Источник версии (решить при реализации):** `version` из `package.json` приложения. В Next.js не читать
  `package.json` в рантайме на клиенте — пробросить через `next.config.mjs` `env`/`NEXT_PUBLIC_APP_VERSION`
  (билд-тайм inline) либо серверный импорт `package.json` в layout/footer (Server Component). Выбрать единый
  паттерн и задокументировать в `.claude/docs/ui-components.md`.
- **Размещение:** рядом со `StudioCredit` (Этап 6.9) — оба в общий футер-блок, чтобы тираж шёл одной правкой layout.
- **Охват:** все приложения с публичным UI (тот же список что Этап 6.9 + петы). Без UI (dashboard-agent) — N/A.
- **✓ DoD:** компонент в `@letar/ui`; версия читается из `package.json` через единый билд-тайм-механизм;
  каждый сайт из охвата показывает версию в футере; для submodules — коммит внутри + bump SHA; паттерн
  проброса версии задокументирован в `ui-components.md`.
- **Зависимости:** нет (UI-тираж, итерационно — как Этап 6.8/6.9). Удобно делать вместе с Этапом 6.9 (один футер).

### Этап 6.11 — Pressable-компоненты в `@letar/ui` + тираж 🆕 (добавлен 2026-06-20)

> **Цель:** единый тач-фидбек во всём монорепо. На тач-устройствах — spring-анимация (CSS-only, без JS).
> На десктопе — position-aware ripple от точки клика (GPU-анимация, ноль re-renders на тач).

**Что идёт в `@letar/ui`:**

- **`Pressable`** — Box-обёртка с `data-pressable`, `overflow: hidden`, `useRipple` + `RippleEl` для ripple на мыши.
- **`useRipple` + `RippleEl`** — экспортируются отдельно для кастомных композиций.
- **`Button`** (именованный экспорт, не конфликт с Chakra) — Chakra Button + встроенный ripple.
  Используется для `onClick`-кнопок (SignIn, формы). **Не поддерживает `asChild`** — для Link-кнопок → `AppLink`.
- **`ExternalLink`** — `Pressable + IconButton asChild + <a target="_blank" rel="noopener noreferrer">`.
  Для иконок соцсетей и внешних ссылок. Принимает `href`, `aria-label`, `size`, `variant`.
- **`pressableConfig`** — объект `{ keyframes, globalCss }` для мержа в `defineConfig()` каждого приложения:
  кейфрейм `ripple-expand` + глобальный CSS для `[data-pressable]` (spring + touch-action).

**Что остаётся в каждом приложении (`_components/ui/app-link.tsx`, ~12 строк):**

- **`AppLink`** — тонкая обёртка: `Pressable + Chakra Button asChild + app-специфичный Link из next-intl`.
  Зависит от `@/i18n/navigation` — не может жить в `@letar/ui`. Для приложений без next-intl → используют Pressable + нативный `<a>`.

**iOS-фикс (один раз в провайдере/layout):**

```tsx
useEffect(() => {
  document.addEventListener('touchstart', () => {}, { passive: true })
}, [])
```

**Тираж по приложениям** (после реализации `@letar/ui`):

| Приложение             | Затронутые места                                           |
| ---------------------- | ---------------------------------------------------------- |
| **kami**               | ✅ nav-links, sign-in-button, mobile-menu, social-links    |
| **aprel8008**          | ✅ CTA, nav                                                |
| **grandslamcup**       | ✅ desktop-nav, mobile-drawer, footer кнопки, StudioCredit |
| **archetest**          | ✅ mobile-drawer nav items                                 |
| **driving-school**     | ✅ BottomNav items                                         |
| **aboi**               | ✅ pressableConfig + iOS-фикс                              |
| **animatrona-tracker** | ✅ pressableConfig + iOS-фикс                              |
| **dsperevod**          | ✅ pressableConfig + iOS-фикс                              |
| **premium-rosstil**    | ✅ pressableConfig + iOS-фикс                              |
| **time**               | ✅ pressableConfig + iOS-фикс                              |
| **synth**              | ✅ pressableConfig + iOS-фикс                              |
| **studio**             | при готовности                                             |

**✓ DoD:**

- [x] `@letar/ui` экспортирует `Pressable`, `useRipple`, `RippleEl`, `PressableButton`, `ExternalLink`, `pressableConfig` (v0.5.0)
- [x] kami полностью переведён (`Button`/`AppLink`/`ExternalLink` применены: nav-links, sign-in-button, mobile-menu, social-links, projects/page, hero)
- [x] `pressableConfig` задокументирован в `.claude/docs/ui-components.md` (как добавить в тему)
- [x] Тираж на все приложения монорепо (11/11 ✅, кроме studio — при готовности)
- [x] Версия `@letar/ui` поднята (0.3.0 → 0.5.0)

**Зависимости:** нет (UX-улучшение, итерационно).

### Этап 7 — driving-school: на общую библиотеку ✅ ПОЛНОСТЬЮ (2026-06-11, сессия №32)

- ✅ `driving-school/auth.ts` мигрирован на `createAuth({ mode: 'standalone' })` (~607→~330 строк).
- ✅ `@letar/auth` расширен полями `socialProviders`, `databaseHooks`, `password` (v0.5.0→v0.6.0).
- ✅ pin-auth адаптеры обновлены на namespace-подход без поля `type` (как в premium-rosstil Этап 5).
- ✅ SSE endpoint обновлён (`autologin:email` namespace).
- ✅ `magicLink` плагин BA + UI на /sign-in + `magicLinkClient()` в `auth-client.ts`.
- **Зависимости:** Этапы 1, 5, **1.5** ✅.

### Этап 8 — Соц-секреты per-владелец + админка (§2.3, §9-D5)

- **UI выбора режима в админке коммерческого проекта** (informed consent §2.3):
  - **Tier 1 → `hub-client`:** «перейти на авторизацию letar.best» с показом рисков (бренд, домен письма, риск бана,
    миграция identity, обработчик ПДн). Технически = регистрация проекта hub-клиентом Ключницы (реестр — см. Этап 1.5 п.4)
    - миграция данных (§8.5).
      ✅ **UI выбора зафиксирован (2026-07-15, пилот dsperevod):** `/admin/settings/auth-mode/` —
      сравнение Tier 1/Tier 2 с полным списком рисков из §2.3, чекбокс «ознакомлен с рисками» перед
      кнопкой запроса, история запросов на странице. Запрос пишется в `AuditLog`
      (`REQUEST_AUTH_MODE_MIGRATION`) — **сознательно не автоматизирует сам переход**: смена режима
      требует кодовой правки `lib/auth.ts` + регистрации hub-клиента в Ключнице + миграции данных
      (§8.5), это не рантайм-флаг и не самообслуживание, а формальная фиксация решения владельца для
      разработчика. Проверено скриптом напрямую на БД (enum `REQUEST_AUTH_MODE_MIGRATION` +
      `AuditLog` round-trip), typecheck/lint зелёные.
  - **Tier 2 → `standalone` + свои ключи:** владелец вводит свои OAuth clientId/secret; secret **шифруется at-rest**
    в БД его проекта; `createAuth({ social: { source: 'db' } })` читает их при старте/reload. **Без runtime-динамики
    провайдеров** (решение ревизии №3) — D8 не нужен.
    ✅ **Реализовано и проверено вживую (2026-07-15)** — пилот на `dsperevod` (первый реальный
    потребитель `createAuthAsync`/`createSocialProviderLoader`/`encryptSecret`/`decryptSecret` из
    `@letar/auth`, до этого только докстринги без реальных вызовов): новая модель
    `SocialProvider` (`@@allow('all', auth().role == 'ADMIN')`, AES-256-GCM secret), страница
    `/admin/social-providers/` (список + create/edit/delete, `Alert` с рисками владения),
    `lib/auth.ts` переведён на `createAuthAsync` с `social: { source: 'db', load:
    createSocialProviderLoader(...) }`. Проверено: typecheck/lint зелёные, dev-сервер стартует с
    top-level `await createAuthAsync(...)` без ошибок, sign-up/sign-in через API работают,
    `requireAdmin` → ZenStack-запрос → рендер страницы подтверждены curl'ом с реальной сессией,
    encrypt→store→loader→decrypt round-trip проверен отдельным скриптом (значение в БД не
    читается как plaintext, loader корректно расшифровывает). **Ограничение:** провайдеры
    читаются один раз при старте процесса — правки в админке требуют рестарта (задокументировано
    в UI и README). **Не покрыто:** OAuth-провайдеры через `genericOAuth`-плагин с кастомным
    `getUserInfo` (Yandex у driving-school) — DB-loader сериализует только `clientId`/`clientSecret`
    для нативных `socialProviders`, не сложные колбэки; миграция `driving-school` на DB-backed
    Tier 2 сознательно не делалась в этой сессии — риск сломать боевой VK/Yandex-вход.
- ✅ **Миграция auth-hub на `createAuth({ mode: 'hub-provider' })`** — выполнено (сессия №33). Вынести захардкоженные OIDC-секреты auth-hub в secret-store (Этап 0.4) — остаётся.
- **✓ DoD:** ✅ коммерс может в админке увидеть Tier 1/Tier 2 с показом рисков и зафиксировать
  informed-consent выбор (пилот dsperevod, `/admin/settings/auth-mode/`; сам переход на Tier 1 —
  не самообслуживание, требует разработчика — см. запись выше); ✅ Tier 2-секреты шифруются at-rest
  и подхватываются `createAuth()` (пилот dsperevod); ✅ auth-hub работает на фабрике; ✅ нет
  строковых секретов в коде нового пути. **Остаётся:** тираж обоих UI (соц-провайдеры + выбор
  режима) на другие Tier 2 приложения (aboi, driving-school — с оговоркой про Yandex/VK
  кастомные колбэки); реальное исполнение Tier 1-перехода как отдельная задача класса §8.5, когда
  появится первый реальный запрос.
- **Зависимости:** после auth-унификации (этапы 1, **1.5**, 2–7). Самостоятельный крупный трек.
- ✅ **Побочная находка ЗАКРЫТА (2026-07-15/16, коммит `ffd845b`):** локальный
  `apps/dsperevod/prisma/seed.ts` создавал первого ADMIN с bcrypt-хешем пароля, но `lib/auth.ts`
  не переопределяет `password.hash/verify` (в отличие от driving-school/aboi) → Better Auth
  проверял его своим дефолтным scrypt → `sign-in` под сид-админом падал с "Invalid password
  hash". Пофикшено: `hashPassword` из `@better-auth/utils/password` вместо `bcryptjs` — тот же
  scrypt-алгоритм, что и дефолт Better Auth. Проверено вживую (2026-07-16): пересид +
  `sign-in/email` под сид-админом → 200, роль ADMIN, тестовые данные вычищены из dev-БД.

### Этап 8.5 — Несколько email на аккаунт (account linking / merge)

- **Фича:** управление своими email в профиле (как GitHub) — привязка/подтверждение нескольких адресов к
  одному аккаунту, вход по любому. Better Auth `accountLinking` линкует только по **одинаковому** email; для
  **разных** адресов нужна кастомная merge-логика (прообраз — `mergeAnonymousAccount` в aboi).
  ✅ **Self-service добавление/подтверждение/переключение основного — сделано (2026-07-16, auth-hub
  v0.6.0):** `/profile/emails/` в Ключнице, модель `UserEmail`, свой токен подтверждения (не пересекается
  с core Better Auth `Verification`), смена основного email принудительно завершает сессию (инвалидация
  `cookieCache`, см. запись в шапке плана).
  ✅ **Вход по любому linked-email — сделано (2026-07-16, auth-hub v0.6.4):** БЕЗ перехвата core-резолва —
  `resolveLoginEmail()` на уровне server actions Ключницы (`loginUser`, `sendMagicLinkAction`) резолвит
  подтверждённый `UserEmail` → основной `User.email` до вызова Better Auth. Попутно закрыты дыра
  дубль-аккаунта (auto-sign-up по linked-адресу) и гонка `verifyAddedEmail` (адрес мог стать чьим-то
  основным за 24ч жизни токена). Проверено вживую + скрипт-матрица на dev-БД. Детали — запись в шапке.
- **Merge:** выбрать canonical-аккаунт → перепривязать `Account`/сессии/связанные данные → погасить дубли →
  аудит. **Необратимо → бэкап БД обязателен.** Остаётся ручным скриптом владельца (см. ниже) — merge ДВУХ
  РАЗНЫХ уже существующих аккаунтов не покрыт self-service UI выше (это другая задача: там пользователь сам
  подтверждает владение обоими email последовательно, здесь — canonical выбирается вручную разработчиком).
  ✅ **Скрипт готов и проверен (2026-07-16):** `infra/migrations/auth-hub-merge-accounts.ts` —
  параметризованный (`CANONICAL_EMAIL`/`DUPLICATE_EMAIL`/`DRY_RUN`, dry-run по умолчанию), по прецеденту
  `infra/migrations/kami-owner-migration.ts` (`ZenStackClient`+`$transaction`), но общего назначения, не
  под конкретный email. Переносит все relations `User` (`Account` — по одной записи из-за составного
  `@@unique([providerId, accountId])`, `Passkey`/`OauthApplication`/`OauthAccessToken`/`TelegramToken`/
  `ConsentLog` — простой перенос, `OauthConsent`/`ProjectProfile` — с разрешением смысловых конфликтов),
  email duplicate сохраняется как доп. `UserEmail` у canonical (по прецеденту `setPrimaryEmail`), roles —
  union, обе `Session` инвалидируются принудительно (тот же риск `cookieCache`, что и у self-service).
  Проверен вживую на локальной БД (dry-run + реальный merge с тремя edge-cases конфликтов + повторный
  идемпотентный запуск), см. запись в шапке плана. Прод-запуск не выполнялся — ждёт первого реального
  кейса. Своей `AuditLog` в auth-hub нет — лог только консольный (structured, с инструкцией
  `tee` в файл), заводить модель ради разового скрипта признано непропорциональным.
- **Разовая операция владельца:** склейка личных email в Ключнице — ✅ **ВЫПОЛНЕНА 2026-05-30** (§14.1):
  canonical `kami@letar.best`, 5 провайдеров (credential, github, google×2, yandex) на одном аккаунте.
  ✅ **Перенос данных в kami (2026-06-05):** `infra/migrations/kami-owner-migration.ts` — 4 AudioFile
  перенесены с `letarkami@gmail.com`, оба старых аккаунта удалены, `kami@letar.best` получил роль ADMIN.
  ✅ **Скрипты выполнены (2026-06-26):** `dashboard-owner-migration.ts`, `archetest-owner-migration.ts`,
  `animatrona-tracker-owner-migration.ts` — во всех трёх приложениях `kami@letar.best` уже ADMIN,
  старых аккаунтов нет (dry-run подтвердил: миграция выполнена).
- **Зависимости:** Ключница (auth-hub); правовой аспект §2.6.

### Этап 9 — Документация — сквозной (§11)

---

## 8. Сквозные требования

- **i18n:** `auth.verification.*` для `[locale]`-приложений (aboi, kami, dsperevod); auth-hub — ru-хардкод.
  (premium-rosstil исключён — выведен из эксплуатации 2026-07-05.)
- **Rate-limit:** серверный (`/send-verification-email`, `/sign-up/email`). ⚠️ Дефолтный store Better Auth —
  **in-memory** (сброс при рестарте, не общий между инстансами Docker) → для production задать персистентный store
  (БД/secondary storage), иначе rate-limit иллюзорен. Ключ = `ip + email` (§13.3).
- **SSE-масштабирование:** verification-stream sticky к одному инстансу; при горизонтальном масштабе событие на
  инстансе A не дойдёт до клиента на B без pub/sub. Текущее допущение — однопроцессный деплой; зафиксировать явно.
- **Миграции:** на боевых данных — версионированные `db:migrate` (НЕ `db:push`); бэкап + проверка rollback до старта.
- **Безопасность:** ручная верификация только `requireAdmin`; access-policy для enhanced Prisma; секреты — шифрование
  at-rest; resend не раскрывает существование юзера.
- **UX:** cooldown «Отправить повторно через {n} с»; успех — inline; коды + ссылка в письме.
- **Тесты:** Vitest + Playwright (регистрация → resend → cooldown → cross-tab → admin verify). TDD.

---

## 9. Точки принятия решения (развилка + рекомендация)

> **Решено:** D1 (aboi — первый эталон pin-auth флоу, поэтапно), **D2 (kami — сохранить все способы, унифицировать
> через фабрику — вариант (a)), D10 (абстракция = серверная фабрика `createAuth()`, ось из 3 режимов §2.2,
> «переход коммерса» = `hub-client`, Этап 1.5 — ревизия №3)**, D3 (premium `requireEmailVerification` — нет),
> D4 (premium → миграция на Better Auth), D5 (секреты per-владелец: админка Tier 1/Tier 2 с информированием),
> D6 (pin-auth отдельная), D7 (admin-таблица пер-приложение), D9 (Passkeys — делаем, Этап 6.5),
> модель владения §2, структура — Nx tags §2.5, алертинг — Telegram+Umami (Этап 0).

- **D2 — kami способы ✅ РЕШЕНО (a):** сохранить все способы (email/password, magic-link, OAuth, Ключница),
  реализацию унифицировать через `createAuth({ mode: 'hub-client' })`. Реализация — Этап 6 (после фабрики 1.5).
- **D10 — Форма и место абстракции ✅ РЕШЕНО (ревизия №3):** серверная фабрика `createAuth(profile)` в
  `@letar/auth/server` (§4); единая ось из 3 режимов §2.2; «переход коммерса на letar.best» = режим `hub-client`
  (OIDC-клиент Ключницы); Tier 2 = `standalone` + ключи из БД при старте. Выделен Этап 1.5 в Фазе B.
- **D8 — Динамика OAuth-провайдеров ✅ вне основной цели (ревизия №3):** для существующих коммерсов и для Tier 2
  (`standalone`, ключи из БД при старте/reload) **динамика НЕ нужна**. Остаётся **только** для гипотетической
  «SaaS Ключницы» (один auth-hub на несколько тенантов, multi-tenant CNAME §2.2). Если когда-нибудь понадобится —
  spike (1–2 дня) до реализации; варианты: (a) LRU-кэш инстансов с TTL; (b) proxy-провайдер с динамическим
  `clientId`/`clientSecret` из БД по `tenantId` [рекоменд. для MVP]; (c) отдельный контейнер per tenant.

---

## 10. Риски

- **Доставка писем** (Этап 0) — первопричина, без неё всё бессмысленно.
- **Схема pin-auth ↔ Better Auth** (`DateTime`/`verificationToken` vs `Boolean`/`verification`) — адаптеры + миграции.
- **enhanced Prisma + ручная верификация** — нужна access-policy, иначе action молча не применится.
- **Обход верификации** через admin — только `requireAdmin`, аудит-лог желателен.
- **Email-флуд** — серверный rate-limit на resend.
- **Соц-секреты Tier 1** — общий риск бана OAuth-приложения; владение/юридика (ToS); шифрование at-rest для БД.
- ~~**Правовое (152-ФЗ) локализация**~~ ✅ **ЗАКРЫТ (2026-06-04):** Ключница хостится в РФ → ст. 18 152-ФЗ выполнена. Остаётся: оператор/обработчик, договор поручения для Tier 1, согласия per-домен (§2.6).
- **Account-merge** — необратимо (перепривязка/удаление дублей) → бэкап БД + выбранный canonical до старта; боевые данные.
- ~~**`driving-school` Socket.IO без Redis-адаптера блокирует rollout**~~ ✅ **ЗАКРЫТ (2026-07-14,
  commit `b29ca4b`+`8189504`, см. запись выше §18.6 Сессия J):** `@socket.io/redis-adapter`
  подключён (`route.ts` → `createAdapter` на `ioredis` при наличии `REDIS_URL`), `letar.rollout:
  'true'` включён, rollout-пилот пройден zero-downtime (msg #434), **13/~19 SERVER_APPS на
  rollout** на тот момент — driving-school больше не блокер, входит в состав финальных 19/19.
- **🟠 Переход режима = миграция identity (ревизия №3)** — `standalone → hub-client` меняет источник `user.id`
  (Ключница вместо локального) → существующие пользователи коммерса требуют миграции/перепривязки данных (класс §8.5),
  а не флага. Однонаправленно по стоимости (откат Tier 1→Tier 2 — ещё одна миграция). Закладывать бэкап + план переноса.
- **🟠 `hub-client` отдаёт домен письма Ключнице** — верификация/сброс уходят с `letar.best`, не с домена коммерса
  → потеря брендинга письма + спам-флаги на чужом домене (связь с первопричиной §2.4). Показывать в consent (§2.3).
- ~~**Регистрация hub-клиента** — `trustedClients` сейчас хардкод-массив + redeploy.~~ ✅ **ЗАКРЫТ (сессия №7):** клиенты
  хранятся в `oauthApplication` (БД), `trustedClients` удалён; регистрация через `db:seed` или `/admin/clients` UI.
  ⏳ Create/edit UI для новых клиентов — Этап 8 (admin).
- **Протечка абстракции `createAuth()`** — enhanced Prisma как adapter, 3 модели ролей, разнородные плагины
  (organization у driving-school, oidcProvider у auth-hub) могут не уложиться в единый профиль → **обязателен spike**
  (Этап 1.5 п.1) до реализации; риск over-engineering, если фабрика попытается покрыть всё сразу. Начать с 2 режимов.
- **Submodules** — коммит внутри + bump SHA; не смешивать с публичными `libs/` в одной сессии.
- ~~**🔴 Секреты в публичном репо**~~ ✅ **ЗАКРЫТ (сессия №8):** 6 OIDC client secrets ротированы; старые значения из git-истории отозваны; новые секреты только в `.env.docker` (не в коде).
- **Миграции на боевых данных** — `db:migrate` + бэкап + dry-run; особенно перенос FK в петах (§14.1) и merge (§8.5).
- **🟡 `archetest` — failed-миграция на проде (обнаружено 2026-07-13, §18.6 Сессия J, диагностика
  завершена):** `20260321000000_baseline` (с 23 марта) висела в БД как failed с марта, никто не
  закрывал вопрос до этой сессии — блокировала Prisma `P3009` любые новые миграции. Обнаружено
  случайно при обычном компос-деплое (не связано с ним) — `deploy-affected.sh` защита сработала
  (pre-migrate dump, прервал до rollout, даунтайма не было). Диагностика BlackCove (read-only,
  msg #398): это дубликат-миграция с тем же содержимым, что и настоящий baseline
  `20260321075436_baseline` (применён на 2 дня раньше) — упала на `CREATE TYPE ... already exists`,
  0 применённых шагов, схема БД не изменилась. Пользователь санкционировал
  `prisma migrate resolve --rolled-back` — исполнение в работе (thread `deploy-archetest-rollout-J`).
- **Rate-limit in-memory** — без персистентного store защита фиктивна после рестарта / на нескольких инстансах. ✅ **Решение принято (2026-06-04):** поставить Redis на s2; подключить как `secondaryStorage` в Better Auth rate-limit config (Этап 0/2 follow-up). ✅ **Применено (2026-06-18):** `buildStandaloneAuth` получил поддержку `secondaryStorage`; svoichuzhie подключает Redis через `REDIS_URL`.
- **Бэкапы (Этап 0.3)** — критичный пробел: конфиги Maddy и DKIM-ключи не бэкапятся → потеря = невосстановимая почта;
  лишний scope синхронизации раздувает хранилище. Resilio R/O-ключи лежат в публичном репо (утечка).
- ~~**Ренейм БД `lena_*` (Этап 0.6)**~~ ✅ **РЕШЕНИЕ ПРИНЯТО (2026-06-04):** БД `lena_*` **не переименовывать** — исторический идентификатор, работает нормально, риск/downtime не оправданы. Этап 0.6 сужается до остальных хвостов (пути бэкапов, ключ `lena-form-sync-queue`, submodule Dockerfile-комментарии).

---

## 11. Документация (сквозной шаг)

- `libs/pin-auth/README.md` — Better Auth-совместимость + примеры вне driving-school.
- `libs/auth/README.md` — ⭐ **`createAuth(profile)` + 3 режима** (`standalone`/`hub-client`/`hub-provider`, §2.2/§4);
  resend-кнопка/хук (клиент — параметр).
- `libs/email/README.md` — лог `success === false`, формат строки.
- `.claude/docs/auth.md` — «Email-верификация и resend» + **модель владения, 3 режима и фабрика `createAuth()`** (§2/§4);
  чек-лист «как поставить новое приложение на режим».
- `.claude/docs/email.md` — `SendEmailResult`, SMTP-ошибки, `SMTP_FROM_EMAIL`, домен письма per-владелец.
- `.claude/rules/auth.md` — правило: при `requireEmailVerification` обязательны resend + rate-limit.
- `.claude/docs/backup-architecture.md` (Этап 0.3) — новая стратегия (только `uploads`+`backups`), бэкап Maddy/DKIM,
  бэкап локальных кредов; вынести Resilio R/O-ключи в `.claude/OPS_JOURNAL.local.md`.
- `.claude/docs/server-migration-letar.md` (Этап 0.6) — обновить статус по `lena_*` после решений по корзине C.
- PLAN/CHANGELOG/версии затронутых проектов. Перед merge — `docs-auto-sync` + `workflow:update-docs`.

---

## 12. Агенты и скиллы

- **`security-auditor`** — resend, ручная верификация, соц-секреты (Этап 8), access control.
- **`auth-policy-validator`** — `@@allow/@@deny` на `emailVerified` (enhanced Prisma).
- **`ui-architect`** — UX `EMAIL_NOT_VERIFIED`, баннеров, admin-таблиц, PIN-инпута, выбора Tier 1/2 (Chakra v3).
- **`e2e-test-writer`** — Playwright: регистрация → resend → cooldown → cross-tab → admin verify.
- **`refactor-expert`** — Этап 1.5: проектирование `createAuth()`, миграция приложений на фабрику без дублирования;
  перевод driving-school на библиотеку.
- **`better-auth` (skill)** — Этап 1.5 spike: единообразная сборка `socialProviders`/`plugins`, `genericOAuth` на
  OIDC-discovery, enhanced Prisma как adapter, динамика провайдеров (D8).
- **`code-quality-gate`** — перед коммитом (`nx format` → `nx lint` → `nx typecheck:tsgo` → test).
- **`migration-assistant` / `db-schema-assistant`** — миграции схем (pin-auth модели, `Verification.type`).

> Скиллы: `better-auth` (resend, rateLimit, OIDC, динамика провайдеров), `email-maddy` (`SMTP_FROM_EMAIL`),
> `chakra-theming`, `i18n-multilingual`, `zenstack-helper` (access policies), `deployment-assistant` (секреты).

---

## 13. Предложения архитектора (поверхностный анализ — нужны уточнения)

> ⚠️ **Предупреждение:** Это результат поверхностного анализа кода и документации без глубокого погружения
> в runtime-поведение и edge-case'ы. Каждый пункт требует обсуждения перед включением в план.
> Вопросы для уточнения — в §13.0.

### 13.0 Вопросы для уточнения — ЗАКРЫТЫ

1. **D1 / приоритет:** ✅ **aboi** — первый эталон Этапа 2.
2. **Passkeys:** ✅ **Делаем** — Этап 6.5, через Ключницу, для kami/time/grandslamcup.
3. **SMTP-алертинг:** ✅ **Вариант B + C** — Telegram-webhook + Umami events (Этап 0).
   Конфиг: `TELEGRAM_ALERT_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID` в `.env.docker`. Токен — только в `.env`, не в коде.
4. **Tier 2 / динамика:** ✅ **Отложено** до заключительных этапов — D8 в §9, spike перед реализацией.
5. **Ключница OIDC / refresh:** 🔲 Не подтверждено. Проверить при работе над Этапом 6 (kami).
6. **Rate-limit NAT:** ✅ NAT не актуален (пользователи из разных мест) — IP-based достаточен.

---

### 13.1 Уязвимость: SSE endpoint с email в URL

**Проблема.** Текущая реализация SSE: `/api/auth/verification-stream/${email}` — email в URL.
Любой может подписаться на поток чужого email и узнать факт верификации (enumeration юзеров).

**Рекомендация.** Заменить email-параметр на одноразовый `streamToken` (UUID), который:

- генерируется в сервер-экшене при создании PIN,
- хранится в `verificationToken.streamToken`,
- инвалидируется при верификации или истечении PIN.

```typescript
// Вместо /api/auth/verification-stream/${email}
// → /api/auth/verification-stream/${streamToken}
```

**Объём:** небольшой — `token-manager.ts`, SSE-роут, клиентский `useVerificationStream`.
**Зависимости:** Этап 1 (рефакторинг pin-auth). Включить как sub-task Этапа 1.

---

### 13.2 Timing-атака на PIN: нужен constant-time compare

**Проблема.** В `pin-validator.ts:90`: `verificationToken.pin !== pin` — строковое сравнение
уязвимо к timing-атаке (теоретически, при короткой сети и предсказуемом серверном времени).

**Рекомендация.** Заменить на `crypto.timingSafeEqual`:

```typescript
import { timingSafeEqual } from 'crypto'

const storedPin = Buffer.from(verificationToken.pin, 'utf8')
const inputPin = Buffer.from(pin.padEnd(storedPin.length), 'utf8')
const match = storedPin.length === inputPin.length && timingSafeEqual(storedPin, inputPin)
```

**Объём:** 5 строк в `pin-validator.ts`. Низкий риск регрессий.
**Зависимости:** нет — сделать в Этапе 1 как hardening.

---

### 13.3 Rate-limit: два уровня (IP + email) ✅ уточнено

NAT не актуален (§13.0.6). Итоговая конфигурация:

- **IP-уровень:** `{ window: 60, max: 10 }` — защита от burst-flood.
- **Email-уровень:** `{ window: 3600, max: 5 }` — защита от targeted harassment на конкретный адрес.
- Реализация: `rateLimit.customRules` Better Auth, ключ = `ip + email`.

---

### 13.4 SMTP graceful degradation: UX при failure ✅ включено в план

Включено в Этап 0 (алертинг B+C) и Этап 1 (UX `useResendCountdown`):

- Cooldown не применяется при `success === false`.
- Пользователю: нейтральное сообщение без деталей ошибки.
- Telegram: 3 подряд failure → webhook. Umami: event на каждый failure для трендов.
- ⚠️ `TELEGRAM_ALERT_BOT_TOKEN` и `TELEGRAM_ALERT_CHAT_ID` — только в `.env.docker`, не в коде.

---

### 13.5 Динамика OAuth-провайдеров Better Auth ✅ отложено → D8

Для существующих коммерческих приложений (каждое — отдельный деплой) динамика не нужна.
Актуально только для будущей «SaaS Ключницы». Перенесено в D8 §9, spike перед реализацией.

---

### 13.6 Passkeys / WebAuthn ✅ делаем → Этап 6.5

Решено. Описание в §7 Этап 6.5.

---

### 13.7 Ключница OIDC: refresh-token handling 🔲 проверить в Этапе 6

Sub-task для Этапа 6 (kami): проверить `accessTokenExpiration`, реакцию на 401, необходимость
`offline_access` scope. Включено в описание Этапа 6.

---

### 13.8 Авто-логин токен: гарантия single-use ✅ включено в план → Этап 1

Включено в security hardening Этапа 1. Адаптер `updateTokenForAutoLogin` — delete + create, не update.

---

### 13.9 Наблюдаемость: KPI верификации ✅ включено → Этап 0 + Этап 2

Umami events: отправка письма, успешная верификация, resend — добавить в server actions Этапа 2 (aboi).
Telegram alerting — в Этапе 0. Вместе дают картину: % доставки + % верификации.

---

### 13.10 Nx module-boundary tags ✅ включено → Этап 0.5

Описание в §7 Этап 0.5.

---

## 14. Операционный журнал и инфра-задачи

> 🔒 **Вынесено в приватный файл** `.claude/OPS_JOURNAL.local.md` (в `.gitignore`, не коммитится).
> Содержит инфра-детали прода (хосты, БД-креды, пути к бэкапам, доступ) — не публикуется в публичном репо `letar`.
> Сами задачи отражены в roadmap §7 как этапы Фазы A (0, 0.1, 0.2, 0.7).

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
# BASE_URL=http://localhost:XXXX (дev-сервер, запускается webServer)
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
| ------------------- | ------------------ | -------------------------------------------- |
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
| -------------------------------- | ------------------------------------------------------------------------- |
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
- [ ] §15.3.1 — prod-снепшот + анонимизация + blast-radius gate (см. DoD 15.3.1 отдельно)
```

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
deploy-affected.sh  →  docker compose up -d --build  →  ~10-30с даунтайма на рестарт
```

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
```

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
run_e2e(app)        → s3: nx e2e с E2E_BASE_URL против staging-контейнера
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

## §19 — TypeScript 7 GA: план тиража на остальные проекты 🆕

> Не связано с темой auth этого файла — инфраструктурный/тулинговый трек, добавлен здесь по аналогии с §15/§17/§18.
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

### ✓ DoD §19

- [x] Пилот на `time`: таргет `typecheck:ts7` добавлен, результат идентичен tsc/tsgo, задокументирован
- [ ] Проверено, зависит ли ESLint/typescript-eslint от API `typescript` программно
- [ ] Корневой `package.json` переведён на схему `typescript6`/`native` алиасов (или обосновано, почему нет)
- [ ] `nx run-many -t typecheck:tsgo` (или `ts7`) зелёный по всем apps/libs на новом компиляторе
- [ ] Решение по судьбе `typecheck:tsgo`/`@typescript/native-preview` (оставить, свернуть, переименовать)
- [ ] Тираж завершён на всех проектах, доки (`CLAUDE.md`, `environment.md`) обновлены под новую версию/цифры скорости

### Риски

- Коллизия bin `tsc` (см. выше) — обязательно использовать alias-схему, не голый bump версии.
- typescript-eslint/другие плагины ESLint могут требовать API 6.0 — без алиаса `@typescript/typescript6`
  тираж сломает `nx lint` по всему монорепо разом.
- TS7 language server пока не поддерживает Vue/MDX/Astro/Svelte/Angular embedding — не блокер для CLI-тайпчека,
  но может повлиять на редакторский опыт там, где такие стеки используются.

---

## §20 — Рассинхрон форматтера между worktree/фоновыми сессиями 🆕

> Не связано с темой auth этого файла — инфраструктурный/тулинговый трек, добавлен по аналогии с §15/§17/§18/§19.
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
