# PLAN.md — Архив выполненных сессий (до 2026-07-13)

> Архив рабочего журнала (шапки) корневого `PLAN.md` — записи сессий старше ~1 недели.
> Первый проход (сессии №1-41, до 2026-06-21) — 2026-07-21 (`/workflow:archive-completed`, §21).
> Второй проход (сессии №42-74, до 2026-07-13) — 2026-07-21 (`/workflow:archive-completed`, повторный запуск).
> Активный журнал — см. верх `PLAN.md`.

---

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
kami-network`, все 44 контейнера с `premium-network` подключены и к `kami-network` (без
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
/products`, если кто-то захочет копнуть глубже Prisma 7 + Turbopack.

> **Сессия №72 (2026-07-12, §18.6 Сессия J — `form-example` обычный деплой закрыт, найден
> отдельный баг Prisma/`ECONNREFUSED` на `/products`):**
> Закрыла зависший из Сессии №70 пункт — задеплоила `form-example` с двумя изменениями сразу
> (коммиты линейны, конфликта резервации не было): compose-миграция под rollout-профиль
> (`098eb75`, IvoryPrairie) + вынос захардкоженного `POSTGRES_PASSWORD` в `.env.docker.enc`
> (`df5602179`, BronzeForge). Ротация пароля требовала ручного шага **до** пересборки: достала
> новый `POSTGRES_PASSWORD` из расшифрованного `.env.docker.enc`, выполнила `ALTER USER forms
WITH PASSWORD ...` на уже работающем `form-example-db`, только потом обычный деплой (пересоздал
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
