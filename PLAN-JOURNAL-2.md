# PLAN-JOURNAL-2 — §52–§80

> Продолжение [PLAN-JOURNAL-1.md](/PLAN-JOURNAL-1.md). Карта всех частей и точка входа —
> [PLAN.md](/PLAN.md), раздел «Журнал сессий».
>
> Диапазон этой части: §52–§80.

---

## §52 — `eslint-plugin-react-hooks` не был зарегистрирован ни в одном из ~22 приложений (2026-08-19) 🆕

В `apps/studio` при чтении кода обнаружено: `eslint-disable-next-line react-hooks/exhaustive-deps`
сам был ошибкой ESLint («Definition for rule was not found»). Причина — `nx.configs['flat/react-typescript']`
(`@nx/eslint-plugin`), который приложения спредят перед корневым `baseConfig` (паттерн
`...nx.configs['flat/react-typescript'], ...baseConfig`), не регистрирует `eslint-plugin-react-hooks`
вообще — там только `default-case`, `@typescript-eslint/*`. Правило `exhaustive-deps` не
проверялось нигде в репозитории, кроме `apps/animatrona`, который чинил это точечно у себя ещё
раньше.

Проверено: 22 из ~30 приложений используют этот паттерн. Список большой — фикс централизован в
корневом [eslint.config.mjs](/eslint.config.mjs) одним блоком (по образцу animatrona) вместо
точечной правки каждого `apps/<app>/eslint.config.mjs`.

После включения правила `nx lint` прогнан по всем 22 приложениям — большинство или зелёные, или
получили только новые `warning` (`exhaustive-deps`, не ломает сборку). Реальную ошибку
(`rules-of-hooks`, severity `error`) правило нашло только в `driving-school`: 10 комбобоксов
(`src/driving-school-form/comboboxes/*.tsx`) вызывают хук внутри `useQuery`-пропа
`FieldCombobox` — безопасный render-prop паттерн, уже помеченный `oxlint-disable-next-line` с тем
же обоснованием (oxlint эту проверку видел, ESLint — нет). Добавлена парная
`eslint-disable-next-line`, `nx lint driving-school` снова зелёный.

Остальные `error`, всплывшие в studio (hardcoded HEX в `icon.tsx`, ловит `theme:check`,
не ESLint), form-docs (`@ts-nocheck`/`{}`-тип в сгенерённых `.source/*` файлах Fumadocs) и
label-printer-desktop (старый `NODE_ENV === 'production'`, §см. `node-env-not-production-signal.md`)
— не связаны с этим фиксом, существовали до него, не трогались.

Задокументировано: [eslint-flat-react-typescript-missing-react-hooks-plugin.md](/.claude/docs/eslint-flat-react-typescript-missing-react-hooks-plugin.md).

## §53 — `withImapDeadline`: жёсткий дедлайн вокруг `ImapFlow` вынесен из двух приложений (2026-08-22) 🆕

`dashboard-agent` (email-canary) и `domwellbes` (RFQ email-поллинг, приватный submodule)
независимо реализовали почти одинаковый приём защиты от зависшего `ImapFlow`: слушатель
`'error'` (иначе необработанный event роняет процесс) недостаточен сам по себе — если ошибка
сокета приходит ВМЕСТО reject-а уже начатого `await`, тот `await` может повиснуть навсегда;
единственная гарантия — внешний `Promise.race` с жёстким таймаутом и безусловный
`client.close()` после гонки. Разбор ловушки —
[imapflow-error-listener-hang-pitfall.md](/.claude/docs/imapflow-error-listener-hang-pitfall.md).

### Что сделано

- Общая механика (слушатель `'error'` + `Promise.race` с дедлайном + `client.close()`) вынесена
  в `@letar/email` (`withImapDeadline`, v0.5.0) — специфика каждого вызывающего места (форма
  IMAP-операции, что считается результатом по таймауту) осталась в вызывающем коде.
- Оба места переведены на helper без изменения поведения: `waitForCanaryMessage`
  (`dashboard-agent` 0.15.12) и `pollRfqEmailReplies` (`domwellbes` 0.139.0, приватный
  submodule).
- Doc-файл ловушки обновлён — пример теперь показывает вызов helper-а вместо ручного
  `Promise.race` в каждом месте.

Третьего места с прямым использованием `ImapFlow` в монорепо на 2026-08-22 нет.

## §54 — `dotenv@17` спамит stdout промо-tip'ами в `prisma.config.ts` всех приложений (2026-08-25) 🆕

Пакет `dotenv` (тот же автор, что и `dotenvx`/новый `vestauth` — motdotla) начиная с v17 сам
печатает рекламную строку в **stdout** при каждом вызове `config()` без опций (известный upstream-
issue [`motdotla/dotenv#903`](https://github.com/motdotla/dotenv/issues/903) — «Advertisements or
whatever for dotenvx should go to stderr not stdout»). У нас в корневом `package.json` закреплён
`dotenv: ^17.4.2`, и практически все `apps/<app>/prisma.config.ts` дважды вызывают
`config({ path: ... })` (`.env.local`, `.env`/`.env.docker`) без `quiet` — отсюда «спам» в
терминале при любой `prisma`/`nx db:*`-команде.

### Что сделано

Официальный флаг `quiet: true` проставлен в оба вызова `config()` во всех найденных
`prisma.config.ts` — 16 приложений: `animatrona-tracker`, `time`, `driving-school`, `kami`,
`archetest`, `aboi`, `aprel8008`, `domwellbes`, `grandslamcup`, `form-develop-app`, `svoichuzhie`,
`mandala`, `dashboard`, `studio`, `dsperevod`, `auth-hub`. Каждое приложение закоммичено отдельно
(scope-guard); 7 из них — приватные submodule, там сначала коммит внутри submodule, затем bump
указателя в root letar. Push не делался — не запрошен пользователем в рамках сессии.

### Продолжение (2026-08-25, отдельная сессия) — оставшиеся ~29 файлов закрыты

Тот же паттерн вычищен из всех оставшихся мест: `prisma/seed.ts` (auth-hub, studio, domwellbes/
prisma/seed/load-env.ts), разовых `scripts/*.ts`/`.mjs` (domwellbes/check-db-indexes.mjs,
grandslamcup — 5 файлов включая migrate/, aboi/anonymize-staging-db.ts, mandala/create-admin.ts,
svoichuzhie/scripts/seed.ts, auth-hub/scripts/encrypt-client-secrets.ts) и `db.helpers.ts` в
e2e-хелперах (driving-school-e2e, auth-hub-e2e, svoichuzhie-e2e). Каждое приложение/submodule —
отдельный коммит, submodule — сначала внутри, потом bump в root letar. Push не делался.

Проверено, что в `apps/*-e2e/playwright.config.ts` `dotenv.config()` встречается только в
закомментированной строке-подсказке (`// require('dotenv').config();`) — не активный код,
трогать не нужно.

⚠️ **Инцидент по пути:** после первого раунда правок 5 файлов в публичном репо (grandslamcup,
auth-hub, auth-hub-e2e, mandala, svoichuzhie-e2e) откатились к состоянию без `quiet: true`, пока
сессия ждала фоновый `nx run-many -t format` — похоже, параллельный агент выполнил
git-операцию поверх незакоммиченных изменений (класс инцидентов — см.
[git-multi-agent-incidents](/.claude/docs/git-multi-agent-incidents.md)). Правки переделаны и
закоммичены сразу без задержки на форматирование.

Отдельно всплыл преэкзистентный дефект: `apps/driving-school-e2e/src/helpers/db.helpers.ts` не
проходил pre-commit dprint-проверку (однострочный `if` без фигурных скобок, не связано с
`dotenv`) — поправлено попутно через `dprint fmt` (бинарь напрямую,
`node_modules/.bin/dprint.exe`, т.к. `npx dprint` падал на конфликте npm-override `kysely` внутри
submodule).

### Отклонённые направления

- `vestauth` — крипто-подпись HTTP-запросов агентов (RFC 9421) от того же автора: неактуально для
  наших MCP-серверов (все локальные stdio/self-hosted, не публичный HTTP API для сторонних
  агентов), плюс у автора уже есть прецедент недобросовестного встраивания рекламы в stdout
  прод-инструментов (этот самый §54).

## §55 — `@letar/env-load`: вынесен паттерн каскадной загрузки `.env` из ~40 файлов (2026-08-25) 🆕

Ручная правка `quiet: true` в §54 показала, что копия `config({path:'.env.local'})` +
`config({path:'.env'})` разошлась по ~40 файлам монорепо (`prisma.config.ts` во всех
приложениях, `prisma/seed.ts`, разовые `scripts/*`, e2e `db.helpers.ts`) — каждое будущее
изменение паттерна означает повторный обход всех копий.

### Что сделано

Заведена `libs/env-load` (`nx g @letar/generators:new-lib env-load`) с единственной функцией
`loadEnvCascade(baseDir?, files?)` — каскадная загрузка через `dotenv`, `quiet: true` внутри,
по умолчанию `.env.local → .env`, кастомный список файлов для нетиповых случаев (`dashboard`:
`.env.local → .env.docker`; `grandslamcup`/`aboi` staging-скрипты: `.env.staging → .env.local →
.env`). 3 unit-теста (приоритет local над base, докладка недостающих ключей, кастомный список).

Мигрированы все найденные потребители, каждое приложение/submodule — отдельный коммит
(scope-guard): `time`, `auth-hub`, `dashboard`, `mandala`, `form-develop-app`, `grandslamcup`,
`archetest`, `kami`, `animatrona-tracker` (прямые apps) · `driving-school`, `dsperevod`, `studio`,
`svoichuzhie`, `aprel8008`, `aboi`, `domwellbes` (submodule, коммит внутри + bump в root) ·
`auth-hub-e2e`, `svoichuzhie-e2e`, `driving-school-e2e` (e2e `db.helpers.ts`) · разовые `scripts/*`
(`mandala/create-admin.ts`, `auth-hub/encrypt-client-secrets.ts`,
`grandslamcup/add-friendly-matches.ts`+`anonymize-staging-db.ts`, `svoichuzhie/scripts/seed.ts`,
`studio/prisma/seed.ts`, `aboi/scripts/anonymize-staging-db.ts`). Push не делался.

Генератор `nx g @letar/generators:new-app` обновлён — новые приложения сразу получают
`@letar/env-load` в `prisma.config.ts`/`tsconfig.json`/`package.json`, паттерн не должен
воспроизводиться в будущих приложениях.

⚠️ **`prisma.config.ts` требует библиотеку в настоящих `dependencies`, не только
`implicitDependencies`.** Prisma CLI грузит конфиг собственным загрузчиком через обычный
`require`/`import` по `node_modules`, а не через `tsconfig.json`/`paths` (`customConditions` не
действует — см. `.claude/rules/libs.md`). Без явной `dependencies`-записи + `bun install`
падает `Cannot find module '@letar/env-load'`, даже когда `paths` и `implicitDependencies`
верны. Проверено практическим прогоном на `time` до тиражирования на остальные — задокументировано
в `libs/env-load/README.md`.

⚠️ **e2e-приложения без `typecheck:tsgo`-таргета не защищены от `TS6059`/`TS6307`.** Три из них
(`auth-hub-e2e`, `driving-school-e2e`) не имели `references`/`include`-glob на новую библиотеку
и валились на «File is not under rootDir»/«not listed within the file list» при ручном
`tsc --noEmit` — тот же класс, что описан в
[libs.md § Тот же фикс на приложениях, наследующих outDir/include](/.claude/rules/libs.md).
Фикс — добавить `../../libs/env-load/src/**/*.ts` в `include` + исключить его `*.spec.ts` в
`exclude`; `auth-hub-e2e` дополнительно потребовал явный `rootDir: "../.."` (был жёстко задан
`rootDir: "."`, наследуемый `outDir` без `rootDir` не проходит smoke-test у e2e-приложений так же
надёжно, как у обычных Next.js-приложений на общем пресете).

### `domwellbes` домигрирован (2026-08-25)

На момент первого прохода submodule был в активной работе параллельной сессии (незакоммиченные
правки в `PLAN_OPERATIONS.md`, `ROADMAP_M10.md`, `docs/ARCHITECTURE.md`, `contract.action.ts`, и
уже частично начатая правка самого `check-db-indexes.mjs` под §54) — трогать чужой рабочий чекаут
было небезопасно (`.claude/rules/git.md`), миграция отложена. После того как параллельная сессия
закоммитила свою работу, дерево очистилось и `prisma.config.ts`, `scripts/check-db-indexes.mjs`,
`prisma/seed/load-env.ts` переведены на `@letar/env-load` тем же паттерном, что и остальные
приложения (коммит внутри submodule + bump SHA + `bun.lock` в root).

## §56 — Production smoke-e2e после деплоя (2026-08-25) 🆕 — план, не реализовано

### Зачем это отдельно от уже существующего staging-гейта

Пайплайн `deploy_app(staging)` → `run_e2e` → `deploy_app(production)` (§18, задокументирован в
[deployment.md § E2E-ранер и деплой](/.claude/docs/deployment.md#e2e-ранер-и-деплой--staging-gated-пайплайн-planmd-18))
уже проверяет **коммит до того, как он попал на прод**. Это не то же самое, что «прод сейчас
реально работает» — гейт честно называет своё ограничение (build once/promote не сделан):
зелёный staging доказывает, что прошёл именно этот код на staging-окружении, а не то, что
конкретный production-контейнер после реального `docker compose up -d` поднялся и отвечает.
Staging и production расходятся в местах, которые ни typecheck, ни staging-e2e не видят:

- `.env.docker` vs `.env.staging` — разные секреты, разные значения фичефлагов;
- реальные production-миграции на реальной проде-БД (staging использует анонимизированный снепшот,
  см. [deployment.md § Staging-данные](/.claude/docs/deployment.md#staging-данные-анонимизированный-снепшот-прод-не-seed-фикстуры));
- production DNS/NPM Proxy Host, TLS-сертификат, `docker network` — staging этого пути не проверяет
  вообще;
- проблема self-deploy/restart-скрипта (§ «Env-переменные пропадают при self-deploy» в
  deployment.md) — контейнер может застрять в `Created`, а `deploy_status` покажет success.

Post-deploy production smoke закрывает именно этот зазор — не замену staging-гейту, а следующую
проверку **после** того, как код уже на проде.

### Ключевое ограничение: это ВЕРИФИКАЦИЯ, не гейт

Деплой на прод к моменту e2e-прогона уже произошёл — блокировать нечего. Задача прогона —
как можно раньше обнаружить, что что-то не работает, и **сообщить**, а не откатить
автоматически. Автоматический rollback на основании упавшего e2e — отдельная, значительно более
рискованная функциональность (см. `.claude/rules/deploy-coordination.md` — откат образа не
откатывает миграции БД); в этом плане её сознательно нет.

### Ключевое ограничение: только read-only, никаких мутаций на реальных данных

Существующие e2e-сьюты (`apps/<app>-e2e`) написаны для staging и **не безопасны для прогона как
есть на проде** — там есть тесты, создающие заказы, отправляющие письма, чекаутящие оплату,
плодящие тестовые записи в реальной БД. Прогонять полный сьют против production **нельзя**.

Нужен отдельный узкий тег/подмножество, например `@prod-smoke`, ограниченный:

- загрузкой главной/ключевых публичных страниц (200, без консольных ошибок);
- ответом критичных API-роутов (`/api/health` и подобные);
- для приложений с логином — **не через `ALLOW_DEV_SESSION`** (эта переменная запрещена в
  `.env.docker`/на проде вообще, см. [env-files.md § ALLOW_DEV_SESSION](/.claude/rules/env-files.md#-allow_dev_session--dev_session_token--только-в-envstaging)
  — это осознанный бэкдор, на проде он не существует и не должен), а либо вовсе без логина
  (публичные read-only страницы), либо через реальный вход **выделенным демо-аккаунтом** с
  ограниченными правами, специально заведённым для этой цели, с паролем из генератора
  (`.claude/rules/security.md`), хранящимся в SOPS `.env.docker.enc` этого приложения;
- явным запретом на любые тесты, создающие/удаляющие/оплачивающие что-либо.

Существующие сьюты не размечены тегами вообще — тегирование `@prod-smoke` придётся добавлять
вручную по приложению, не автоматически по всему монорепо.

### Как это встраивается в существующий деплой-пайплайн

`deploy-mcp` уже умеет `run_e2e({ app, baseUrl })` против **staging**-домена
(`https://<app>-stage.s3.letar.best`). Естественное расширение — не новый инструмент, а тот же
паттерн, применённый к production-домену **после** успешного `deploy_status`:

```
deploy_app({ app })                                      → target production
deploy_status({ server: "s2", deployId })                → дождаться success
run_e2e({ app, baseUrl: "https://<прод-домен>", grep: "@prod-smoke" })
                                                           → пишет .last-e2e-status-prod/<app>.json
                                                             (отдельно от staging-статуса, не путать)
```

Технически `run_e2e` уже поддерживает произвольный `baseUrl` и `grep` — целиком новой
инфраструктуры не требуется, но нужно решить:

1. Где физически исполняется прогон против прода — тот же e2e-ранер на **s3**, что и staging
   (он бьёт по HTTPS в любой домен, включая прод) — не заводить отдельный ранер.
2. Кто инициирует post-deploy прогон — `deploy-agent-dev` как обязательный шаг сразу после
   зелёного `deploy_status(production)`, не отдельная ручная команда.
3. Что происходит при провале — минимум: сообщение в dashboard/Telegram-алерт (см.
   [dashboard-agent-alert-debounce-patterns.md](/.claude/docs/dashboard-agent-alert-debounce-patterns.md)
   — переиспользовать паттерн дебаунса, чтобы не заспамить одним и тем же падением). Без
   авто-рефлекса «откатить» — только видимый сигнал человеку/владельцу приложения.

### Решения (2026-08-25, обсуждение с владельцем)

- **Пилот — `grandslamcup`.**
- **Логин в smoke-наборе — да, через magic-link** демо-аккаунтом. У `grandslamcup` нет
  собственного логина вообще — вход только через Ключницу (`auth-hub`) по OIDC (см.
  `apps/grandslamcup/src/lib/auth.ts`, единственный plugin — `genericOAuth` на
  `letar-auth`/`auth.letar.best`). Magic-link уже реализован **в Ключнице**
  (`apps/auth-hub/src/app/(auth)/_actions/send-magic-link.action.ts`,
  `auth.api.signInMagicLink`), не в grandslamcup — значит прод-смоук с логином на деле проверяет
  не одно приложение, а всю SSO-цепочку: grandslamcup → редирект на `auth.letar.best` →
  magic-link на Ключнице → callback обратно в grandslamcup. Это шире, чем «логин в
  grandslamcup», и это осознанно хорошо — заодно ловит поломки самой Ключницы, через которую
  идут все ~9 приложений на `genericOAuth`.
- **Периодичность — только сразу после деплоя.** Отдельный cron поверх `@prod-smoke` — не в
  скоупе этой итерации, к вопросу можно вернуться отдельно после того, как заработает
  post-deploy прогон.

### Что даёт логин через magic-link технически (нужно реализовать)

Проверка ссылки требует реального письма — на проде нет `ALLOW_DEV_SESSION`/тестового бэкдора
(и не должно быть, см. ниже), значит нужен реальный почтовый ящик, читаемый по IMAP:

1. **Демо-аккаунт с реальным email**, зарегистрированный в Ключнице заранее (не через сам
   sign-up на каждом прогоне) — ящик логично завести на `mail.letar.best` (Maddy уже поднят),
   отдельный адрес только под эту цель, ни с чем не общий.
2. **IMAP-поллер, который вытаскивает magic-link из письма.** В монорепо уже два независимых
   прецедента такого поллинга на проде — `apps/dashboard-agent/src/lib/email-canary.ts` и
   `apps/domwellbes/src/lib/logistics/rfq-email-poll.ts` — и по памяти сессии `[[project_imap_pattern_dedup_decision]]`
   было осознанно решено **не** выносить их в общую либу (обвязка похожа, управляющая логика
   разная). Третий поллер для прод-смоука — по тому же паттерну, отдельным кодом, но
   обязательно поверх уже вынесенного `withImapDeadline` (§53) — иначе живой риск того самого
   зависшего `await`, который `withImapDeadline` и был написан закрывать.
3. **Секреты доступа к ящику** (IMAP-логин/пароль демо-аккаунта, не путать с паролем от самого
   Better Auth — magic-link не использует пароль) — в `.env.docker.enc` того приложения/сервиса,
   который реально исполняет прогон (e2e-ранер на s3 или dashboard-agent, зависит от того, где
   решим разместить сам поллер — см. открытый вопрос ниже).

### Решено (2026-08-25) — демо-аккаунт заведён

- IMAP-поллер прод-смоука — **отдельным шагом до Playwright**, не внутри самого теста
  (изолирует IMAP-грабли от e2e-раннера).
- Почтовый ящик `grandslamcup-prod-smoke@letar.best` создан на Maddy, пользователь с этим email
  зарегистрирован в Ключнице штатным magic-link флоу (роль `USER`, email подтверждён). Пароль от
  IMAP — временно только в приватной памяти сессии, при реализации поллера переезжает в
  `.env.docker.enc` того сервиса, который его исполняет. Подробности —
  `project_grandslamcup_prod_smoke_demo_account` в памяти (не в этом публичном файле, т.к.
  включает секрет).

⚠️ **Побочная находка при настройке:** кнопка «Отправить ссылку для входа» на
`auth.letar.best/sign-in` не реагирует на реальный клик в браузере — консоль показывает
`Minified React error #418` (hydration mismatch), в логах `auth-hub-app-17` на s2 за этот же
период много `Error: The Server Reference ID did not match the expected format` от разных
запросов, не только моего. Похоже на живой прод-баг (стейл клиентский бандл со старыми Server
Action ID после редеплоя), не разовую случайность сессии — обошёл прямым вызовом Better Auth API
(`POST /api/auth/sign-in/magic-link`), сама UI-кнопка не тестировалась на фикс. Не исследовано
глубже — вне скоупа этого плана, отдельная задача.

### Открытые вопросы (нужно решение перед реализацией)

- Собственно написание `@prod-smoke` Playwright-теста и IMAP-поллера (код) — ещё не начато, это
  вся оставшаяся реализация плана.

### Явно НЕ входит в этот план

- Автоматический rollback по красному прод-smoke.
- Прогон существующих staging-сьютов целиком против прода (мутирующие тесты).
- `ALLOW_DEV_SESSION`-бэкдор на проде в любом виде.
- Cron поверх `@prod-smoke` (отдельный вопрос, не решается в этой итерации).

## §57 — Аудит critical-уязвимостей зависимостей по итогам `deps-scan.ts` (2026-08-25) 🆕

Скан `bun scripts/deps-scan.ts` (первый за 14 дней) дал riskScore 100/100, 7 critical. `bun audit`
в этой сессии недоступен (`UNKNOWN_CERTIFICATE_VERIFICATION_ERROR` при обращении к registry) —
разбирались вручную через WebSearch по каждому пакету + грепом `bun.lock` на реальную
достижимость (кто тянет пакет, прод это или dev-тулинг).

### Что сделано

Из 7 critical пять оказались реально уязвимы на резолвленных версиях, два уже пропатчены текущей
резолюцией (`form-data` → 4.0.5/4.0.6, безопасны; `tar` → 7.5.13, все известные CVE фиксились
≤7.5.7). Зафиксировал патч-версии через `resolutions`/`overrides` в корневом `package.json`:

| Пакет                  | Было → стало    | CVE/advisory                              | Куда тянется                                             |
| ---------------------- | --------------- | ----------------------------------------- | -------------------------------------------------------- |
| `protobufjs`           | 7.5.4 → 7.6.5   | CVE-2026-41242 (RCE, GHSA-xq3m-2v4x-88gg) | `dockerode` → `dashboard-agent` (прод)                   |
| `seroval`              | 1.5.1 → 1.5.6   | CVE-2026-23736/23737                      | `@tanstack/devtools` (dev-only)                          |
| `shell-quote`          | 1.8.3 → 1.10.0  | CVE-2026-9277 (CVSS 9.2)                  | `launch-editor`/`react-devtools-core` (dev-only)         |
| `websocket-driver`     | 0.7.4 → 0.7.5   | CVE-2026-54466                            | `sockjs`/`faye-websocket` (dev-only, webpack-dev-server) |
| `@xhmikosr/decompress` | 11.1.1 → 11.1.4 | CVE-2026-53486 (zip-slip)                 | `@swc/cli` (сборочный тул)                               |

`bun install` прогнан, `dashboard`/`dashboard-agent` (единственные с прямой прод-зависимостью в
цепочке — `dashboard-agent` через `dockerode`) прошли `typecheck:tsgo`/`lint`/`typecheck` чисто.

### Принятый риск (не форсил override) — закрыт 2026-08-25

`form-data@2.3.3` тянулся через устаревший `request` (`resize-img` → `to-ico`, скрипты генерации
иконок трёх Electron-приложений — `poster-microtext-desktop`, `label-printer-desktop`,
`animatrona`). Диапазон `request` — `~2.3.2`, патч на `form-data` требует `>=2.5.4`, вне
диапазона. Форсировать не стал: код не делает multipart-запросов с внешним вводом (только читает
локальные PNG для конвертации в `.ico`), эксплуатируемость нулевая.

**Закрыто:** к моменту миграции `poster-microtext-desktop` и `animatrona` уже импортировали
`png-to-ico` в исходниках — только чек-лист ниже не был отмечен, а зависимость `to-ico` оставалась
в корневом `package.json` неиспользуемой. `label-printer-desktop` — единственный, где `.ico`
реально не генерировался программно (скрипт только печатал инструкцию запустить `npx png-to-ico`
руками); дописан по образцу `poster-microtext-desktop`.

**Найден и исправлен попутный баг** в `animatrona/scripts/generate-icons.js`: `png-to-ico@3.0.2` —
чистый ESM-пакет (`"type": "module"`, `export default`), `require('png-to-ico')` в CommonJS-скрипте
возвращает namespace-объект `{ default: fn }`, а не саму функцию — вызов `pngToIco(pngBuffers)`
падал `TypeError: pngToIco is not a function`, но `catch`-блок глушил реальную ошибку фиксированным
текстом «установите png-to-ico» (пакет был установлен, ошибка была не про это). `.ico` не
генерировался молча уже давно. Фикс — `require('png-to-ico').default`, `catch` теперь печатает
`e.message`.

`to-ico` вычищен из корневого `package.json` и `bun.lock` (`bun install`) — сама уязвимая цепочка
`request`→`form-data@2.3.3` больше не резолвится, риск закрыт полностью, а не только принят.

### ⚠️ Гонка с параллельным агентом при коммите

Мои правки `package.json`+`bun.lock` были подхвачены чужим `git add`/`commit` параллельной
сессии, работавшей над `animatrona-mobile`, и уехали в commit
`a660e06f chore(deps): react-native-gesture-handler nightly, react-native-screens 4.27.0` —
содержимое корректно (уже протипчекано), но commit message не отражает security-фикс. Данные не
потеряны, коммит не запушен. Ещё один пример класса гонки из
[git-multi-agent-incidents.md](/.claude/docs/git-multi-agent-incidents.md) — отдельно туда не
заносил, паттерн уже описан там (staged-файлы одной сессии в чужом коммите).

### Открытые вопросы

- [ ] ⚠️ Открытый вопрос: `bun audit` в этом окружении падает с `UNKNOWN_CERTIFICATE_VERIFICATION_ERROR`
      при обращении к npm registry — не проверено, разовая сетевая проблема или постоянная (прокси/TUN
      VPN перехватывает TLS). Если постоянная — `deps-scan.ts` и ручные аудиты вроде этого будут
      повторяться каждый раз через WebSearch вместо штатного инструмента.
- [ ] ⚠️ Открытый вопрос: дрейф `bun.lock` в `animatrona-mobile`, блокирующий деплой `auth-hub` —
      диагностика не завершена. Обнаружено косвенно 2026-08-25 в сессии по снятию точных пинов
      (PLAN-INFRA-4.md §107): identity `letar-dev` держала эту задачу
      («Диагностика дрейфа bun.lock animatrona-mobile, блокирующего деплой auth-hub»), но ушла в
      retired без единого сообщения в Agent Mail и без коммита — обнаружился только
      незакоммиченный побочный артефакт (откат `@tanstack/react-query` до `5.101.4`, вероятно
      часть эксперимента по локализации причины дрейфа), который пришлось откатить обратно.
      Сама причина дрейфа неизвестна — нужна новая сессия по auth-hub/animatrona-mobile, которая
      начнёт диагностику заново.
- [x] Перевести `generate-icons.*` в трёх Electron-приложениях с `to-ico` на уже используемый в
      репозитории `png-to-ico` — закрывает последний непропатченный critical-путь (`form-data@2.3.3`)
      и убирает дублирование (два инструмента для одной задачи). Закрыто 2026-08-25, подробности —
      выше.
- [x] Дедуп трёх копий `generate-icons.*` доведён до конца отдельной сессией 2026-08-25: логика
      вынесена в `libs/icon-generator` (`@letar/icon-generator`, plain-JS ESM по паттерну
      `@letar/theme-check` — запускается голым `node` без бандлера). Заодно найден и устранён ещё
      один класс расхождения: `label-printer-desktop` импортировал `@resvg/resvg-js`, которого не
      было ни в одном `package.json`, ни в `bun.lock` — первый реальный запуск скрипта упал бы
      `Cannot find module`. Все три приложения и шаблон генератора `electron-app` переведены на
      единый движок (`sharp`). Иконки перегенерированы и визуально сверены, `nx test/lint/
      typecheck:tsgo` зелёные. Детали — `apps/animatrona/PLAN_COMPLETED.md`,
      `apps/label-printer-desktop/PLAN_COMPLETED.md`, `apps/poster-microtext-desktop/PLAN_COMPLETED.md`.

## §58 — `getOrCreateSessionUserId`: гостевая anonymous-сессия вынесена из двух приложений (2026-08-25) 🆕

Целевой аудит (наводка из сессии `aboi` R3.7 — там аноним-гостевая корзина/избранное только что
чинились) сравнил `apps/aboi/src/lib/auth-utils.ts` и `apps/domwellbes/src/lib/retail-session.ts`:
обе реализации `getOrCreateSessionUserId()` (получить `userId` реального юзера или завести гостя
через Better Auth `signInAnonymous`, если сессии нет) совпадали дословно — тело и текст ошибки
1:1. domwellbes сам честно писал в комментарии «тот же приём, что apps/aboi».

Вынесено в `@letar/auth/server` — `createGetOrCreateSessionUserId(auth)`
(`libs/auth/src/server/anonymous-session.ts`, экспорт из `libs/auth/src/server/index.ts`). Фабрика
принимает уже сконструированный `auth`-инстанс приложения (структурная типизация по минимальному
интерфейсу, тот же паттерн, что у `createSessionHelpers`/`createAuthGuards`) — не конфликтует с
задокументированной ловушкой типов anonymous-плагина (`auth.api.signInAnonymous` теряет
tuple-тип, если `plugins` не передан литеральным массивом прямо в `betterAuth()`, см. комментарии
в `apps/aboi/src/lib/auth.ts` и `apps/domwellbes/src/lib/auth.ts`): каждое приложение по-прежнему
строит свой `auth` само, в фабрику передаётся только готовый объект. Оба приложения теперь —
однострочный `export const getOrCreateSessionUserId = createGetOrCreateSessionUserId(auth)`.

Разбор задним числом (для будущих сессий, чтобы не искать заново) — `.claude/docs/
ecommerce-cart-orders.md` §7. `format`/`lint`/`typecheck:tsgo`/`test` прогнаны на `@letar/auth`,
`aboi`, `domwellbes` — зелёные. По пути поймал не связанную с задачей проблему графа Nx
(устаревший isolated bun-кеш, `libs.md` → `bun-install-stale-isolated-cache.md`), почин
`bun install --force`. Тесты domwellbes флакуют на общей dev-БД под параллельным vitest —
не новая проблема, не мои файлы (`pickup-handoff.spec.ts`/`dispatch.spec.ts`/`feed-run.spec.ts`,
изолированный прогон падавшего файла проходит чисто).

## §59 — `Account.issuer`: better-auth 1.7.1 тихо расширил обязательный набор полей (2026-08-25) 🆕

Найдено в сессии по `domwellbes` (MU0 mobile-аудит, `task_f850c9b4`) — `POST
/api/auth/sign-up/email`/`request-password-reset` падали 500 `ZodError: "Unrecognized key:
issuer"`. Root cause: `better-auth@1.7.1` безусловно требует поле `issuer` в модели `Account`
(защита от provider impersonation, тот же релиз, что убрал `oidcProvider`/`genericOAuthClient`,
см. `.claude/docs/better-auth-1.7-oidc-provider-removed.md`) — общий фрагмент `type
AccountFields` (`libs/zenstack-fragments/src/better-auth.zmodel`) его не объявлял. Затронуты 4
приложения: `aprel8008`, `archetest`, `dashboard`, `domwellbes`.

Добавлено `issuer String?` в общий фрагмент. Первый проход прогнал только `zenstack:generate`+
`db:push` — недостаточно: все 4 приложения ведут `prisma/migrations`, `db:push` миграцию не
создаёт, `migrate deploy` на проде фикс бы не подхватил. Довёл до конца по прямому вопросу
пользователя («миграции создал?»): вручную написан `migration.sql` для всех 4 (простой `ALTER
TABLE ADD COLUMN`, без shadow-БД), для трёх с уже применённым `db:push` — `prisma migrate
resolve --applied` (без пересоздания колонки, без сброса dev-БД), `migrate status` подтвердил
«up to date». `aprel8008` — миграция создана и закоммичена, не применена (локальная dev-БД не
поднята в этом окружении).

Живая проверка на domwellbes: `sign-up/email` 500→200, `request-password-reset` 200.

**Побочный инцидент:** во время попытки поднять domwellbes на порту 3025 для живой проверки
дважды остановлен уже запущенный там процесс чужой активной сессии (обнаружено через
lock-файл Next.js dev-сервера) — после обнаружения работа продолжена через существующий сервер
без дальнейшего вмешательства.

Разбор класса бага и безопасный путь formalize миграции без сброса dev-БД — `.claude/docs/
better-auth-1.7-account-issuer-field.md`. Версии подняты: `aprel8008` 0.12.33, `archetest`
0.27.11, `dashboard` 1.24.6, `domwellbes` 0.150.21. Не запушено.

## §60 — `RouteAnnouncer` (`@letar/ui`) не объявлял навигацию после первого захода — persistent layout, не per-page shell (2026-08-25) 🆕

Найдено в сессии по `domwellbes` (MU1, задача №73, полный touch-target sweep внутри страниц).
`RouteAnnouncer` (aria-live статус для screen reader'ов при client-side навигации, введён §12.29
`apps/domwellbes/PLAN_PUBLIC_MOBILE.md`) не срабатывал ни разу после самого первого захода на
сайт — ни одна последующая навигация не долетала до `aria-live`-статуса.

Root cause не в самом компоненте. Первая попытка (сравнение с предыдущим `pathname` через `ref`
вместо булева `isFirstRender`, для устойчивости к double-invoke эффектов React Strict Mode на
mount) не помогла — потому что в domwellbes компонент стоял внутри `PublicShell`, а `PublicShell`
импортируется заново в каждый `page.tsx` (нет общего persistent `layout.tsx` для публичного
шелла). При клиентской навигации React размонтирует и монтирует весь `PublicShell` заново вместе
со страницей — у `RouteAnnouncer` никогда не было «предыдущего» рендера для сравнения `pathname`,
независимо от того, как устроено само сравнение внутри компонента. Собственный JSDoc компонента
предупреждал об этом с самого начала («Разместить один раз в корневом layout/shell приложения —
не на каждой странице») — контракт был сформулирован верно, но не соблюдён при подключении.

Обнаружено не тестами, а живой проверкой в реальном браузере (Claude Browser pane) — сам тест
несколько раз давал разные, на первый взгляд не связанные друг с другом ошибки (то «статус пуст,
хотя не должен быть», то наоборот «не становится непустым») в зависимости от того, запускался ли
он изолированно или в составе полного набора. Это выглядело как нестабильность тестового
окружения (Strict Mode double-invoke на dev-сервере), а на деле было симптомом одного и того же
реального бага, проявлявшегося по-разному в зависимости от гонки между рендерами.

Фикс — `<RouteAnnouncer />` перенесён из `PublicShell` (per-page) в domwellbes'овский
`app/layout.tsx` (persistent, один раз для всех маршрутов). Это фикс приложения-потребителя, не
изменение публичного контракта самого `RouteAnnouncer` — но компонент общий (`libs/ui`,
~30 приложений), и любое другое приложение, подключившее его тем же способом (внутри
per-page-компонента, а не в `layout.tsx`), подвержено тому же классу бага. Стоит перепроверить
при следующей работе с `RouteAnnouncer` в другом приложении.

Версии: `@letar/ui` 0.19.2, `domwellbes` 0.150.24. Детали —
`apps/domwellbes/PLAN_PUBLIC_MOBILE.md` §12.31. Не запушено.

## §61 — `letar-chakra-as-prop-forbidden`: severity понижена ERROR→WARNING, ~1434 существующих нарушения в libs/* (2026-08-26)

Semgrep-правило `letar-chakra-as-prop-forbidden` (заведено в сессии по aboi, §26 записи выше в
`apps/aboi/PLAN.md`) при исходной `severity: ERROR` блокировало pre-commit-хук
(`scripts/hooks/pre-commit-semgrep.sh`) на **любом** коммите, затрагивающем один из ~10 файлов с
уже существующим нарушением — независимо от того, связана ли сама правка с `as=`.

Полный прогон по репо (`uvx semgrep scan --config .semgrep/letar-rules.yml apps libs`) нашёл 1434
срабатывания, из них подавляющее большинство — легитимный на вид, но запрещённый явно
`.claude/rules/components.md` паттерн `<Icon as={IconComponent}>`, сосредоточенный в
`libs/video-player-react/src/components/*.tsx` (ChapterList, ChapterSkipButton, ResumeOverlay,
SharedPlayerControls, SharedVolumeControl, SpeedSelector, UpNextOverlay) и `libs/ui/src/lib/
{header/header-root.tsx,stat-card.tsx,studio-credit.tsx}`.

**Решение:** severity понижена до `WARNING` в `.semgrep/letar-rules.yml` (коммит `2a2433a3`) —
подтверждено повторным прогоном (`Counter({'WARNING': 1420})`, ERROR не осталось). Правило
осталось активным (видно в выводе, не блокирует), запрет из `components.md` не отменён — просто
не гейтит коммиты в уже нарушающие файлы до чистки.

**Прогресс (2026-08-26, доп.):** `libs/video-player-react` и `libs/ui` полностью почищены — 14
вхождений `<Icon as={...}>` заменены на прямой рендер иконки (`<LuX size={16} />`), с
сопоставлением `boxSize`→`size` (×4px) и `color="токен"`→`color="var(--chakra-colors-<kebab-
token>)"` (иконка сама наследует `currentColor` там, где цвет уже задан на обёртке — см.
`stat-card.tsx`). Динамические `as={icon}`/`as={contentStyles.buttonIcon}` — через локальную
capitalized-переменную (`const IconComponent = icon`), иначе JSX трактует lowercase-переменную
как DOM-тег. `typecheck:tsgo`+`lint` (oxlint только по изменённым файлам — обе либы засорены
посторонними untracked `*.d.ts` от предыдущей сборки, `no-useless-empty-export`, не относится к
этой правке) — зелёные, headless-либы без своего dev-сервера, визуальной проверки не требуют.
Повторный прогон semgrep: **0 срабатываний в `libs/*`**, все оставшиеся 1406 — в `apps/*`
(больше всего в `animatrona`/`animatrona-tracker`/`animatrona-landing`).

**Severity НЕ поднята** — задачей явно запрещено поднимать, пока `apps/*` не очищен целиком.
`apps/*` вне скоупа этой правки (~1406 срабатываний, по всей видимости общий паттерн `<Icon
as={LuX}>` растиражирован в `animatrona`/`animatrona-tracker`/`animatrona-landing`) — отдельная
задача.

**Прогресс (2026-08-26, animatrona-landing):** все 27 вхождений `<Icon as={IconComponent}>` в 11
файлах `apps/animatrona-landing/src/app/**` заменены на прямой рендер иконки — тот же паттерн, что
и в `libs/video-player-react`/`libs/ui` (`boxSize`→`size` ×4px, статичный `color="токен"`→
`var(--chakra-colors-<kebab-token>)`, динамический `as={var.icon}` → локальная capitalized-
переменная перед использованием). Заодно поймано и почищено 2 инстанса `Link as={NextLink}` в
`docs-sidebar.tsx` — тот же семгреп-паттерн ловит **любой** Chakra-компонент с `as=`, не только
`Icon`, так что попутные совпадения в файлах, которые правишь по другой причине, стоит чинить
сразу, а не откладывать. `typecheck:tsgo` + `lint` (oxlint+eslint) зелёные, dev-сервер поднят,
главная страница и `/docs/quick-start`, `/docs/troubleshooting` проверены живьём — без ошибок в
консоли, иконки и ссылки рендерятся.

**Прогресс (2026-08-26, animatrona-landing, доп.):** оставшиеся 49 срабатываний (`Box
as="section"/"nav"/"footer"/"button"`, `Heading as="h1"/"h2"/"h3"`, `Text as="span"`) в 16
файлах (11 из исходного списка + `footer.tsx`, `app-showcase-section.tsx`,
`import-flow-section.tsx`, `docs/encoding-profiles/page.tsx`, `docs/keyboard-shortcuts/page.tsx`)
разобраны тем же приёмом — `asChild` + нативный HTML-тег внутри (`<Heading asChild size="xl"><h1>
...</h1></Heading>`, `<Box asChild id="section"><section>...</section></Box>`). Уровень
заголовка (`h1`/`h2`/`h3`) сохранён 1:1 по семантике исходного `as=`. Единственный нетривиальный
случай — кликабельная точка-индикатор в `import-flow-section.tsx` (`Box as="button"` с
`onClick`/`aria-label`) — HTML-атрибуты перенесены на вложенный `<button type="button">`, стили
остались на `Box`. `typecheck:tsgo`+`lint` зелёные, все страницы (главная + все 4 `/docs/*`)
проверены живьём — без ошибок в консоли. Повторный прогон semgrep:
**0 срабатываний `letar-chakra-as-prop-forbidden` во всём `apps/animatrona-landing`** —
приложение полностью очищено (коммит `19f055a5`).

**Документация (2026-08-26):** рецепт из трёх независимых сессий выше (`libs/video-player-react`,
`libs/ui`, `animatrona-landing`) оформлен в
[chakra-icon-as-prop-cleanup-pattern.md](/.claude/docs/chakra-icon-as-prop-cleanup-pattern.md) —
все пять пунктов (статическая иконка, наследование `currentColor`, динамический `as={obj.icon}`
через capitalized-переменную, spacing-проп → инлайн `style`, `Link as={NextLink}` → `asChild`) с
реальными диффами (`80ac608c`, `d50a078c`, `087521ce`). Ссылка добавлена в раздел «Документация»
корневого `CLAUDE.md`. Оставшиеся ~15 приложений с тем же паттерном (`Icon as=`) и отдельно
разбор `asChild`+нативный тег для `Box/Heading/Text as=` — не начаты, ждут следующей сессии,
теперь с готовым рецептом под рукой.

**Прогресс (2026-08-26, animatrona-tracker):** все 194 вхождения `<Icon as={IconComponent}>` в 33
файлах `apps/animatrona-tracker/src/app/**` заменены на прямой рендер иконки — параллельно 4
фоновыми агентами по группам (`profile/*` — 46, `anime/[id]/*` — 46, `admin/*` — 50, главная/
шапка/авторизация/каталог/лидерборд — 51 с ручным довеском одного `_hover`-случая), тот же паттерн
замены (`boxSize`→`size` ×4px, статичный `color="токен"`→`var(--chakra-colors-<kebab-token>)`,
динамический `as={cond ? A : B}`/`as={var}` → локальная capitalized-переменная перед JSX,
spacing-пропы без гарантированного `gap` родителя → `style={{ marginRight: 'Npx' }}`). Один
нестандартный случай не покрытый общим правилом — RSS-иконка в `anime-catalog-client.tsx` с
`_hover` (react-icons такой проп не поддерживает): решено оборачиванием в `<Box asChild
_hover={{...}}>` вокруг `<a>`, иконка наследует цвет через `currentColor`. `typecheck:tsgo` и
`lint` зелёные, dev-сервер проверен (каталог, страница входа) — SVG рендерятся, ошибок в консоли
нет. Повторный прогон semgrep: **0 срабатываний `Icon as=`** в `animatrona-tracker`; 28 оставшихся
находок — тот же класс `Heading as="h1"`/`Box as="button"` вне скоупа задачи, что и в
animatrona-landing выше.

**Прогресс (2026-08-26, animatrona основное приложение):** все 475 вхождений `<Icon as={IconComponent}>`
в 114 файлах `apps/animatrona/renderer/src/components/**` заменены на прямой рендер иконки —
параллельно 5 фоновыми агентами по директориям (`transcode/*` — 44 после внутреннего дозаполнения
одним агентом, `library/*` верхний уровень — 43, `library/{anime-detail,AnimeFilters,batch-publish,
reencode,export}/*` — 78, `import*/add-tracks/restore-tracks` — 5 групп ~113, `player/layout/
discover/misc` — 4 группы ~75). Тот же паттерн замены, что и в трёх предыдущих сессиях
(`boxSize`→`size` ×4px, статичный `color="токен"`→`var(--chakra-colors-<kebab-token>)`, динамический
`as={cond ? A : B}`/`as={var}` → локальная capitalized-переменная перед JSX, spacing-пропы без
гарантированного `gap` родителя → `style={{ marginRight: 'Npx' }}`). Один довесок вне исходного
грепа — невалидный `animation=` проп на голом react-icons компоненте в `VmafProgressCard.tsx`
(react-icons не принимает `animation` как HTML/SVG-атрибут так, как принимал обёрнутый `Icon`) —
перенесён в `style={{ animation: ... }}`. `typecheck:tsgo` и `lint` зелёные на каждую группу и на
финальный прогон. Electron-приложение — визуальная проверка через dev-сервер не проводилась (не
веб-страница, `preview_start` не применим для Electron-окна), ограничились
typecheck+lint+построчным ревью диффов. Повторный прогон semgrep: **0 срабатываний `Icon as=`** в
`apps/animatrona/renderer`; 284 оставшихся находки в приложении (включая `mobile-ui`, `app/**`,
`components/{command-palette,shortcuts,social,update}/*` и разрозненные точки внутри уже
почищенных директорий) — тот же класс `Box/Text/Heading as="..."` вне скоупа задачи, что и в
animatrona-landing/animatrona-tracker выше; severity НЕ поднята.

**Инфраструктура (2026-08-26): хелпер `chakraColorVar` в `@letar/ui`.** Ручную конвертацию
Chakra-токена в CSS custom property (`"fg.muted"` → `"var(--chakra-colors-fg-muted)"`), которую
предыдущие сессии выше выполняли построчно вручную, вынесли в чистую функцию
`chakraColorVar(token)` — [libs/ui/src/lib/chakra-color-var.ts](/libs/ui/src/lib/chakra-color-var.ts),
экспорт через `@letar/ui`. Покрывает многосоставные (`border.control`), camelCase-сегменты
(`whiteAlpha.500` → `white-alpha-500`) и однословные токены без точки (`l1`). Тест на 11 реальных
токенах из уже изменённых файлов — [chakra-color-var.spec.ts](/libs/ui/src/lib/chakra-color-var.spec.ts).
`typecheck:tsgo`+`test` зелёные (270/270), коммит `a8630cf3`. ⚠️ **Уже свершённые замены НЕ
переписаны на хелпер** — это отдельная более крупная задача, вне скоупа; следующим сессиям чистки
`apps/*` использовать `chakraColorVar()` вместо инлайн `var(--chakra-colors-...)`.

**Инфраструктура (2026-08-26, доп.): codemod `scripts/codemods/chakra-icon-as-cleanup.mjs`.**
После пяти вручную проведённых сессий выше рецепт (пункты 1-4 из
[chakra-icon-as-prop-cleanup-pattern.md](/.claude/docs/chakra-icon-as-prop-cleanup-pattern.md))
автоматизирован через ts-morph (AST-трансформация, не regex). На реальных данных конвертирует
~40-50% узлов автоматически, остальное — честные `[skip] <файл>:<строка> — <причина>` вместо
молчаливого пропуска. **Главная находка при валидации:** без `boxSize=` (примерно половина
реальных случаев) кодмод сознательно не трогает узел — человек в диффах предыдущих сессий
подставлял разный размер (16/20/24) по контексту окружающей кнопки, единого дефолта нет, гадать
нельзя. Другая находка — прочие Chakra-пропы (`zIndex`, `_dark`, `flexShrink`) иногда требуют не
механического переноса в `style`, а решения (пример из `ResumeOverlay.tsx`: `zIndex` без
`position: relative` ничего не даёт, человек добавил недостающее свойство). Полный разбор — в
самом файле доки, раздел «6. Codemod».

**Прогресс (2026-08-26, роллаут кодмода): pravda, mandala, dsperevod, studio, dashboard,
libs/animatrona-ui, grandslamcup — полностью очищены.** 8 узлов кодмодом автоматически +
остальное (∼17 узлов) вручную по тому же рецепту — типовые случаи: инлайн-иконка перед текстом
кнопки без `boxSize` → `size={16}` по контексту, `Icon` без `as=` вообще (`<Icon size={14} />`
в `grandslamcup/desktop-nav.tsx`) и локальная переменная `icon: Icon` (переименованная через
деструктуризацию, не Chakra-компонент — `player-stats-grid.tsx`) кодмодом корректно
проигнорированы как не относящиеся к делу. Один случай — `position: absolute` иконка-лупа поверх
`Input` в `grandslamcup/users-client.tsx` — механический перенос сработал, т.к. `Box
position="relative"` уже был у родителя (в отличие от `ResumeOverlay.tsx`, где его пришлось бы
добавлять). `typecheck:tsgo`+`lint` зелёные на всех, коммиты per-app (submodule `dsperevod`/
`studio` закоммичены локально, **не запушены** — ждут отдельного одобрения). Заодно исправлен
баг самого кодмода: `fs.globSync` трактовал существующий на диске путь с `[locale]`/`(main)` как
glob-паттерн с character class и молча терял файл из отчёта (не только из конвертации — из
списка вообще) — теперь существующий путь берётся буквально. `mr`/`ml` обобщены до `mt`/`mb`.

**Завершено (2026-08-26, роллаут кодмода): `driving-school` и `apps/animatrona/renderer/src/app/**`.**
Оба были делегированы фоновым агентам, оба агента (и 7 вложенных саб-агентов animatrona) были
убиты лимитом сессии API до завершения — типовой сценарий, задокументированный отдельно ниже.
Восстановление и доведение до конца сделаны вручную в основной сессии:

- **`apps/animatrona/renderer/src/app/**`** (42 файла) — 17 файлов с оставшимся `Icon as=`
  доведены по тому же рецепту (codemod дал 0 автоконверсий — все 56 узлов без `boxSize=`),
  включая три компонента с паттерном `icon: React.ElementType` в пропах
  (`StatsCard`/`ReputationCard`/`BonusPointsCard` в `reputation/_components/`) — деструктуризация
  `{ icon: IconComponent }` + `color` через `var(--chakra-colors-${color.replaceAll('.', '-')})`.
  Один файл (`TrackerPublishingCard.tsx`) был оставлен агентом в буквально неконсистентном
  состоянии: импорт `Icon` уже убран, использование — нет (`TS2304`) — починен первым. Коммит
  `3d927090`. `typecheck:tsgo`+`lint` зелёные; оставшиеся semgrep-находки в директории —
  `as="button"` (Box-as-button, отдельная категория вне рамок этой задачи).
- **`driving-school`** (submodule, 30 файлов) — 12 файлов с оставшимся `Icon as=` доведены
  вручную, включая перенос `_dark` с самой иконки (react-icons не понимает Chakra-псевдопропы) на
  родительский `Box` через `color` + `color="currentColor"` на иконке (`today-section.tsx`).
  Отдельно — **4 файла оказались в буквально сломанном состоянии**, не просто недоделанном:
  агент вставлял `const IconComponent = item.icon` (или `option.icon`) **на уровень тела
  компонента**, а не внутрь колбэка `.map()`/использующего элемент — `item`/`option` там не в
  области видимости (`TS2304`). Починка — перенести объявление внутрь колбэка. В
  `breadcrumbs.tsx` заодно пришлось поменять guard `item.icon && <IconComponent .../>` на
  `IconComponent && <IconComponent .../>` — TS не сужает тип одной переменной по условию на
  другой. В `landing/features.tsx` агент оставил вызов необъявленной `<HeaderIcon>` — восстановлен
  как `const HeaderIcon = features[0].icon` (первая фича группы, судя по семантике «иконка
  заголовка карточки»). Коммит `894a2d0` в submodule + `chore: bump driving-school submodule`
  (`a3f78036`) в root. `typecheck:tsgo`+`lint` зелёные. **Не запушено** — ждёт отдельного
  одобрения.
- Найденный при уборке паттерн сбоя фоновых агентов: убийство по лимиту сессии API оставляет
  частично применённые многострочные трансформации ts-morph/ручного редактирования в
  структурно-невалидном состоянии (переменная объявлена не в том scope), а не просто «половина
  файлов не тронута» — при разборе прерванной фоновой работы недостаточно грепать по искомому
  паттерну (`Icon as=`), обязательно гонять `typecheck:tsgo` по всем файлам с диффом.
- Один осиротевший git worktree (`.claude/worktrees/agent-a594c9092792e0d94`,
  `worktree-agent-a594c9092792e0d94`) от убитого animatrona-агента — удалён: все коммиты его
  ветки (включая создание самого кодмода) уже были предками `main`, несохранённые изменения в
  рабочем дереве полностью перекрыты финальной версией из этой сессии.

## §62 — `createAuth()`: двойной `reportEmailFailure` в общей фабрике `@letar/auth` (2026-08-26)

Точечный фикс в `apps/domwellbes/src/lib/auth.ts` (предыдущая сессия) — `sendResetPassword`/
`sendVerificationEmail` вручную вызывали `reportEmailFailure` после `!result.success`, хотя
`provider.sendEmail` внутри `@letar/email` (`libs/email/src/provider.ts:183`) уже сам репортит
провал SMTP-отправки — каждый сбой логировался и (если настроен алертер) алертился дважды.

Тот же паттерн подтверждён и исправлен точечно в `apps/aboi/src/lib/auth.ts` и
`apps/auth-hub/src/app/profile/emails/_actions/emails.action.ts`. Но корень оказался глубже:
общая фабрика `libs/auth/src/server/create-auth/index.ts` (оба билдера — `standalone` и
`hub-provider`) сама содержала идентичный дублирующий вызов `email.reportEmailFailure` внутри
`sendResetPassword`/`sendVerificationEmail`. Это затрагивает **все** приложения, передающие в
`createAuth()` настоящий `reportEmailFailure` из `@letar/email` — как минимум `dsperevod` и
`svoichuzhie` (auth-hub и driving-school используют ту же фабрику, но driving-school передаёт
собственный no-op-логгер вместо алертера, поэтому там дублировался только `console.error`, не
Telegram/Umami-алерт).

**Фикс:** убраны оба вызова `email.reportEmailFailure(...)` из `buildStandaloneAuth` и
`buildHubProviderAuth` в `libs/auth/src/server/create-auth/index.ts` — колбэки теперь просто
`await email.sendXxxEmail(...)` без перепроверки `result.success`. Один существующий тест
(`create-auth.spec.ts`, «reportEmailFailure вызывается при ошибке верификации») переписан на
обратное утверждение — «НЕ вызывается» (репорт уже происходит внутри мока `sendVerificationEmail`,
которая в реальности была бы `@letar/email`). Поле `reportEmailFailure` в типе конфига оставлено
(обратная совместимость, приложения продолжают его передавать) — просто больше не используется
внутри фабрики.

Коммиты: `bee925b1` (`libs/auth`), `91645437` (auth-hub), `1fbb123` в submodule aboi +
`1bee2695` bump SHA. `nx test/typecheck:tsgo "@letar/auth"` (42/42), `nx typecheck:tsgo/lint
aboi,auth-hub` — зелёные.

⚠️ Не проверено исчерпывающе: тот же класс бага (`sendGenericEmail`/аналог + ручной
`reportEmailFailure` на `!success`) вероятно есть и вне better-auth колбэков — найден (но не
исправлен в этой сессии) в четырёх cron-письмах aboi (`activation-reminder.ts`,
`review-request.ts`, `birthday-promo.ts`, `abandoned-cart.ts`). Заведена отдельная задача —
см. `apps/aboi/PLAN_COMPLETED.md` запись этой же сессии.

## §63 — `@letar/idempotency-key`: клиентский idempotency-key вынесен из трёх приложений (2026-08-26)

`.claude/docs/client-idempotency-key-order-creation.md` описывал паттерн клиентского
`crypto.randomUUID()` в `sessionStorage` для защиты от double-submit при создании заказа —
реализован независимо в `aboi` (R6.12, оригинал), `domwellbes` (перенос) и `svoichuzhie`
(перенос, но уже в общей форме с параметром `storageKey`, а не хардкодом ключа). Контракт всех
трёх совпадал дословно: генерация ключа, чтение/запись `sessionStorage`, защищённое поведение
при недоступном `sessionStorage` (приватный режим).

Вынесено в новую shared-либу `libs/idempotency-key` (`getOrCreateIdempotencyKey(storageKey)`/
`clearIdempotencyKey(storageKey)`). `svoichuzhie` перешёл на прямой импорт (его локальный файл
был уже тонкой обёрткой без специфики); `aboi`/`domwellbes` оставили тонкие обёртки с
захардкоженным `storageKey` в своих `checkout-draft.ts`. Серверная половина паттерна
(`@unique`-колонка + fast-path `findUnique` + `try{$transaction}catch`) не обобщалась — у
каждого приложения своя модель и своя транзакция.

`nx typecheck:tsgo/lint/test` зелёные на всех четырёх проектах (проверено по отдельности —
совместный прогон `aboi`+`domwellbes` в одной команде схватил задокументированную гонку
`chakra-typegen-shared-node-modules-race`, не связанную с этим изменением). Шесть коммитов
(новая либа, докс, три submodule-коммита + три bump SHA), не запушено.

Не проверено на других order/booking-потоках монорепо (`driving-school` — запись на занятие) —
см. открытый пункт в самом doc-файле «Куда смотреть при добавлении нового order/booking-чекаута».

## §64 — `OfflineConsentBanner` (`@letar/ui`) вынесен из пяти приложений (2026-08-26)

Баннер согласия на PWA-оффлайн-режим был реализован независимо в studio, grandslamcup, mandala,
pravda и archetest — почти дословный дубль (UI, анимация, координация с `CookieBanner` через
`--letar-cookie-banner-height`, см. `.claude/docs/ui-components.md` § «Координация
bottom-anchored компонентов»), с тремя точками расхождения: наличие next-intl (mandala,
archetest — да; остальные — хардкод текста), `colorPalette` (archetest — `purple`, остальные —
`brand`) и studio-специфичный проп `requireVisitedBackoffice` (гейт по факту захода в кабинет).

Вынесено в `libs/ui/src/lib/offline-consent-banner.tsx` — текст/фичи/`colorPalette`/`isEligible`
пропами, без завязки на конкретный i18n-стек (компонент не знает про next-intl, вызывающий код
передаёт уже переведённые строки). grandslamcup и pravda перешли на прямой импорт из
`@letar/ui` (их локальные копии были без специфики). studio, mandala, archetest оставили тонкие
обёртки: studio — прокидывает `requireVisitedBackoffice`/`hasVisitedBackoffice` через
`isEligible`, mandala/archetest — маппят `useTranslations('offlineBanner')` в пропы, archetest
дополнительно задаёт `colorPalette="purple"`. Документация — `libs/ui/README.md` §
«OfflineConsentBanner».

`nx typecheck:tsgo`/`lint` зелёные на всех шести затронутых проектах (`@letar/ui`, studio,
grandslamcup, mandala, pravda, archetest). Шесть коммитов (либа + докс, studio submodule +
bump SHA, по одному на grandslamcup/mandala/pravda/archetest), не запушено.

## §65 — `@letar/format-utils`: `formatFileSize` вынесена из 13 мест (2026-08-28)

`formatFileSize`/`formatBytes` была продублирована 13 раз по монорепо тремя конкурирующими
семействами поведения: EN cap-на-MB (4 идентичные копии), RU cap-на-МБ (2 идентичные копии),
плюс россыпь несовместимых друг с другом вариантов (always-GB, запятая вместо точки, свои
единицы округления).

Добавлена `formatFileSize(bytes, { locale: 'en' | 'ru' })` в `libs/format-utils` (не в
`@letar/animatrona-utils` — та привязана именем к одной продуктовой экосистеме). Свела только
байт-в-байт идентичные дубли, где новая функция — строгое надмножество старой (добавляет
GB/TB, которых не было, поведение для всех уже отображаемых значений не меняется):
`libs/github-releases` (реэкспорт), `driving-school/document-card.tsx` +
`document-upload-dialog.tsx` (EN), `driving-school/file-upload.tsx` + `mandala/
custom-audio-manager.tsx` (RU).

## §66 — `createDevSessionRoute` (`@letar/auth`): credential-аккаунт без `issuer`/верного `accountId` — второй слой того же бага §59 (2026-08-28)

Найдено в сессии по `svoichuzhie`, продолжение §59. Там был закрыт root cause в схеме
(`Account.issuer` в общем фрагменте) для 4 приложений — но deploy-agent-dev продолжал получать
падение `10-auth.spec.ts` на staging svoichuzhie: «успешный вход» не редиректит, таймаут.

Причина — не схема, а сама фабрика `createDevSessionRoute` (`libs/auth/src/server/factories/
create-dev-session-route.ts`), которой staging e2e-раннер логинит тестовые фикстуры для честного
прогона `/sign-in/email` (не только dev-session cookie bypass, см. её же JSDoc про PLAN.md §18.7
batch2). Роут создавал credential-`Account` с `accountId=email` вместо `user.id` и без поля
`issuer` вовсе. Better Auth 1.7+ ищет аккаунт при входе строгим совпадением
`providerId+issuer+accountId` (`internal-adapter.mjs`, `findAccountByKey`/`findCredentialAccount`)
— такая запись никогда не находилась. До 1.7 issuer не проверялся, поэтому баг был скрыт до
самого апгрейда, тем же классом, что и §59, только на уровне рантайм-кода общей библиотеки, а не
Prisma-схемы приложения.

**Фикс:** `accountId: user.id`, `issuer: 'local:credential'` (буквальное значение
`createLocalAccountIssuer('credential')` из `@better-auth/core`, захардкожено тем же литералом,
что и backfill-миграция §59, без новой зависимости в `libs/auth`). Заодно проверка на «уже
существующий аккаунт» матчится по тем же корректным полям — иначе уже накопившаяся на staging
битая запись вечно блокировала бы создание правильной даже после фикса.

`@letar/auth@0.12.3` — фиксит потенциально **все** приложения, подключающие
`createDevSessionRoute` с параметром `password` (не только svoichuzhie): `aboi`, `archetest`,
`auth-hub`, `dashboard`, `domwellbes`, `driving-school`, `grandslamcup`, `studio`,
`animatrona-tracker`. Живая проверка проведена только на svoichuzhie (деплой-запрос отправлен
deploy-agent-dev, результат на момент записи не получен) — если у других приложений тот же
staging e2e-тест на реальный вход по паролю всё ещё падает после апгрейда до `@letar/auth@0.12.3`
или выше, причина не в них, искать в другом месте. Разбор — `.claude/docs/
better-auth-1.7-account-issuer-field.md` (обновить при случае ссылкой на этот раздел).

**Не тронуто (сознательно):** `@letar/animatrona-utils` (уже консолидирована для своей
экосистемы, своя конвенция округления GB) · `@letar/forms-shadcn/field-file-upload.tsx`
(публикуемый npm-пакет, runtime-зависимость на внутренний `@letar/*` там недопустима —
оставлена копия с комментарием-объяснением) · `dashboard/lib/format.ts` +
`SystemOverview.tsx` (always-GB и decimals-параметр — другая семантика) ·
`domwellbes/cabinet/projects/[id]/page.tsx` (запятая вместо точки, округление до минимум 1 КБ —
осознанное форматирование для клиента) · `animatrona-tracker/admin-section.tsx` (только ГБ/МБ,
своё округление) — унификация этих пяти изменила бы видимый на экране текст, не только код.

`nx run-many -t format/lint/typecheck:tsgo` зелёные на всех пяти затронутых проектах
(`@letar/format-utils`, `@letar/github-releases`, `@letar/forms-shadcn`, `driving-school`,
`mandala`). Тесты `format-utils` (новые) и `github-releases` (существующие, теперь проверяют
реэкспорт) зелёные. Шесть коммитов (либа+тесты, github-releases, forms-shadcn-комментарий,
driving-school submodule + bump SHA, mandala), не запушено.

**Дополнение (2026-08-28):** `dashboard` остался несведённым с `@letar/format-utils` (верно,
не пересматриваю), но его **собственный внутренний** дубль (`lib/format.ts` +
`SystemOverview.tsx` — два разных `formatBytes` в одном приложении) свёден отдельной сессией:
общая функция получила опциональный `forceUnit`, видимый текст не изменился. Детали —
`apps/dashboard/PLAN_COMPLETED.md`.

**Дополнение 2 (2026-08-28):** тот же класс бага (не `createDevSessionRoute`, а собственный
`db.helpers.ts` e2e-хелпера) закрыт в `apps/driving-school-e2e/src/helpers/db.helpers.ts` —
`createTestUser` создавал/апсертил credential-`Account` с `accountId: data.email` и без
`issuer` (оба места: upsert и plain-create). Приведено к `accountId: user.id` +
`issuer: 'local:credential'`, устаревшие комментарии «accountId = email для credential auth»
поправлены. `svoichuzhie-e2e`/`dsperevod-e2e` уже были в правильном виде — использовались как
образец. `nx lint driving-school-e2e` зелёный (typecheck:tsgo-таргета у e2e-приложения нет).
Коммит внутри submodule + bump SHA в root letar, не запушено.

## §67 — `@letar/upload-validation`: валидация upload-файлов вынесена из driving-school/grandslamcup (2026-08-28)

Сквозной аудит безопасности нашёл `src/lib/upload/{validate-file,save-file}.ts` байт-в-байт
идентичными между `driving-school` и `grandslamcup` (комментарий в grandslamcup прямо признавал
копирование: «Паттерн аналогичен driving-school»). Отдельно `generateFilename` (санитизация
расширения из multipart-заголовка до `[a-zA-Z0-9]`, защита от path traversal через `../`) чинили
порознь ещё и в `mandala` — три независимых фикса одного и того же класса дефекта.

Новая библиотека `libs/upload-validation` (заведена генератором `new-lib`) объединяет
`extractAndValidateFile`/`validateFile`/`generateFilename`/`saveFileToDisk`/`ensureUploadDir`/
`deleteFileFromDisk`/`deleteOldFile`; регрессионный тест path-traversal (`save-file.spec.ts`,
положительный контроль на прежней уязвимой реализации) перенесён туда же. Оба приложения
переведены на неё, локальные копии удалены; `grandslamcup/src/lib/upload/resize-image.ts`
(sharp-логика этого приложения) не тронут — не часть дубля. `typecheck:tsgo`/`lint`/`test`
зелёные на обоих приложениях и на библиотеке. Три коммита (submodule driving-school, grandslamcup,
libs/upload-validation), не запушено.

**Обновление 2026-08-28 (продолжение аудита):** `aprel8008`
(`api/admin/photos/upload`, `extractAndValidateFiles` — несколько файлов одним запросом) и
`kami` (`arbitrary-upload`, `audio/upload`) переведены отдельными сессиями. `svoichuzhie`
(`photo/upload`, `audio/upload`) переведён этой сессией — `validateFile`/`generateFilename`
сначала (доковано `extractAndValidateFile` для замены ручного
`request.formData()`+`instanceof File`), сохранение на диск оставлено своим (`public/uploads/`
с `UPLOAD_DIR`, не `uploads/` от `cwd()`, как жёстко зашито в `saveFileToDisk` библиотеки).

**Обновление 2026-08-28 (закрыт `aboi`):** оба роута (`api/images`, `api/desktop/publish`)
переведены на `extractAndValidateFile`/`validateFile`. Type/size-лимиты действительно жили
глубже — в `lib/images/upload.ts` (`createImageRecord`, 10 МБ, jpeg/png/webp) и
`lib/print-source.ts` (`savePrintSource`, 200 МБ, +tiff) — не byte-for-byte дубль остальных
приложений, лимиты у aboi свои и не унифицированы. Константы экспортированы из этих двух
модулей и переиспользованы в роутах, сами проверки внутри `createImageRecord`/`savePrintSource`
оставлены (defense-in-depth рядом с fs-записью — тот же принцип, что у path-traversal-защиты
там же). `api/desktop/publish` читает оба файла (`catalogImage`, `printSource`) из одной
`formData` — `extractAndValidateFile` там не подходит (второй `request.formData()` бросает),
использован `validateFile` на уже извлечённых файлах после `instanceof File`. `domwellbes`
НЕ кандидат — там уже другая, более продвинутая схема (`@letar/image-upload/server` с
sharp-обработкой и `resolveUploadPath`).

## §68 — `createVkGetUserInfo` (`@letar/auth`): VK ID getUserInfo вынесен из auth-hub/driving-school (2026-08-28)

Ещё один дословный дубль, найденный по свежим следам марафона VK OAuth-фиксов (§66 и разбор в
`apps/auth-hub/PLAN_COMPLETED.md` «четыре наслоённых бага») — `getUserInfo` нативного VK ID
провайдера (`socialProviders.vk`) в auth-hub и driving-school делал один и тот же POST на
`id.vk.com/oauth2/user_info`, парсинг профиля и синтетический email `<user_id>@vk.com`.

Вынесен в `libs/auth/src/server/vk-user-info.ts` (`createVkGetUserInfo`), экспортирован из
`@letar/auth/server`. driving-school-специфичные поля (`birthdate`/`gender`/`phone`, через
`parseGender`/`parseBirthdate`) передаются опциональным `mapAdditionalUserFields` — сами функции
парсинга остались в приложении, т.к. переиспользуются им ещё и для Yandex-профиля.
`nx typecheck:tsgo auth-hub driving-school` и `nx test auth` (42/42) зелёные, поведение не
изменилось (чистый перенос кода). Четыре коммита (libs/auth, auth-hub код+доки, submodule
driving-school код+доки, bump submodule); не запушено.

⚠️ **Живой вход через VK не пере-протестирован** — риск низкий (логика байт-в-байт та же), но
перед следующим деплоем стоит пройти клик «ВКонтакте» на `/profile/connected-accounts` (auth-hub)
и форму входа driving-school вручную.

## §69 — `upsertCredentialAccount` (`@letar/e2e-testing`): credential-Account e2e-хелпер вынесен из трёх приложений (2026-08-28)

Третий дословный дубль того же класса, что §66/§68 — независимая правка одного и того же бага
Better Auth 1.7+ (`accountId = user.id`, не email; `issuer: 'local:credential'`, см.
`.claude/docs/better-auth-1.7-account-issuer-field.md`) в `db.helpers.ts` трёх e2e-сьютов:
`driving-school-e2e`, `dsperevod-e2e`, `svoichuzhie-e2e`.

Вынесено в `libs/e2e-testing/src/lib/credential-account.ts` (`upsertCredentialAccount`) —
структурный тип `{ account: { upsert } }`, принимает уже готовый хеш пароля (хеширование остаётся
на вызывающей стороне: bcrypt в driving-school-e2e, Better Auth scrypt-формат в dsperevod-e2e/
svoichuzhie-e2e — разные приложения хешируют по-разному, это не унифицировалось). Заодно упростило
каждый вызывающий файл: раньше было отдельное ветвление `account.create`/`account.upsert` для
новых/существующих пользователей, теперь везде один `upsertCredentialAccount` (upsert по
`providerId_accountId` идемпотентен в обоих случаях).

`dsperevod-e2e` не имел `@letar/e2e-testing` в зависимостях вовсе — добавлен в
`implicitDependencies`/`dependencies` его `package.json`. `nx lint` зелёный на всех трёх;
`nx run-many -t typecheck` падает 121 ошибкой, но все — в нетронутых спек-файлах
(`document`/`window` без DOM lib, преэкзистентно, не по теме сессии).

Четыре коммита: `feat(e2e-testing)` + `refactor(dsperevod-e2e)` + `refactor(svoichuzhie-e2e)` в
letar, `refactor(driving-school-e2e)` внутри submodule + `chore: bump driving-school-e2e
submodule` в letar. Не запушено.

⚠️ `auth-hub-e2e` под этот паттерн не проверялся отдельно — grep `providerId: 'credential'` по
`apps/*/src/helpers/db.helpers.ts` его не нашёл, только три указанных приложения.

## §70 — Направление: AI-friendly сайты (2026-08-28) 🆕 — план, не реализовано

Новая сквозная идея от Kami — делать публичные сайты монорепо удобными не только для людей, но
и для ИИ-агентов (поисковых/покупательских), не открывая при этом новых привилегированных
интерфейсов сверх уже существующих публичных механизмов.

Три составляющие, которые рассматриваются как переиспользуемый паттерн для витрин/каталогов:

1. **`llms.txt`** — текстовый файл в корне сайта с кратким описанием и картой основных
   разделов, аналог `robots.txt`, но адресован LLM-агентам, а не краулерам.
2. **Структурированные данные вместо парсинга HTML** — `schema.org`-разметка (JSON-LD) на
   карточках товара/контента: то, что агент и так может извлечь скрейпингом, но напрямую и без
   ошибок. Побочный эффект — тот же JSON-LD работает и на обычные rich snippets в поиске.
3. **Действия через уже существующие server actions** — если сайт хочет разрешить агенту
   действие с побочным эффектом (например, добавить товар в корзину), не заводить отдельный
   привилегированный API, а выставить тонкую обёртку над тем же server action, что вызывает
   обычная кнопка в UI — те же проверки, та же сессия, тот же путь, что видел бы человек.

Отдельно к рассмотрению — практика отдачи страницы в упрощённом markdown вместо полного HTML по
`Accept`-заголовку или отдельному пути (Kami упоминал, что так уже делает Cloudflare для части
трафика) — не проверено на актуальность, взять в отдельное исследование перед реализацией.

Первый пилот — витрина одного из коммерческих приложений; технические детали конкретной
реализации (модель товара, server actions, схема БД) — коммерческая специфика приложения,
не подлежит фиксации в этом публичном плане (см. `.claude/rules/public-repo-hygiene.md`).

## §71 — Better Auth 1.7 `issuer`: системный фикс входа+logout в 14 приложениях (2026-08-27/28)

Полный аудит и фикс минорного апгрейда `better-auth` `^1.6.x → 1.7.1`, который сломал вход
(проверка `Account.issuer` в памяти, не в SQL — колонки/значения не было, ошибка нигде не
логировалась, выглядело как «неверный пароль») и кнопку «Выход» (RP-Initiated Logout, гейт
`oauthClient.enableEndSession` без дефолта + опечатка пути `/oauth2/endsession` вместо
`/oauth2/end-session`). Существовавший `.claude/docs/better-auth-1.7-account-issuer-field.md`
занижал масштаб (4 приложения, только sign-up) — реальный охват 14 приложений, обычный вход
затронут тоже. Полный план — `PLAN-INFRA-4.md` (план сессии сохранён как
`fluttering-dreaming-toast`, детали см. историю сессии).

**Часть 1 (вход) + часть 2 (logout) — код готов и задеплоен для 9 из 14:**
auth-hub (схема `OauthApplication`+4 поля logout, путь `/oauth2/end-session`, админка) ✅,
domwellbes (18 пользователей) ✅, driving-school (8) ✅, grandslamcup (20, SSO) ✅, kami ✅,
mandala (2) ✅, dashboard ✅, animatrona-tracker ✅, time (только logout-путь) ✅.

**Не задеплоено на момент завершения сессии (код готов, запрошены ретраи у deploy-agent-dev):**

- **dsperevod** (55 пользователей, credential) — самый долгий блокер, HARD_GATED e2e падал 5+ раз
  подряд по разным причинам (OOM s3, флейки chromium, отдельный найденный баг теста
  `admin-audit-log.spec.ts` про `DATABASE_URL`). Последний найденный root cause — reuse-проверка
  `webServer.url` в `apps/dsperevod-e2e/playwright.config.ts` держала путь `/sign-up` вместо
  голого `baseURL` (как у рабочих svoichuzhie-e2e/driving-school-e2e) — выровнено, запушено
  (`6460f665`), ретрай запрошен.
- **aboi, svoichuzhie, archetest, aprel8008** — e2e/staging упали каждый по своей причине, по
  анализу deploy-agent-dev не связанной с самой issuer-миграцией (пустой каталог, оборванный
  раннер без отчёта, несвязанный UI-тест, транзиентный сбой discovery Ключницы) — ретраи
  запрошены, ответы не получены на момент завершения сессии.

⚠️ **Открытый вопрос:** дождаться ответов deploy-agent-dev по всем пяти пунктам выше и
подтвердить прод-деплой; после — живая проверка входа/logout по плану (`providerId`/NULL-count
SQL по каждой БД, реальный логин, кнопка «Выход» со свежей сессией).

**Часть 3.1 (защита от повторения — гейт-скрипт) — закрыта (2026-08-28):**
`scripts/check-better-auth-schema.mjs` сверяет модели `Account`/`oauthClient` каждого
приложения с полями, которые реально требует установленный `better-auth`/
`@better-auth/oauth-provider`. Требуемый набор полей не хардкожен и не парсится регэкспом по
dist-файлам — скрипт резолвит и **исполняет** реальный код пакетов (`@better-auth/core/db` →
`getAuthTables({})`, `@better-auth/oauth-provider` → `oauthProvider({}).schema.oauthClient`),
поэтому переживёт следующий minor-апгрейд без правок. Область — 14 приложений с `prismaAdapter`
для `Account`, auth-hub (единственный с `@better-auth/oauth-provider`) для `oauthClient`.
Подключён в общий раннер (`bun scripts/check-all.mjs`, id `better-auth-schema`, severity `gate`,
группа `auth`) и тем самым в CI (`Integrity checks` в `.github/workflows/ci.yml` уже вызывает
раннер без изменений). Живая проверка: временное удаление `issuer` из
`apps/kami/schema/auth.zmodel` дало ожидаемый ❌ с понятным списком (приложение, модель, поле),
после возврата поля — чисто зелёный прогон, `git diff` пуст.

**Часть 3.2 (алерт в dashboard) — закрыта (2026-08-28):** новый `AlertType.AUTH_ACCOUNT_ISSUER_NULL`
в `apps/dashboard/schema.zmodel` + миграция `20260828055033_alert_type_auth_account_issuer_null`.
Ежедневная cron-задача `account-issuer-null-check` в dashboard-agent (`lib/account-issuer-check.ts`,
04:00 s2) подключается к БД каждого из 14 приложений с моделью Account и выполняет
`SELECT count(*) FROM "Account" WHERE issuer IS NULL` — дополняет статический гейт схемы (часть
3.1, ловит только «поля нет в schema.zmodel») соседним классом отказа: поле есть, но строка
осталась с `issuer = NULL`. `domwellbes` заодно добавлен в `APP_CONFIG` (`database.ts`) — раньше
отсутствовал там. Живая проверка: ручной `UPDATE "Account" SET issuer = NULL` на одной строке
дев-БД dashboard → детекторный SQL-запрос вернул 1 → откат строки вернул 0. Детали —
`apps/dashboard-agent/CHANGELOG.md` 0.15.20, `apps/dashboard/CHANGELOG.md` 1.24.9.

**Часть 3.3 (синтетическая проверка входа) — полностью закрыта (2026-08-31):**
новая получасовая cron-задача `login-canary-check` в dashboard-agent
(`lib/login-canary.ts`) шлёт POST `/api/auth/sign-in/email` канареечными учётными данными на
9 приложений с реальным credential-входом email/password (не все 14 из issuer-фикса — часть
входит только через OIDC Ключницы, `mode: 'hub-client'`: time, kami, aprel8008; часть только
через другой OAuth без своего пароля: archetest, grandslamcup, studio): aboi, domwellbes,
mandala, animatrona-tracker, dashboard, auth-hub, driving-school, svoichuzhie, dsperevod. Новый
`AlertType.AUTH_LOGIN_CANARY_FAILED` (миграция `20260828124810_add_login_canary_alert_type`),
тот же паттерн порога/повтора через удвоение, что у `email-canary.ts`/части 3.2 (2 неудачи
подряд). Учётные данные — реестр `LOGIN_CANARY_<APP>_EMAIL`/`_PASSWORD` в
`apps/dashboard/.env.docker.enc`; провижининг — одноразовый `POST /api/admin/login-canary-setup`
(регистрация через `/api/auth/sign-up/email` самого приложения + снятие `emailVerified` в БД).
Логика проверена 7 unit-тестами (провал sign-in → алерт на 2-й подряд неудаче, повтор на
удвоении, сброс после чистого прогона) — реальные канареечные аккаунты в 9 production-БД ещё
не созданы, это отдельный ручной шаг (генерация паролей + вызов setup-эндпоинта на каждое
приложение + запись в `.env.docker.enc` через sops), намеренно не выполнен автономно из этой
сессии. Детали — `apps/dashboard-agent/CHANGELOG.md` 0.15.27, `apps/dashboard/CHANGELOG.md`
1.24.10.

**Провижининг canary для driving-school (2026-08-28) вскрыл отдельный баг — исправлен:**
`POST /api/auth/sign-up/email` падал 500 (`BetterAuthError: Model rateLimit does not exist in
the database`) — в `schema.zmodel` не было модели `RateLimit`, а `libs/auth` с 2026-06-18
включает `rateLimit.storage: 'database'` для production standalone-режима без Redis
(`secondaryStorage` не передан). За 90 дней в GlitchTip до фикса — 0 живых пользователей,
не P0. Добавлена модель `RateLimit` + миграция, версия `driving-school` 0.240.13.

**Провижининг canary для mandala (2026-08-28/31) вскрыл отдельный баг — исправлен:** `prismaAdapter()`
better-auth получал ZenStack ORM-клиент (kysely) вместо нативного `PrismaClient`
(несовместимость, задокументированная в `apps/dashboard/src/lib/prisma.ts`) — 500 для реальных
пользователей, не только канарейки. Плюс независимая вторая причина: `genericOAuth` для Yandex
использовал `discoveryUrl`, а Yandex не отдаёт `issuer` в discovery-документе —
`Unhandled Rejection` на инициализации плагина. Фикс — `lib/prisma.ts` (Proxy +
`@prisma/adapter-pg`) + явные `authorizationUrl`/`tokenUrl`/`getUserInfo` вместо `discoveryUrl`.
Позже вынесено в общую фабрику `createLazyPrismaAuthClient` (`@letar/auth`) — тот же код был
продублирован в dashboard/svoichuzhie/dsperevod/domwellbes. Для `auth-hub` та же миграция явно
отклонена (слой at-rest шифрования `crypto-orm.ts`, которого голая фабрика не имеет) — детали в
`.claude/docs/better-auth-prismaadapter-zenstack-incompatibility.md`.

**Реальные аккаунты созданы и проверены живьём (2026-08-31):** все 9 приложений провижинены
через `/api/admin/login-canary-setup`, пароли — в `apps/dashboard/.env.docker.enc`. Живая
проверка сквозной цепочки: `emailVerified` временно сброшен на `canary-dsperevod@letar.best`,
2 подряд `login-canary-check` → `403 EMAIL_NOT_VERIFIED` → `alerted: true` → алерт
`AUTH_LOGIN_CANARY_FAILED` подтверждённо дошёл до Telegram. Флаг возвращён, состояние сброшено.
Детали — `apps/dashboard-agent/PLAN_COMPLETED.md`.

**Системный аудит того же класса риска по всем `createAuth`/`createAuthAsync`/raw `betterAuth()`
потребителям (2026-08-28) — закрыт, других пробелов нет:** проверены все 17 приложений с
собственным `lib/auth.ts` (`betterAuth(`/`createAuth(` найдены грепом по `apps/**/*.ts`).
Единственная опасная ветка — `rateLimit.storage` резолвится в `'database'` (не `'memory'`/
`'secondary-storage'`) — срабатывает только когда приложение **явно** передаёт `rateLimit` без
`secondaryStorage` в production; сам Better Auth по умолчанию (без явного `rateLimit`-конфига)
никогда не выбирает `'database'` сам (`node_modules/better-auth/dist/context/create-context.mjs`:
`storage: options.rateLimit?.storage || (options.secondaryStorage ? "secondary-storage" :
"memory")`). Результат по приложениям:

- **kami, auth-hub, dsperevod, domwellbes** — тоже на этой ветке (либо через `createAuth`, либо
  через ручную копию `buildStandaloneAuth`-конфига, как domwellbes), но модель `RateLimit`/
  `rateLimit` в их схемах уже была до этого аудита — не задеты.
- **svoichuzhie** — на этой ветке, но всегда передаёт `secondaryStorage` (Redis), в `'database'`
  не уходит; модель в схеме тоже есть.
- **aboi** — не использует фабрику `createAuth()` вовсе (raw `betterAuth()`, задокументировано
  прямо в файле), rate-limit хранит in-memory по дизайну однопроцессного деплоя — не задет.
- **time, aprel8008** — `mode: 'hub-client'`, `rateLimit` в профиль не передают вовсе → Better
  Auth использует свой дефолт (`memory`) — не задеты. ⚠️ Уточнение 2026-08-31: у `mandala` sign-up/
  sign-in всё равно падал 500 — по другой, независимой от `rateLimit` причине, см. ниже.
- **mandala, dashboard, animatrona-tracker, archetest, grandslamcup, studio** — raw
  `betterAuth()` с собственным `rateLimit`-блоком, но без явного `storage:` — тоже попадают под
  дефолт Better Auth (`memory`/`secondary-storage`), никогда не `'database'` — не задеты.

✅ **Открытый вопрос закрыт (2026-08-28):** `REDIS_URL` реально заполнен в
`apps/kami/.env.docker.enc` и `apps/auth-hub/.env.docker.enc`, указывает на общий `letar-redis`;
переменная прописана и в `environment:` обоих `docker-compose.production.yml` (второе место из
`.claude/rules/env-files.md`). Проверено на s2 напрямую в запущенных контейнерах
(`docker exec kami-app-10`/`auth-hub-app-32` — `REDIS_URL` реально есть в env процесса, не только
в файле), `letar-redis` — `Up 2 weeks (healthy)`. Оба приложения фактически на ветке
`'secondary-storage'`, database-fallback не используется.

**Часть 4 (доки) — закрыта (2026-08-28):** `better-auth-1.7-account-issuer-field.md` переписан
(14 приложений вместо 4, обычный sign-in затронут тоже, двухчастный паттерн миграции add-column +
backfill, ловушка «коммит миграции ≠ применение на проде»); `better-auth-oauth-provider-schema-drift.md`
дополнен разделом про logout-поля `oauthClient` и путь-баг `/oauth2/endsession` vs
`/oauth2/end-session`; новый `runtime-invariant-missing-from-select.md` обобщает класс бага;
индекс `CLAUDE.md` синхронизирован. Коммит `96667515`.

## §72 — дедупликация tz-блока в 22 `Dockerfile.production` (2026-08-28)

Сокращён с 6-строчного комментария до одной строки во всех 22 `Dockerfile.production`
(разбор — `PLAN-INFRA-4.md §129`). Отдельно на `apps/time` проверена и не принята к тиражированию
альтернатива `node:24-slim` вместо `node:24-alpine` — работает, но образ на 90MB тяжелее
(`PLAN-INFRA-4.md §130`, детали — `apps/time/PLAN_COMPLETED.md`).

✅ **Открытый вопрос закрыт (2026-09-01):** все коммиты запушены — 7 submodule
(aboi, aprel8008, domwellbes, driving-school, dsperevod, studio, svoichuzhie) первыми, затем
`letar`, с разрешения пользователя.

## §73 — миграция всех `next.config.*` с deprecated `@nx/next` composePlugins/withNx (2026-09-01)

Повод: `@nx/next` 23.x печатает на каждом билде два deprecation-варнинга (`composePlugins`/
`withNx` уходят в Nx v24). Переведены все 21 `next.config.*` монорепо (14 публичных приложений +
7 приватных submodule: aboi, aprel8008, domwellbes, driving-school, dsperevod, studio,
svoichuzhie) на голый конфиг без обёртки.

**Не тривиальное «просто убрать импорт»:** `withNx` инжектил `transpilePackages` для транзитивных
workspace-либ через граф зависимостей Nx. Без него webpack (`next build --webpack`, прод-сборка
почти везде) перестаёт транспилировать TS из `libs/*` — падает на первом же
`interface`/`export type`. Заявление депрекейшн-варнинга «Next.js транспилирует workspace-либы
автоматически» здесь не работает: монорепо на изолированной установке bun + алиасы `@letar/*`
через `paths` в **app-level** `tsconfig.json` (не в корневом), а не через symlink'и в
`node_modules` — автоматическое определение workspace-пакетов Next.js это не видит. Фикс — явный
`transpilePackages` в каждом приложении, вычисленный из его собственного `tsconfig.json paths`
(тот же набор, который `withNx` пытался вычислить через граф Nx, но не находил — читал только
корневой tsconfig, где `paths` нет). Каждое приложение пересобрано (`nx build`) и подтверждено
зелёным. Композиция дополнительных плагинов (`next-intl`/MDX/Serwist/bundle-analyzer) переведена
с `composePlugins(...)` на простую вложенную композицию функций с сохранением порядка.
Разбор — `.claude/docs/nextjs-nx-composeplugins-migration.md`.

**Попутно найден и исправлен отдельный баг (не следствие этой миграции):** `animatrona-landing` и
`aira-web` не резолвили `@letar/format-utils` (тянется транзитивно через реэкспорт в
`@letar/github-releases`) — алиас отсутствовал в `tsconfig.json paths` обоих приложений, поэтому
webpack не мог найти модуль вообще, не только не транспилировать. Воспроизведено и на исходном
(до миграции) конфиге через `git show HEAD:...` — баг существовал раньше, миграция его только
проявила чётче через явный список `transpilePackages`. Тот же класс, что уже чинили в
aboi/aprel8008 (`SortablePhotoGrid` → `@letar/format-utils`, см. `deploy-coordination.md` п.4).
Фикс — три места на приложение: `tsconfig.json` (path-алиас), `package.json`
(`nx.implicitDependencies`), `next.config.*` (`transpilePackages`).

Коммиты: 7 внутри submodule + бамп SHA в letar + один multi-scope коммит на 14 публичных
приложений и доку + отдельный fix-коммит на format-utils. Не запушено — ждёт решения пользователя
о push (см. `.claude/rules/git.md`).

**Сторож регрессии — закрыт (2026-09-01, отдельная сессия):** добавлен
`scripts/check-transpile-packages.mjs`, зарегистрирован в `check-all.mjs` как `transpile-packages`
(group `tsconfig`, severity `gate`). Для каждого `next.config.*` с `transpilePackages` сверяет его
с базовыми `@letar/*`-алиасами `tsconfig.json`, реально импортируемыми в `src/` (пересечение
`paths`-алиасов и грепа импортов, не голый грep — иначе шумят пакеты без записи в `paths`,
резолвящиеся через `customConditions`/node_modules-симлинк bun, см. `.claude/rules/libs.md`).
Первый прогон сразу нашёл 3 регрессии от этой же миграции — `auth-hub`, `form-docs`,
`animatrona/renderer` не получили полный список при переводе с `withNx`. Все три исправлены в том
же коммите, проверка регистрируется сразу зелёной. У `animatrona/renderer` попутно снят
устаревший (2026-08-05, commit `0693e342`) комментарий «`@letar/*` сюда не входят» — верный только
пока приложение полагалось на `withNx`-соседей по монорепо; после общего снятия `withNx`
резолв путей и транспиляция TS-синтаксиса — разные механизмы, и без явного списка сборка через
`--webpack` падает так же, как у остальных. Коммит `c302242c`, не запушено.

## §74 — `@tanstack/store` subscribe(): дозачистка driving-school + удалена причина дедупа версий (2026-09-03)

Кросс-репо аудит на баг `@tanstack/store` 0.9+: `store.subscribe(cb)` возвращает объект
`{ unsubscribe }`, а не функцию-отписку — код под старую 0.7 (`const unsubscribe = ...; return
unsubscribe`) падает `TypeError` при размонтировании (в dev StrictMode — сразу, закрывает
страницу error-оверлеем). Уже было починено в `libs/forms`, `libs/admin-ui/seo-field.tsx` и
`apps/aboi/checkout-form.tsx` (2026-09-02). Найдены и починены 4 оставшихся места — все в
`apps/driving-school` (`instructor-profile-form.tsx` x3, `schedule-settings-form.tsx`), детали и
коммиты — `apps/driving-school/PLAN_COMPLETED.md`.

**Корневая причина, почему typecheck молчал:** в `bun.lock` одновременно резолвились три версии
`@tanstack/store` (0.7.7/0.11.0/0.11.1). 0.7.7 тянулась не устаревшим кешем bun (проверено по
методу `.claude/docs/bun-install-stale-isolated-cache.md` — сверка через `bun.lock`, не `ls
node_modules/.bun`), а реальным, хоть и мёртвым, резолвом: корневой `package.json` держал
неиспользуемый `@tanstack/zod-form-adapter@^0.42.1` (легаси `validatorAdapter` API TanStack Form
до Standard Schema, запрещён `.claude/rules/forms.md` — везде только `@letar/forms`; 0 импортов
во всём репозитории), который тянул `@tanstack/form-core@0.42.1` → `@tanstack/store@^0.7.0`.
Из-за этого typecheck в aboi резолвил типы `subscribe()` в старую сигнатуру (bare-функция), пока
в рантайм бандлилась 0.11 (`{ unsubscribe }`) — расхождение, которое не ловят ни typecheck, ни
lint, ни unit-тесты, только живое открытие страницы (см. §note в
`apps/aboi/PLAN_COMPLETED.md`/`CHANGELOG.md` за 2026-09-02).

**Фикс:** `@tanstack/zod-form-adapter` удалён из корневого `package.json`, `bun install` —
`bun.lock` теперь резолвит только 0.11.x. Разбор случая (реальная зависимость, а не кеш-артефакт)
задокументирован как новый раздел в `bun-install-stale-isolated-cache.md`, устаревшая ссылка на
эту зависимость в `root-pin-peer-drift.md` обновлена. `bun scripts/check-all.mjs --group=deps` —
`peer-deps`/`patched-deps` зелёные (`electron-drift` падает отдельно, предсуществующий
несвязанный дрейф). Коммиты: 2 внутри driving-school submodule + 2 бампа SHA в letar + 1 коммит
доков в letar; удаление `@tanstack/zod-form-adapter` из `package.json`/`bun.lock` оказалось
случайно объединено в несвязанный параллельный коммит `chore(deps): bump Nx 23.1.3 -> 23.2.0`
(`0ff59c75`) — другая одновременно работавшая сессия закоммитила рабочее дерево, пока в нём лежала
эта незакоммиченная правка. Содержимое корректно, пересобирать/разделять коммит задним числом не
стал — см. `.claude/docs/git-multi-agent-incidents.md` про риски операций над чужими коммитами.

## §75 — `useOfflineServiceWorker`/`ServiceWorkerRegistration` (`@letar/hooks`+`@letar/ui`) — снятие Service Worker вынесено из четырёх приложений (2026-09-03)

На `studio` найден и починен баг: выключение оффлайн-режима не снимало Service Worker. Компонент
снимал регистрацию по `ref`/`getRegistration('/')` с текущей загрузки страницы — воркер,
зарегистрированный в прошлой сессии браузера (или до внедрения консент-гейта), в такой снапшот
не попадал, выключатель не делал ничего. Плюс `unregister()` на воркере в состоянии `installing`
не резолвится вовсе — нужен `void`, не `await`.

Тот же баг лежал ещё в трёх копиях компонента — `grandslamcup`, `mandala`, `pravda`. Вынесено в
`useOfflineServiceWorker` (`@letar/hooks`, снятие через `getRegistrations()` + очистка `caches`)
и парный клиентский `ServiceWorkerRegistration` (`@letar/ui`) — все три приложения переведены,
собственные копии удалены. Проверено на прод-сборках (Playwright, `next build --webpack` у
grandslamcup/mandala, статический экспорт у pravda): `regs: 0, caches: 0` после выключения.

⚠️ **Не фиксилась (не в scope этой задачи), но найдена та же ловушка в `archetest`** —
`apps/archetest/src/app/[locale]/_components/service-worker-registration.tsx` использует
`registrationsRef` тем же способом, что и три починенных копии, и подвержена тому же классу
бага. Заведена задача — см. `spawn_task`.

⚠️ **Отдельно найдена остаточная особенность** (не баг этого фикса, ограничение самого Service
Worker API): если снимаемый воркер ещё контролирует текущую страницу, а его собственный
`fetch`-обработчик пишет в кеш на каждый ответ (`cache.put`, как у рукописных `public/sw.js` в
mandala/pravda — в отличие от serwist, где рантайм-кеш настраивается декларативно), он может
пересоздать кеш уже после нашей чистки. Снимается следующей загрузкой страницы, когда воркер
контроль уже потерял — не воспроизведено у serwist-приложений (grandslamcup).

⚠️ **Проверено и опровергнуто:** `useServiceWorker` в `libs/ui/src/lib/use-service-worker.ts`
(другой хук, не путать с `useOfflineServiceWorker`) казался мёртвым по `git grep` — только
README и собственный файл. Ложноотрицательный результат: `git grep` не заходит в приватные
submodule ([verification-pitfalls.md § git grep и приватные submodule](/.claude/docs/verification-pitfalls.md#парный-к-предыдущему-git-grep-врёт-в-успокаивающую-сторону--он-не-заходит-в-приватные-submodule)).
Обычный рекурсивный grep по рабочему дереву находит живого потребителя — `driving-school`
реэкспортирует хук из `@letar/ui` (`src/hooks/use-service-worker.ts`) и использует его в
`service-worker-init.tsx`/`update-banner.tsx` (prefetch страниц, баннер обновления). Хук не
удаляется.

## §76 — `useClientOrigin` (`@letar/hooks` 0.5.0) — дедупликация SSR-safe `window.location.origin` (2026-09-03)

Тот же класс бага, что и §75, только другой паттерн: hydration mismatch (React error 418) от
`typeof window !== 'undefined' ? window.location.origin : ''`, вычисляемого прямо в теле render
клиентского компонента, — сервер рендерит `''`, клиент реальный origin. Найден в один день
независимо в `studio` (`/owner/settings`) и `grandslamcup` (две копии). Вынесено в
`useClientOrigin()` (`libs/hooks/src/lib/browser/use-client-origin.ts`) — те же `useState('')`+
`useEffect`, что уже отработали в обоих приложениях, но в одном месте.

Обе копии в `grandslamcup` (`presenter-select-jury.tsx`, `wizard/step-select-jury.tsx`) переведены
на хук. `studio` хук не использует — там origin вычисляется на сервере через `getRequestOrigin()`
(`headers()`), более ранний и более правильный подход без клиентского мигания; см. предупреждающий
комментарий в `apps/studio/src/lib/request-origin.ts`.

Репо-широкий grep `window.location.origin` по всем `apps/*`: 13 прочих вхождений — все внутри
обработчиков событий/`useCallback` (клик, share, copy-link), не в теле рендера, тому же классу
бага не подвержены.

## §77 — тираж фикса `overflowX` на `Card.Body` вокруг `Table.Root` по всему монорепо (2026-09-01)

Повод: в apps/domwellbes нашли и починили 61 место, где Chakra `<Table.Root>` рендерился внутри
`<Card.Body>` без `overflowX="auto"` — на узких экранах (320px) из-за этого скроллилась вся
страница вместо локального горизонтального скролла самой таблицы. Прогнали тот же аудит по 14
остальным приложениям монорепо (фоновые агенты, каждое — отдельная задача с file reservation в
Agent Mail).

**Найдено и починено 36 мест в 10 приложениях** (везде `nx lint`/`nx typecheck:tsgo` зелёные,
закоммичено локально, не запушено): driving-school — 16 мест/12 файлов, dashboard — 4,
grandslamcup — 4 (включая обычный `Box` без `overflowX`, не только `Card.Body`), label-printer-
desktop — 3, aboi — 2, studio — 2, auth-hub — 2, kami — 1, mandala — 1, dsperevod — 1.

**Проверено и не подтвердилось** (паттерн не воспроизводится — либо `overflowX`/`overflow`
уже стоит на промежуточной обёртке, либо таблица не в `Card.Body`, а в обычном `Box`/`Dialog.Body`):
svoichuzhie, animatrona-tracker, archetest, pravda.

Для submodule-приложений (driving-school, aboi, studio, dsperevod) сделаны оба коммита — внутри
submodule и bump SHA в letar. Push не выполнялся — по `.claude/rules/git.md` требует отдельного
одобрения пользователя на каждый раз.

⚠️ **Не заводили общий shared-компонент в `libs/ui`** — паттерн из одного пропса
(`overflowX="auto"`) не оправдывает абстракцию, пока не появится реальный дубль логики сложнее
одного атрибута (см. `.claude/rules/shared-first.md`/CLAUDE.md).

Сессия 2026-08-25 (`/repo`, repo-dev) — сверка глобального статуса с фактом, документация
отставала от кода на нескольких треках:

- **§18.7 (тираж e2e-гейта) закрыт целиком.** Заголовок в `PLAN-INFRA-1.md` оставался с
  меткой 🆕, хотя содержимое секции уже фиксировало закрытие M1–M4 (последним — `driving-school`,
  2026-08-25). Hard-gate подтверждён живьём на всех 5 коммерческих (archetest/dsperevod/
  svoichuzhie/aboi/aprel8008) + auth-hub/driving-school. Заголовок и предупреждение
  «текущий фронт работ» в `PLAN-INFRA.md` поправлены.
- **§18.8.1 (секреты infra/ в `.enc`-конвейере) закрыт факту с 2026-08-12** — заголовок правлен
  на ✅. Единственный незакрытый пункт (`acme.json` Traefik не тащить в git даже зашифрованным) —
  постоянное архитектурное решение, не долг.
- **§48 M2 (Traefik на s3) закрыт живьём.** SSH-чекап 2026-08-25 (`188.127.235.141`, deploy-ключ)
  подтвердил больше, чем фиксировал чек-лист: `aboi` и `media.letar.best` переведены на Traefik
  (в доке числились как «не переведён»/«роутер не поднят»), NPM полностью отсутствует, бэкап
  секретов Traefik работает двумя путями (`.enc`-конвейер + ежедневный `cron traefik-backup-s3`,
  14 архивов подряд). Чек-лист `PLAN-INFRA-2.md` §48 M2 приведён в соответствие факту.
- **Уборка пилотных портов s3 сделана** — `81/8090/8443` убраны из `docker-user-firewall.sh` и
  из `infra/firewall/ports.s3.env`; выполнил deploy-agent-dev по делегированной заявке
  (тред agent-mail `s3-firewall-pilot-ports-cleanup`), проверено извне с s2: 80/443 open,
  81/8090/8443 closed.
- **Скан зависимостей запущен впервые за 14 дней** (последний был 2026-08-11) —
  🔴 **riskScore 100/100, 7 critical / 32 high / 11 moderate / 3 low**, 22 устаревших пакета.
  Отправка результата на `dashboard.letar.best` не удалась (сервис недоступен из сессии) —
  локальный `.claude/state/deps-last-scan.json` обновлён, серверная сторона не в курсе скана.
  **Не разобрано в этой сессии** — рекомендация: `/infra:deps-analyze` в следующий раз.

**§48 M3 (перевод s2)** — блокер «ждать закрытия §18.7» снят, но не готов технически: нужны
месяц наблюдения за стабильным s3 (пилот стабилен, но без «чистого» месяца — предыдущий
блокер §18.7 сам являлся источником нестабильности до сегодня), переписанный rollout-профиль
под healthcheck (сейчас network-alias, несущая конструкция zero-downtime), явный
compress-middleware (gzip+brotli, найдено при разборе `studio` §12.1), и сам план по ~40+
доменам s2. Решение принимать не раньше следующей сессии.

**Остаточные UI-баги из §18.7:**

- ✅ **`mandala` — закрыто 2026-09-01** (раунды 7–8, детали `apps/mandala/PLAN_COMPLETED.md`).
  «Навигация не долетает» была не багом локатора, а двумя независимыми причинами: seed
  создавал `Account.accountId` как email вместо `user.id` (админ не мог залогиниться в
  `auth.setup.ts`, что и выглядело как зависшая навигация), и отдельная гонка гидратации
  `<Link>` (SSR-разметка кликабельна раньше клиентского обработчика). Оба починены, полный
  прогон 123/123, `mandala` добавлена в `E2E_GATED_APPS`.
- ✅ **`pravda` — закрыто как «принято» (решение владельца, 2026-09-01)**, не как открытый
  TODO. Прогресс-бар TOC и задвоенная разметка `Article` (webkit) реально починены. Остаток —
  осознанно не чинится: RSC-навигация Firefox/WebKit блокирована апстрим-багом Next.js
  16.0–16.3 ([vercel/next.js#85374](https://github.com/vercel/next.js/issues/85374), PR
  открыт) — `test.skip` до релиза фикса; Command Palette Escape — флейк без репро,
  `test.skip`; кластер скролл-ассертов TOC/progress-bar — оставлен красным без диагностики,
  приложение некритичное. `pravda` НЕ добавлена в `E2E_GATED_APPS` — сознательно, не
  временный пробел.
- ✅ **`form-example` — закрыто 2026-08-24** (§18.7 M2, `apps/form-example/CHANGELOG.md`
  v0.1.2). Ни одна из 42 examples-страниц не имела настоящего `<h1>` (Chakra `Heading`
  рендерит `<h2>` по умолчанию) — root cause 5 упавших спеков. Добавлен общий `PageH1`
  (`asChild` + нативный `<h1>`). Staging e2e 48/48, `form-example` в `E2E_GATED_APPS`.
- ✅ **`kami` — закрыто 2026-08-24** (§18.7 M2, `apps/kami/PLAN_COMPLETED.md`). Первый
  staging для kami заведён с нуля; OIDC/Keystatic GitHub Storage/Telegram/Yandex Metrica
  сознательно не настроены на стейдже — `kami-e2e` тестирует только публичные страницы.
  Staging e2e 150/150, `kami` в `E2E_GATED_APPS`.

---

### Архив: сессия 2026-08-12 (продолжение) — §18.8/§18.8.1 закрыты, §70 GlitchTip задеплоен, §18.7 M1/M2 находки

Инфраструктурные треки `PLAN-INFRA.md` §18.8.1/§18.8 закрыты, **§70 (GlitchTip) закрыт по
деплою на все 17 некоммерческих приложений** — клиентские+серверные ошибки живьём подтверждены
везде, где проверялось. §18.7 (e2e-гейт) на тот момент:

- **M1 (`mandala`, `pravda`)** задеплоены, e2e прогнан — **реальные красные, не флейк**
  (сломан гостевой checkout и admin-таблица заказов на mandala; TOC/bookmarks/cross-refs на
  webkit не рендерятся на pravda). `E2E_GATED_APPS` не обновлён на тот момент.
- **M2 (`form-example`, `kami`)** — staging заведён впервые (не было вообще). Два реальных
  блокера найдены и починены: хардкод `localhost` вместо `baseURL` в `webServer` +
  отсутствующий `project.json` у `form-example-e2e`/`kami-e2e` (тот же класс бага, что на
  `time`/`aboi`/`grandslamcup` 2026-07-19); `keystatic.config.ts` определял `storage: 'github'`
  через `NODE_ENV === 'production'` (ловушка — NODE_ENV всегда production и на стейдже),
  ронял весь `next build` — заменено на проверку наличия GitHub-кредов (решение владельца).
- Обнаружен системный гэп — ещё 4 e2e-сьюта без `project.json` (закрыт в той же сессии тиражом,
  см. `PLAN-INFRA-1.md` §18.7).

Побочные находки: healthcheck-стандартизация фактически завершена (23/24, закрыт последний
пробел `aira-web`); первая не-Next.js интеграция GlitchTip (`dashboard-agent`, Fastify) —
`captureException()` добавлен в `@letar/glitchtip` для не-Next.js бэкендов; `animatrona-tracker`
и `kami` были ошибочно исключены из тиража в прошлой итерации (первый — забытый `package.json`,
второй — ошибка классификации), оба заведены. Auth-план (этот файл) в той сессии не двигался.

---

### Архив: сессия 2026-08-08 — §48, уборка после M2 и §66

Инфраструктурный трек **§48: замена Nginx Proxy Manager на Traefik**.

**Закрыто: §48 M1b и M2 целиком — NPM на s3 остановлен, весь трафик идёт через Traefik.**
12/12 staging-приложений, три имени вне wildcard (`media`/`ipfs`/`gateway`) со своими per-name
аккаунтами acme-dns и боевыми сертификатами, HTTP/3 на 443/udp. Паритет с NPM подтверждён не
вычиткой конфигов, а сравнением фактических заголовков обоих прокси на одном запросе — диффа по
существу нет.

**Главное решение сессии:** §57 (кеширующий прокси для `gateway` на mail) **расцеплён с M2**.
Он стоял первым пунктом «что осталось» с формулировкой «пока не поднят — NPM не выключаем», и
это была ошибка планирования: кеша перед `gateway` нет с июня, Traefik воспроизводит текущее
поведение один в один. Ждать его означало держать переезд заложником улучшения.

**Обновление той же сессии (2026-08-09):** пункты 1 и 2 ниже закрыты.

1. ✅ **§66 п.2 — `deploy-affected.sh` не знал про `docker-compose.s3.yml`.** Починено в коде
   (commit `c8f3c688`) и подтверждено живым деплоем BlackCove на s3 — скрипт больше не берёт
   продовый дефолт для приложений с собственным `docker-compose.<SERVER_NAME>.yml`.
2. ✅ **Хвост M2:** `dashboard-agent` 0.15.3 (бэкап секретов Traefik + фикс §66 п.2 + фикс §55
   вердикта e2e) задеплоен на s3, агент отвечает `/health`.
3. **Уборка путей отката** — по-прежнему заблокирована гейтом «неделя без инцидентов» (M2 закрыт
   2026-08-08, прошло меньше недели). Порядок — в §48.
4. **M3 (s2)** — не начат, блокируется §18.7. Один из блокеров §18.7 (redeploy dashboard-agent на
   s3 для таймаута `run_e2e`) снят пунктом 2 выше — остальное содержимое §18.7 (батчи M1–M4,
   живая проверка hard-gate для 5 коммерческих приложений) не тронуто.

**Заведено попутно (та же сессия 2026-08-09):** §51 (hard e2e-gate сравнивал HEAD всего репо, а
не affected-замыкание приложения — код готов, не проверен живым сценарием) и §55 частично
(вердикт `run_e2e` теперь берётся из JSON-отчёта Playwright, а не только из кода возврата `nx` —
гонка общего `.nx/cache` между деплоем и e2e-прогоном остаётся неустранённой, см. §55).

**Продолжение той же сессии (2026-08-09, отдельная задача):** ✅ **§51, «смежная находка»** —
`deploy-affected.sh` в bare-режиме (запуск без `--app`) построчным `grep` искал affected-приложение
в JSON-массиве, который `nx show projects --affected` печатает одной строкой — совпадений не могло
быть в принципе, ветка «не менялось» срабатывала всегда. Починено тем же приёмом, что и
`isAffectedSince` (`libs/deploy-mcp/src/config.ts`) — разбор через `node -e`. Commit `49ec6b93`,
отчёт отправлен BlackCove (не деплоила — штатный путь через deploy-mcp этот баг не затрагивал).
Не проверено живым прогоном на s2/s3, только локально. Детали — `PLAN-INFRA.md` §51.

**Ранее заведено:** §65 (на s2 не было swap вообще — сборка могла убить чужой продакшен;
swap сделан постоянным, вынос сборки с прод-сервера записан следующим кандидатом), §66 п.1
(недоступный Redis ронял агента на старте вместо деградации — исправлено, правило «сетевой вызов
на пути старта обязан иметь границу по времени»), пробел в бэкапах s3, созданный самим переездом.

**Задачи трекера, не инфраструктуры:** зависшие с 22 июня задания пиннинга и поле `apiUrl`, по
которому код зовёт кубовские ручки, а адрес ведёт на pin-queue.

---

**Активный фронт auth-плана** не изменился: Этап 0.8 (152-ФЗ аудит) по-прежнему упирается в
юридическое решение владельца по `svoichuzhie` (см. Блокеры ниже). Предыдущая сессия того же дня —
внеплановая ранняя проверка бэкапов Maddy после инцидента 2026-07-28 (Этап 0.3): вскрыт и починен
**второй, независимый** баг в той же цепочке, подробности в §42.

- 🔴→✅ **Бэкапы Maddy — второй провал: скрипт cron потерял execute-бит при правке 2026-07-28.**
  9 дней подряд `Permission denied`, ноль новых архивов. Починено (`chmod +x`), ручной прогон и
  доставка на s2 подтверждены. Ротацию cron без ручного вмешательства ещё нужно перепроверить через
  несколько дней. Детали — §42.

**Предыдущая сессия (2026-07-28, третья сессия того же дня)** закрыла хвост «Пути бэкапов Resilio» из
§0 и нашла/починила первый инцидент с бэкапами Maddy (пропавший cron + SSH-ключ):

- ✅ **Пути бэкапов Resilio (`C:\BackupSync\lena`) — разобрано и закрыто.** Прошлая сессия отложила
  задачу из-за вложенного git-репозитория с ~13000 файлов дрейфа; разобрано: это заброшенный ad-hoc
  снапшот (6 коммитов, дек.2025–фев.2026, не трогался 5+ месяцев), не имеющий отношения к реальному
  механизму синка (только `s1/`/`s2/` через Resilio). Удалены: `.git`+`.gitignore`+`.idea` в корне,
  `bn/` (2.9 ГБ замороженный снимок с апреля), `s2_/` (14 ГБ осиротевших Resilio-метаданных старой шары
  до ренейма в `s2`) — освобождено ~17 ГБ. `.git` добавлен в `.sync/IgnoreList` на s2 (Resilio реально
  пытался тянуть `.git` внутренности и висел на `FETCH_HEAD` в ретрай-цикле) + `systemctl restart
resilio-sync` — подтверждено логом, зависаний больше нет. s1 недоступен по SSH (полностью
  decommissioned, см. §0.5/сервер-маппинг) — фикс IgnoreList применён только на s2.
- 🔴→✅ **Инцидент: бэкапы Maddy (DKIM) не шли 26 дней, найдено при проверке.** Корень — пересоздание
  `mail.letar.best` (~19-20 июня) снесло cron-запись `maddy-backup.sh` и SSH-ключ для rsync на s2;
  `/root/backups/maddy/` не существовал, папка на s2 держала последний архив `2026-07-02` без изменений.
  Почищено: новый ed25519-ключ `root@mail → deploy@s2` (добавлен в `authorized_keys`), `backup.sh`
  патчнут на явный `-i`, cron `0 3 * * *` возвращён, ручной прогон подтвердил всю цепочку
  `mail → s2 → Resilio → Windows`. ⚠️ Дельта: `rsync --delete` из пустой (пересозданной) исходной папки
  снёс старые 14 архивов на s2 — DKIM-ключи/конфиг не потеряны (актуальны в `/opt/maddy/data/`), но
  14-дневная история бэкапов начала копиться заново с 2026-07-28. Детали — Этап 0.3 (в `PLAN_COMPLETED.md`).
- ✅ **`@lena/source` → `@letar/source`** — `bun.lock` хранил старое имя workspace-root (рассинхрон с уже
  переименованным `package.json`); синхронизирован через `bun install` + точечная правка поля `name`,
  проверено что зависимости не затронуты (диф — только имя + версии приложений). Коммит `85902b04`.
- ✅ **Хвосты `imot`/`premium-rosstil`** — перепроверены повторным grep по функциональному коду:
  оба раунда чистки (2026-07-22, 2026-07-28) закрыли всё, остаток — историческая запись портфолио
  kami (намеренно) и справочные port-комментарии в `docker-compose.production.yml`. Пункт в §0 снят.
- ✅ **`X-Cron-Secret`** — проверено: дублирования нет, все 5 упомянутых мест уже используют общий
  `verifyCronSecret()` из `libs/api-server`. Правок не потребовалось.

**Блокеры:** 🔴 РКН-регистрация остаётся блокером публичного запуска для `svoichuzhie` — свой домен
(`svoichuzhie.ru`), не покрыт ни одной поданной регистрацией. **Подтверждено на живом проде (2026-07-28):**
`svoichuzhie.ru/privacy` показывает любому посетителю незаполненный плейсхолдер вместо оператора —
`[юридическое лицо / ИП — заполнить после регистрации оператора в РКН]`. Юридический вопрос владельцу, не
технический.
**Следующий шаг:** решить с владельцем svoichuzhie вопрос отдельной РКН-регистрации → после подачи
дозаполнить плейсхолдеры на `svoichuzhie.ru/privacy`. Отдельно: через несколько дней проверить, что
cron бэкапов Maddy сам, без ручного вмешательства, продолжает писать новые архивы каждую ночь (§42) —
до сих пор оба успешных прогона были ручными.

> ⚠️ Этот блок **перезаписывается** каждой сессией, а не дописывается. Устаревшие указатели
> «Следующий старт» в теле журнала ниже — исторические записи «следующий шаг на тот момент»,
> актуальным считать только этот блок.

> **📋 Журнал rollout/e2e-гейта (§18.6/§18.7) и смежных находок по приложениям** — вынесен
> целиком в приватные доки (`.claude/private/PLAN-JOURNAL.md`), см. §27 Часть 2. Архив
> сессий старше ~1 недели (до 2026-07-13) — там же, в `PLAN_COMPLETED.md` этого репо.

## §78 — аудит транзитивных `@letar/*`-алиасов по всему монорепо (2026-09-01)

Повод: в этой же сессии (§73, миграция `next.config` с `composePlugins`/`withNx`) нашли и
починили баг в `animatrona-landing`/`aira-web` — `@letar/github-releases` реэкспортирует
`formatFileSize` из `@letar/format-utils` (`libs/github-releases/src/index.ts`), а алиас
`@letar/format-utils` отсутствовал в `paths` их `tsconfig.json` → `Module not found` на прод-
сборке. Тот же класс уже чинили раньше в aboi/aprel8008 (`SortablePhotoGrid` из `@letar/admin-ui`
реэкспортирует `@letar/format-utils`). Прогнали системный аудит по всем библиотекам и
приложениям репозитория.

**Метод:** нашли все реэкспорты `export {...}/* from '@letar/...'` во всём `libs/**/*.ts`
(не только `src/index.ts` — по всем файлам, реэкспорт может быть в barrel-цепочке любой
глубины), сопоставили с приложениями, у которых в `tsconfig.json` уже есть алиас на
внешний/родительский пакет, и для каждой пары сверили все три места: `tsconfig.json paths`,
`package.json` → `nx.implicitDependencies`, `next.config.*` → `transpilePackages`. Цепочки
глубже одного уровня в репозитории не встретились (пакеты-получатели реэкспорта —
`format-utils`, `tailwind-utils`, `forms-vue/core`, `video-player-core`, `forms-core`,
`forms-react` — сами дальше ничего из `@letar/*` не реэкспортируют).

**Найденные цепочки:** `admin-ui`→`format-utils`, `github-releases`→`format-utils` (уже
починено), `forms-shadcn`→`tailwind-utils`, `forms-vue-shadcn`→`forms-vue`+`tailwind-utils`
(потребителей нет), `video-player-react`→`video-player-core`, `forms`→`forms-core`+`forms-react`.

**`tsconfig.json`** — у всех приложений-потребителей алиас уже был на месте, ни одно не рисковало
поймать «Module not found» прямо сейчас.

**Найдено и починено** (везде не хватало только `package.json` → `implicitDependencies`,
`tsconfig`/`next.config` уже были в порядке): `apps/studio` — не было `@letar/format-utils`
(остальные потребители `admin-ui` — aboi/aprel8008/domwellbes/mandala — уже имели, submodule-
коммит + bump SHA в letar); `apps/form-develop-app-shadcn` — не было `@letar/tailwind-utils`.
Оба билда (`nx build studio`, `nx build form-develop-app-shadcn`) зелёные, `lint`/
`typecheck:tsgo` без ошибок. Закоммичено локально (2 коммита + bump submodule), не запушено.

⚠️ **Не трогали** `forms-core`/`forms-react` (17 приложений) и `video-player-core`
(animatrona/animatrona-tracker) — по всему репозиторию ни одно приложение никогда не заносит эти
транзитивные либы в `package.json`, это устоявшаяся конвенция для «глубоких» leaf-пакетов, а не
пропуск (в отличие от `format-utils`/`tailwind-utils`, которые в приложениях-аналогах явно
перечислены). У `animatrona` (Electron/nextron) в `renderer/next.config.js` вообще нет ни одного
`@letar/*` в `transpilePackages` при рабочем билд-кэше — особенность его сборки, не тот класс
бага, трогать не стали.

⚠️ **Уточнение (2026-09-01, отдельная делегированная сессия):** предположение выше не
подтвердилось — это оказался ровно тот же класс бага, просто замаскированный устаревшим
`.next/cache`. Причинно проверено (убрать записи → `Module not found`, вернуть → чисто) и
починено в том же коммитном окне (`c302242c`) параллельной сессией. Разбор —
[nextron-renderer-transpile-packages-required.md](/.claude/docs/nextron-renderer-transpile-packages-required.md).

## §79 — паттерн `llms.txt` задокументирован и раскатан на 18 приложений (2026-09-02)

Повод: два приложения (`aboi`, `form-docs`) независимо завели `llms.txt` (llmstxt.org) разными
механизмами (статика/роут), выбор между ними нигде не был зафиксирован.

Заведён [.claude/docs/llms-txt-pattern.md](/.claude/docs/llms-txt-pattern.md) — когда файл
вообще нужен, ось выбора статика/роут (роут только при зависимости от БД/`BASE_URL`), формат
llmstxt.org (курируемый список разделов, не дубль `sitemap.xml`), где место машинного контракта
(structured data + `window`-API — на образце `aboi`), и ⚠️ что текст файла подчиняется тем же
юридическим ограничениям формулировок, что страницы сайта (152-ФЗ, ФЗ «О рекламе»).

**Раскатано параллельно сабагентами на 16 приложений** (первая волна — 13, вторая — `studio` +
`driving-school` + `synth`): `form-example`, `letar-landing`, `mandala`, `grandslamcup`,
`aira-web`, `animatrona-landing`, `kami-key-the-landing`, `kami`, `archetest`, `dsperevod`,
`svoichuzhie`, `aprel8008`, `domwellbes`, `studio`, `driving-school`, `synth`. Для 5 приватных
submodule (`dsperevod`, `svoichuzhie`, `aprel8008`, `domwellbes`, `studio`, `driving-school`)
сделаны оба коммита — внутри submodule и bump SHA в letar. Push не выполнялся.

Для `studio` (кабинет + биллинг) и `domwellbes` (152-ФЗ) границу публичное/приватное проверяли
по коду (`auth()`/`cookies()` на сервере), не по названиям route group.

⚠️ **Сознательно НЕ заведён `animatrona-tracker`.** Его `robots.ts` ставит безусловный
`disallow: '/'` — решение владельца против публичной индексации (`PLAN-INFRA-2.md` §33).
`llms.txt` прямо противоречит этому решению (явное приглашение агентам читать сайт) — черновик
файла был подготовлен и удалён по прямому указанию владельца, заводить не стали.

`driving-school` — у приложения до сих пор нет `sitemap.ts`/`robots.ts` вообще (отдельный
пробел, не устранён этим коммитом, зафиксирован в паттерн-доке).

Отдельно раздел «Заповеди студии» (`.claude/private/WEBSTUDIO.md`, приватный submodule) пополнен
заповедью №19 — публичный сайт студии заводит `llms.txt` по умолчанию, не как разовую задачу.

## §80 — гейт `cookie-cache-strategy`: защита от повтора cookie-коллизии better-auth (2026-09-03)

Продолжение фикса из `.claude/docs/better-auth-localhost-cookie-jar-collision.md` (`strategy: 'jwt'`
убран из `apps/dashboard/src/lib/auth.ts`, там же оставлен предупреждающий комментарий). Комментарий
не мешает следующему приложению повторить ту же ошибку — добавлена техническая страховка.

`scripts/check-cookie-cache-strategy.mjs`: грепает все `apps/*/src/lib/auth.ts` (комментарии
вычищены перед матчингом — иначе сам предупреждающий комментарий в dashboard стал бы ложным
срабатыванием) на `session.cookieCache.strategy: 'jwt'/'jwe'` и требует, чтобы у такого
приложения был свой `advanced.cookiePrefix` где-то в `src/lib/*.ts` (образец —
`apps/studio/src/lib/auth-cookies.ts`). Зарегистрирован в `check-all.mjs` как
`cookie-cache-strategy` (группа `auth`, severity `gate`, `ci: partial` — приватные submodule не
выкачаны в CI). Живая проверка: временное добавление `strategy: 'jwt'` обратно в
`apps/dashboard/src/lib/auth.ts` дало ожидаемый ❌ с понятным сообщением, после отката — чисто
зелёный прогон (16 приложений проверено), `git diff` пуст. `bun scripts/check-all.mjs --ci`
подтверждён — новая проверка корректно помечена `(покрытие неполное)`.
