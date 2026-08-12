# `NODE_ENV === 'production'` не отличает прод от staging и от локальной сборки

Правило и его причина коротко — `.claude/rules/env-files.md` § «`NODE_ENV === 'production'` —
та же ловушка бьёт не только секреты». Здесь — три случая, где это фактически ломало прод/CI,
для справки при диагностике похожих симптомов.

## Корень проблемы

`next build`/`next start` **всегда** выставляет `NODE_ENV=production` — в том числе при сборке
staging-образа и при обычном `nx build <app>` на машине разработчика. Любая проверка вида
`x: process.env.NODE_ENV === 'production'` поэтому не отличает «это реальный прод» ни от
staging, ни от прод-сборки на dev-машине.

## Случай 1: `ALLOW_DEV_SESSION` — бэкдор-эндпоинт (исходное правило)

Приложения со staging-e2e через `@letar/auth/server` `createDevSessionRoute` (см.
`grandslamcup`) держат в `.env.staging` пару переменных, открывающую бэкдор `/api/auth/dev-session`
— создание сессии для любого email без пароля/OIDC. Проверка `NODE_ENV === 'production'` не
защитила бы прод, будь она единственным барьером — единственная защита — явный флаг + токен,
задаваемые вручную per-окружение и никогда не попадающие в `.env.docker`/`.env.docker.enc`.

## Случай 2: `aboi` — meta robots vs robots.ts противоречили друг другу (2026-07-28)

`meta robots` в `generateMetadata()` был завязан на `NODE_ENV === 'production'`, из-за чего на
staging (`aboi.letar.best`) meta-тег разрешал `index, follow`, а `robots.ts` в том же приложении
честно проверял `BASE_URL` и отдавал `Disallow: /` — два файла противоречили друг другу на одном
домене.

Урок: для решений, зависящих от «это прод или нет» (индексация, дев-бэкдоры, debug-панели,
verbose-логи), проверять явный домен/URL (`BASE_URL`/`NEXT_PUBLIC_BASE_URL` против списка
прод-доменов), а не `NODE_ENV`. Если в приложении уже есть такая проверка (как
`IS_PRODUCTION_DOMAIN` в `robots.ts`) — выносить её в общую константу и переиспользовать везде,
а не писать вторую похожую проверку рядом.

## Случай 3: `kami` — локальная сборка задела прод-хранилище (2026-08-05)

Другой корень того же класса: не расхождение prod/staging, а расхождение **локальная сборка vs
рантайм**. `keystatic.config.ts` и `src/lib/keystatic.ts` переключают `storage`/`reader` на
GitHub через `isProd = NODE_ENV === 'production'`. Поскольку `next build` выставляет
`NODE_ENV=production` и при обычном локальном запуске, GitHub-ветка конфига включалась уже на
`nx build kami` на машине разработчика — без `KEYSTATIC_GITHUB_CLIENT_ID`/`_SECRET`,
`KEYSTATIC_SECRET` и `GITHUB_PAT` в `.env.local` сборка падала на `Failed to collect page data`,
хотя разработчик не собирался трогать прод-хранилище. Деталь сессии —
`apps/kami/PLAN_COMPLETED.md`.

## Случай 4: `kami/src/lib/keystatic.ts` — тот же баг рядом, не пойман при первом фиксе (2026-08-12)

Фикс `keystatic.config.ts` (Случай 3) не заметил `src/lib/keystatic.ts` — второй файл с точно
такой же веткой `const isProd = NODE_ENV === 'production'`, определяющей `reader` (GitHub vs
локальный). Почищено вместе с ревизией ниже: условие — `Boolean(process.env.GITHUB_PAT)`, как и
в соседнем `keystatic.config.ts`.

## Ревизия ESLint-правила (2026-08-12)

Точечные фиксы трижды не удерживались — правило возвращалось в новом месте быстрее, чем успевали
его находить руками. Заведён системный барьер: `no-restricted-syntax` в корневом
`eslint.config.mjs` ловит `process.env.NODE_ENV === /!== 'production'` в обе стороны сравнения
(включая `'production' === process.env.NODE_ENV`), не трогая легитимные `'development'`/`'test'`.

Полный прогон по репозиторию (grep + точечный разбор каждого вхождения, 2026-08-12) нашёл 34
файла реального кода (без учёта `.md`/`PLAN*`/generated) с этим паттерном. Разбивка:

- **1 новая находка, требовавшая фикса** — Случай 4 выше (`kami/src/lib/keystatic.ts`).
- **Build-тулинг (легитимно)** — `next.config.js/mjs`, `webpack.config.js` Electron-приложений,
  шаблоны генератора `libs/generators/.../electron-app/files/**`: NODE_ENV здесь задаёт сам
  тулинг сборки (webpack `mode`/`devtool`), а не расползается из `next build` в рантайм.
- **Electron main-процесс (легитимно)** — `animatrona`, `label-printer-desktop`,
  `poster-microtext-desktop`: паттерн `app.isPackaged || NODE_ENV === 'production'`. Первичный
  сигнал — `app.isPackaged` (packaged-сборка vs `electron .` в dev), NODE_ENV только fallback.
  У Electron-приложений нет понятия staging-домена — граница прод/стейдж, из-за которой правило
  вообще завели, здесь физически не существует.
- **Разобранные точечно легитимные рантайм-случаи (низкий риск, оставлены как есть)**:
  - `secure: NODE_ENV === 'production'` для cookie (`auth-hub`, `mandala`, `driving-school`) —
    корректно для ЛЮБОЙ собранной сборки (staging тоже отдаётся по https), доменное различие
    здесь не нужно — это не тот же класс бага, что индексация/бэкдоры;
  - Prisma/`Pool` dev-singleton-cache `if (NODE_ENV !== 'production') globalForX.x = x`
    (`aboi`, `driving-school`, `animatrona-tracker`, `form-develop-app`) — стандартный паттерн
    из документации Prisma; на staging просто не кэширует между HMR-перезагрузками (которых на
    staging и нет) — безвредно;
  - выбор backend для rate-limit storage `database`/`memory` (`kami/src/lib/auth.ts`,
    `libs/auth/src/server/create-auth/index.ts`, включая `requireEmailVerification`) — не
    security-decision, а производительность/устойчивость; на staging просто использует более
    строгий/персистентный backend, чем в dev;
  - dev-only `console.error`/видимость debug-панели в `@letar/forms`/`@letar/forms-shadcn`
    (`form-debug-values.tsx`, `use-computed-value.ts` × 2) — тише на staging, не риск;
  - `auth-hub/src/lib/db.ts` (throw при отсутствии `AUTH_ENCRYPTION_KEY`), `dashboard-agent`
    (pino-pretty transport), `dashboard/src/instrumentation.ts` (лог запуска),
    `archetest` (`service-worker-registration.tsx`, `dev/layout.tsx`) — во всех случаях эффект
    на staging строже/безопаснее, а не слабее, чем задумано (SW регистрируется, `/dev`
    прячется, шифрование требуется) — не тот класс риска, который правило призвано ловить;
  - `svoichuzhie/src/lib/auth.ts` — уже самостоятельно защищён: условие
    `NODE_ENV !== 'production' || ALLOW_DEV_SESSION === 'true'` на staging (NODE_ENV=production)
    включается только явным `ALLOW_DEV_SESSION`, который никогда не попадает в
    `.env.docker`/`.env.docker.enc` (см. `.claude/rules/env-files.md`).

Allow-list на все перечисленные случаи — в `eslint.config.mjs`, с комментариями и ссылкой сюда.
Проверено `nx lint` на 18 проектах (все затронутые + несколько контрольных без вхождений) —
правило не даёт ложных срабатываний на `NODE_ENV === 'development'`/`'test'`.

## Итог

Четыре независимых случая, четыре разных следствия (открытый бэкдор, противоречивая индексация,
падающая локальная сборка, пропущенный при первом фиксе дубль) — один и тот же неверный сигнал.
`NODE_ENV` не говорит, где на самом деле выполняется код: ни staging от прода не отличает, ни
прод-сборку разработчика от прод-сервера. С 2026-08-12 это больше не держится на памяти —
`no-restricted-syntax` в корневом `eslint.config.mjs` не даст паттерну вернуться незамеченным.
