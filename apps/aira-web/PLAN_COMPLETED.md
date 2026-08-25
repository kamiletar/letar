# PLAN_COMPLETED — aira-web

## GlitchTip AIRA-WEB-1: `ContextError` при переключении языка (2026-08-25)

GlitchTip issue 604: `ContextError: useContext returned 'undefined'... forgot to wrap component
within <ChakraProvider />`, впервые 2026-08-18, ~9 срабатываний/неделю. Breadcrumb последнего
события — soft-навигация `to: "/ru", from: "/ru"`, то есть клик по `locale-switcher.tsx` (даже на
уже активной локали вызывает `router.replace`).

Root cause — тот же класс бага, что уже найден и закрыт на `auth-hub`/`mandala`/`dashboard`/
`driving-school`/`animatrona-tracker` (разбор —
[nextjs16-turbopack-default-emotion-hydration.md](/.claude/docs/nextjs16-turbopack-default-emotion-hydration.md)):
`project.json` не переопределял `dev`/`build`, оба таргета наследовались от `@nx/next` плагина
как голый `next dev`/`next build` → Turbopack по умолчанию (Next.js 16). Комбинация Chakra v3
`ChakraProvider` (рендерит emotion `<Global>`) + `next-themes` `ColorModeProvider` под Turbopack
триггерит hydration mismatch на клиентской навигации, React отбрасывает и заново монтирует
поддерево `<body>` — в момент этой пересборки хуки Chakra в свежесмонтированных компонентах могут
не увидеть провайдер.

Фикс — тот же паттерн: частичный override `options.command` для `build`/`dev` в `project.json`
(`next build --webpack` / `next dev --webpack`), без дублирования `cache`/`inputs`/`outputs` —
проверено `nx show project aira-web --json` до/после, смержилось только поле `command`.

**Проверка:** живая репродукция через Browser pane (`nx dev aira-web` под webpack) — клик по
переключателю языка на уже активной локали, переключение en→ru→en несколько раз подряд, включая
быстрые повторные клики — ни разу `ContextError`/hydration-краш, только известное безвредное
предупреждение `next-themes` про `<script>`-тег (см. тот же doc-файл). `nx build aira-web`
проходит с явным `(webpack)` в выводе. Добавлен регрессионный e2e-тест
`apps/aira-web-e2e/src/locale-switcher.spec.ts` — клик на текущей локали и переключение en↔ru не
дают `pageerror` в консоли.

## Touch target для текстовых ссылок — WCAG 2.5.5 (2026-08-25)

Аудит по всему монорепо нашёл 2 ссылки без достаточной высоты клика на мобильном:
`[locale]/privacy/page.tsx` («← Aira») и `_components/footer.tsx` («Privacy»). Обе идут через
locale-aware `Link` из `@/i18n/navigation` (next-intl) — общий компонент `TouchLink` (`@letar/ui`)
для них не подходит (жёстко берёт `next/link`, сломал бы префикс локали). Фикс — `minH="2.75rem"
alignItems="center"` прямо на существующем `Link asChild`, без замены компонента. Внешние ссылки
(github/spec/releases, `target="_blank"`) не тронуты.

## Выполненные задачи

- [x] Фикс: `CookieBanner` рендерился вне `ChakraProvider` (2026-08-25). Тот же класс бага, что
      только что найден и исправлен в `apps/time` (commit `b5b138cd`) — `[locale]/layout.tsx`
      рендерил `<CookieBanner appKey="aira-web" />` сиблингом после закрывающего `</Providers>`,
      а не его потомком. Пока `shown === false` (до первого эффекта, читающего `localStorage`)
      баннер рендерит `null` и ошибка не видна; как только эффект выставляет `shown = true`,
      падают реальные Chakra-компоненты (`Box`/`Checkbox`/`Button`/...) вне дерева
      `RootChakraProvider` — `ContextError: useContext returned undefined`. Образец правильного
      вложения — `apps/driving-school/src/app/layout.tsx`. Фикс — перенос `<CookieBanner>`
      внутрь `<Providers>`/`<NextIntlClientProvider>`. Версия 0.3.4. Подтверждено живьём через
      Browser pane (`nx dev aira-web`, консоль без `ContextError`, баннер рендерится).
- [x] Фикс: `config.matcher` в `proxy.ts` обязан быть литералом, не вызовом `buildIntlMatcher()`
      (2026-08-21). Репо-широкий баг из apps/kami (§18.7 M2): Next.js 16 статически парсит
      `config.matcher` через AST на build-time без исполнения модуля, `CallExpression` не
      поддерживается — `next build` падал, хотя typecheck/lint проходили чисто. Matcher инлайнен
      литералом `['/((?!api|_next|_vercel|.*\\..*).*)', '/']`, `proxy.spec.ts` дополнен
      regression-тестом (текстовый разбор файла, сверка с `buildIntlMatcher(опции)`). commit
      `b8210b38`.
- [x] Matcher next-intl перенесён на `@letar/i18n-proxy` (2026-08-21) — `buildIntlMatcher()` из
      общей `libs/i18n-proxy`, та же логика (api/_next/_vercel исключены), без изменения
      поведения. Аудит ниже подтверждён верным, добавлен `proxy.spec.ts`
      (`findUndeclaredMetadataRoutes`) — ловит появление нового metadata-роута тестом, а не
      ручным аудитом.
- [x] Аудит matcher proxy.ts — баг studio не подтвердился (2026-08-21). Проверка класса бага из
      apps/studio (matcher не исключал metadata-роуты без расширения в URL). В aira-web
      `opengraph-image.tsx` живёт внутри `src/app/[locale]/` — это уже locale-scoped роут, не
      глобальный, matcher его не должен трогать отдельно. `src/app/manifest.ts` отдаёт
      `/manifest.webmanifest` — точка в URL есть, dot-wildcard-исключение ловит штатно.
      `icon`/`apple-icon`/`twitter-image` в приложении нет. Изменений не потребовалось.
- [x] GlitchTip (staging + production) + первый `.env.staging.enc` (не существовал вообще) +
      healthcheck в прод-compose — последний пробел из 24 приложений монорепо (2026-08-12,
      PLAN-INFRA.md §70)
- [x] `tsconfig.json`: убраны `references` на библиотеки — TS6305/TS6059 (2026-08-07)
  - Тот же баг, что в `dashboard-agent` (0.11.1, `.claude/rules/libs.md` § «Тот же редирект под
    обычным `tsc`»): `references` на `../../libs/*` вели на solution-конфиг библиотек и
    редиректили на `tsconfig.spec.json`, давая вечный `TS6305`. Массив `references` убран целиком
    (своего `tsconfig.spec.json` в файле не было)
  - Побочный эффект — `TS6059: not under rootDir` после снятия project references; фикс —
    явный `"rootDir": "../.."` в `compilerOptions`
  - Проверено: `nx typecheck:tsgo aira-web --skip-nx-cache` — было 8 ошибок TS6305/TS7006,
    стало 0. `nx build aira-web` — зелёный
- [x] v0.3.1 — архитектура браузерного демо Aira, проработка без кода (2026-07-30)
  - Запрос владельца: «может ли Aira работать прямо в браузере, чтобы попробовать без установки —
    учётка заводится сама, потом юзер скачивает свой профиль». Сессия целиком проектная: кода нет,
    результат — план здесь и задачи в спеке `kamiletar/aira`
  - **Вердикт: реально, и дешевле, чем предполагала спека Aira.** Разбор — `PLAN.md`, Фаза 2
  - Что подтвердилось исследованием: `iroh` официально собирается под `wasm32` (есть рабочие
    примеры от n0); `aira-core` весь wasm-совместимый, кроме опционального `aws-lc-rs`; `redb`
    работает в браузере через `redb-opfs` (крейт Wire); COOP/COEP и `SharedArrayBuffer` **не
    нужны** — feature `parallel` у `argon2` выключена, `rayon` в workspace нет; IPC демона Aira
    ложится на `postMessage` воркера один-в-один — **воркер = демон**
  - Найденная ловушка: `Platform::Mobile` в `aira-core` используется только в тестах, у профилей
    разные соли → браузер обязан взять Desktop-параметры (256 МБ, t=3, p=4), иначе из той же
    seed-фразы получится **другая личность** и учётка не перенесётся в нативный клиент
  - Честно записаны проигрыши браузера: 100% трафика через relay, вся защита от DPI недоступна,
    нет доставки в фоне, хранилище вытесняется в Safari, проблема доверия к доставке кода
  - **Решения владельца:** демо — отдельное приложение `aira-try` на поддомене (dev-порт 3031);
    интерфейс React/Chakra вместо egui; движок десктопа Tauri v2; граница репозиториев «Rust и
    ядро в `aira`, весь React в `letar`»; юридический вопрос закрыт («реагируем по ситуации»);
    свои relay не поднимаем — разбор в `PLAN.md` §2.8
  - **Заведено в спеку `kamiletar/aira`:** Milestone 14 (WASM-ядро), 15 (голосовые заметки —
    протокол уже был готов, §6.11), 16 (разметка сообщений + §6.25 безопасное подмножество),
    17 (Tauri-клиент + §15.9 границы репозиториев); §15.8 два класса клиентов (CLI и egui
    намеренно минимальные); обоснование отказа от звонков в §1. Коммиты `9333e78`, `37725ef`,
    `971e038`
  - Побочно: заведена команда `/aira-web` (приложения не было в `.claude/commands/`), токен
    агента `aira-web-dev` сохранён в память, политика публикации npm — в `PLAN-INFRA.md` §44
- [x] Лендинг, навигация и SEO — зафиксировано задним числом (2026-07-30)
  - Пункты висели в `PLAN.md` как незакрытые, хотя код давно на месте. Точную дату восстановить
    нельзя: файлы старше `chore: initial commit` (2026-05-16, fresh start из lena)
  - Навигация: `header.tsx` (+ мобильное меню, `skip-to-content`), `footer.tsx`, `locale-switcher.tsx`
  - Секции: `hero.tsx`, `features.tsx`, `security-deep-dive.tsx`, `download-section.tsx`
  - Релизы: `lib/github.ts` — последний релиз из GitHub Releases API, ISR 1 час, разбор ассетов
    installer/portable по платформе и архитектуре. **Отдельных страниц списка и релиза нет** —
    осталось в `PLAN.md`
  - SEO: `opengraph-image.tsx`, `json-ld.tsx`, `sitemap.ts`, `robots.ts`, `lib/seo.ts`, `manifest.ts`
  - Деплой: `docker-compose.production.yml` (порт 3017) + staging-вариант
- [x] Инициализация приложения (2026-04-10)
  - Nx генерация, Chakra UI, тема teal/purple, MDX
  - Umami аналитика
- [x] v0.3.0 — 152-ФЗ: минимальное cookie-уведомление (2026-07-28)
  - Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8). Только Umami-аналитика,
    без аккаунтов/форм — счётчик тоже собирает ПД (IP, cookies)
  - `CookieBanner` из `@letar/ui` (`consentApiUrl={null}` — localStorage-only, нет БД)
  - `analytics-consent.tsx` — Umami инициализируется только после согласия
  - Страница `/[locale]/privacy` (10 локалей, текст политики пока только на русском — осознанное
    упрощение); `@letar/ui` добавлен в `transpilePackages` (`next.config.mjs`)
