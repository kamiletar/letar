# Корневой `not-found.tsx` без root `layout.tsx` — Next.js сам подставляет `<html>/<body>`

## Симптом

Hydration mismatch на невалидном сегменте динамического роута (например `/de` при
`routing.locales` без немецкого) — дублирование тега `<html>` в дереве. `nx typecheck:tsgo`,
`nx lint`, юнит-тесты остаются зелёными всё время — баг ловится только живым тестом в браузере на
конкретном невалидном URL.

⚠️ Ещё один частный случай ловушки из
[verification-pitfalls.md](/.claude/docs/verification-pitfalls.md) — статическая проверка не
покрывает этот путь рендера в принципе, нужен реальный запрос к невалидному сегменту.

## Причина

Приложение локализовано через `[locale]/layout.tsx`, который и рендерит `<html lang={locale}>` +
`<body>` — у приложения **нет** собственного `app/layout.tsx` на верхнем уровне. Это штатно, пока
запрос попадает в `[locale]/...` с валидной локалью: `<html>/<body>` рендерится ровно один раз,
внутри `[locale]/layout.tsx`.

Корневой `not-found.tsx` (`apps/<app>/src/app/not-found.tsx`) — особый случай. Next.js вызывает
его не только на обычный 404, но и когда `notFound()` бросается **из самого**
`[locale]/layout.tsx` — например, при проверке `routing.locales.includes(locale)` на невалидном
значении. В этот момент рендер `[locale]/layout.tsx` уже прерван, `<html>/<body>` из него не
вышли — а `not-found.tsx` лежит на уровне app root, у которого нет родительского layout вообще.

Next.js не оставляет страницу без `<html>/<body>`: для root-level файла без родительского layout
он в dev-режиме подставляет их сам через внутренний `DefaultLayout`. Если `not-found.tsx` **сам
тоже** рендерит `<html><body>...</body></html>`, тег `<html>` in отдаёт дважды — React видит
несовпадение с тем, что фактически ушло в разметку, и ругается hydration mismatch.

## Фикс

Корневой `not-found.tsx` в приложении без `app/layout.tsx` должен возвращать обычный контейнер
(`<div>` и т.п.), **без** `<html>`/`<body>` — Next.js подставит их сам:

```tsx
// ✅ apps/aboi/src/app/not-found.tsx
export default function RootNotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', ... }}>
      <h1>404</h1>
      <p>Страница не найдена</p>
    </div>
  )
}
```

```tsx
// ❌ дублирует <html>, которое DefaultLayout уже подставил
export default function RootNotFound() {
  return (
    <html lang="ru">
      <body>...</body>
    </html>
  )
}
```

Разметка получается заведомо неоформленной (без Chakra-провайдеров, без темы) — это ожидаемо и
безопасно: этот файл ловит единственный редкий случай (невалидный сегмент локали до входа в
`[locale]/layout.tsx`), не основной 404-путь приложения. Основной 404 внутри валидной локали
обслуживает `[locale]/not-found.tsx` (если есть) с полным layout.

## Приложения в зоне риска

Список получен `2026-08-17` командой:

```bash
for d in apps/*/src/app; do [ -d "$d/[locale]" ] && [ ! -f "$d/layout.tsx" ] && echo "$d"; done
```

На эту дату — `aboi`, `aira-web`, `kami`, `time`. Список может измениться (появится/пропадёт
`app/layout.tsx`, добавится новое локализованное приложение) — перепроверяй командой выше, не
полагайся на этот список как на актуальный без перезапуска. Если у любого из этих приложений есть
или появится корневой `not-found.tsx`, который сам рендерит `<html>/<body>` — это тот же баг.

## Где встречалось

`apps/aboi/src/app/not-found.tsx`, найдено и исправлено в сессии `2026-08-17` (задача §S3.7 из
`apps/aboi/PLAN_MARKETING.md`). Разбор с деталями — `apps/aboi/PLAN_COMPLETED.md`, секция «Сессия
2026-08-17» (submodule, приватная часть монорепо).
