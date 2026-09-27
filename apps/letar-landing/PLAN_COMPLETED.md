# Выполненные задачи

## Фикс `tsconfig.json` target (согласованность) — версия 0.5.9 (2026-09-27)

Побочный эффект фикса `TS2737` в `animatrona-landing`/`kami-key-the-landing`/`synth` (BigInt-
литерал в `@letar/format-utils` требует `ES2020+`, эти приложения держали `target: "ES2017"` от
старого `create-next-app`-скаффолда). `letar-landing` саму либу не использует, но
[tsconfig-presets.md](/.claude/docs/tsconfig-presets.md) документирует четвёрку как «100%
единообразную» — target поднят до `ES2022` только ради этого инварианта, функционального риска
нет.

## SEO-аудит и находимость по «Летар»/«Студия Летар» — версии 0.5.6–0.5.8 (2026-09-27)

**0.5.6** — подключён `theme:check` (`themePrefix: 'src/lib/theme.ts'`, тема в одном файле, не в
каталоге, как у `kami`). Первый прогон нашёл 51 находку: 23 закрыты реальным фиксом
(magic-number transition-длительности → `transitionProperty` + Chakra-токен `transitionDuration`;
`scale(0.98)`/`scale(0.99)` в `_active` → `pressScale.lg`/`pressScale['2xl']` из `@letar/ui`),
20 — в allowlist (`viewport.themeColor`, `SocialImage` под `next/og`, decorative-тени). Заодно
починен латентный прод-баг: `@letar/ui` и `@letar/analytics` были только в
`nx.implicitDependencies`, не в реальных `dependencies` — typecheck это не ловил (резолв через
`paths`), а прод-сборка через `node_modules` упала бы `Module not found`.

**0.5.7** — SEO-аудит (`/audit:seo-audit`): внутренняя ссылка на `/privacy` в футере вела без
слэша при `trailingSlash: true` — лишний 308-редирект, исправлена на `/privacy/`. `sitemap.ts`:
`lastModified` главной был захардкожен на `2026-08-28` — обновлён на `2026-09-27`. Canonical/OG
проверены — наследование от `layout.tsx` намеренное, не баг. Заодно добавлена находимость по
кириллическому «Летар»: `title`/`description`/`keywords` дополнены формой `Letar (Летар)`,
JSON-LD `WebSite` получил `alternateName: 'Летар'`, hero-текст явно называет сайт «Letar (Летар)».
`og:title`/`twitter:title` оставлены короткими (`Letar`) — сигнал уже даёт остальная метадата.

**0.5.8** — по запросу пользователя добавлена находимость по «Студия Летар»: в hero-абзаце и на
CTA-кнопке «Перейти в Studio» добавлено `(Студия Летар)`; JSON-LD `Organization` студии получил
`alternateName: 'Студия Летар'` (тот же паттерн, что `WebSite.alternateName` из 0.5.7).

Всё проверено живьём через dev-сервер (`preview_start` + screenshot + `get_page_text`), не только
typecheck/lint. Коммиты: часть 0.5.6 (theme:check), `89567828b` (0.5.7, «Летар»),
`ec62157d7` (0.5.8 + дозаполнение CHANGELOG за 0.5.7).

## Провайдер на `DarkOnlyChakraProvider` — версия 0.5.5 (2026-09-24)

`_components/ui/provider.tsx` сведён к одной строке: `DarkOnlyChakraProvider` из
`@letar/chakra-provider/next` (0.3.0) вместо ручной сборки `EmotionRegistry` +
`ColorModeProvider` + `RootChakraProvider`. Поведение прежнее (принудительно тёмная тема, реестр
Emotion снаружи). В dev сырой HTML без `<style data-emotion>` в `<body>`. Кросс-приложенческий разбор — `PLAN-INFRA-6.md` §201.

## `--webpack` в dev/build — превентивный фикс Turbopack+Emotion hydration (2026-08-25)

Часть аудита `.claude/docs/nextjs16-turbopack-default-emotion-hydration.md` (раздел «Аудит по
всему монорепо»). Приложение сочетает Chakra v3 `ChakraProvider` и `next-themes`'ный
`ThemeProvider` как прямого потомка (`_components/ui/provider.tsx`), `dev`/`build` в
`project.json` были голым `next dev -p 3015`/`next build` без флага бандлера — Turbopack по
умолчанию. Фикс — `--webpack` добавлен к обеим командам (эталон — `apps/mandala`). Живая
репродукция гонки клика не проводилась (превентивный фикс по структурному совпадению, как и на
`aira-web`/`auth-hub`) — `nx typecheck:tsgo`/`nx lint`/`nx build` зелёные.

## Touch target для текстовых ссылок — WCAG 2.5.5 (2026-08-25)

Ссылка «Конфиденциальность» в футере переведена на `TouchLink` (`@letar/ui`).

## tsconfig.json — убраны `references` на `libs/*` (2026-08-07)

Убраны ссылки на `../../libs/analytics` и `../../libs/ui` из `references` (хрупкий редирект на
`tsconfig.spec.json`, см. образец фикса `dashboard-agent` 0.11.1,
`.claude/rules/libs.md`). `references` пустой не остался — ключ был удалён целиком.
`nx typecheck:tsgo` и `nx build` зелёные.

## Версия 0.3.0 — 2026-07-28 (152-ФЗ: минимальное cookie-уведомление)

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8). Только Umami-аналитика, без
аккаунтов/форм. `CookieBanner` из `@letar/ui` (`consentApiUrl={null}` — localStorage-only, нет БД),
`analytics-consent.tsx` (Umami только после согласия), минимальная страница `/privacy` (главная
страница без Navbar — `/privacy` рендерится только с `Footer`). `@letar/ui` не был подключён
(`package.json`/`next.config.js`) — добавлен.

## Версия 0.1.0

### Реализовано

- Базовая структура лендинга (Next.js 16 + Chakra UI v3)

---

**Последнее обновление:** 2026-04-04
