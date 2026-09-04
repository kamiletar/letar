# `@serwist/next` в domwellbes заблокирован: webpack-сборка не проходит

⚠️ **`@serwist/next` работает только под webpack** (см.
[serwist-turbopack-stale-sw-artifact.md](./serwist-turbopack-stale-sw-artifact.md) и
[pwa-offline.md](./pwa-offline.md)), а Next.js 16 по умолчанию собирает `next build` через
Turbopack. Паттерн Serwist+`--webpack` в целом рабочий — `mandala` и `grandslamcup` его уже
применяют. У `domwellbes` (2026-09-04) это тем не менее реальный блокер, не формальность:
`next build --webpack` падает по двум независимым причинам, специфичным именно для этого
приложения (вероятно из-за необычно большого дерева маршрутов — публичный сайт целиком плюс вся
admin-ERP в одном Next.js-приложении, тогда как у `mandala`/`grandslamcup` дерево заметно меньше).

## Причина 1 — исчерпание памяти V8 на дефолтном лимите

С дефолтным лимитом heap (`node ../../node_modules/next/dist/bin/next build --webpack`, без
`NODE_OPTIONS`) сборка падает `FATAL ERROR: Ineffective mark-compacts near heap limit
Allocation failed - JavaScript heap out of memory` — воспроизведено дважды подряд, второй раз
без сетевых ретраев (шрифты `next/font/google` уже закешированы), то есть не сетевой флак, а
устойчивая нехватка памяти именно webpack-графа. У приложения десятки маршрутов (публичный сайт +
`/admin` целиком) — Turbopack-сборка того же дерева укладывается в дефолтный лимит и завершается
за ~1.5 минуты, `--webpack` — нет.

`NODE_OPTIONS="--max-old-space-size=8192"` подавляет OOM (сборка доходит до этапа генерации
статических страниц, ~3.2 мин на компиляцию), но это не готовое решение — см. причину 2.

## Причина 2 — `ContextError` на `/_global-error` под webpack (при поднятом лимите памяти)

С поднятым лимитом памяти сборка доходит до пререндера `/_global-error` и падает:

```
Error [ContextError]: useContext returned `undefined`. Seems you forgot to wrap component
within <ChakraProvider />
```

`src/app/global-error.tsx` **намеренно** не использует `ChakraProvider` — он заменяет собой весь
`layout.tsx` целиком (Next.js требование: `global-error.tsx` сам рендерит `<html>/<body>`), и это
уже задокументировано как allowlist-исключение в `scripts/check-theme-hardcodes.mjs`. Под
Turbopack эта страница пререндерится штатно. Под webpack что-то в графе резолва тянет chakra-хук,
ожидающий контекст — не диагностировано до конца (кандидат: другой инстанс `@chakra-ui/react` в
графе webpack против единственного инстанса в графе Turbopack; не подтверждено).

## Итог

Обе причины — не про Serwist как таковой, а про то, что `domwellbes` никогда не собирался под
webpack и не был на это рассчитан (в отличие от `apps/studio`, где `next build --webpack` —
штатная команда с самого начала, см. `apps/studio/project.json`). Включать `@serwist/next` в
`domwellbes` нельзя, пока:

1. Webpack-сборка не укладывается в разумный лимит памяти (или не выяснено, почему граф настолько
   тяжелее, чем у Turbopack — раздутый `transpilePackages`, дублирующиеся chunk'и и т.п.);
2. `ContextError` на `/_global-error` не воспроизведён точечно и не исправлен.

**Статус на 2026-09-04:** PWA offline-режим для `domwellbes` реализован частично — только
`src/app/manifest.ts` (installable app shell для `/admin/`, без офлайн-кеша). Код Serwist
(`sw.ts`, `next.config.mjs` wrapping, ручная регистрация из `(admin)/layout.tsx`) был написан,
собран, подтверждённо не работает под Turbopack (сборка проходит, `public/sw.js` не создаётся —
Serwist там no-op) и заблокирован под webpack по причинам выше — **откачен**, не оставлен в
дереве как мёртвый код. Возврат к нему — отдельная задача, начинать с причины 1 (профилировать
память webpack-сборки этого конкретного приложения).
