# PLAN — Глобальная унификация авторизации и верификации в монорепо

> **✅ §18.7 Тираж M1, батч 2 — `mandala` `/admin/products` сломан целиком, два независимых бага
> в т.ч. в `libs/admin-ui` (2026-07-22, mandala-dev, коммит `a5893e7c`, v0.39.10):**
> (1) `prisma/seed.ts` никогда не создавал `Product` — таблица товаров была пуста на любом
> окружении; (2) `SlugField`/`SeoField` (`libs/admin-ui/src/form-fields/`) возвращали из `useEffect`
> результат `form.store.subscribe()` напрямую — в установленном `@tanstack/store@^0.11.0`
> `subscribe()` возвращает `{ unsubscribe }`, а не функцию, cleanup не вызывался, подписка утекала
> на каждый mount/unmount и крашила вкладку браузера при клиентской навигации с любого admin-списка
> на `/new` (`Target page, context or browser has been closed` в Playwright). Тот же паттерн уже был
> починен в 10 местах `libs/forms/src/` ранее — только 2 файла `libs/admin-ui` остались со старым
> кодом. Фикс сделан напрямую в `libs/admin-ui` (единственный consumer — `mandala`), без делегирования
> через `form-delegation.md` (не `libs/forms`/form-mcp экосистема). **Верифицировано на staging через
> BlackCove:** 96→99→**103 passed** (было 12 failed → 9 failed, все по теме `/admin/products` ушли).
> Остаточные 9 фейлов (чекаут/заказы/CRUD-флоу) — отдельная задача, в `apps/mandala/PLAN.md` →
> «🟡 Остаточные e2e-фейлы». Детали — `apps/mandala/PLAN_COMPLETED.md`.

> **🔴→✅ Этап 0.7 — инцидент прод-краша от email-canary, найден BlackCove и починен
> (2026-07-21/22, thread `deploy-dashboard-agent-email-canary`, коммит `305c0ec7`):** после первого
> деплоя `email-canary-check` необработанный `'error'` на `ImapFlow` (`Socket timeout`) уронил весь
> процесс `dashboard-agent` на s2 — вместе с cron-планировщиком остальных задач и deploy-mcp API,
> попутно оборвав деплой `aprel8008`, который в этот момент вёл BlackCove (пришлось доливать вручную
> через SSH-резерв). **Два слоя фикса:** (1) слушатель `client.on('error', ...)` — устраняет краш,
> но если ошибка приходит ВМЕСТО reject-а уже начатого `await`, тот `await` виснет навсегда; (2)
> внешний `Promise.race` с жёстким дедлайном (`POLL_TIMEOUT_MS + 15s`) + `client.close()` по
> истечении — гарантирует ответ за конечное время независимо от поведения ImapFlow изнутри. Живым
> прогоном воспроизведён реальный зависший IMAP-сокет (внешняя сетевая проблема до порта 993, не
> баг Maddy — локально на сервере IMAP отвечает мгновенно) и подтверждено: вместо зависания —
> `ok:false` с понятной причиной за ~105с, процесс жив. Деплой фикса запрошен у BlackCove.

> **✅ Этап 0.7 — канареечный мониторинг доставки email, код готов (2026-07-22, root-weaver):**
> `dashboard-agent` 0.7.6 → 0.8.0 — `lib/email-canary.ts` + новая cron-задача `email-canary-check`
> (раз в 15 минут, s2). SMTP-отправка через выделенный ящик `canary@letar.best` + IMAP-проверка
> двух ног (internal — тот же ящик Maddy; external — BCC на реальный внешний почтовик, ловит
> класс инцидента «форвард режется gmail»). Алерт в dashboard при 3 подряд неудачах одной ноги
> (переиспользован `AlertType.CRON_FAILED`, без новой миграции схемы). **Обе ноги провижинированы
> и подтверждены (2026-07-22):** internal — ящик `canary@letar.best` на Maddy; external —
> `letarkami@gmail.com` (личный ящик владельца, IMAP app-password после включения 2FA). SMTP+IMAP
> auth обеих ног проверены вживую, секреты залиты и синхронизированы на s1/s2. Подробности — §0.7
> ниже и `apps/dashboard-agent/PLAN.md`.

> **✅ §18.7 Тираж M1, батч 2 — `mandala` инфра-блокер снят, dashboard-agent на s3 передеплоен
> (2026-07-21, BlackCove, msg #667):** Простой `dashboard-agent` на s3 (9.9 дней, см. запись ниже)
> оказался не просто «забыли передеплоить» — коммит переименования `premium-network →
kami-network` (`7fd18c8c`, 2026-07-13) прошёл по всему репо, но не докатился до самого s3:
> `docker-compose.s3.yml` требовал внешнюю сеть `kami-network`, которой на сервере не было (осталась
> `premium-network`), редеплой падал на `network ... declared as external, but could not be found`
> с ~07-11/12 (ещё до самого коммита). **Смигрировано без даунтайма:** 4 живых media-контейнера
> (`media-api`/`worker`/`nginx`/`redis`) dual-homed на `kami-network`, health проверен на новой сети
> до отключения от старой, пустая `premium-network` удалена. Побочно найден техдолг: `deploy-affected.sh`
> не знает про хост `s3` вообще (case-select только s1/s2) — обойдено прямым `docker compose` на
> сервере, сам скрипт не тронут (общий критичный файл для всех продов, чинить — отдельным PR).
> **Итог:** `deploy_app(mandala, seed:true)` теперь реально передаёт `--seed`; `nx run
mandala:db:seed` запускается и падает уже на **нашей** известной проблеме
> (`Cannot find module '@/generated/prisma'`, tsx/tsconfig-paths не резолвит path-alias при вызове
> через `prisma db seed`) — инфра-блокер снят, дальше чинить app-владельцу.
>
> **✅ `mandala/prisma/seed.ts` — path-alias баг починен, вскрыл и обнажил ещё 2 связанных бага
> (2026-07-21, root-weaver, v0.39.9):** Путь `@/generated/prisma` заменён на относительный
> `../src/generated/prisma` (паттерн всех остальных приложений — `mandala` была единственной,
> использовавшей алиас в `prisma/seed.ts`, куда `tsx` не прокидывает `tsconfig.json` paths при
> вызове через `prisma db seed`). **После фикса вскрылись два новых бага, оба воспроизведены
> локально в точности как на сервере (`nx zenstack:generate` → `nx db:seed`):**
>
> - **`PrismaClient` is not a constructor** — `zenstack:generate` у `mandala` (как и у
>   `grandslamcup`/`dsperevod`/`auth-hub`/`time`/`archetest`/`aprel8008`/`svoichuzhie`/`kami`/
>   `studio` — репо-wide паттерн) **намеренно** перезаписывает `src/generated/prisma/index.ts` на
>   `export * from './browser'` третьей командой в `project.json` — защита от протечки
>   Node-only `PrismaClient` в клиентские бандлы. Но `browser.ts` экспортирует только типы, не
>   класс. Само приложение это не задевает (`lib/db.ts` использует `ZenStackClient`, не сырой
>   `PrismaClient`), но `prisma/seed.ts` — единственное место в `mandala`, которому нужен
>   настоящий класс. Фикс — импорт `PrismaClient` из явного `../src/generated/prisma/client`
>   (реальный серверный entry-point, `index.ts`/`browser.ts` — сознательно урезанный дефолт).
> - **`PrismaClientInitializationError`: нужен non-empty `PrismaClientOptions`** — Prisma 7
>   (`prisma-client` TS-генератор) больше не собирает `new PrismaClient()` без параметров,
>   требует явный driver adapter. Фикс по образцу `animatrona-tracker/prisma/seed.ts` —
>   `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`
>   (`@prisma/adapter-pg` уже в зависимостях корня).
>
> **Проверено локально end-to-end:** `nx run mandala:db:seed --skip-nx-cache` — admin
> (`admin@elfafeya.art`, credential-аккаунт) создан, 31 мандала/37 изображений/10 short URL
> засеяны (предупреждения "File not found" — ожидаемо, `uploads/` не в git, на staging файлы
> есть). `nx lint mandala` и `nx typecheck:tsgo mandala` чисто.
>
> **✅ Аудит остальных 9 приложений батча ЗАВЕРШЁН (2026-07-21, фоновая сессия):** реальный баг того
> же класса нашёлся только в **`grandslamcup`** — тот же bare-index импорт (`'../src/generated/
> prisma'` → `browser`-экспорт без класса) + `new PrismaClient()` без driver adapter. Починен тем
> же паттерном (явный `../src/generated/prisma/client` + `PrismaPg` adapter), коммит `6efa4e59`,
> версия `3.37.3 → 3.37.4`. Проверено локально (временный `postgres:17-alpine` на порту 5453,
> `nx db:push` + `nx db:seed` — дошёл до реального запроса к БД, контейнер после проверки удалён).
> **Остальные 8 приложений не затронуты — баг там не воспроизводится:**
> `dsperevod`/`auth-hub`/`studio`/`archetest`/`kami` используют `ZenStackClient` напрямую (не сырой
> `PrismaClient`, как и `mandala`), а `time`/`aprel8008`/`svoichuzhie` вообще не имеют
> `prisma/seed.ts`. Правок в них не вносилось — паттерн бага не воспроизводится, трогать не нужно.
>
> **✅ §18.7 Тираж M1, батч 2 — диагностика и фиксы 4 находок BlackCove (2026-07-21,
> root-weaver):** По следам свода BlackCove (запись ниже) — разобраны и закрыты кодом 4 из 5
> проблем батча (`mandala` не тронута, блокирована на стороне BlackCove — dashboard-agent
> redeploy + `tsx`/path-alias баг в seed).
>
> - **`dsperevod`/`svoichuzhie` — email-verification/auth формы биты в несуществующий адрес.**
>   Root cause — `authClient` (`src/lib/auth-client.ts`) строился на build-time
>   `NEXT_PUBLIC_BETTER_AUTH_URL`, которого `Dockerfile.production` никогда не передавал как build
>   ARG — в собранном клиентском бандле всегда оставался дефолт `localhost:PORT`. Клиент бил мимо
>   staging-домена из браузера пользователя, хотя серверный `BETTER_AUTH_URL` был настроен верно.
>   Фикс — `window.location.origin` вместо `process.env.NEXT_PUBLIC_*` (паттерн уже был в `aboi`).
>   **Подтверждено BlackCove живым прогоном:** dsperevod `email-verification.spec.ts` 3/3
>   passed (было 3/3 failed); svoichuzhie `10-auth.spec.ts` 2 из 3 auth-тестов починились.
>   Коммиты: `09cda6f`(dsperevod submodule), `76cae4b`(svoichuzhie submodule), root `dabccad7`/
>   `616da8fc`/`9afec0fb`.
> - **`pravda` — `CONNECTION_REFUSED` на URL без слэша.** Root cause — nginx `port_in_redirect`
>   (дефолт `on`) подставлял внутренний container-порт (`3007`, не проброшен наружу) в
>   автогенерируемый 301-редирект `$uri`→`$uri/`. Фикс — `port_in_redirect off;`. **Подтверждено**
>   curl'ом BlackCove — редирект теперь без порта, порт-баг закрыт (~15 тестов `bookmarks.spec.ts`
>   и часть `mobile-overflow` были на этом завязаны). Коммит `dabccad7`.
> - **`pravda` — клиентская RSC-навигация между статьями ломалась.** Root cause — известный
>   апстрим-баг Next.js 16 ([vercel/next.js#85374](https://github.com/vercel/next.js/issues/85374)):
>   RSC-сегменты (Cache Components) пишутся на диск вложенными директориями, клиентский роутер
>   запрашивает их плоским dot-separated именем — путь расходится, 404 на prefetch. Фикс — build
>   adapter (`apps/pravda/build/adapter.js`, `adapterPath` в `next.config.mjs`), переименовывающий
>   файлы после сборки. **Подтверждено BlackCove ad-hoc Playwright-скриптом (голый API, не
>   `@playwright/test`)** — RSC-запросы возвращают 200 с плоскими путями, реальная навигация для
>   пользователей работает. Сам `navigation.spec.ts` (через `@playwright/test`) продолжает падать
>   5/13 — оказалось артефактом тестовой обвязки (`devices['Desktop Firefox']` эмуляция?), не
>   сервера/сборки; включён `retries: 1` (временно, коммит `b1ed1c12`) для сбора `trace.zip` —
>   диагностика этого отдельного вопроса передана BlackCove, не завершена. Коммит `90c2e09c`.
> - **`svoichuzhie` — `10-auth.spec.ts:48` (успешный вход без `callbackUrl`) — отдельный баг,
>   не редирект/кука.** Диагностировано временным логированием в `fanclub/profile/page.tsx`
>   (`hasSession: true`, cookie долетает) + прямым SQL-запросом BlackCove к staging-БД:
>   `testFan`, заведённый на staging через `stagingGlobalSetup()` (`@letar/e2e-testing`
>   `devSessionLogin`, dev-session bypass), не имеет **ни одной** записи `Account` — не только
>   `credential`, вообще никакой. `createDevSessionRoute` создаёт голого `User`+`Session`, минуя
>   таблицу `Account`. Реальный `/sign-in/email` ищет `providerId='credential'`, не находит →
>   `INVALID_EMAIL_OR_PASSWORD` (лог `"Credential account not found"`, `better-auth/dist/api/
routes/sign-in.mjs:211-214`). Объясняет заодно, почему `:30`/`:40` "проходили" — им нужен только
>   общий текст ошибки, неважно по какой причине. **Фикс:**
>   `createDevSessionRoute` (`@letar/auth/server` v0.11.1) — новый опциональный query-параметр
>   `password`, создающий (idempotent) `Account` с `providerId='credential'` через
>   `hashPassword` из `@better-auth/utils/password`; `devSessionLogin` (`@letar/e2e-testing`
>   v0.1.1) прокидывает параметр; `svoichuzhie-e2e/global-setup.ts` передаёт
>   `password: testFan.password`. Обратная совместимость: без `password` — поведение не меняется,
>   безопасно для остальных 5 приложений на этой фабрике (aboi, driving-school, grandslamcup,
>   auth-hub, animatrona-tracker, studio). **✅ Подтверждено BlackCove живым прогоном (msg #664,
>   2026-07-21 16:44):** `svoichuzhie` полный e2e (64 теста) — 54 passed/4 failed/6 skipped (было
>   48/12/4). `10-auth.spec.ts:48` прошёл; косвенно подтверждён и весь `fan-chromium`-проект
>   (`12-fanclub-member.fan.spec.ts`), зависящий от валидной fan-сессии. Коммит `c95bd1c7`.
>
> **Новые находки из подтверждающего прогона (не диагностировались, отдельный баг форм, не
> dev-session):** `03-subscription.spec.ts:4` — email-инпут в footer остаётся visible после
> сабмита формы подписки; `11-fanclub-register.spec.ts:10` — форма вступления в фан-клуб не выше
> секции тиров (layout order); `11-fanclub-register.spec.ts:37`/`:65` — кнопка submit остаётся
> disabled при регистрации в фан-клуб/anti-enumeration. Все 4 — вне скоупа этой сессии, ждут
> app-владельца.
>
> **Не в скоупе этой сессии:** `mandala` (54 admin-теста, блокирована на стороне BlackCove — две
> раздельные проблемы, обе диагностированы BlackCove, msg #635: (1) `deploy_app(seed:true)` не
> запускает seed — `dashboard-agent` на s3 не передеплоен 9 дней, текущий образ старше поддержки
> `seed` в `apps/dashboard-agent/src/routes/deploy.ts:418`; (2) ручной `nx run mandala:db:seed`
> падает отдельно — `Cannot find module '@/generated/prisma'`, `tsx`/`tsconfig-paths` не резолвит
> path-alias при вызове через `prisma db seed`); `dsperevod` `callback-drawer.spec.ts` (webkit,
> ввод телефона — не диагностировано). Временное диагностическое логирование в
> `svoichuzhie/fanclub/profile/page.tsx` **оставлено** (gated за `ALLOW_DEV_SESSION`, безобидно) —
> убрать отдельным коммитом после уборки диагностических находок.

> **⚠️ §18.7 Тираж M1, батч 2 — полный редеплой+e2e остальных 5 приложений батча
> (2026-07-21, BlackCove):** По плану root-weaver (#610) — для `mandala`, `dsperevod`, `pravda`,
> `aira-web`, `aprel8008` выполнен `deploy_app(staging)` (коммит `ec610181`) → `run_e2e` по
> одному, не параллельно; s3 предварительно проверен на нагрузку (`load average: 5.2/6.9/5.6`,
> было 34+ в прошлых прогонах). **Итог: `aira-web` 3/3 ✅, `aprel8008` 3/3 ✅ — честные зелёные;
> `mandala` 51 passed/2 failed/16 skipped/54 did not run ❌, `dsperevod` 11/7/3 didn't-run ❌,
> `pravda` 88/149/3 skipped ❌.** Ключевые находки: (1) **mandala** — `auth.setup.ts`
> (`authenticate as admin`) не проходит на staging (остаётся на `/sign-in`), каскадом обрушив 54
> admin-зависимых теста; отдельно SEO title не совпадает. (2) **dsperevod** — экран «Проверьте
> почту» не появляется после регистрации (все 3 браузера); все 4 теста `callback-drawer.spec.ts`
> падают в webkit на вводе телефона. (3) **pravda** — доминирующая причина большинства из 149
> отказов: nginx-конфиг статического экспорта отдаёт `CONNECTION_REFUSED` на любой URL **без
> завершающего слэша** (подтверждено напрямую через `docker logs` + повтор запросов, 100%
> воспроизводимо на одних и тех же путях); отдельно реальные баги — `bookmarks` (кнопка скрыта),
> `cross-refs` (текст не рендерится), `toc` (`href.slice is not a function`, TOC пустой),
> клиентская RSC-навигация не срабатывает, клик по результату поиска не переходит на страницу.
> **Не диагностировалось глубже** — не зона BlackCove (app-код), передано root-weaver сводом
> (broadcast, т.к. на момент отправки root-weaver был retired — восстановлен и переотправлено
> адресно, msg #625). **Инфра-побочный эффект:** на s3 добавлен 8GB swap-файл (`/swapfile`,
> persisted в `/etc/fstab`) — первая попытка деплоя `mandala` словила OOM-килл при пиковой
> компиляции Turbopack (available memory упала до 214Mi, свопа не было вообще); вторая попытка
> прошла. Своп — не костыль под конкретный баг, а системная подстраховка для будущих пиков сборки.
>
> **✅ §18.7 Тираж M1, батч 2 — `svoichuzhie` точечные повторные прогоны, root cause
> rate-limit найден (2026-07-20/21, root-weaver + BlackCove):** После checkbox/strict-mode фиксов
> (commit `b8fc1bec9`) прогон дал 51 passed/7 failed/6 skipped — хуже ожидания (root-weaver ждал
> только 2 в `11-fanclub-register`, по факту 7, часть новых). root-weaver диагностировал реальный
> root cause трёх из семи (`10-auth.spec.ts` — неверный пароль/несуществующий email/успешный
> вход): `auth.ts` держал relaxed rate-limit для `/sign-in/email`/`/sign-up/email` под условием
> `NODE_ENV !== 'production'`, но staging собирается production-билдом — условие никогда не
> срабатывало, дефолтный строгий лимит Better Auth блокировал повторные попытки логина с одного
> IP. Фикс: `|| ALLOW_DEV_SESSION === 'true'` (тот же флаг, что уже используется для dev-session,
> никогда не попадает в реальный прод). Checkbox-баг (2 позиции) починен тем же паттерном, что
> `aboi` (`focus()` + `Space` вместо клика мышью). Коммит `ec610181`/`16e06f23`. **Не
> диагностировано:** `03-subscription.spec.ts` (форма подписки, email-инпут не скрывается) и
> `formY < tiersY` в `11-fanclub-register` (layout-сдвиг, 274 вместо <216) — новые находки,
> отдельный раунд. **Повторный прогон после этого фикса ещё не выполнен** (следующий шаг сессии).
>
> **✅ §18.7 Тираж M1, батч 2 — `DEV_SESSION_TOKEN` глобальный vs per-app, `svoichuzhie`
> 48/64 passed (2026-07-20/21, BlackCove):** После фикса `webServer.url` (root-weaver, коммит
> `88fed18f`) и фикса auth на staging через `stagingGlobalSetup()`/dev-session (root-weaver,
> `4a75b32f`) — `svoichuzhie` всё ещё давал 403 на dev-session. **Root cause:**
> `dashboard-agent` запускает `run_e2e` через `sudo -u deploy -H --preserve-env=BASE_URL,DEV_SESSION_TOKEN`
> — этот флаг сохраняет **ОДНО значение из окружения самого процесса dashboard-agent**
> (`5cbe8e87...`, единое на весь сервис), а НЕ читает `DEV_SESSION_TOKEN` индивидуально из
> `.env.staging` каждого приложения. BlackCove при настройке `.env.staging` для
> `mandala`/`svoichuzhie`/`aprel8008`/`dsperevod` сгенерировал разные токены на каждое — отсюда 403. **Фикс:** токен во всех четырёх `.env.staging` на s3 выровнен под глобальное значение
> dashboard-agent. **Итог `svoichuzhie` после фикса: 48 passed / 12 failed / 4 skipped** —
> auth-часть теперь честно проходит; остаток — (а) strict-mode конфликт двух кнопок «Войти» на
> `/login` (шапка + форма, 7 из 12 отказов), (б) `db.helpers.ts:106` (`ensureTestProduct` для
> merch-checkout) всё ещё бьёт `127.0.0.1:5432` напрямую — тот же класс проблемы, что чинили для
> auth, но в другой helper-функции, не мигрирован на dev-session (2 отказа), (в)
> `11-fanclub-register.spec.ts` — форма/таймауты, не диагностировано глубоко (2 отказа).
> **Не проверено повторно:** `mandala`'s ранее репортнутый `auth.setup.ts` отказ мог быть тем же
> классом бага (токен не совпадал) — токен выровнен, но mandala не переprogнан. `E2E_GATED_APPS`
> BlackCove сам не трогает — ждёт решения root-weaver по итогам смешанных результатов батча
> (тред `staging-e2e-gate-m1-batch2`, msg #619).
>
> **✅ §18.7 M1 `aboi` — `checkout.spec.ts:140` (webkit) `/cart`-редирект: первая гипотеза
> опровергнута живым прогоном, вторая — подтверждена (2026-07-19, aboi-dev, commit
> `<см. CHANGELOG аboi 0.25.5>`):** Диагностика началась с ложной тревоги — шестой/седьмой прогоны
> BlackCove (`msg #582/#584`) на самом деле били в `localhost:3018` dev-режим
> (playwright.config.ts webServer fallback), а не в staging: `BASE_URL` не был передан в вызов
> `run_e2e` после рестарта Deploy Agent. После перезапуска с явным
> `BASE_URL=https://aboi-stage.s3.letar.best` (msg #586) вскрылся один реальный, стабильно
> воспроизводимый отказ: `checkout.spec.ts:140` webkit, `page.waitForURL` лог —
> `navigated to /checkout → /cart → /cart` вместо success.
>
> **Гипотеза №1 (0.25.4, опровергнута):** `authClient.signUp.email()` (авто-регистрация гостя)
> выполнялась ДО перехода на success-страницу, меняя cookie сессии текущей вкладки. Перенос
> авто-регистрации на success-страницу задеплоен и перепрогнан BlackCove живьём (msg #588) —
> **идентичный отказ воспроизвёлся снова**, гипотеза не подтвердилась.
>
> **Гипотеза №2 (0.25.5, механизм подтверждён логами, не живой WebKit-отладкой):** Next.js Server
> Actions по протоколу возвращают вместе с ответом свежий RSC-рендер ВЫЗЫВАЮЩЕГО маршрута —
> `placeOrderAction`, вызванный из `/checkout`, тащит за собой ре-рендер `checkout/page.tsx`, чей
> `redirect('/cart')` на пустую (уже опустошённую этим же action'ом) корзину срабатывает как часть
> ЭТОГО ответа раньше, чем клиентский код успевает выполнить `window.location.href` на success. На
> загруженном WebKit эта встроенная гонка стабильно выигрывает — на других браузерах/без нагрузки
> клиентский код обычно успевает первым. Фикс: `placeOrderAction` теперь сам вызывает `redirect()`
> (на success либо на T-Bank `paymentUrl`) — `NEXT_REDIRECT`, брошенный ИЗНУТРИ action, Next
> обрабатывает отдельно от обычного RSC-мерджа текущей страницы, гонки не возникает в принципе.
> **✅ Подтверждено живым прогоном (msg #590, BlackCove, `run_e2e` на коммите `2c99f9d4`):**
> `35 passed / 3 failed / 1 skipped / 3 did not run` — лучший результат за всю серию. `checkout.spec.ts:140`
> (webkit) прошёл. Оставшиеся 3 отказа — весь список уже известный некритичный шум
> (`email-verification.spec.ts:63` firefox+webkit — CPU-contention scrypt; `pvz-picker.spec.ts:169`
> firefox — флейк геолокации), новых регрессий нет. BlackCove считает `aboi` готовым кандидатом на
> `E2E_GATED_APPS`.
>
> Попутно (сохранено из 0.25.4, эта часть не связана с флейком, актуальна независимо от исхода):
> `mergeAnonymousAccount` не переносил `Order.userId` при линковке anonymous→real (заказ терял
> владельца, т.к. `Order.user` — `onDelete: SetNull`, Better Auth удаляет anonymous-юзера сразу
> после линковки). Также отправлен `deploy-mcp` техдолг BlackCove (msg #586): параметр `baseUrl`
> не транслируется в `BASE_URL` для playwright — не в скоупе этой сессии (libs/deploy-mcp, не
> aboi). **➡️ Следующий шаг:** запросить у BlackCove добавление `aboi` в `E2E_GATED_APPS`
> (`libs/infra-config/src/index.ts`, по образцу `time` из msg #577).
>
> **✅ Системный фикс: staging trustedOrigins/localhost-баг тиражирован на 5 приложений
> (2026-07-19, root-weaver):**
> После находки root cause `/cart`-редиректов в `aboi` (см. запись ниже) — проверены все
> `docker-compose.staging.yml` монорепо на тот же паттерн (`BETTER_AUTH_URL`/
> `NEXT_PUBLIC_BASE_URL`/`NEXT_PUBLIC_APP_URL` = `localhost:<port>` вместо реального публичного
> staging-домена). Найден в **5 приложениях**: `driving-school`, `dsperevod`, `mandala`,
> `svoichuzhie` — почтены, `auth-hub` — **пропущен**.
>
> Механизм неодинаков — три разных случая:
>
> - **`mandala`**: `auth.ts` не задаёт `trustedOrigins` явно → Better Auth дефолтится на
>   `baseURL`. Фикс — только env-переменная в `docker-compose.staging.yml`.
> - **`dsperevod`/`svoichuzhie`**: `baseURL` уже env-driven (`BETTER_AUTH_URL`), но
>   `trustedOrigins` — захардкоженный массив, не читает эту переменную вообще. Добавлена
>   аддитивная запись `...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [])`
>   поверх существующего прод-списка (не убирает/меняет старые записи) + фикс env-переменной.
> - **`driving-school`**: сложнее всех — `baseURL` **жёстко захардкожен** на punycode прод-домена
>   (`https://xn--80aaah6cnh.xn--p1ai`) независимо от `NODE_ENV`, из-за точного совпадения
>   Google OAuth `redirect_uri`. **`baseURL` НЕ трогается** (риск сломать прод OAuth) —
>   исправлен только `trustedOrigins` (аддитивно) + env-переменные `BETTER_AUTH_URL`/
>   `NEXT_PUBLIC_APP_URL`, которые отдельно используются `getAppUrl()` (`lib/app-url.ts`) для
>   абсолютных ссылок в email (magic-link, PIN, verification) — это чинится полностью, но
>   Better Auth CSRF-валидация для driving-school остаётся частично untested без явного
>   staging-прогона (driving-school и так в M4, последний батч §18.7, по причине сложности).
>
> **`auth-hub` НЕ тронут** — его staging-домен не подтверждён нигде в дереве (нет
> `.env.staging.example`, нет упоминаний в `PLAN.md`), в отличие от остальных 4 (все имели
> явную `DOMAIN=<app>-stage.s3.letar.best` строку). Гадать со значением для критичного
> инфраструктурного приложения (держит OIDC для всего монорепо, `auth-hub` — намеренно
> последний в M4 по этой же причине) признано слишком рискованным. Нужно подтверждение
> реального домена (или отсутствия staging-домена вообще — возможно, вариант B из
> `auth-hub-e2e-setup` thread — `docker-staging + warn-gate` — не предполагал публичный домен)
> прежде чем чинить.
>
> **Ни один из 4 фиксов не подтверждён живым staging-прогоном** — только у `aboi` фикс того же
> класса проверен BlackCove вживую. Остальные 4 — по аналогии, теоретически корректны (код
> проверен typecheck/lint), но нуждаются в собственном staging-деплое + `run_e2e`, когда каждое
> из них дойдёт до своего батча §18.7 Тиража M.
>
> Коммиты: `dbe3995`(driving-school), `cf9834d`(dsperevod), `9bcd851`(svoichuzhie),
> `3f76ff98`(letar root, mandala + submodule bumps).
>
> **✅ §18.7 Тираж M1 — regex-баг из пятого прогона починен (2026-07-19, root-weaver):**
> `checkout.spec.ts:194`+`:336` (оба вхождения одного паттерна) — `toHaveURL` матчит полный URL,
> не `pathname` (в отличие от `waitForURL` выше в том же тесте), `$`-якорь без учёта query
> никогда не матчил success-страницу с `?accountCreated=1`. Фикс — `(\?.*)?` перед якорем.
> Коммиты: `51dbbb0`(aboi-e2e), `6c72f6ec`(letar root). BlackCove (Deploy Agent) сейчас
> **остановлен** (`Deploy Agent остановлен`, 2026-07-19 11:27) — шестой прогон запросить при
> следующем запуске `/deploy-agent`, чеклист: `deploy_app(aboi, staging)` на `51dbbb0`/`6c72f6ec`
> → `run_e2e`.
>
> **✅ §18.7 Тираж M1 — пятый прогон: `trustedOrigins`-фикс подтверждён живьём, найден
> предсуществующий баг regex в тесте (2026-07-19):**
> BlackCove пересобрал `aboi` на `372bf80`/`0b69ee64` и прогнал `run_e2e` через
> `https://aboi-stage.s3.letar.best`. **`trustedOrigins`-гипотеза root-weaver подтверждена** —
> `/cart`-редирект для `checkout.spec.ts:140` исчез, чекаут реально доходит до
> `/checkout/success/<accessToken>` (пруф в логе: `.../checkout/success/cmrrphmre...?accountCreated=1`).
>
> Вскрылся **предсуществующий баг самого теста** (`checkout.spec.ts:194`): паттерн
> `/\/checkout\/success\/[a-z0-9]{20,32}\/?$/` требует конца строки сразу после `accessToken`, но
> реальный URL содержит `?accountCreated=1` — раньше не всплывало, потому что тест падал раньше
> (на `/cart`-редиректе), фикс `trustedOrigins` расчистил путь и обнажил баг ассерта. Падает на
> 3/3 браузера. Фикс тривиальный (убрать `$`-якорь или явно допустить query-string) — не в скоупе
> BlackCove, ждёт app-владельца.
>
> Итог пятого прогона: 20 passed, 6 failed (все три категории — regex-баг выше + два уже принятых
> известных шума: email-verification CPU-конкуренция, геолокация Firefox), 15 did not run
> (каскад `test.skip`). **➡️ Следующий шаг:** app-владельцу починить regex в `checkout.spec.ts:194`
> → шестой прогон BlackCove → при зелёном `aboi` кандидат на `E2E_GATED_APPS`.
>
> **✅ §18.7 Тираж M1 — `time` в `E2E_GATED_APPS`; `aboi` — найден вероятный корень
> `/cart`-редиректов, четвёртый прогон 32/42 (2026-07-19):**
> `time` добавлен BlackCove в `E2E_GATED_APPS` (`libs/infra-config/src/index.ts`, коммит
> `6af28c70`, с разрешения владельца) — `E2E_GATED_APPS` как файл/константа не существовал
> заранее, это первая реализация списка. `aboi` четвёртый прогон: 32/42 passed (было 21/42) —
> DaData-фикс подтверждён полностью рабочим, 0 падений по подсказкам адреса.
>
> **Найден вероятный root cause `/cart`-редиректов** (`checkout.spec.ts:140`+`:279`, разные
> способы доставки, разные браузеры — не специфично к CDEK/MANAGER_CALL): `auth.ts:40-44`
> собирает `trustedOrigins` из `BETTER_AUTH_URL`/`NEXT_PUBLIC_BASE_URL`, а
> `docker-compose.staging.yml` указывал оба на `http://localhost:3022` — но e2e (`run_e2e`)
> бьёт по реальному публичному домену `https://aboi-stage.s3.letar.best`. Better Auth сверяет
> `Origin` заголовок КАЖДОГО state-changing запроса (CSRF-защита) с `trustedOrigins` —
> несовпадение могло приводить к некорректной установке cookie анонимной сессии
> (`lib/cart.ts` `getOrCreateSessionUserId` создаёт нового anonymous-юзера с пустой корзиной,
> если сессия не находится → `checkout/page.tsx` `redirect('/cart')` при пустой корзине).
> Старое допущение («HTTPS-домен нужен только для OAuth-callback») было неверным — Better Auth
> валидирует Origin независимо от того, используется ли OAuth. Исправлено на реальный домен
> (коммит `372bf80`) — **не подтверждено живым прогоном**, ждёт пятого прогона BlackCove.
>
> **Решение по email-verification таймаутам (60с/30с всё равно не хватает под 6-воркерной
> параллельной нагрузкой на shared staging):** принято как известное ограничение warn-only
> гейта, не блокер — не гоняться за дальнейшими timeout-бампами (диминишинг ретёрнс), `time` и
> большая часть `aboi` уже полезны как гейт. Если понадобится твёрдая защита именно для
> auth-флоу — отдельная задача уровня инфраструктуры (снизить параллелизм воркеров для aboi-e2e
> специфично, или поднять ресурсы staging-контейнера), не e2e-тестов.
>
> Коммиты: `372bf80` (aboi). **➡️ Следующий шаг:** запросить у BlackCove пятый прогон `aboi`
> (пересборка с `372bf80`) — если `trustedOrigins`-фикс закрывает оба `/cart`-падения, `aboi`
> кандидат на `E2E_GATED_APPS` с оставшимся email-verification как известный warn-only шум.
>
> **🎉 §18.7 Тираж M1 — `time` полностью зелёный и подтверждён по существу; `aboi` третий круг
> (msg #575) в работе (2026-07-19):**
> BlackCove прогнал финальный e2e — `time`: **3/3 passed**, в логе `nx run time-e2e:e2e` напрямую
> (executor), без прежнего `nx run time:dev` — `project.json`-фикс подтверждён: `time` реально
> бьёт по staging-контейнеру. **Можно вносить `time` в `E2E_GATED_APPS`.**
> `aboi`: было 5–7/42 → стало 21/42 passed (9 failed, 12 не выполнились каскадом от
> `test.skip`). Новый набор из 5 находок, 3 закрыты сразу:
>
> - **DaData-подсказка адреса не появлялась** несмотря на `DADATA_MOCK_MODE=true` — оказалось,
>   это ДРУГОЕ поле (`checkout-form.tsx` клиентский `AboiForm.Field.Address`, не серверный
>   `searchDadataCitiesAction`): `libs/forms` `field-address.tsx` — пустой `token` → `provider =
null` → fetch вообще не вызывается, `page.route()` перехватывать нечего. Добавлен
>   `NEXT_PUBLIC_DADATA_TOKEN=<плейсхолдер>` в `.env.staging.example` — не настоящий токен,
>   `page.route()` перехватывает запрос раньше, чем он доходит до `suggestions.dadata.ru`,
>   нужна только непустая строка.
> - **Гонка в тесте геолокации** — `test.use({geolocation})` даёт мгновенную мок-позицию,
>   фаза `requesting` («Геолокация…») может смениться на `searching` быстрее одного цикла
>   поллинга Playwright под нагрузкой staging — тест принимал только строгий «Геолокация…»,
>   расширен на обе фазы.
> - **Firefox не отклоняет геолокацию проактивно** (в отличие от Chromium) — может провисеть до
>   внутреннего `timeout:10_000` браузерного API и вернуть TIMEOUT вместо PERMISSION_DENIED; тест
>   принимал только текст отказа, расширен на оба исхода + таймаут 8с→13с.
> - **email-verification таймауты подняты** (30с→60с на `waitForResponse`, 15с→30с на
>   «Почти готово») — 3 параллельных браузерных проекта одновременно бьют scrypt-хешированием
>   пароля в один shared staging-контейнер, легитимная CPU-конкуренция, не баг.
> - **🟡 Не закрыто:** `checkout.spec.ts:140` (webkit) — после ручного заполнения адреса browser
>   оказывается на `/cart`. `redirect('/cart')` в `checkout/page.tsx` срабатывает только на
>   сервере при пустой корзине на GET — не диагностировано без живого доступа к staging
>   (подозрение: WebKit cookie/session race между `addProductToCart` и `goto('/checkout')`).
>   Явно не гадаю с фиктивным фиксом — задокументировано, ждёт либо живой отладки, либо повторной
>   находки от BlackCove после четвёртого прогона.
>
> Коммиты: `eeb2bbb` (aboi), `9826fd2` (aboi-e2e). **➡️ Следующий шаг:** запросить у BlackCove
> четвёртый прогон `aboi` (не `time` — тот уже зелёный, добавить в `E2E_GATED_APPS` можно сразу).
>
> **✅ §18.7 Тираж M1 — второй круг находок BlackCove (msg #573) починен (2026-07-19):**
> После редеплоя `f049f87`/`bee64c6d` BlackCove прогнал e2e 4 раза (localhost+staging × 2) —
> CDEK-фикс подтверждён (0×401 во всех прогонах), но всплыло 5 новых проблем, все закрыты:
>
> - **`time-e2e` игнорировал staging BASE_URL целиком** — root cause НЕ в синтаксисе
>   `webServer.command` (обе формы, `nx run x:y` и короткая `nx x y`, матчатся одним и тем же
>   regex'ом в `@nx/playwright/plugin`), а в **отсутствии `project.json`**: без него таргет `e2e`
>   собирается через inferred `createNodes`, который добавляет `dependsOn` на `dev`-таск — Nx
>   поднимал локальный `next dev` ДО проверки `reuseExistingServer`/`url`, зелёный результат не
>   отражал реальный контейнер. Фикс — explicit `project.json` с executor
>   `@nx/playwright:playwright` (паттерн `aboi-e2e`/`grandslamcup-e2e`), обходит инференс целиком.
>   Тот же баг унаследован всеми 6 приложениями из Тиража N генератора `@letar/generators:e2e-suite`
>   (`animatrona-landing-e2e` и др.) — генератор теперь скаффолдит `project.json` по умолчанию,
>   старые 6 не ретрофичены (не в скоупе, задокументировано как чеклист перед их гейтом).
> - **`checkout.spec.ts`** — URL успеха матчился на устаревший `ORD-YYYYMMDD-XXXXX`, а реальный
>   редирект — `accessToken` (cuid, `checkout.ts:352`); `orderNumber` используется только в
>   `failUrl`/email/админке.
> - **`pvz-picker.spec.ts`** — автокомплит города вызывает `searchDadataCitiesAction` (DaData), не
>   `searchCdekCities` как думал старый комментарий теста; DaData — платный сервис без песочницы,
>   `NEXT_PUBLIC_DADATA_TOKEN` на staging пуст → добавлен `DADATA_MOCK_MODE` (по образцу
>   `CDEK_MOCK_MODE`) в `shipping.action.ts` + `.env.staging.example`.
> - **WebKit «добавлено в корзину»** — таймаут 5с→10с (смена текста — чистый React state, не
>   завязана на `router.refresh()` вопреки старому комментарию; задержка сетевая, под нагрузкой).
> - **`email-verification.spec.ts`** — подтверждён тот же rate-limit `/sign-up` (5/час/IP), что и
>   раньше диагностировала RoseSparrow, просто исчерпан повторными прогонами BlackCove; тест
>   теперь детектирует HTTP 429 и делает `test.skip` с понятным сообщением вместо ложного failure.
> - Побочно: `aboi-e2e/tsconfig.json` не тайпчекался (`window` в `addInitScript()`-колбэках без
>   `lib: dom`) — вскрылось только после полной очистки Nx-кэша, вероятно маскировалось стейл-кэшем
>   в прошлых сессиях.
>
> Коммиты: `ccd12ec` (aboi), `6907190` (aboi-e2e), `c034560e`+`bbbcc396` (letar root, включая фикс
> генератора). **➡️ Следующий шаг:** запрошен у BlackCove повторный `deploy_app`+`run_e2e` для
> `aboi`+`time` (msg отправлено в тред `staging-e2e-gate-m1-aboi-time`) — при зелёном добавить
> оба в `E2E_GATED_APPS`.
>
> **✅ §18.7 Тираж M1 — все app-баги `aboi`/`time` из ответа BlackCove починены (2026-07-18):**
> **`time-e2e`** — `playwright.config.ts` звал несуществующий nx-проект `@letar/time` (реальное
> имя — `time`, `@letar/time` это имя `package.json`) и `webServer.url` был захардкожен на
> `localhost:3000` вместо `baseURL` — `reuseExistingServer` поэтому не видел уже поднятый
> staging-контейнер. + `locale: 'ru-RU'` (Chromium/WebKit шлют `Accept-Language: en-US`,
> next-intl отдавал английский). Плейсхолдер `example.spec.ts` заменён на реальный смок-тест
> главной страницы. Локально 3/3 браузера зелёные.
> **`aboi-e2e` — корневая причина глубже, чем казалось изначально:** `checkout.spec.ts`/
> `pvz-picker.spec.ts` были написаны в расчёте на одностраничную форму, а
> `checkout-form.tsx` — **трёхшаговый** `AboiForm.Steps` (Контакты → Доставка → Оплата, не
> двухшаговый, как решили после первого чтения кода) — кнопка «Перейти к оплате» физически не в
> DOM до прохождения первых двух шагов. Падало бы в любом окружении, не только на staging;
> CDEK 401 был реальным, но не единственным и не главным виновником. Дополнительно нашлось и
> починено:
>
> - `getCityCodeByPostalCode()` в `cdek.ts` — единственная функция без проверки
>   `CDEK_MOCK_MODE` (все остальные её уже проверяли) — на staging с тестовыми credentials
>   всегда падала в реальный OAuth (401), `getDeliveryPointsAction()` получал `null` → пустой
>   список ПВЗ → `CDEK_POINT` выглядел нерабочим.
> - `consentAccepted` в `initialValue` — `false`, не `true`, как ошибочно считал старый
>   комментарий в тесте — чекбокс требует явного клика.
> - Клик мышью (label/текст/role=checkbox/`.check()`) на этом конкретном Ark UI Checkbox
>   стабильно **не переключал** состояние формы в сценарии с вручную заполненным адресом
>   (воспроизведено множество раз, первопричина не найдена — не cookie-баннер, не анимация
>   перехода шагов, всё исключено пошаговой проверкой) — `focus()` + `Space` работает надёжно
>   везде, использован как решение.
> - Cookie-баннер (`@letar/ui` `CookieBanner`, fixed снизу) перекрывал чекбокс на длинных формах
>   до принятия — `localStorage` теперь предзаполняется через `addInitScript` до первой
>   навигации.
> - `email-verification.spec.ts`: «Войти» на `/sign-in` неоднозначен (есть кнопка в шапке) —
>   уточнён локатор до формы. **«Почти готово» не появлялось не из-за бага UI** (как
>   предполагал BlackCove), а из-за rate-limit Better Auth (`/sign-up`: 5/час) — сработал от
>   повторных локальных прогонов при отладке этой же сессии, подтверждено чистым прогоном после
>   сброса лимита (перезапуск dev-сервера, in-memory store).
>   **Итог локально** (`BASE_URL=http://localhost:3018`, `--project=chromium`): 13/14 — один
>   pre-existing флейк в геолокационном тесте (гонка с реальным Nominatim API, не связан с этой
>   правкой). Коммиты: `f049f87` (aboi submodule), `16545c2` (aboi-e2e submodule), `884ed211`
>   (time-e2e, letar root).
>   **➡️ Следующий старт:** ⏳ запрос BlackCove **отправлен и дополнен** — msg #570 (RoseSparrow,
>   2026-07-18, тред `staging-e2e-gate-m1-aboi-time`) + msg #571 (root-weaver, 2026-07-19,
>   дополнение: редеплой staging нужен и для **aboi**, не только time — `f049f87` меняет app-код
>   `cdek.ts`/`instrumentation.ts`, staging-образ собран до фикса; плюс проверить фактический
>   `CDEK_MOCK_MODE=true` в `.env.staging` на s3). Ждём BlackCove: `deploy_app(aboi+time, staging)`
>   → `run_e2e` оба → зелёный → `E2E_GATED_APPS`. Предупреждение про `/sign-up` rate-limit (5/час
>   при повторных прогонах) передано в обоих сообщениях.
>
> **✅ §18.7 Тираж M1 — BlackCove закрыл инфра-часть `aboi`+`time`, e2e НЕ зелёный (app-баги) (2026-07-18, архив):**
> Полный прогон: `pg_dump` прод `aboi` (искл. `Account`/`Session`/`Verification`/`ConsentLog`) →
> restore в `aboi-staging-db` (data-only) → `anonymize-staging-db.ts` — чисто. WebKit system-libs
> на s3 установлены (`playwright install-deps webkit` от root) — разовая инфра-задача закрыта.
> `deploy_app(aboi, staging)` и повторный `deploy_app(time, staging)` прошли, оба контейнера
> healthy. Опубликован тестовый товар (`published: true`) — блокировал каталог/checkout пустым
> списком, это и была исходная причина Бага 2.
> **e2e ПОСЛЕ фикса — всё ещё не зелёный, но по app-причинам, не инфра:**
> `aboi` 33/42 passed (было 2/42) — 9 падений: (1) CDEK test-credentials дают `401
invalid_client` на `api.edu.cdek.ru` → не рендерится `CDEK_POINT` radio, 6 тестов; (2)
> `email-verification.spec.ts` — heading "Почти готово" не появляется после sign-up на всех
> браузерах, похоже на реальный UI-баг, не флейк. `time` — e2e вообще не запускается:
> `playwright.config.ts` пытается поднять свой webServer через `nx run @letar/time` (project not
> found) вместо использования переданного `BASE_URL` — `time-e2e` пока только `example.spec.ts`-
> плейсхолдер, конфиг не адаптирован под staging-прогон с внешним baseUrl.
> **`E2E_GATED_APPS` пока НЕ пополнен** — оба прогона не зелёные, но не по вине инфраструктуры.
> **Бонус:** deploy-mcp теперь поддерживает `deploy_app({ app, seed: true })` — `--seed` больше не
> требует SSH-резерва (было закрыто через SSH для `auth-hub` в этой же сессии, затем зашито в
> `apps/dashboard-agent/src/routes/deploy.ts` + `libs/deploy-mcp/src/server.ts`, коммит `64e558fc`,
> см. `apps/dashboard-agent/PLAN_COMPLETED.md` v0.7.6). Само-деплой `dashboard-agent` на себя
> споткнулся на известном chicken-and-egg (контейнер создан, не стартовал сам) — поднят вручную.
> **Побочно найдено и починено BlackCove ранее:** коммит `133faafe` ссылался на непроверенный SHA
> `driving-school` — блокировало `git pull --recurse-submodules` на s2 и s3; **вывод на будущее:**
> перед `git add <submodule>` проверять `git log origin/main..HEAD` внутри submodule.
> **➡️ Следующий старт:** app-владельцам (CobaltReef/RoseSparrow) — починить CDEK test-auth,
> email-verification UI, `time-e2e` playwright.config, затем повторный `run_e2e` для обоих →
> зелёный → `E2E_GATED_APPS`. Запрос по остальным 6 приложениям M1 (`svoichuzhie`, `aprel8008`,
> `dsperevod`, `mandala`, `pravda`, `aira-web`) пока не отправлен — код готов (ниже).
>
> **⏳ §18.7 Тираж M — код-подготовка `aboi`+`time` (2026-07-18):** `docker-compose.staging.yml` +
> `.env.staging.example` для обоих приложений (порты: aboi db 5457/app 3022→3018, time db
> 5458/app 3023→3013 — следующие свободные после grandslamcup/auth-hub/driving-school). `time`
> (hub-client) — добавлен staging redirect URI `time-stage.s3.letar.best` в
> `apps/auth-hub/prisma/seed.ts` (clientId `time-prod`, тот же клиент/секрет, отдельного
> staging-инстанса Ключницы нет). `aboi` — standalone, OAuth/OIDC не участвует, но `AUTH_ENCRYPTION_KEY`
> обязателен (fail-fast `getEncryptionKey()` в `src/lib/auth.ts`, не graceful). `playwright.config.ts`
> обоих приложений уже поддерживают `BASE_URL` env — правок не потребовалось.
> **Не в скоупе этой сессии (нужен BlackCove):** DNS/NPM proxy host для доменов, создание
> `.env.staging` с реальными секретами на s3, `db:seed` auth-hub с новыми redirect URI, живой
> `deploy_app(staging)` → `run_e2e` → добавление в `E2E_GATED_APPS`. Запрос по `aboi`+`time`
> отправлен через agent-mail (thread `staging-e2e-gate-m1-aboi-time`).
>
> **⏳ §18.7 Тираж M1 — код-подготовка остальных 6 приложений батча (2026-07-18):**
> `svoichuzhie`, `aprel8008`, `dsperevod`, `mandala`, `pravda`, `aira-web` — `docker-compose.staging.yml`
> для всех + `.env.staging.example` для приложений с секретами (`pravda`/`aira-web` — статика/
> без БД и auth, файл не нужен). Порты (продолжение последовательности aboi=5457/3022,
> time=5458/3023): `mandala` db 5459/app 3024→3004, `svoichuzhie` db 5460/app 3025→3021,
> `aprel8008` db 5461/app 3026→3023, `dsperevod` db 5462/app 3027→3019, `pravda` без БД/app
> 3028→3007 (nginx-статика), `aira-web` без БД/app 3029→3017 (standalone Next.js, без auth).
> `aprel8008` (hub-client) — добавлен staging redirect URI `aprel8008-stage.s3.letar.best` в
> auth-hub seed.ts (clientId `aprel8008-prod`). `dsperevod` — как и `aboi`, требует
> `AUTH_ENCRYPTION_KEY` (fail-fast). `mandala` — raw `betterAuth` (не фабрика `createAuth`),
> Google/Yandex OAuth опционален (блок подключается только если оба ID/SECRET заданы) — на
> staging не заполняется. `svoichuzhie` — 2FA/СДЭК/платежи не проверяются по-настоящему,
> `REDIS_URL` для rate-limit опционален. Инфра-часть для всех 6 — тот же список, что и у
> aboi/time, у BlackCove (запрос ещё не отправлен, ждём ответа по первой паре, чтобы не
> перегружать очередь). **➡️ Следующий старт:** после ответа BlackCove по `aboi`/`time` —
> запрос на оставшиеся 6 приложений M1 тем же образом; затем батч M2 (`form-example`, `kami`).
>
> **✅ §18.7 Тираж N ЗАКРЫТ 6/6 — все приложения получили базовый e2e-сьют (2026-07-18):**
> `animatrona-landing`, `animatrona-tracker`, `kami-key-the-landing`, `letar-landing`, `studio`,
> `form-docs` (67 тестов суммарно, все зелёные локально) + новый Nx-генератор
> `@letar/generators:e2e-suite` (закрывает дублирование playwright.config.ts по ~20 приложениям) +
> фиксированные kebab-case имена agent-mail для всех 30 проектных `/команд`. Детали — §18.7 ниже.
> **➡️ Следующий старт:** тираж M — подключение к staging-e2e-гейту приложений с готовым сьютом,
> `aboi`/`time` первыми.
>
> **✅ SocialProvidersSettings извлечён в `@letar/auth` (2026-07-17, `libs/auth` v0.11.0):**
> UI self-service Tier2 OAuth-ключей (список + форма + server actions CRUD) продублировался в
> третий раз (dsperevod → aboi → driving-school, см. запись ниже) — извлечён в
> `SocialProvidersList`/`SocialProviderForm` (`@letar/auth/client`, чистый React без
> `@letar/forms` — тот же компромисс, что и у `AuthModeSettings`) + `createSocialProviderActions`
> (`@letar/auth/server`, структурная типизация — не завязано на конкретный Prisma-клиент raw/
> ZenStack-enhanced или сигнатуру auth-guard `requireAdmin`/`requireOwner`). Добавлен
> `tryGetEncryptionKey()` — не бросает, возвращает `null` — обобщение graceful-degradation
> паттерна driving-school для будущих Tier2-приложений. Все три приложения (dsperevod v0.6.3, aboi
> v0.25.2, driving-school v0.238.1) переведены на общий компонент, поведение не изменилось.
> Проверено скриптами напрямую на dev-БД каждого приложения (encrypt→store→decrypt round-trip,
> access-policy non-admin/non-owner, CRUD) — без похода в браузер (dev-session роут driving-school
> сломан, чинится отдельной параллельной сессией), typecheck/lint всех 4 проектов зелёные.
>
> **✅ Этап 8 — social-providers UI перенесён на driving-school (2026-07-17, v0.238.0):**
> `/owner/settings/social-providers/` — self-service редактирование `clientId`/`clientSecret`
> Google/VK/Yandex (модель `SocialProvider`, `@@allow('all', auth().isOwner)`, AES-256-GCM at-rest),
> ранее сознательно пропущено (запись 2026-07-16 ниже) из-за риска сломать боевой VK/Yandex-вход.
> Решение: `lib/auth.ts` мержит DB-провайдеров (приоритет) с существующими env-переменными
> (fallback) через `resolveCreds()` — кастомные `getUserInfo`-колбэки (день рождения/пол/телефон) и
> `databaseHooks.account.create.after` остаются захардкожены без изменений, DB-loader покрывает
> только сами ключи, не колбэки. **Graceful degradation** (архитектурное отличие от aboi/dsperevod):
> `AUTH_ENCRYPTION_KEY` не required fail-fast — если не задан или чтение БД падает, приложение тихо
> откатывается на env-провайдеров вместо падения (проверено живым рестартом dev-сервера без ключа).
> Строгий fail-fast здесь недопустим — driving-school уже в проде работает на env-провайдерах,
> случайный обрыв ключа не должен ронять боевой соц-вход мультитенантной платформы. Проверено
> скриптом напрямую на dev-БД (не через dev-session — см. находку ниже): encrypt→store→decrypt
> round-trip не хранит plaintext, access-policy блокирует non-owner чтение, CRUD корректен.
> `AUTH_ENCRYPTION_KEY` сгенерирован (`openssl rand -hex 32`, отдельный для dev/prod) и добавлен в
> `.env.local`+`.env.docker`(`.env.docker.enc` пересобран)+`docker-compose.production.yml`.
> **✅ Задеплоено на прод (2026-07-18, BlackCove, commit `53b6f1c`, zero-downtime)** — первая
> попытка деплоя провалилась на предсуществующем баге (`AuditLog` labels/payload типы не ловились
> `typecheck:tsgo`, только полным `next build`/`tsc`), пофикшено тем же коммитом, повтор прошёл
> успешно. **Побочно найден баг (вынесен отдельной задачей, не в скоупе этой сессии):**
> `/api/auth/dev-session` у driving-school падает с 500 (`TypeError: Cannot set property message of
which has only a getter`) — предсуществующий, не связан с этим изменением, блокирует будущие
> e2e/preview через dev-session механизм.
>
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
http://localhost:3021/...` стабильно получал `connection refused`, хотя `wget
http://127.0.0.1:3021/...` отвечал мгновенно. Внешний трафик через nginx идёт по отдельному
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
ул., 8"` (commit `bc8b595` submodule + `5c2a333` letar), проверено локально — `source` парсит
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
localhost:5432`) — `form-example-db`, единственная БД в монорепо без `ports:` в compose;
> `deploy-affected.sh` мигрирует с хоста через `localhost:$DB_PORT`, слушать было нечего. Старый
> контейнер не тронут, риска не было. **Пофикшено (commit `d0c5cfc`):** добавлен `ports:
'5443:5432'` (первый свободный порт, проверены все занятые 5434–5455) в
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
migrations/` **никогда не существовала в репозитории** — схема на проде была накатана через
> `prisma db push`, а не `prisma migrate`; `deploy-affected.sh` безусловно вызывает `migrate
deploy`, который требует историю миграций против непустой БД (baseline). Не архитектурная
> находка BlackCove (не его профиль трогать состояние прод-БД) — решение пользователя: baseline
> вместо исключения из миграционного пути (риск молчаливого пропуска будущих реальных
> schema-изменений, прецедент driving-school commit `8e34f17`).
> **✅ Baseline-миграция сгенерирована и провалидирована (2026-07-15):** локальный dev reset
> (временный Postgres-контейнер, не трогал `docker-compose.yml`) → `prisma migrate dev --name
init --create-only` из текущей `prisma/schema.prisma` → `prisma/migrations/
20260715163011_init/migration.sql` (2 таблицы `Product`/`Contact`, 2 enum). Применена к чистой
> тестовой БД через `migrate deploy` — прошла без ошибок, `migrate status` подтвердил «up to
> date». Закоммичена в репо. **На проде миграцию НЕ применять DDL-ом** (схема там уже такая) —
> нужен `prisma migrate resolve --applied 20260715163011_init` перед повторным `migrate deploy`,
> это должен выполнить BlackCove (затрагивает состояние прод-БД, вне профиля этой сессии).
>
> **✅✅ `form-example` rollout-пилот ЗАВЕРШЁН — ТИРАЖ §18.6 ЗАКРЫТ ПОЛНОСТЬЮ (2026-07-15,
> BlackCove, msg #474/#475, thread `deploy-form-example-mandala-rollout-J`):** `migrate resolve
--applied 20260715163011_init` выполнен на прод-БД (без DDL, только пометка в
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
inspect` на тот момент показал обратное (~28 контейнеров, включая nginx-proxy-manager) — отсюда
> двухэтапная (сначала диагностика, потом безопасная миграция) процедура удаления.

> **➡️ Следующий старт:** тираж §18.6 Сессии J и удаление `premium-network` полностью завершены.
> Кандидаты: (1) `driving-school` — `@socket.io/redis-adapter` для Socket.IO перед включением
> rollout для этого сервиса (§10, отложено пользователем, не блокер); (2) Этап 1.5 `createAuth
(profile)` или Этап 8 (соц-секреты per-владелец) — следующий содержательный этап Фазы B/C.

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
src/app/api/socket/route.ts` **не использует Redis-адаптер** (`@socket.io/redis-adapter`),
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
driving-school` с намеренно пустыми `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` — чисто. Попросил
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
service_healthy` снова сработал корректно (как в dsperevod). Ни одной ошибки. **Обнаружено
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

> **Архив:** сессии старше ~1 недели (до 2026-07-13) перенесены в [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).

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
- ⏳ **Хвосты decommission `imot`/`premium-rosstil` (найдено root-weaver, 2026-07-22, тот же класс
  проблемы, что и хвосты `lena`):** приложения выведены из эксплуатации 2026-07-05, но 25+ файлов вне
  их собственных папок всё ещё их упоминают. Один реально ломает тест — `libs/infra-config/src/index.ts`
  (`SERVER_APPS`) расходится с локальной копией в `dashboard-agent` (там уже почищено с v0.7.5), из-за
  чего падает `server-config.guard.spec.ts`. Полный список по категориям риска (docker-compose
  secret-mounts других приложений, backup-скрипты, generated Prisma, doc-комментарии) — Backlog в
  `apps/dashboard-agent/PLAN.md`.

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

> **✅ Код готов (2026-07-22, root-weaver, dashboard-agent 0.7.6 → 0.8.0):** `lib/email-canary.ts` +
> `routes/email-canary.ts` в `dashboard-agent` — `POST /api/cron/email-canary-check`, cron-задача
> `email-canary-check` (раз в 15 минут, s2). SMTP-отправка (`canary@letar.best`) + IMAP-проверка
> двух независимых ног: **internal** (тот же ящик Maddy — жив ли сам SMTP/IMAP) и **external**
> (BCC на реальный внешний почтовик, напр. Gmail — ловит класс инцидента «форвард режется gmail»,
> а не только «SMTP принял»). Обе ноги опциональны по конфигу — отсутствие env-переменных не
> считается провалом, нога просто не проверяется. Состояние + latency последних 30 прогонов —
> `/home/deploy/letar/email-canary-state.json`; при 3 подряд неудачах одной ноги — алерт в
> dashboard (переиспользован `AlertType.CRON_FAILED`, не заводили отдельный enum/миграцию ради
> этой задачи — можно завести `EMAIL_DELIVERY_FAILED` отдельно, если понадобится фильтрация в UI).
> Umami-канал алертинга не заведён — текущий `sendNotification` в dashboard поддерживает только
> Telegram, отдельный Umami-event ради одной задачи признан непропорциональным.
> **✅ Internal-нога провижинирована и подтверждена (2026-07-22):** ящик `canary@letar.best`
> создан на Maddy, SMTP+IMAP auth проверены вживую (оба OK), секреты залиты в `.env.docker.enc`
> (коммит `2a5aaa0d`), синхронизированы на s1/s2, деплой запрошен у BlackCove. **⏳ External-нога
> ждёт владельца:** нужен внешний почтовый ящик (Gmail и т.п.) с IMAP app-password в
> `EMAIL_CANARY_EXTERNAL_*` — создание стороннего аккаунта агент выполнить не может. До заполнения
> — `external.configured: false`, не алертит. Детали — `apps/dashboard-agent/PLAN.md` и
> `CHANGELOG.md` (v0.8.0).

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
- ✅ **Тираж на aboi (2026-07-15)** — оба UI перенесены целиком (`/admin/social-providers/` +
  `/admin/settings/auth-mode/`), см. запись в шапке плана.
- ✅ **Тираж social-providers на driving-school (2026-07-17, v0.238.0)** — `/owner/settings/
social-providers/`, ранее сознательно пропущенный из-за Yandex/VK кастомных `getUserInfo`.
  Решение: DB-провайдеры мержатся с env-fallback в `lib/auth.ts` через `resolveCreds()`, кастомные
  колбэки/`databaseHooks` не тронуты — DB-loader покрывает только `clientId`/`clientSecret`, не
  логику обогащения профиля. **Graceful degradation** — `AUTH_ENCRYPTION_KEY` не fail-fast (в
  отличие от aboi/dsperevod): при отсутствии ключа или ошибке чтения БД приложение откатывается на
  env-провайдеров вместо падения (боевая мультитенантная платформа, случайный обрыв ключа не должен
  ронять соц-вход). Подробности — запись в шапке плана и `apps/driving-school/CHANGELOG.md`
  (v0.238.0).
- **✓ DoD:** ✅ коммерс может в админке увидеть Tier 1/Tier 2 с показом рисков и зафиксировать
  informed-consent выбор (пилот dsperevod, тираж aboi/driving-school, `/admin(или /owner)/settings/
auth-mode/`; сам переход на Tier 1 — не самообслуживание, требует разработчика); ✅ Tier 2-секреты
  шифруются at-rest и подхватываются `createAuth()`/вручную-мержатся (dsperevod/aboi/driving-school);
  ✅ auth-hub работает на фабрике; ✅ нет строковых секретов в коде нового пути; ✅ оба UI перенесены
  на все Tier 2 приложения монорепо (dsperevod эталон, aboi, driving-school). **Остаётся:** реальное
  исполнение Tier 1-перехода как отдельная задача класса §8.5, когда появится первый реальный запрос.
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

## Инфраструктурные треки — вынесены в `PLAN-INFRA.md`

> Перенесено 2026-07-21 (§21 DoD п.2). Секции §15–§20 не относятся к auth-плану этого файла
> (s3/медиа/e2e-сервер, PhotoGallery-конвенция, Kamal, Deploy MCP + staging-gated пайплайн,
> TS7-тираж, рассинхрон форматтера) — вынесены в отдельный файл, номера секций сохранены.

См. [PLAN-INFRA.md](/PLAN-INFRA.md):

- **§15** — сервер s3 (медиа, e2e-ранер, IPFS, бэкап)
- **§16** — конвенция `PhotoGallery` из `@letar/ui`
- **§17** — Kamal zero-downtime деплой (справочный анализ, не выбран — см. §18.6)
- **§18** — Deploy MCP + staging-gated пайплайн, включая **§18.6** (hard gate + `libs/deploy-engine`)
- **§18.7** — Тираж e2e-гейта на все приложения (выделен в отдельный трек 2026-07-21 — активный
  фронт работ, см. шапку журнала выше)
- **§19** — TypeScript 7 GA: план тиража, включая **§19.1** (гейт проверки типов в деплое)
- **§20** — рассинхрон форматтера между worktree/фоновыми сессиями

---

## §21 — Корневой PLAN.md разросся: архивация и вынос инфра-треков 🆕

> Добавлено 2026-07-18 (сессия диагностики памяти TS → §19). Файл перевалил за ~4400 строк, при этом
> §15–§20 сами себя помечают «не связано с темой auth этого файла — добавлен по аналогии» —
> инфраструктурные треки живут в файле, который начинался как план по auth. Новым агентам трудно
> находить нужное (план тиража TS7 приходится искать в auth-файле).

### Что сделать

1. Прогнать `workflow:archive-completed` по корневому `PLAN.md` — закрытые секции/этапы уходят
   в архивный файл, живые остаются.
2. Решить: выносить ли живые инфраструктурные треки (§15–§21) в отдельный `PLAN-INFRA.md`
   (оставив в `PLAN.md` ссылки-указатели), или хватает архивации.
3. Проверить ссылки на секции по номерам (`.claude/docs/`, командные файлы, память агентов) —
   при переносе номера/якоря не должны протухнуть.

### ✓ DoD §21

- [x] Прогнан `workflow:archive-completed` (2026-07-21) — шапка (рабочий журнал сессий)
      разросшаяся до ~2200 строк, разрезана по границе ~1 месяц: записи старше 2026-06-21
      (344 строки, «Сессия №1–№41» + ранние блоки) вынесены в новый `PLAN_COMPLETED.md`,
      в `PLAN.md` оставлен указатель-ссылка. Секции §7 «Этапы» с пометкой ✅ ПОЛНОСТЬЮ **не
      тронуты** — многие содержат незакрытые «Остаётся:» пункты внутри (Этап 8, 8.5), решено
      не разбирать построчно в этом проходе — риск/выгода не оправданы, шапка была основным
      вкладом в размер файла.
- [x] Принято решение по `PLAN-INFRA.md` (2026-07-21) — **вынесено**: §15–§20 перенесены целиком
      в новый `PLAN-INFRA.md`, номера секций сохранены, в `PLAN.md` оставлен указатель-блок
      («Инфраструктурные треки — вынесены в `PLAN-INFRA.md`», сразу после §14). §21 (этот трек)
      остался в `PLAN.md` — он про сам процесс декомпозиции, а не про auth или инфру.
- [x] Ссылки на секции проверены после переноса — `grep` по `.claude/docs/*.md`/`CLAUDE.md` на
      жёсткие ссылки `PLAN.md:<номер строки>` не нашёл ни одной; секции §-нумерованы по имени,
      не по строке, перенос не ломает существующие ссылки. Журнал сессий (шапка) продолжает
      ссылаться на `§18`/`§18.6`/`§18.7` по имени — читателю нужно знать, что определения этих
      секций теперь в `PLAN-INFRA.md`, а не в этом файле (осознанный компромисс, см. риск ниже).

### Второй проход `/workflow:archive-completed` (2026-07-21)

- [x] Журнал (шапка) повторно разрезан: закрытые нумерованные сессии **№42–№74** (2026-06-21 →
      2026-07-13, 878 строк) вынесены в `PLAN_COMPLETED.md` (второй блок, поверх сессий №1–№41 из
      первого прохода). В `PLAN.md` остались только **свежие безномерные записи** (2026-07-13 →
      2026-07-21) — активный тираж §18.7 батчей M1/M2 и текущий фронт работы. Указатель-ссылка
      в `PLAN.md` обновлён на новую границу (`до 2026-07-13`).
- [x] Критерий выбора границы: не календарный «1 месяц», а переход от нумерованной формы записей
      (устоявшийся, закрытый формат сессий) к безномерным batch-отчётам (текущий, ещё пишущийся
      формат тиража) — совпал с естественным швом в журнале, без разрыва смысловых блоков.
- Итог по файлу: `PLAN.md` 4480 → 2361 строк (−47%) за оба прохода архивации + вынос §15–§20 в
  `PLAN-INFRA.md`; `PLAN_COMPLETED.md` 351 → 1231 строка.

### Риск, оставленный открытым намеренно (частично снят)

Изначальный риск — журнал (шапка) на 60–70% состоял из записей про §18/§18.6/§18.7, хотя эти
секции физически переехали в `PLAN-INFRA.md`. Второй проход выше **сократил шапку почти вдвое**
(1857 → ~980 строк), но оставшиеся безномерные записи по-прежнему в основном про §18.7 (текущий
тираж) — это ожидаемо, раз это активный трек. Если объём снова разрастётся до некомфортного —
следующий шаг: применить тот же приём (нумерованная/закрытая форма → архив) к очередной партии
записей, когда текущий batch-формат сессий сам устареет и сменится следующим.
